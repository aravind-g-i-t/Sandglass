const express = require('express');
const auth = require('../middlewares/userAuth');
const userRoute = express.Router();
const userController = require('../controllers/userController');
const passport = require('passport');
const cartController = require('../controllers/cartController');
const wishlistController = require('../controllers/wishlistController');
const orderController = require('../controllers/orderController');









userRoute.get('/', userController.loadHome);
userRoute.get('/login', auth.isLoggedOut, userController.loadLogin);
userRoute.post('/login', userController.verifyLogin);
userRoute.get('/forgot_password', auth.isLoggedOut, userController.loadForgotPassword);
userRoute.post('/forgotPassword', auth.isLoggedOut, userController.forgotPassword);
userRoute.post('/verify_otp', auth.isLoggedOut, userController.verifyForgotOtp);
userRoute.post('/set_password', auth.isLoggedOut, userController.setPassword);
userRoute.get('/signup', auth.isLoggedOut, userController.loadSignup);
userRoute.post('/signup', userController.insertUser);
userRoute.get('/verify', userController.loadVerify);
userRoute.get('/resend_otp', userController.resendOtp);
userRoute.post('/verify', userController.verifyOtp);

userRoute.get('/logout', userController.userLogout);
userRoute.get('/auth/google', passport.authenticate('google', {
    scope: ['email', 'profile']
}));
userRoute.get('/oauth2/redirect/google', passport.authenticate('google',
    { failureRedirect: '/failure',
        successRedirect: '/success'
    })
);
userRoute.get('/success', userController.googleSuccess);
userRoute.get('/failure', userController.googleFailure);
userRoute.get('/shop', userController.shop);
userRoute.get('/product_details', userController.productDetails);
userRoute.get('/profile', auth.isLoggedIn, userController.profile);
userRoute.get('/wishlist', auth.isLoggedIn, wishlistController.wishlist);
userRoute.get('/cart', auth.isLoggedIn, cartController.loadCart);
userRoute.put('/edit_name/:id', userController.editName);
userRoute.put('/edit_phone/:id', userController.editPhone);
userRoute.put('/reset_password/:id', userController.resetPassword);
userRoute.post('/add_address', userController.addAddress);
userRoute.put('/edit_address', auth.isLoggedIn, userController.editAddress);
userRoute.delete('/delete_address', auth.isLoggedIn, userController.deleteAddress);
userRoute.post('/product/add_to_cart', auth.isLoggedIn, cartController.addToCart);
userRoute.put('/cart/quantity', auth.isLoggedIn, cartController.quantityUpdate);
userRoute.delete('/cart/remove_product', auth.isLoggedIn, cartController.removeProduct);
userRoute.put('/addtowishlist', auth.isLoggedIn, wishlistController.addToWishlist);
userRoute.delete('/removefromwishlist', auth.isLoggedIn, wishlistController.removeFromWishlist);
userRoute.get("/checkout", auth.isLoggedIn, cartController.loadCheckout);
userRoute.post("/checkout", auth.isLoggedIn, cartController.addNewAddress);
userRoute.post('/place-order', auth.isLoggedIn, orderController.placeOrder);
userRoute.get('/order_details', auth.isLoggedIn, orderController.orderDetails);
userRoute.patch('/cancel_order', auth.isLoggedIn, orderController.cancelOrder);
userRoute.patch('/return_order', auth.isLoggedIn, orderController.returnOrder);
userRoute.post("/payment/razorpay", auth.isLoggedIn, orderController.razorPayment);
userRoute.post("/verifypayment", auth.isLoggedIn, orderController.verifyPayment);
userRoute.post('/apply_coupon', auth.isLoggedIn, cartController.applyCoupon);
userRoute.post('/remove_coupon', auth.isLoggedIn, cartController.removeCoupon);
userRoute.get('/autocomplete', userController.autoComplete);
userRoute.get('/invoice/:id', auth.isLoggedIn, orderController.generateInvoice);
module.exports = userRoute;