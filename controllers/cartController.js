/* eslint-disable camelcase */
// const { errorMonitor } = require('nodemailer/lib/xoauth2');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Address = require('../models/addressModel');
const Coupon = require('../models/couponModel');
const Wallet = require('../models/walletModel');

const loadCart = async(req, res) => {
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
        res.render('user/cart', {
            userData,
            cartData,
            couponDiscount,
            totalPrice
        });
    } catch (error) {
        res.status(500).send(`An error occurred: ${error.message}`);
    }
};

// function calculateTotalPrice(cartData, couponDiscount) {
//     let total = 0;
//     cartData.product.forEach(product => {
//         total += product.productPrice * product.quantity;
//     });

//     if (couponDiscount) {
//         total -= total * (couponDiscount / 100);
//     }

//     return total;
// }

const addToCart = async (req, res) => {
    try {
        const productId = req.body.productId;
        const productData = await Product.findById(productId);
        if (!productData) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Calculate the final price using getDisplayPrice
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

        // Update the total price of the cart
        // cart.totalPrice = cart.product.reduce((total, item) => total + item.productPrice * item.quantity, 0);

        await cart.save();
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};



// const quantityUpdate = async (req, res) => {
//     try {
//         console.log("cart qty");
//         let { productId, status } = req.body;
//         console.log( productId, status);
//         let productData = await Product.findById(productId);
//         let cartData = await Cart.findOne({ userId: req.session.user._id });
//         if(status === "UP") {
//             console.log(`status is ${status}`);
//             const productIndex = cartData.product.findIndex((item) =>item.productId.toString() === productId);
//             const findProductStock = productData.stock;
//             console.log(findProductStock);
//             console.log(productIndex);
//             if (productIndex > -1) {
//                 if (cartData.product[productIndex].quantity<findProductStock){
//                     if (cartData.product[productIndex].quantity >= 1 &&cartData.product[productIndex].quantity < 10){

//                         cartData.product[productIndex].quantity += 1;
//                         // cartData.product[productIndex].productPrice =
//                         //   productData.promo_price;
//                     }else{
//                         console.log("quantity out of range");
//                         return res.json({
//                         message: "Max 10",
//                         total: cartData.totalPrice,
//                         // totalGST: cartData.totalPriceGST
//                         });
//                     }
//                 }else{
//                     return res.json({
//                         message: "product exceeded",
//                         total: cartData.totalPrice,
//                         // totalGST: cartData.totalPriceGST
//                     });
//                 }
//             }
//             cartData.totalPrice = cartData.product.reduce((total, item)=>{
//                 return total + item.productPrice * item.quantity;
//             },0);
//             // cartData.totalPriceGST = (cartData.totalPrice + (cartData.totalPrice * 0.12))

//             let total = cartData.totalPrice;
//             console.log('total price:',total);
//             // let totalGST= cartData.totalPriceGST
//             await cartData.save();
//             console.log('quantity updated successfully');
//             res.status(200).json({
//                 message: "quantity updated successfully",
//                 total: total,
//                 // totalGST: totalGST,
//                 products: cartData.product,
//             });
//         }else if (status === "DOWN") {
//             console.log(`status is ${status}`);
//             const productIndex = cartData.product.findIndex(
//             (item) =>item.productId.toString() === productId);
//             console.log(productIndex);
//             if (productIndex > -1) {
//                 if(cartData.product[productIndex].quantity > 1 &&
//                 cartData.product[productIndex].quantity <= 10){
//                     cartData.product[productIndex].quantity -= 1;
//                     // cartData.product[productIndex].productPrice -=
//                     // productData.promo_price;
//                 }else {
//                     console.log("quantity out of range");
//                     return res.json({
//                     message: "Min 1",
//                     total: cartData.totalPrice,
//                     // totalGST: cartData.totalPriceGST
//                     });
//                 }
//             }

//             cartData.totalPrice = cartData.product.reduce(
//             (total, item) => total + item.productPrice * item.quantity,0);

//             // cartData.totalPriceGST = (cartData.totalPrice + (cartData.totalPrice * 0.12))
//             let total = cartData.totalPrice;
//             // let totalGST= cartData.totalPriceGST
//             await cartData.save();
//             console.log('quantity updated successfully');
//             res.status(200)
//                 .json({ message: "quantity updated successfully", total: total });
//         }
//     }catch (error) {
//       console.log(`Error in quantityUpdate -- ${error}`);
//     }
// };

const quantityUpdate = async (req, res) => {
    try {
        const { productId, status } = req.body;

        const productData = await Product.findById(productId);
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
    }
};

// const removeProduct=async(req,res)=>{
//     try {
//         const { productId, productPrice} = req.body;
//         console.log(` productId -- ${productId}`);
//         console.log(` product price -- ${productPrice}`);
//         const cartData=await Cart.findOne({userId:req.session.user._id})
//         const productIndex = cartData.product.findIndex(item => item.productId.toString() === productId);
//         const quantity=cartData.product[productIndex].quantity;
//         await Cart.updateMany(
//                         { userId: req.session.user._id },
//                         { $pull: { product: { productId: productId} } },
//                         { $inc: { totalPrice: -productPrice*quantity } }
//                         );


//         if (!cartData) {
//             console.log(`Cannot find cartData`);
//             return res.status(404).send("Cart not found");
//         } else {
//             console.log(`updated cart -- ${cartData._id}`);
//         }
//         res.status(200).json("Successfully removed from cart");

//     } catch (error) {
//         console.log('Error in removeProduct',error);
//     }
// }

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

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
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
                // If any product is out of stock, redirect back to the cart page
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
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};


const addNewAddress = async(req, res) => {
    try {
        const {
            fullname,
            billing_address1,
            billing_address2,
            city,
            state,
            pincode,
            phone,
            email
        } = req.body;

        let addressData = await Address.findOne({ userId: req.session.user._id });
        // const userData = await User.findById(req.session.user._id);
        // const orderData = await Order.find({ userId: req.session.user._id });

        if (addressData) {
            addressData.address.push({
                fullName: fullname,
                addressLine1: billing_address1,
                addressLine2: billing_address2,
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
                        fullName: fullname,
                        addressLine1: billing_address1,
                        addressLine2: billing_address2,
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

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const applyCoupon = async(req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user._id;

        // Check if coupon exists and is valid
        const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
        if (!coupon) {
            return res.status(400).json({ message: 'Invalid or expired coupon code' });
        }

        // Fetch user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(400).json({ message: 'Cart not found' });
        }

        // Assuming you want to check for other conditions like min purchase amount, etc.
        const cartTotal = cart.product.reduce((acc, product) => acc + (product.productPrice * product.quantity), 0);

        if (cartTotal < coupon.minPurchaseAmount) {
            return res.status(400).json({ message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} is required to use this coupon` });
        }

        // Apply coupon to cart
        cart.coupon = couponCode;
        await cart.save();

        return res.json({ message: 'Coupon applied successfully', discountPercentage: coupon.discountPercentage });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const removeCoupon = async(req, res) => {
    try {
        const userId = req.session.user._id;

        // Fetch user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(400).json({ message: 'Cart not found' });
        }

        // Remove the coupon
        cart.coupon = undefined;
        await cart.save();

        return res.json({ message: 'Coupon removed successfully' });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
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