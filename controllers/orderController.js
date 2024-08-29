/* eslint-disable max-depth */
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Address = require('../models/addressModel');
const Cart = require('../models/cartModel');
const Wallet = require('../models/walletModel');
const Coupon = require('../models/couponModel');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

// To create an instance of RazorPay to do payments
const RazorPayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


const orderDetails = async(req, res) => {
    try {
        const orderId = req.query.orderId;
        console.log('orderId:', orderId);
        const userData = await User.findById(req.session.user._id);
        const orderData = await Order.findOne({ orderId }).populate('userId').populate('products.productId');
        console.log(orderData);
        let totalPrice = 0;
        let invoice;
        orderData.products.forEach(item => {
            totalPrice += item.productPrice * item.quantity;
            if (['Return Requested', 'Return Approved', 'Return Rejected', 'Return Cancelled', 'Delivered'].includes(item.status)) {
                invoice = true;
            }
        });
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
        console.log(address);
        res.render('user/orderDetails', {
            userData,
            orderData,
            address,
            couponDiscount,
            totalPrice,
            invoice
        });
    } catch (error) {
        console.log('Error in orderDetails', error);
    }
};

const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, totalPrice } = req.body;
        console.log(addressId, paymentMethod, totalPrice);

        const cartData = await Cart.findOne({ userId: req.session.user._id }).populate("product.productId");

        for (const item of cartData.product) {
            const productId = item.productId._id;
            const quantity = item.quantity;
            const product = await Product.findById(productId);

            if (!product) {
                return res.status(404).json({ message: `Product not found: ${productId}` });
            }
            if (product.stock === '0') {
                return res.status(400).json({ message: `${product.productName} is out of stock` });
            }
            if (product.stock < quantity) {
                return res.status(400).json({ message: `Not enough stock for product ${product.productName}` });
            }
        }
        for (const item of cartData.product) {
            const productId = item.productId._id;
            const quantity = item.quantity;
            const product = await Product.findById(productId);

            product.stock -= quantity;
            await product.save();
        }

        const order = new Order({
            userId: req.session.user._id,
            products: cartData.product,
            coupon: cartData.coupon,
            addressId,
            payableAmount: totalPrice,
            paymentMethod,
            paymentStatus: (paymentMethod === 'Wallet') ? 'Success' : 'Pending'
        });

        await order.save();
        if (paymentMethod === 'Wallet') {
            await Wallet.findOneAndUpdate(
                { userId: req.session.user._id },
                {
                    $inc: { walletBalance: -totalPrice },
                    $push: {
                        transactions: {
                            type: 'Debit',
                            amount: totalPrice,
                            time: new Date()
                        }
                    }
                },
                { new: true, useFindAndModify: false }
            );
        }


        cartData.product = [];
        cartData.coupon = null;
        await cartData.save();
        console.log('Cart cleared');
        return res.status(200).json({ message: "Success" });

    } catch (error) {
        console.log('Error in placeOrder', error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId, productId } = req.body;

        // Fetch the order data
        const orderData = await Order.findById(orderId);
        if (!orderData) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Find the product in the order
        const product = orderData.products.find(product => product._id.toString() === productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found in order" });
        }

        // Calculate refund amount
        let refundAmount = product.productPrice * product.quantity;
        if (orderData.coupon) {
            console.log('Coupon exists');
            const coupon = await Coupon.findOne({ code: orderData.coupon });
            if (coupon) {
                refundAmount = refundAmount * (1 - (coupon.discountPercentage / 100));
            }
        }
        // Update product status and inventory regardless of payment status
        const activeProducts = orderData.products.filter(product => !['Cancelled', 'Returned'].includes(product.status));
        if (orderData.products.length === 1 || activeProducts.length === 1) {
            if (orderData.paymentStatus === 'Success') {
                orderData.paymentStatus = 'Refunded';
                refundAmount = orderData.payableAmount;
            } else if (orderData.paymentStatus === 'Pending') {
                orderData.paymentStatus = 'Cancelled';
            }
        }
        await Product.findByIdAndUpdate(product.productId, {
            $inc: { stock: product.quantity }
        });



        // If payment status is "Success", proceed with the refund
        if (orderData.paymentStatus === 'Refunded' || orderData.paymentStatus === 'Success') {


            // Use findOneAndUpdate to update wallet and push transaction
            const walletData = await Wallet.findOneAndUpdate(
                { userId: req.session.user._id },
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
            orderData.returnedAmount = refundAmount;
            orderData.payableAmount -= refundAmount;

            if (!walletData) {
                return res.status(404).json({ message: "Wallet not found" });
            }
        }
        product.status = "Cancelled";
        // Save the updated order
        await orderData.save();

        return res.status(200).json({ message: "Successfully Cancelled" });
    } catch (error) {
        console.error('Error in cancelOrder', error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};




const returnOrder = async(req, res) => {
    try {
        const { orderId, productId, reason } = req.body;
        console.log(orderId, productId, reason);
        const orderData = await Order.findById(orderId);
        const orderedProduct = orderData.products.find(product => product._id.toString() === productId);
        if (!orderedProduct) {
            return res.status(404).json({ message: "Product not found in order" });
        }
        console.log("Product found", orderedProduct);
        orderedProduct.reason = reason;
        orderedProduct.status = 'Return Requested';
        await orderData.save();
        return res.redirect('/profile');

    } catch (error) {
        console.log('Error in returnOrder', error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const razorPayment = (req, res) => {
    let amount = parseFloat(req.body.amount);
    amount = Math.round(amount); // Ensure amount is a valid float and fixed to 2 decimals
    console.log(amount);
    const options = {
        amount, // Convert to smallest currency unit
        currency: "INR",
        receipt: "order_rcptid_11"
    };
    RazorPayInstance.orders.create(options, (err, order) => {
        if (err) {
            console.log(`Error in razorPayment -- ${JSON.stringify(err)}`); // Improved error logging
            return res.status(400).json({ success: false, message: "Failed to create order", error: err });
        } else {
            console.log("Order created: ", order.id);
            return res.status(200).json({ success: true, orderId: order.id });
        }
    });
};


// Here the razorpay payment will be verified and the order will be placed
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body.response;
        const { addressId, paymentMethod, totalPrice } = req.body;
        console.log(addressId, paymentMethod, totalPrice);

        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const keySecret = process.env.RAZORPAY_KEY_SECRET; // Razorpay key secret from environment variables

        // Generate the expected signature using HMAC SHA256
        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(body.toString())
            .digest("hex");

        // Compare the signatures
        if (expectedSignature === razorpay_signature) {
            console.log("Payment verified successfully");

            if (addressId && paymentMethod && totalPrice) {
                const cartData = await Cart.findOne({ userId: req.session.user._id }).populate("product.productId");

                for (const item of cartData.product) {
                    const productId = item.productId._id;
                    const quantity = item.quantity;
                    const product = await Product.findById(productId);

                    if (!product) {
                        return res.status(404).json({ message: `Product not found: ${productId}` });
                    }
                    if (product.stock === '0') {
                        return res.status(400).json({ message: `${product.productName} is out of stock` });
                    }
                    if (product.stock < quantity) {
                        return res.status(400).json({ message: `Not enough stock for product ${product.productName}` });
                    }
                }
                for (const item of cartData.product) {
                    const productId = item.productId._id;
                    const quantity = item.quantity;
                    const product = await Product.findById(productId);

                    product.stock -= quantity;
                    await product.save();
                }

                const order = new Order({
                    userId: req.session.user._id,
                    products: cartData.product,
                    coupon: cartData.coupon,
                    addressId,
                    payableAmount: totalPrice,
                    paymentMethod,
                    paymentStatus: 'Success'
                });

                await order.save();


                cartData.product = [];
                cartData.coupon = null;
                await cartData.save();
                console.log('Cart cleared');

            }


            res.status(200)
                .send({ success: true, message: "Payment verified successfully" });
        } else {
            console.log("Payment verification failed");
            res.status(400)
                .send({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.error(`Error in verifyPayment -- ${error}`);
        return res.status(500).send({ success: false, message: "Internal Server Error" });
    }
};

const generateInvoice = async (req, res) => {
    try {
        // Retrieve the order by ID
        const order = await Order.findOne({ orderId: req.params.id })
            .populate('userId') // Populate user details
            .populate('products.productId'); // Populate product details

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Fetch the address using the addressId from the order
        const address = await Address.findOne(
            { 'address._id': order.addressId },
            { 'address.$': 1 }
        );

        if (!address) {
            return res.status(404).send('Address not found');
        }

        // Generate the invoice PDF
        const doc = new PDFDocument({ margin: 50 });

        // Stream the PDF to the response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);
        doc.pipe(res);

        // Generate the invoice content
        generateHeader(doc);
        generateCustomerInformation(doc, order, address);
        generateInvoiceTable(doc, order);
        generateFooter(doc);

        // Finalize the PDF
        doc.end();

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).send('Error generating invoice');
    }
};

// Function to generate the header of the invoice
function generateHeader(doc) {
    doc
        .fontSize(20)
        .text('INVOICE', 50, 45)
        .fontSize(10)
        .text('SANDGLASS', 200, 50, { align: 'right' })
        .text('NM Street', 200, 65, { align: 'right' })
        .text('Cochi, Kerala, 688527', 200, 80, { align: 'right' })
        .moveDown();
}

// Function to generate customer information on the invoice
function generateCustomerInformation(doc, order, address) {
    const customerAddress = address.address[0]; // Fetch the first address object

    doc
        .text(`Invoice Number: ${order.orderId}`, 50, 160)
        .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, 175)
        .text(`Order ID: ${order.orderId}`, 50, 190)
        .text(`Customer Name: ${order.userId.username}`, 300, 160)
        .text(`Customer Address: ${customerAddress.addressLine1}`, 300, 175)
        .text(`${customerAddress.city}, ${customerAddress.state}, ${customerAddress.pincode}`, 300, 190)
        .moveDown();
}

// Function to generate the invoice table with products
function generateInvoiceTable(doc, order) {
    let i;
    const invoiceTableTop = 250;

    doc.font('Helvetica-Bold');
    generateTableRow(doc, invoiceTableTop, 'Product', 'Unit Price', 'Quantity', 'Total');
    generateHr(doc, invoiceTableTop + 20);
    doc.font('Helvetica');

    for (i = 0; i < order.products.length; i++) {
        const product = order.products[i];
        const position = invoiceTableTop + ((i + 1) * 30);
        generateTableRow(
            doc,
            position,
            product.productId.productName,
            product.productPrice.toFixed(2),
            product.quantity,
            (product.productPrice * product.quantity).toFixed(2)
        );
        generateHr(doc, position + 20);
    }

    const subtotalPosition = invoiceTableTop + ((i + 1) * 30);
    generateTableRow(doc, subtotalPosition, '', '', 'Subtotal', order.payableAmount.toFixed(2));

    const paidToDatePosition = subtotalPosition + 20;
    generateTableRow(doc, paidToDatePosition, '', '', 'Paid To Date', order.payableAmount.toFixed(2));

    const duePosition = paidToDatePosition + 25;
    generateTableRow(doc, duePosition, '', '', 'Balance Due', (0).toFixed(2));
}

// Function to generate a row in the invoice table
function generateTableRow(doc, y, item, unitPrice, quantity, lineTotal) {
    doc
        .fontSize(10)
        .text(item, 50, y)
        .text(unitPrice, 200, y, { width: 90, align: 'right' })
        .text(quantity, 300, y, { width: 90, align: 'right' })
        .text(lineTotal, 0, y, { align: 'right' });
}

// Function to generate a horizontal line (divider)
function generateHr(doc, y) {
    doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}

// Function to generate the footer of the invoice
function generateFooter(doc) {
    doc
        .fontSize(10)
        .text('Payment is due within 15 days. Thank you for your business.', 50, 780, { align: 'center', width: 500 });
}


const loadInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;

        // Fetch the order, user, and coupon details
        const order = await Order.findOne({ orderId })
            .populate('userId')
            .populate('products.productId');
        const coupon = await Coupon.findOne({ code: order.coupon });
        if (!order) {
            return res.status(404).send('Order not found');
        }
        const address = await Address.findOne(
            { 'address._id': order.addressId },
            { 'address.$': 1 }
        );
        const user = await User.findById(req.session.user._id);

        let finalPrice = 0;
        order.products.forEach(item => {
            finalPrice += item.productPrice * item.quantity;
        });
        // Calculate discount and total
        let discount = 0;
        if (order.coupon) {
            discount = (finalPrice * coupon.discountPercentage) / 100;
        }
        const shippingPrice = 300; // Set shipping price dynamically if needed

        // Render the invoice page with the order, user, and calculated prices
        res.render('user/invoice', {
            order,
            user,
            address,
            coupon,
            discount: discount.toFixed(2),
            finalPrice: finalPrice.toFixed(2),
            shippingPrice: shippingPrice.toFixed(2)
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Server error');
    }
};

module.exports = {
    orderDetails,
    placeOrder,
    cancelOrder,
    returnOrder,
    razorPayment,
    verifyPayment,
    generateInvoice,
    loadInvoice
};