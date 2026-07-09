const express = require('express');
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');
const productController = require('../controllers/productController');
const multer = require('../helpers/multer');
const auth = require('../middlewares/adminAuth');
const adminRoute = express.Router();
const offerController = require('../controllers/offerController');
const { validateAdminLogin, handleValidation } = require('../middlewares/validation');



adminRoute.get('/', auth.isLoggedOut, adminController.loadLogin);
adminRoute.post('/', validateAdminLogin, handleValidation("admin"), adminController.adminLogin);
adminRoute.post('/logout', adminController.adminLogout);
adminRoute.get('/dashboard', auth.isLoggedIn, adminController.loadDashboard);
adminRoute.get('/users', auth.isLoggedIn, adminController.loadUsers);
adminRoute.get('/categories', auth.isLoggedIn, categoryController.loadcategories);
adminRoute.post('/categories', auth.isLoggedIn, categoryController.insertCategory);
adminRoute.patch("/categories/:id/status", auth.isLoggedIn, categoryController.statusUpdate);
adminRoute.get('/editCategory', auth.isLoggedIn, categoryController.loadEdit);
adminRoute.patch('/categories/:id', auth.isLoggedIn, categoryController.editCategory);
adminRoute.get('/products', auth.isLoggedIn, productController.loadProducts);
adminRoute.get('/add_product', auth.isLoggedIn, productController.loadAddProduct);
adminRoute.patch('/users/:id/status', auth.isLoggedIn, adminController.userStatusUpdate);
adminRoute.post('/add_product', auth.isLoggedIn, multer, productController.addProduct);
adminRoute.patch('/products/:id/status', auth.isLoggedIn, productController.productStatusUpdate);
adminRoute.get('/products/:id/edit', auth.isLoggedIn, productController.loadEditProduct);
adminRoute.delete('/remove_image', multer, productController.removeImage);
adminRoute.patch('/products/:id', multer, productController.editProduct);
adminRoute.get('/orders', auth.isLoggedIn, adminController.orderList);
adminRoute.get('/order_details', auth.isLoggedIn, adminController.orderDetails);
adminRoute.patch('/update-order-status', auth.isLoggedIn, adminController.updateOrderStatus);
adminRoute.get('/coupons', auth.isLoggedIn, adminController.coupons);
adminRoute.get('/add_coupon', auth.isLoggedIn, adminController.addCoupon);
adminRoute.get('/edit_coupon/:id', auth.isLoggedIn, adminController.editCoupon);
adminRoute.patch('/coupons/:id', auth.isLoggedIn, adminController.updateCoupon);
adminRoute.post('/save_coupon', auth.isLoggedIn, adminController.saveCoupon);
adminRoute.put('/update_coupon_status/:id', auth.isLoggedIn, adminController.updateCouponStatus);
adminRoute.get('/generate_report', auth.isLoggedIn, adminController.generateReport);
adminRoute.get('/create_offer', auth.isLoggedIn, offerController.createOffer);
adminRoute.post('/save_offer', auth.isLoggedIn, offerController.saveOffer);
adminRoute.get('/offers', auth.isLoggedIn, offerController.loadOffersPage);
adminRoute.patch('/toggle_offer_status', auth.isLoggedIn, offerController.toggleOfferStatus);

adminRoute.get('/edit_offer/:id', auth.isLoggedIn, offerController.editOffer);
adminRoute.patch('/offers/:id', auth.isLoggedIn, offerController.updateOffer);
adminRoute.get('/select_items/:id', auth.isLoggedIn, offerController.selectItems);
adminRoute.post('/add_offer_product', auth.isLoggedIn, offerController.addOfferProduct);
adminRoute.post('/remove_offer_product', auth.isLoggedIn, offerController.removeOfferProduct);
adminRoute.post('/add_offer_category', auth.isLoggedIn, offerController.addOfferCategory);
adminRoute.post('/remove_offer_category', auth.isLoggedIn, offerController.removeOfferCategory);


module.exports = adminRoute;