
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Address = require('../models/addressModel');
const Cart = require('../models/cartModel');
const Wallet = require('../models/walletModel');
const Coupon = require('../models/couponModel');
const MESSAGES = require("../constants/messages.constant");
const STATUS_CODES = require('../enum/statusCode.enum');

const PDFDocument = require('pdfkit');

const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const RazorPayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


const orderDetails = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        const userData = await User.findById(req.session.user._id);
        const orderData = await Order.findOne({ orderId }).populate('userId').populate('products.productId');

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
        let walletApplicable;
        const wallet = await Wallet.findOne({ userId: req.session.user._id });
        if (wallet.walletBalance > orderData.payableAmount) {
            walletApplicable = true;
        }
        return res.render('user/orderDetails', {
            userData,
            orderData,
            address,
            couponDiscount,
            totalPrice,
            invoice,
            walletApplicable
        });
    } catch (error) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(`An error occurred: ${error.message}`);
    }
};

const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, totalPrice } = req.body;

        const cartData = await Cart.findOne({ userId: req.session.user._id }).populate("product.productId");

        for (const item of cartData.product) {
            const productId = item.productId._id;
            const quantity = item.quantity;
            const product = await Product.findById(productId);

            if (!product) {
                return res.status(STATUS_CODES.NOT_FOUND).json({ message: `Product not found: ${productId}` });
            }
            if (product.stock === '0') {
                return res.status(STATUS_CODES.BAD_REQUEST).json({ message: `${product.productName} is out of stock` });
            }
            if (product.stock < quantity) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({ message: `Not enough stock for product ${product.productName}` });
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
        return res.status(STATUS_CODES.OK).json({ message: "Success" });

    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId, productId } = req.body;

        const orderData = await Order.findById(orderId);
        if (!orderData) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ message: "Order not found" });
        }

        const product = orderData.products.find(product => product._id.toString() === productId);
        if (!product) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ message: "Product not found in order" });
        }

        let refundAmount = product.productPrice * product.quantity;
        if (orderData.coupon) {
            const coupon = await Coupon.findOne({ code: orderData.coupon });
            if (coupon) {
                refundAmount = refundAmount * (1 - (coupon.discountPercentage / 100));
            }
        }
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

        if (orderData.paymentStatus === 'Refunded' || orderData.paymentStatus === 'Success') {


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
                return res.status(STATUS_CODES.NOT_FOUND).json({ message: "Wallet not found" });
            }
        }
        product.status = "Cancelled";
        await orderData.save();

        return res.status(STATUS_CODES.OK).json({ message: "Successfully Cancelled" });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};




const returnOrder = async (req, res) => {
    try {
        const { orderId, productId, reason } = req.body;
        const orderData = await Order.findById(orderId);
        const orderedProduct = orderData.products.find(product => product._id.toString() === productId);
        if (!orderedProduct) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ message: "Product not found in order" });
        }
        orderedProduct.reason = reason;
        orderedProduct.status = 'Return Requested';
        await orderData.save();
        return res.redirect('/profile');

    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const razorPayment = (req, res) => {
    let amount = parseFloat(req.body.amount);
    amount = Math.round(amount); 
    const options = {
        amount, 
        currency: "INR",
        receipt: "order_rcptid_11"
    };
    RazorPayInstance.orders.create(options, (err, order) => {
        if (err) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Failed to create order", error: err });
        } else {
            return res.status(STATUS_CODES.OK).json({ success: true, orderId: order.id });
        }
    });
};


const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
            req.body.response;
        const { addressId, paymentMethod, totalPrice } = req.body;

        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {

            if (addressId && paymentMethod && totalPrice) {
                const cartData = await Cart.findOne({ userId: req.session.user._id }).populate("product.productId");

                for (const item of cartData.product) {
                    const productId = item.productId._id;
                    const quantity = item.quantity;
                    const product = await Product.findById(productId);

                    if (!product) {
                        return res.status(STATUS_CODES.NOT_FOUND).json({ message: `Product not found: ${productId}` });
                    }
                    if (product.stock === '0') {
                        return res.status(STATUS_CODES.BAD_REQUEST).json({ message: `${product.productName} is out of stock` });
                    }
                    if (product.stock < quantity) {
                        return res.status(STATUS_CODES.BAD_REQUEST).json({ message: `Not enough stock for product ${product.productName}` });
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

            }


            return res.status(STATUS_CODES.OK)
                .send({ success: true, message: "Payment verified successfully" });
        } else {
            return res.status(STATUS_CODES.BAD_REQUEST)
                .send({ success: false, message: "Payment verification failed" });
        }
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

// eslint-disable-next-line consistent-return
const generateInvoice = async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.id })
            .populate('userId')
            .populate('products.productId');

        if (!order) {
            res.status(STATUS_CODES.NOT_FOUND).send('Order not found');
            return;
        }

        const address = await Address.findOne(
            { 'address._id': order.addressId },
            { 'address.$': 1 }
        );

        if (!address) {
            res.status(STATUS_CODES.NOT_FOUND).send('Address not found');
            return;
        }

        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);
        doc.pipe(res);

        generateHeader(doc);
        generateCustomerInformation(doc, order, address);
        generateInvoiceTable(doc, order);
        generateFooter(doc);

        doc.end();

    } catch {
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Error generating invoice');
        return;
    }
};

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

function generateCustomerInformation(doc, order, address) {
    const customerAddress = address.address[0];

    doc
        .text(`Invoice Number: ${order.orderId}`, 50, 160)
        .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, 175)
        .text(`Order ID: ${order.orderId}`, 50, 190)
        .text(`Customer Name: ${order.userId.username}`, 300, 160)
        .text(`Customer Address: ${customerAddress.addressLine1}`, 300, 175)
        .text(`${customerAddress.city}, ${customerAddress.state}, ${customerAddress.pincode}`, 300, 190)
        .moveDown();
}

function generateInvoiceTable(doc, order) {
    let i;
    const invoiceTableTop = 250;

    doc.font('Helvetica-Bold');
    generateTableRow(doc, invoiceTableTop, 'Product', 'Unit Price', 'Quantity', 'Total');
    generateHr(doc, invoiceTableTop + 20);
    doc.font('Helvetica');

    // eslint-disable-next-line no-plusplus
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

function generateTableRow(doc, y, item, unitPrice, quantity, lineTotal) {
    doc
        .fontSize(10)
        .text(item, 50, y)
        .text(unitPrice, 200, y, { width: 90, align: 'right' })
        .text(quantity, 300, y, { width: 90, align: 'right' })
        .text(lineTotal, 0, y, { align: 'right' });
}

function generateHr(doc, y) {
    doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}

function generateFooter(doc) {
    doc
        .fontSize(10)
        .text('Payment is due within 15 days. Thank you for your business.', 50, 780, { align: 'center', width: 500 });
}


const loadInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;

        const order = await Order.findOne({ orderId })
            .populate('userId')
            .populate('products.productId');
        const coupon = await Coupon.findOne({ code: order.coupon });
        if (!order) {
            return res.status(STATUS_CODES.NOT_FOUND).send('Order not found');
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
        let discount = 0;
        if (order.coupon) {
            discount = (finalPrice * coupon.discountPercentage) / 100;
        }
        const shippingPrice = 300;

        return res.render('user/invoice', {
            order,
            user,
            address,
            coupon,
            discount: discount.toFixed(2),
            finalPrice: finalPrice.toFixed(2),
            shippingPrice: shippingPrice.toFixed(2)
        });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Server error');
    }
};

const payByRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
            req.body.response;
        const { paymentMethod, totalPrice, id } = req.body;

        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const keySecret = process.env.RAZORPAY_KEY_SECRET; // Razorpay key secret from environment variables

        // Generate the expected signature using HMAC SHA256
        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(body.toString())
            .digest("hex");

        // Compare the signatures
        if (expectedSignature === razorpay_signature) {

            if (paymentMethod && totalPrice) {
                await Order.findOneAndUpdate({ orderId: id },
                    {
                        $set: {
                            paymentMethod: 'Razorpay',
                            paymentStatus: 'Success'
                        }
                    }
                );
            }


            return res.status(STATUS_CODES.OK)
                .send({ success: true, message: "Payment done successfully" });
        } else {
            return res.status(STATUS_CODES.BAD_REQUEST)
                .send({ success: false, message: "Payment failed" });
        }
    } catch (error) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(`An error occurred: ${error.message}`);
    }
};

const payByWallet = async (req, res) => {
    try {
        const { totalPrice, id } = req.body;
        await Order.findOneAndUpdate({ orderId: id },
            {
                $set: {
                    paymentMethod: 'Wallet',
                    paymentStatus: 'Success'
                }
            }
        );
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
            { new: true }
        );
        return res.status(STATUS_CODES.OK).json({ message: "Success" });
    } catch (error) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(`An error occurred: ${error.message}`);
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
    loadInvoice,
    payByRazorpay,
    payByWallet
};