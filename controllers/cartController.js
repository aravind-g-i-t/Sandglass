const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Address = require('../models/addressModel');
const Coupon = require('../models/couponModel');
const Wallet = require('../models/walletModel');
const MESSAGES = require("../constants/messages.constant");
const STATUS_CODES = require('../enum/statusCode.enum');



const loadCart = async (req, res) => {
    try {
        const userData = await User.findById(req.session.user._id);
        const cartData = await Cart.findOne({ userId: userData._id }).populate('product.productId');
        await Promise.all(cartData.product.map(async item => {
            const product = await Product.findById(item.productId);
            item.productPrice = await product.getDisplayPrice();
        }));
        let totalPrice;
        let couponDiscount = 0;
        if (cartData) {
            totalPrice = cartData.product.reduce((total, item) => {
                return total + (item.productPrice * item.quantity);
            }, 0);
        }
        if (cartData && cartData.coupon) {
            const coupon = await Coupon.findOne({ code: cartData.coupon });
            if (coupon) {
                couponDiscount = coupon.discountPercentage;
            }
        }
        return res.status(STATUS_CODES.OK).render('user/cart', {
            userData,
            cartData,
            couponDiscount,
            totalPrice
        });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};



const addToCart = async (req, res) => {
    try {

        const productId = req.body.productId;
        const productData = await Product.findById(productId);
        if (!productData) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                success: false,
                message: MESSAGES.PRODUCT_NOT_FOUND
            });
        }

        const finalPrice = await productData.getDisplayPrice();

        const userData = await User.findById(req.session.user._id);
        if (!userData) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                success: false,
                message: MESSAGES.USER_NOT_FOUND
            });
        }

        let cart = await Cart.findOne({ userId: userData._id });
        if (cart) {
            const productIndex = cart.product.findIndex((item) => {
                return item.productId.toString() === productId;
            });
            if (productIndex > -1) {
                if (cart.product[productIndex].quantity < productData.stock) {
                    cart.product[productIndex].quantity += 1;
                }
            } else {
                cart.product.push({
                    productId: productData._id,
                    productPrice: finalPrice,
                    quantity: 1
                });
            }
        } else {
            cart = new Cart({
                userId: userData._id,
                product: [
                    {
                        productId: productData._id,
                        productPrice: finalPrice,
                        quantity: 1
                    }
                ]
            });
        }


        await cart.save();
        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: MESSAGES.PRODUCT_ADDED_TO_CART
        });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.INTERNAL_SERVER_ERROR
        });
    }
};



const quantityUpdate = async (req, res) => {
    try {
        const { productId, status } = req.body;

        const productData = await Product.findById(productId);

        if (!productData) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                message: MESSAGES.PRODUCT_NOT_FOUND
            });
        }

        const cartData = await Cart.findOne({
            userId: req.session.user._id
        });

        if (!cartData) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                message: MESSAGES.CART_NOT_FOUND
            });
        }

        const productIndex = cartData.product.findIndex(
            item => item.productId.toString() === productId
        );

        if (productIndex === -1) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                message: MESSAGES.PRODUCT_NOT_IN_CART
            });
        }

        const cartProduct = cartData.product[productIndex];

        const stock = productData.stock;
        const quantity = cartProduct.quantity;

        const finalPrice = await productData.getDisplayPrice();

        if (status === "UP") {

            if (quantity >= 10) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({
                    code: "MAX_QUANTITY",
                    message: "Cannot add more than 10 of the same item."
                });
            }

            if (quantity >= stock) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({
                    code: "STOCK_EXCEEDED",
                    message: "Cannot increase quantity beyond available stock."
                });
            }


            cartProduct.quantity += 1;

        } else if (status === "DOWN") {

            if (quantity <= 1) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({
                    code: "MIN_QUANTITY",
                    message: "Quantity cannot be less than 1."
                });
            }

            cartProduct.quantity -= 1;
        }

        cartProduct.productPrice = finalPrice;

        const totalPrice = cartData.product.reduce((total, item) => {
            return total + (item.productPrice * item.quantity);
        }, 0);

        cartData.totalPrice = totalPrice;

        let discount = 0;

        if (cartData.coupon) {

            const coupon = await Coupon.findOne({
                code: cartData.coupon,
                isActive: true
            });

            if (coupon) {
                discount = totalPrice * (
                    coupon.discountPercentage / 100
                );
            }
        }

        await cartData.save();

        return res.status(STATUS_CODES.OK).json({
            message: MESSAGES.QUANTITY_UPDATED,
            total: totalPrice,
            quantity: cartProduct.quantity,
            finalPrice,
            discount,
            products: cartData.product,
            productData
        });

    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            message: MESSAGES.INTERNAL_SERVER_ERROR
        });
    }
};



const removeProduct = async (req, res) => {
    try {
        const { productId, productPrice } = req.body;

        const cartData = await Cart.findOne({ userId: req.session.user._id });
        if (!cartData) {
            return res.status(STATUS_CODES.NOT_FOUND).send(MESSAGES.CART_NOT_FOUND);
        }

        const productIndex = cartData.product.findIndex(item => item.productId.toString() === productId);
        if (productIndex === -1) {
            return res.status(STATUS_CODES.NOT_FOUND).send(MESSAGES.PRODUCT_NOT_IN_CART);
        }

        const quantity = cartData.product[productIndex].quantity;

        await Cart.updateOne(
            { userId: req.session.user._id },
            {
                $pull: { product: { productId } },
                $inc: { totalPrice: -productPrice * quantity }
            }
        );

        return res.status(STATUS_CODES.OK).json(MESSAGES.REMOVED_FROM_CART);

    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

const loadCheckout = async (req, res) => {
    try {
        const userData = await User.findById(req.session.user._id).exec();
        const cartData = await Cart.findOne({ userId: req.session.user._id }).populate("product.productId");

        await Promise.all(cartData.product.map(async item => {
            const product = await Product.findById(item.productId);
            item.productPrice = await product.getDisplayPrice();
        }));
        const addressData = await Address.findOne({ userId: req.session.user._id });

        let couponDiscount = 0;
        let totalPrice = 0;
        const outOfStockProducts = [];

        if (cartData) {
            cartData.product.forEach(item => {
                if (item.quantity > item.productId.stock) {
                    outOfStockProducts.push({
                        productName: item.productId.productName,
                        productId: item.productId._id
                    });
                } else {
                    totalPrice += item.productPrice * item.quantity;
                }
            });

            if (outOfStockProducts.length > 0) {
                return res.redirect(`/cart?outOfStock=${encodeURIComponent(JSON.stringify(outOfStockProducts))}`);
            }
        }
        const walletData = await Wallet.findOne({ userId: req.session.user._id });
        let walletApplicable;
        let codApplicable;
        if (totalPrice <= walletData.walletBalance) {
            walletApplicable = true;
        }
        if (totalPrice <= 2000) {
            codApplicable = true;
        }
        if (cartData && cartData.coupon) {
            const coupon = await Coupon.findOne({ code: cartData.coupon });
            if (coupon) {
                couponDiscount = coupon.discountPercentage;
                if ((totalPrice - ((totalPrice * couponDiscount) / 100)) <= walletData.walletBalance) {
                    walletApplicable = true;
                }
                if ((totalPrice - ((totalPrice * couponDiscount) / 100)) <= 2000) {
                    codApplicable = true;
                }
            }
        }

        return res.status(STATUS_CODES.OK).render("user/checkout", {
            cartData,
            addressData,
            userData,
            totalPrice,
            couponDiscount,
            walletData,
            walletApplicable,
            codApplicable
        });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};


const addNewAddress = async (req, res) => {
    try {
        const {
            fullName,
            addressLine1,
            addressLine2,
            city,
            state,
            pincode,
            phone,
            email
        } = req.body;
        let addressData = await Address.findOne({ userId: req.session.user._id });

        if (addressData) {
            addressData.address.push({
                fullName,
                addressLine1,
                addressLine2,
                city,
                state,
                pincode,
                phoneNo: phone,
                email
            });
            await addressData.save();
        } else {
            addressData = new Address({
                userId: req.session.user._id,
                address: [
                    {
                        fullName,
                        addressLine1,
                        addressLine2,
                        city,
                        state,
                        pincode,
                        phoneNo: phone,
                        email
                    }
                ]
            });
            await addressData.save();
        }

        return res.redirect("/checkout");

    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user._id;

        const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
        if (!coupon) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.INVALID_COUPON });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.CART_NOT_FOUND });
        }

        const cartTotal = cart.product.reduce((acc, product) => acc + (product.productPrice * product.quantity), 0);

        if (cartTotal < coupon.minPurchaseAmount) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success:true,
                message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} is required to use this coupon` });
        }

        cart.coupon = couponCode;
        await cart.save();

        return res.json({ message: MESSAGES.COUPON_APPLIED, discountPercentage: coupon.discountPercentage });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.INTERNAL_SERVER_ERROR
        });
    }
};

const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user._id;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.CART_NOT_FOUND });
        }

        cart.coupon = undefined;
        await cart.save();

        return res.status(STATUS_CODES.OK).json({ message: MESSAGES.COUPON_REMOVED });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};


module.exports = {
    addToCart,
    loadCart,
    quantityUpdate,
    removeProduct,
    loadCheckout,
    addNewAddress,
    applyCoupon,
    removeCoupon

};