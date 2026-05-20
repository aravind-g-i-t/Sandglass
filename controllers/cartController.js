<<<<<<< HEAD
/* eslint-disable camelcase */
// const { errorMonitor } = require('nodemailer/lib/xoauth2');
=======
>>>>>>> 003d3dd (update ui)
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Address = require('../models/addressModel');
const Coupon = require('../models/couponModel');
const Wallet = require('../models/walletModel');

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
        return res.render('user/cart', {
            userData,
            cartData,
            couponDiscount,
            totalPrice
        });
<<<<<<< HEAD
    } catch (error) {
        res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).json({ success: false, message: "Something went wrong" });
>>>>>>> 003d3dd (update ui)
    }
};



const addToCart = async (req, res) => {
    try {

        const productId = req.body.productId;
        const productData = await Product.findById(productId);
        if (!productData) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const finalPrice = await productData.getDisplayPrice();

        const userData = await User.findById(req.session.user._id);
        if (!userData) {
            return res.status(404).json({ success: false, message: "User not found" });
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
                    productPrice: finalPrice, // Use the final calculated price
                    quantity: 1
                });
            }
        } else {
            cart = new Cart({
                userId: userData._id,
                product: [
                    {
                        productId: productData._id,
                        productPrice: finalPrice, // Use the final calculated price
                        quantity: 1
                    }
                ]
            });
        }


        await cart.save();
        return res.status(200).json({ success: true });
<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).send('Internal Server Error');
>>>>>>> 003d3dd (update ui)
    }
};



const quantityUpdate = async (req, res) => {
    try {
        const { productId, status } = req.body;

        const productData = await Product.findById(productId);
<<<<<<< HEAD
        const finalPrice = await productData.getDisplayPrice();
        const cartData = await Cart.findOne({ userId: req.session.user._id });
        await Promise.all(cartData.product.map(async item => {
            const product = await Product.findById(item.productId);
            item.productPrice = await product.getDisplayPrice();
        }));

        if (!productData || !cartData) {
            return res.status(404).json({ message: "Product or Cart not found" });
        }

        const productIndex = cartData.product.findIndex(item => item.productId.toString() === productId);
        if (productIndex === -1) {
            return res.status(404).json({ message: "Product not found in cart" });
        }

        if (status === "UP") {
            const findProductStock = productData.stock;

            if (cartData.product[productIndex].quantity < findProductStock) {
                if (cartData.product[productIndex].quantity < 10) {
                    cartData.product[productIndex].quantity += 1;
                } else {
                    return res.json({
                        message: "Max 10",
                        total: cartData.totalPrice
                    });
                }
            } else {
                return res.json({
                    message: "product exceeded",
                    total: cartData.totalPrice
                });
            }

        } else if (status === "DOWN") {

            if (cartData.product[productIndex].quantity > 1) {
                cartData.product[productIndex].quantity -= 1;
            } else {
                return res.json({
                    message: "Min 1",
                    total: cartData.totalPrice
                });
            }
        }

        const totalPrice = cartData.product.reduce((total, item) => total + (item.productPrice * item.quantity), 0);

        await cartData.save();
        let discount = 0;
        if (cartData.coupon) {
            const coupon = await Coupon.findOne({ code: cartData.coupon, isActive: true });
            discount = totalPrice * ((coupon.discountPercentage) / 100);

        }
        const quantity = cartData.product[productIndex].quantity;


        return res.status(200).json({
            message: "quantity updated successfully",
            total: totalPrice,
            products: cartData.product,
            quantity,
            productData,
            finalPrice,
            discount
        });

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======

        if (!productData) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        const cartData = await Cart.findOne({
            userId: req.session.user._id
        });

        if (!cartData) {
            return res.status(404).json({
                message: "Cart not found"
            });
        }

        const productIndex = cartData.product.findIndex(
            item => item.productId.toString() === productId
        );

        if (productIndex === -1) {
            return res.status(404).json({
                message: "Product not found in cart"
            });
        }

        const cartProduct = cartData.product[productIndex];

        const stock = productData.stock;
        const quantity = cartProduct.quantity;

        const finalPrice = await productData.getDisplayPrice();

        if (status === "UP") {

            if (quantity >= 10) {
                return res.status(400).json({
                    message: "Maximum quantity is 10",
                    total: cartData.totalPrice
                });
            }

            if (quantity >= stock) {
                return res.status(400).json({
                    message: "Product stock exceeded",
                    total: cartData.totalPrice
                });
            }

            cartProduct.quantity += 1;

        } else if (status === "DOWN") {

            if (quantity <= 1) {
                return res.status(400).json({
                    message: "Minimum quantity is 1",
                    total: cartData.totalPrice
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

        return res.status(200).json({
            message: "Quantity updated successfully",
            total: totalPrice,
            quantity: cartProduct.quantity,
            finalPrice,
            discount,
            products: cartData.product,
            productData
        });

    } catch {
        return res.status(500).json({
            message: "Internal Server Error"
        });
>>>>>>> 003d3dd (update ui)
    }
};



const removeProduct = async (req, res) => {
    try {
        const { productId, productPrice } = req.body;

        const cartData = await Cart.findOne({ userId: req.session.user._id });
        if (!cartData) {
            return res.status(404).send("Cart not found");
        }

        const productIndex = cartData.product.findIndex(item => item.productId.toString() === productId);
        if (productIndex === -1) {
            return res.status(404).send("Product not found in cart");
        }

        const quantity = cartData.product[productIndex].quantity;

        await Cart.updateOne(
            { userId: req.session.user._id },
            {
                $pull: { product: { productId } },
                $inc: { totalPrice: -productPrice * quantity }
            }
        );

        return res.status(200).json("Successfully removed from cart");

<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).send("Internal Server Error");
>>>>>>> 003d3dd (update ui)
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

<<<<<<< HEAD



=======
>>>>>>> 003d3dd (update ui)
        return res.render("user/checkout", {
            cartData,
            addressData,
            userData,
            totalPrice,
            couponDiscount,
            walletData,
            walletApplicable,
            codApplicable
        });
<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).send({ success: false, message: "Something went wrong" });
>>>>>>> 003d3dd (update ui)
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

<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).json({ success: false, message: "Something went wrong" });
>>>>>>> 003d3dd (update ui)
    }
};

const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user._id;

        const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
        if (!coupon) {
            return res.status(400).json({ message: 'Invalid or expired coupon code' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(400).json({ message: 'Cart not found' });
        }

        const cartTotal = cart.product.reduce((acc, product) => acc + (product.productPrice * product.quantity), 0);

        if (cartTotal < coupon.minPurchaseAmount) {
            return res.status(400).json({ message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} is required to use this coupon` });
        }

        cart.coupon = couponCode;
        await cart.save();

        return res.json({ message: 'Coupon applied successfully', discountPercentage: coupon.discountPercentage });
<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).send("Internal Server Error");
>>>>>>> 003d3dd (update ui)
    }
};

const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user._id;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(400).json({ message: 'Cart not found' });
        }

        cart.coupon = undefined;
        await cart.save();

        return res.json({ message: 'Coupon removed successfully' });
<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).send("Internal Server Error");
>>>>>>> 003d3dd (update ui)
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