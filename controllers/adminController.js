/* eslint-disable object-shorthand */
const hashing = require('../helpers/passwordHash');
const Admin = require('../models/adminModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Order = require('../models/orderModel');
const Address = require('../models/addressModel');
const Wallet = require('../models/walletModel');
const Coupon = require('../models/couponModel');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const moment = require('moment');




const loadLogin = async(req, res) => {
    try {
        res.render('admin/login');
    } catch (error) {
        console.log(error.message);
    }
};

const adminLogin = async(req, res) => {
    try {
        let { adminId, adminPassword } = req.body;
        adminId = adminId.trim();
        const adminData = await Admin.findOne({ adminId });
        console.log(adminData);
        if (adminData) {
            const securePassword = await hashing.comparePassword(adminPassword, adminData.adminPassword);
            if (securePassword) {
                req.session.admin = adminData;
                res.redirect('/admin/dashboard');
            } else {
                res.render('admin/login', { message: 'Incorrect credentials' });
            }
        } else {
            res.render('admin/login', { message: 'Incorrect credentials' });
        }

    } catch (error) {
        console.log(error.message);
    }

    // const admin = {
    //     username: "Admin",
    //     password: "Admin@123",
    //   };
    //   let { adminId, adminPassword } = req.body;
    //   console.log(adminId + " -- " + adminPassword);
    //   if (admin.username === adminId) {
    //     console.log("usernamatch match");
    //     if (admin.password === adminPassword) {
    //       console.log("password match");
    //       const hash = await hashing.hashPassword(adminPassword);
    //       const adminData = await Admin.create({
    //         adminId: adminId,
    //         adminPassword: hash,
    //       });
    //       const adminsave = await adminData.save();
    //       if (adminsave) {
    //         console.log("saved");
    //         res.redirect("/admin/dashboard");
    //       } else {
    //         console.log("not savedd");
    //       }
    //     } else {
    //       console.log("password dosend match");
    //     }
    //   } else {
    //     console.log("username doesent match");
    //   }
};


const loadDashboard = async (req, res) => {
    try {
        const { dateFrom, dateTo, page = 1, limit = 10, interval = 'day' } = req.query;
        const isAjax = req.xhr;

        // Convert query params to Date objects for filtering
        const fromDate = dateFrom ? new Date(dateFrom) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
        const toDate = dateTo ? new Date(dateTo) : new Date();

        // Set graph end date to the later of toDate or today, and start date 6 units before
        const graphEndDate = new Date(Math.max(toDate, new Date()));
        const graphStartDate = new Date(graphEndDate);

        // eslint-disable-next-line default-case
        switch (interval) {
            case 'day':
                graphStartDate.setDate(graphEndDate.getDate() - 6);
                break;
            case 'month':
                graphStartDate.setMonth(graphEndDate.getMonth() - 6);
                break;
            case 'year':
                graphStartDate.setFullYear(graphEndDate.getFullYear() - 6);
                break;
        }

        // Calculate total number of orders for pagination
        const totalOrders = await Order.countDocuments({
            orderDate: { $gte: fromDate, $lte: toDate }
        });

        // Fetch all orders within the date range for graph data
        const allOrders = await Order.find({
            orderDate: { $gte: graphStartDate, $lte: graphEndDate }
        });
        // Fetch paginated order data
        const orderData = await Order.find({
            orderDate: { $gte: fromDate, $lte: toDate }
        }).skip((page - 1) * limit)
            .limit(parseInt(limit, 10))
            .populate('userId');

        // Calculate total revenue
        const totalRevenue = orderData.reduce((acc, order) => {
            let orderTotal = parseFloat(order.payableAmount);
            if (order.returnedAmount) {
                orderTotal -= parseFloat(order.returnedAmount);
            }
            return acc + orderTotal;
        }, 0);

        if (isAjax) {
            // Send only the necessary data for AJAX requests
            res.json({
                orderData,
                totalRevenue,
                currentPage: parseInt(page, 10),
                totalPages: Math.ceil(totalOrders / limit)
            });
        } else {
            // For full page load, include additional data
            const productData = await Product.find({});
            const graphData = await processGraphData(allOrders, interval, graphStartDate, graphEndDate);

            res.render('admin/dashboard', {
                orderData,
                productData,
                totalRevenue,
                currentPage: parseInt(page, 10),
                totalPages: Math.ceil(totalOrders / limit),
                dateFrom: fromDate.toISOString().split('T')[0],
                dateTo: toDate.toISOString().split('T')[0],
                limit: parseInt(limit, 10),
                graphData: JSON.stringify(graphData),
                interval: interval
            });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send('An error occurred while loading the dashboard');
    }
};

function processGraphData(orders, interval, startDate, endDate) {
    const graphData = {};

    // Initialize graphData with all 7 points
    for (let i = 0; i < 7; i++) {
        const date = new Date(endDate);
        switch (interval) {
            case 'day':
                date.setDate(date.getDate() - i);
                break;
            case 'month':
                date.setMonth(date.getMonth() - i);
                break;
            case 'year':
                date.setFullYear(date.getFullYear() - i);
                break;
        }
        const key = formatDate(date, interval);
        graphData[key] = 0;
    }

    orders.forEach(order => {
        const date = new Date(order.orderDate);
        const key = formatDate(date, interval);

        if (graphData.hasOwnProperty(key)) {
            let turnover = parseFloat(order.payableAmount);
            if (order.returnedAmount) {
                turnover -= parseFloat(order.returnedAmount);
            }
            graphData[key] += turnover;
        }
    });

    return Object.entries(graphData)
        .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
        .map(([date, turnover]) => ({ date, turnover }));
}

function formatDate(date, interval) {
    switch (interval) {
        case 'day':
            return date.toISOString().split('T')[0];
        case 'month':
            return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        case 'year':
            return date.getFullYear().toString();
    }
}




const adminLogout = async (req, res) => {
    try {
        req.session.admin = null;
        res.redirect('/admin');
    } catch (error) {
        console.log(error.message);
    }
};

const loadUsers = async(req, res) => {
    try {
        let query = {};
        if (req.query.searchUser) {
            const searchQuery = req.query.searchUser;
            console.log(searchQuery);
            query = { username: new RegExp(searchQuery, 'i') };
        }
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 4;
        const startIndex = (page - 1) * limit;
        const userData = await User.find(query).skip(startIndex).limit(limit);
        const totalDocuments = await User.countDocuments();
        const totalPages = Math.ceil(totalDocuments / limit);
        res.render('admin/users', { userData, totalPages, page });

    } catch (error) {
        console.log(error.message);
    }
};

// const blockUser=async(req,res)=>{
//     try {
//         const id=req.query.id;
//         req.session.temp=req.session.user;
//         req.session.user.destroy=false;
//         await User.findByIdAndUpdate(id,{
//             $set:{isActive:false}
//         });
//         res.redirect('/admin/users')
//     } catch (error) {
//         console.log(error.message);
//     }
// }


// const unblockUser=async(req,res)=>{
//     try {
//         const id=req.query.id;
//         req.session.temp=req.session.user;
//         const userData=await User.findByIdAndUpdate(id,{
//             $set:{isActive:false}
//         });
//         res.redirect('/admin/users')
//     } catch (error) {
//         console.log(error.message);
//     }
// }

const userStatusUpdate = async(req, res) => {
    try {
        const id = req.query.id;

        const user = await User.findById({ _id: id });
        if (user.isActive) {
            await User.findByIdAndUpdate(
                { _id: id },
                { $set: { isActive: false } }
            );
        } else {
            await User.findByIdAndUpdate(
                { _id: id },
                { $set: { isActive: true } }
            );
        }
        res.redirect('/admin/users');

    } catch (error) {
        console.log(error.message);
    }
};

// const loadProducts=async(req,res)=>{
//     try {
//         res.render('admin/products')
//     } catch (error) {
//         console.log(error.message);
//     }
// }
const orderList = async (req, res) => {
    try {
        let query = {};

        if (req.query.searchId) {
            const searchQuery = req.query.searchId.trim(); // Trim the search query to remove leading/trailing whitespace and tab characters
            console.log("Search Query:", searchQuery);

            if (searchQuery !== "") {
                query = { orderId: searchQuery }; // Ensure you use the correct field name `orderId`
            }
        }

        console.log("Query:", query);

        const page = parseInt(req.query.page, 10) || 1;
        console.log("Page:", page);

        const limit = 6;
        const startIndex = (page - 1) * limit;

        const orderData = await Order.find(query).populate('userId').sort({ orderDate: -1 }).skip(startIndex).limit(limit);
        console.log("Number of orders:", orderData.length);

        const totalDocuments = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalDocuments / limit);
        console.log("Total pages:", totalPages);

        res.render('admin/orders', {
            orderData,
            page,
            totalPages
        });
    } catch (error) {
        console.log("Error in orderList:", error);
    }
};



const orderDetails = async(req, res) => {
    try {
        const orderId = req.query.orderId;

        const orderData = await Order.findOne({ orderId: orderId }).populate('userId').populate('products.productId');
        console.log(orderData);
        let totalPrice = 0;
        let invoice;
        orderData.products.forEach(item => {
            totalPrice += item.productPrice * item.quantity;
            if (item.status === 'Delivered') {
                invoice = true;
            }
        });
        // const userData=await User.findById(orderData.userId);
        const address = await Address.findOne(
            { 'address._id': orderData.addressId },
            { 'address.$': 1 }
        );
        let couponDiscount = 0;
        if (orderData.coupon) {
            const coupon = await Coupon.findOne({ code: orderData.coupon });
            if (coupon) {
                couponDiscount = coupon.discountPercentage;
            }
        }
        res.render('admin/orderDetails', {
            orderData,
            totalPrice,
            address,
            couponDiscount,
            invoice
        });
    } catch (error) {
        console.log('Error in orderDetails:', error);
    }

};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, productId, status } = req.body;

        if (!orderId || !productId || !status) {
            return res.status(400).json({ success: false, message: 'Missing orderId, productId, or status' });
        }

        // Find the order and update the product status
        const updatedOrder = await Order.findOneAndUpdate(
            { "_id": orderId, 'products._id': productId },
            { $set: { 'products.$.status': status } },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order or Product not found' });
        }

        // Check if the status is "Delivered" and the payment method is "COD"
        if (status === "Delivered") {
            updatedOrder.paymentStatus = "Success";
            const order = await Order.findOne({ orderId });
            order.products.forEach(product => {
                if (product.status !== 'Cancelled') {
                    product.status = 'Delivered';
                }
            });
            await updatedOrder.save();
        }

        // Check if the status is "Returned" and paymentStatus is "Success"
        if (status === "Returned" && updatedOrder.paymentStatus === "Success") {
            const product = updatedOrder.products.find(product => product._id.toString() === productId);
            if (product) {
                let refundAmount = product.productPrice * product.quantity;
                if (updatedOrder.coupon) {
                    const coupon = await Coupon.findOne({ code: updatedOrder.coupon });
                    // eslint-disable-next-line max-depth
                    if (coupon) {
                        refundAmount = refundAmount / 100 * (100 - coupon.discountPercentage);
                    }
                }
                const activeProducts = updatedOrder.products.filter(product => !['Cancelled', 'Returned'].includes(product.status));
                if (updatedOrder.products.length === 1 || activeProducts.length === 0) {
                    refundAmount = updatedOrder.payableAmount;
                }
                updatedOrder.returnedAmount = refundAmount;
                // Update the wallet balance and add a transaction
                const walletData = await Wallet.findOneAndUpdate(
                    { userId: updatedOrder.userId },
                    {
                        $inc: { walletBalance: refundAmount },
                        $push: {
                            transactions: {
                                type: 'Credit',
                                amount: refundAmount.toString(),
                                time: new Date()
                            }
                        }
                    },
                    { new: true }
                );

                if (!walletData) {
                    return res.status(404).json({ success: false, message: 'Wallet not found' });
                }

                // Optionally update order's payableAmount if needed
                updatedOrder.payableAmount = refundAmount;
                updatedOrder.paymentStatus = 'Refunded';

                // Save the updated order
                await updatedOrder.save();
            }
        }

        return res.json({ success: true, order: updatedOrder });

    } catch (error) {
        console.log('Error in updateOrderStatus', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const coupons = async(req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 10;

        const coupons = await Coupon.find({})
            .limit(limit)
            .skip((page - 1) * limit);

        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / limit);

        return res.render('admin/coupons', {
            coupons,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.log('Error in coupons', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const addCoupon = async(req, res) => {
    try {
        return res.render('admin/add_coupon');
    } catch (error) {
        console.log('Error in addCoupon', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const editCoupon = async(req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.redirect('/admin/coupons');
        }

        return res.render('admin/edit_coupon', { coupon });
    } catch (error) {
        console.log('Error in editCoupon', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateCoupon = async(req, res) => {
    try {
        const { code, description, discountPercentage, minPurchaseAmount, quantityLimit, expiryDate } = req.body;
        const couponExists = await Coupon.findOne({ code: code, _id: { $ne: req.params.id } });
        if (couponExists) {
            const coupon = await Coupon.findById(req.params.id);
            res.render(`admin/edit_coupon`, { coupon, message: "Code already exists" });
        } else {
            await Coupon.findByIdAndUpdate(req.params.id, {
                code,
                description,
                discountPercentage,
                minPurchaseAmount,
                quantityLimit,
                expiryDate: new Date(expiryDate)
            });
            return res.redirect('/admin/coupons');
        }


    } catch (error) {
        console.log('Error in updateCoupon', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const saveCoupon = async(req, res) => {
    try {
        const { code, description, discountPercentage, minPurchaseAmount, quantityLimit, expiryDate } = req.body;

        // Validate the required fields
        if (!code || !description || !discountPercentage || !minPurchaseAmount || !quantityLimit || !expiryDate) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const couponExists = await Coupon.findOne({ code: code });
        if (couponExists) {
            res.render('admin/add_coupon', { message: "Code already exists" });
        } else {
            // Create a new coupon object
            const newCoupon = new Coupon({
                code,
                description,
                discountPercentage,
                minPurchaseAmount,
                quantityLimit,
                expiryDate
            });

            // Save the coupon to the database
            await newCoupon.save();

            // Redirect to the coupons list page or send a success response
            return res.status(201).redirect('/admin/coupons');
        }
    } catch (error) {
        console.log('Error in saveCoupon', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateCouponStatus = async(req, res) => {
    try {
        const { isActive } = req.body;
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
        if (coupon) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    } catch (error) {
        console.log('Error in updateCouponStatus', error);

    }
};


const generateReport = async (req, res) => {
    try {
        const { dateFrom, dateTo, format } = req.query;

        // Convert query params to Date objects
        const fromDate = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
        const toDate = dateTo ? new Date(dateTo) : new Date();

        // Fetch orders within the date range
        const orders = await Order.find({
            orderDate: { $gte: fromDate, $lte: toDate }
        }).populate('userId').sort({ orderDate: 1 });

        // Calculate summary statistics
        const totalSales = orders.reduce((sum, order) => sum + Number(order.payableAmount), 0);
        const averageOrderValue = orders.length ? totalSales / orders.length : 0;
        const numberOfOrders = orders.length;

        if (format === 'pdf') {
            await generatePDFReport(res, orders, { totalSales, averageOrderValue, numberOfOrders, fromDate, toDate });
        } else if (format === 'excel') {
            await generateExcelReport(res, orders, { totalSales, averageOrderValue, numberOfOrders, fromDate, toDate });
        } else {
            res.status(400).send('Invalid format. Supported formats are "pdf" and "excel".');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).send('An error occurred while generating the report. Please try again later.');
    }
};

const generatePDFReport = async (res, orders, summary) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    // Helper function to format currency
    const formatCurrency = (amount) => {
        return `₹${new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount)}`;
    };

    // Embed a Unicode-compatible font
    doc.registerFont('DejaVuSans', 'public/admin/assets/fonts/DejaVuSans.ttf');
    doc.font('DejaVuSans');

    // Title
    doc.fontSize(18).text('Sales Report', { align: 'center' });
    doc.moveDown();

    // Summary
    doc.fontSize(12).text(`Total Sales: ${formatCurrency(summary.totalSales)}`);
    doc.text(`Average Order Value: ${formatCurrency(summary.averageOrderValue)}`);
    doc.text(`Number of Orders: ${summary.numberOfOrders}`);
    doc.text(`Date Range: ${moment(summary.fromDate).format('DD-MM-YYYY')} to ${moment(summary.toDate).format('DD-MM-YYYY')}`);
    doc.moveDown();

    // Table headers
    const tableHeaders = ['Order ID', 'Billing Name', 'Date', 'Total', 'Payment Status', 'Payment Method'];
    const tableColumnWidths = [50, 100, 80, 80, 80, 80];

    doc.font('DejaVuSans').fontSize(12);
    let xPos = 50;
    let yPos = doc.y;

    tableHeaders.forEach((header, index) => {
        doc.fillColor('black').text(header, xPos, yPos, {
            width: tableColumnWidths[index],
            align: 'left',
            continued: false,
            lineBreak: false
        });
        xPos += tableColumnWidths[index];
    });

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Table rows
    doc.font('DejaVuSans').fontSize(10);
    orders.forEach((order, index) => {
        xPos = 50;
        yPos = doc.y;

        const rowColor = index % 2 === 0 ? '#FFFFFF' : '#F0F0F0';
        doc.rect(xPos, yPos, 500, 20).fill(rowColor);

        doc.fillColor('black');
        doc.text(order.orderId, xPos, yPos, { width: tableColumnWidths[0], align: 'left' });
        xPos += tableColumnWidths[0];
        doc.text(order.userId.username, xPos, yPos, { width: tableColumnWidths[1], align: 'left' });
        xPos += tableColumnWidths[1];
        doc.text(moment(order.orderDate).format('DD-MM-YYYY'), xPos, yPos, { width: tableColumnWidths[2], align: 'left' });
        xPos += tableColumnWidths[2];
        doc.text(formatCurrency(Number(order.payableAmount)), xPos, yPos, { width: tableColumnWidths[3], align: 'left' });
        xPos += tableColumnWidths[3];
        doc.text(order.paymentStatus, xPos, yPos, { width: tableColumnWidths[4], align: 'left' });
        xPos += tableColumnWidths[4];
        doc.text(order.paymentMethod, xPos, yPos, { width: tableColumnWidths[5], align: 'left' });

        doc.moveDown(0.8);
    });

    // Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(10).text(
            `Page ${i + 1} of ${pageCount}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
        );
    }

    doc.end();
};

const generateExcelReport = async (res, orders, summary) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Add summary
    worksheet.addRow(['Sales Report']);
    worksheet.addRow(['Total Sales', `₹${summary.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
    worksheet.addRow(['Average Order Value', `₹${summary.averageOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
    worksheet.addRow(['Number of Orders', summary.numberOfOrders]);
    worksheet.addRow(['Date Range', `${moment(summary.fromDate).format('DD-MM-YYYY')} to ${moment(summary.toDate).format('DD-MM-YYYY')}`]);
    worksheet.addRow([]);

    // Add headers
    const headers = ['Order ID', 'Billing Name', 'Date', 'Total', 'Payment Status', 'Payment Method'];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
    };

    // Add data
    orders.forEach(order => {
        worksheet.addRow([
            order.orderId,
            order.userId.username,
            moment(order.orderDate).format('DD-MM-YYYY'),
            Number(order.payableAmount),
            order.paymentStatus,
            order.paymentMethod
        ]);
    });

    // Format columns
    worksheet.columns.forEach((column, index) => {
        column.width = 15;
        if (index === 3) { // Assuming the 'Total' column is at index 3
            column.numFmt = '₹#,##0.00';
        }
    });

    // Set content type and disposition
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
};






module.exports = {
    loadLogin,
    adminLogin,
    adminLogout,
    loadDashboard,
    loadUsers,
    userStatusUpdate,
    orderList,
    orderDetails,
    updateOrderStatus,
    coupons,
    addCoupon,
    editCoupon,
    saveCoupon,
    updateCoupon,
    updateCouponStatus,
    generateReport
};