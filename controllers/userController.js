const otp = require('../helpers/otp');
const hashing = require('../helpers/passwordHash');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Address = require('../models/addressModel');
const Wishlist = require('../models/wishlistModel');
const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');
const Cart = require("../models/cartModel");
const validate = require('../helpers/validatePassword');


const loadSignup = (req, res) => {
    try {
        return res.render('user/signup');
    } catch {
        return res.status(500).send('Internal Server Error');

    }
};


const insertUser = async (req, res) => {
    try {
        const { username, email, phone, password } = req.body;

        const checkMail = await User.findOne({
            email
        });
        const checkPhone = await User.findOne({
            phone
        });

        if (checkPhone && checkMail) {
            return res.render('user/signup', {
                message: 'Email and Phone number already exist!'
            });
        }
        if (checkMail) {
            return res.render('user/signup', {
                message: 'Email already exists!'
            });
        }
        if (checkPhone) {
            return res.render('user/signup', {
                message: 'Phone number already exists!'
            });
        }


        await validate(password);
        const hashedPassword = await hashing.hashPassword(password);
        const userData = {
            username,
            email,
            phone,
            password: hashedPassword
        };

        req.session.tempUser = userData;


        const otpCode = otp.generate();
        console.log(otpCode);
        
        req.session.email = email;
        req.session.otp = otpCode;
        req.session.otpExpire = Date.now() + (5 * 60 * 1000);
        await otp.sendOtp(req.session.email, otpCode);
        return res.redirect('/verify');

    } catch {
        return res.render('user/signup', {
            message: 'There was an error sending OTP.'
        });
    }
};


const loadVerify = async (req, res) => {
    try {
        return res.render('user/verify');
    } catch {
        return res.status(500).send('Internal Server Error');

    }
};

// resend OTP

const resendOtp = async (req, res) => {
    try {
        const otpCode = otp.generate();
        console.log(otpCode);
        
        req.session.otp = otpCode;
        req.session.otpExpire = Date.now() + (5 * 60 * 1000);
        await otp.sendOtp(req.session.email, req.session.otp);
        if (req.session.tempUser) {
            return res.redirect('/verify');
        } else {
            return res.render('user/verifyForgot');
        }

    } catch {
        return res.status(500).render('user/verifyForgot', {
            message: "Something went wrong."
        });

    }
};



// verify OTP

const verifyOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        const otp = req.session.otp;
        const otpExpire = req.session.otpExpire;

        if (otp === enteredOtp && Date.now() < otpExpire) {
            req.session.otp = null;
            const userData = new User(req.session.tempUser);

            await userData.save();
            req.session.user = userData;
            const newWallet = new Wallet({
                userId: req.session.user._id,
                walletBalance: 0
            });
            await newWallet.save();

            const wishlistData = new Wishlist({
                userId: req.session.user._id,
                products: []
            });
            await wishlistData.save();

            const cart = new Cart({
                userId: userData._id,
                product: [

                ]
            });
            await cart.save();

            return res.redirect('/');


        } else {
            req.session.otp = null;
            req.session.otpExpire = null;
            return res.render('user/verify', {
                message: 'Incorrect OTP or expired OTP. Please try again.'
            });
        }
    } catch {

        return res.status(500).render('user/verify', {
            message: 'Something went wrong'
        });
    }
};



const loadLogin = (req, res) => {
    try {
        return res.render('user/login');
    } catch {
        return res.status(500).send('Internal Server Error');

    }
};



const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;


        const userData = await User.findOne({
            email
        });
        if (userData) {
            if (userData.isActive) {
                const passwordMatch = await hashing.comparePassword(password, userData.password);
                if (passwordMatch) {
                    req.session.user = userData;
                    return res.redirect('/');
                } else {
                    return res.render('user/login', {
                        message: 'Incorrect password'
                    });
                }
            } else {
                return res.render('user/login', {
                    message: 'You were blocked by Admin'
                });
            }
        } else {
            return res.render('user/login', {
                message: 'Incorrect mail'
            });
        }
    } catch {
        return res.status(500).render('user/login', {
            message: 'Something went wrong'
        });
    }
};




const loadHome = async (req, res) => {
    try {
        let userData;
        const activeCategories = await Category.find({ isActive: true });
        const activeCategoryIds = activeCategories.map(category => category._id);

        const featuredProducts = await Product.find({ isActive: true, category: { $in: activeCategoryIds } })
            .sort({ orderCount: -1 })
            .limit(8);
        const featuredWithFinalPrice = await Promise.all(
            featuredProducts.map(async (product) => {
                const finalPrice = await product.getDisplayPrice();
                return { ...product.toObject(), finalPrice };
            })
        );

        const newArrivalProducts = await Product.find({ isActive: true, category: { $in: activeCategoryIds } })
            .sort({ _id: -1 })
            .limit(8);
        const newArrivalWithFinalPrice = await Promise.all(
            newArrivalProducts.map(async (product) => {
                const finalPrice = await product.getDisplayPrice();
                return { ...product.toObject(), finalPrice };
            })
        );

        if (req.session.user) {
            userData = await User.findById(req.session.user._id);
        }

        return res.render('user/home', {
            userData,
            featured: featuredWithFinalPrice,
            newArrival: newArrivalWithFinalPrice,
            categories: activeCategories
        });

    } catch {
        return res.status(500).send('Internal Server Error');
    }
};



const userLogout = async (req, res) => {
    try {
        req.session.user = null;
        return res.redirect('/login');
    } catch {
        return res.redirect('/login');
    }
};




const loadForgotPassword = async (req, res) => {
    try {
        return res.render('user/forgotPassword');
    } catch {
        return res.status(500).send('Internal Server Error');

    }
};

// eslint-disable-next-line consistent-return
const forgotPassword = async (req, res) => {
    try {

        const mail = req.body.mail;
        const userExists = await User.findOne({ email: mail });
        if (userExists) {
            req.session.email = mail;
            req.session.otp = otp.generate();
            console.log(req.session.otp);
            
            req.session.otpExpire = Date.now() + (5 * 60 * 1000);
            await otp.sendOtp(mail, req.session.otp);
            return res.render('user/verifyForgot');
        } else {
            return res.render('user/forgotPassword', {
                message: "User doesnot exists"
            });
        }


    } catch {
        return res.status(500).render('user/forgotPassword', {
            message: "Something went wrong"
        });

    }
};

const verifyForgotOtp = async (req, res) => {
    try {
        const otp = req.body.otp.trim();
        console.log(otp);
        console.log(req.session);
        
        
        
        if (otp === req.session.otp && Date.now() < req.session.otpExpire) {

            return res.render('user/setPassword');
        } else {
            return res.render('user/verifyForgot',
                { message: 'Entered OTP is wrong or expired' }
            );
        }
    } catch {
        return res.render('user/verifyForgot',
            { message: 'Something went wrong' }
        );
    }
};

const setPassword = async (req, res) => {
    try {
        const password = req.body.password.trim();
        const password2 = req.body.password2.trim();
        if (password === password2) {
            const hashedPassword = await hashing.hashPassword(password);
            await User.findOneAndUpdate({ email: req.session.email },
                { $set: { password: hashedPassword } }
            );
            req.session.email = null;
            req.session.otp = null;
            req.session.otpExpire = null;
            return res.redirect('/login');
        } else {
            return res.render('user/setPassword',
                { message: 'Password mismatch. Try again' }
            );
        }
    } catch {
        return res.status(500).render('user/setPassword',
            { message: 'Something went wrong.' }
        );
    }
};

const shop = async (req, res) => {
    try {
        let userData;
        if (req.session.user) {
            userData = await User.findById(req.session.user._id);
        }

        const page = parseInt(req.query.page, 10) || 1;
        const limit = 9;
        const startIndex = (page - 1) * limit;
        let search = "";
        const categoryFilter = req.query.category || "";

        const searchQuery = { isActive: true };

        if (req.query.search) {
            search = req.query.search.trim();
            searchQuery.productName = new RegExp(search, "i");
        }



        const activeCategories = await Category.find({ isActive: true }).select('_id');
        const activeCategoryIds = activeCategories.map(category => category._id);

        searchQuery.category = { $in: activeCategoryIds };

        if (req.query.category && req.query.category !== 'all-categories') {
            searchQuery.category = categoryFilter;
        }
        searchQuery.stock = { $gt: 0 };

        const sortOptions = {
            'popularity': { orderCount: -1 },
            "price-low-high": { salePrice: 1 },
            "price-high-low": { salePrice: -1 },
            'featured': { orderCount: -1, _id: -1 },
            "new-arrivals": { createdAt: -1 },
            "aA-zZ": { productName: 1 },
            "zZ-aA": { productName: -1 }
        };
        const sortBy = req.query.sort || 'new-arrivals';
        const sortCriteria = sortOptions[sortBy] || sortOptions['new-arrivals'];


        const products = await Product.find(searchQuery)
            .populate({
                path: 'category',
                match: { isActive: true }
            })
            .sort(sortCriteria)
            .skip(startIndex)
            .limit(limit);

        const productsWithFinalPrice = await Promise.all(products.map(async (product) => {
            const finalPrice = await product.getDisplayPrice();
            return { ...product.toObject(), finalPrice };
        }));

        const totalDocuments = await Product.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalDocuments / limit);
        const categories = await Category.find({ isActive: true });

        return res.render("user/shop", {
            products: productsWithFinalPrice,
            categories,
            page,
            totalPages,
            search,
            categoryFilter,
            userData,
            sortBy
        });
    } catch {
        return res.status(500).send('Server Error');
    }
};




const productDetails = async (req, res) => {
    try {
        let userData = null;

        if (req.session.user) {
            userData = await User.findById(req.session.user._id).exec();
        }

        const productId = req.query.id;
        const product = await Product.findById(productId).exec();

        if (!product) {
            return res.status(404).render('error', { message: 'Product not found' });
        }

        const category = await Category.findById(product.category).exec();
        if (!category || !category.isActive) {
            return res.status(404).render('error', { message: 'Product not found' });
        }

        let wishlisted = false;
        if (req.session.user) {
            wishlisted = await Wishlist.findOne({
                "userId": req.session.user._id,
                'products.productId': product._id
            }).exec();
            wishlisted = !!wishlisted;
        }

        const activeCategories = await Category.find({ isActive: true }).select('_id');
        const activeCategoryIds = activeCategories.map(category => category._id);

        const relatedProducts = await Product.find({
            category: { $in: activeCategoryIds },
            isActive: true,
            _id: { $ne: product._id }
        }).sort({ createdAt: -1 }).limit(4);

        const finalPrice = await product.getDisplayPrice();

        const relatedProductsWithPrice = await Promise.all(
            relatedProducts.map(async (relatedProduct) => {
                const finalPrice = await relatedProduct.getDisplayPrice();
                return { ...relatedProduct.toObject(), finalPrice };
            })
        );


        return res.render('user/productDetails', {
            userData,
            product: { ...product.toObject(), finalPrice },
            wishlisted,
            relatedProducts: relatedProductsWithPrice
        });

    } catch {
        return res.status(500).render('error', { message: 'Internal Server Error' });
    }
};





const googleSuccess = async (req, res) => {
    try {

        if (req.user) {
            req.session.user = await User.findById(req.user._id);
            return res.status(200).redirect('/');
        } else {
            return res.status(404).render('user/login', { message: 'googleSuccess failure' });
        }
    } catch {
        return res.status(500).render('user/login', { message: 'Something went wrong' });
    }
};

const googleFailure = async (req, res) => {
    try {
        return res.status(404).render('user/login', { message: 'You have been blocked by SANDGLASS' });
    } catch {

        return res.status(500).render('user/login', { message: 'Something went wrong' });
    }
};

const profile = async (req, res) => {
    try {

        const userData = await User.findById(req.session.user._id);
        const addressData = await Address.findOne({ userId: req.session.user._id });
        const orderData = await Order.find({ userId: req.session.user._id }).populate('products.productId').sort({ createdAt: -1 });
        const walletData = await Wallet.findOne({ userId: req.session.user._id }).sort({ time: 1 });

        return res.render('user/profile', {
            userData,
            addressData,
            orderData,
            walletData

        });
    } catch {
        return res.status(500).send('Internal Server Error');
    }
};




const editName = async (req, res) => {
    try {
        const userId = req.params.id;
        const newName = req.body.name;
        const nameUpdated = await User.findByIdAndUpdate(userId, { $set: { username: newName } }, { new: true });
        if (nameUpdated) {
            return res.status(200).json({
                message: 'Name updated successfully',
                user: nameUpdated
            });
        } else {
            return res.status(404).json({
                message: 'User not found'
            });
        }
    } catch (error) {
        return res.status(500).json({
            message: 'An error occurred while updating the name',
            error: error.message
        });
    }
};

const editPhone = async (req, res) => {
    try {
        const userId = req.params.id;
        const newPhone = req.body.phone;


        const phoneUpdated = await User.findByIdAndUpdate(userId,
            { $set: { phone: newPhone } },
            { new: true } 
        );

        if (phoneUpdated) {
            return res.status(200).json({
                message: 'Phone number updated successfully',
                user: phoneUpdated
            });
        } else {
            return res.status(404).json({
                message: 'User not found'
            });
        }
    } catch (error) {
        return res.status(500).json({
            message: 'An error occurred while updating the phone number',
            error: error.message
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const userId = req.params.id;
        const { oldPassword, newPassword, confirmNewPassword } = req.body;

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: 'New password and confirm new password do not match'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const isMatch = await hashing.comparePassword(oldPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Old password is incorrect'
            });
        }


        user.password = await hashing.hashPassword(newPassword);
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while resetting the password',
            error: error.message
        });
    }
};


const addAddress = async (req, res) => {
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
        // const userData = await User.findById(req.session.user._id);
        // const orderData = await Order.find({ userId: req.session.user._id });

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

        return res.redirect("/profile");

    } catch {

        return res.redirect("/profile");
    }
};

// eslint-disable-next-line consistent-return
const editAddress = async (req, res) => {
    try {
        const { address, addressId } = req.body;

        const addressData = await Address.findOne({ userId: req.session.user._id });
        if (!addressData) {
            return res.status(404).json({ message: "Address doesnot exist." });
        }
        const updateAddress = addressData.address.find(
            (addr) => addr._id.toString() === addressId
        );

        if (!updateAddress) {
            return res.status(404).json({ message: "Address doesnot exist." });
        }


        updateAddress.fullName = address.fullName || updateAddress.fullName;
        updateAddress.addressLine1 = address.addressLine1 || updateAddress.addressLine1;
        updateAddress.addressLine2 = address.addressLine2 || updateAddress.addressLine2;
        updateAddress.city = address.city || updateAddress.city;
        updateAddress.state = address.state || updateAddress.state;
        updateAddress.pincode = address.pincode || updateAddress.pincode;
        updateAddress.phoneNo = address.phoneNo || updateAddress.phoneNo;
        updateAddress.email = address.email || updateAddress.email;

        const newAddress = await addressData.save();

        if (!newAddress) {
            return res.status(500).json({ message: "Failed to update address." });
        }
        return res.status(200).json({ message: "Successfully updated address" });

    } catch (error) {
        return res.status(500).json({ error, message: "Internal server error." });
    }
};

// eslint-disable-next-line consistent-return
const deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.body;
        const addressData = await Address.findOne({ userId: req.session.user._id });
        if (!addressData) {
            return res.status(404).json({ message: "Address doesnot exist." });
        }
        const findAddress = addressData.address.find(
            (addr) => addr._id.toString() === addressId
        );
        const addressIndex = addressData.address.indexOf(findAddress);
        addressData.address.splice(addressIndex, 1);
        await addressData.save();
        return res.status(200).json({ message: "Successfully deleted" });
    } catch (error) {
        return res.status(500).json({ error, message: "Internal server error." });
    }
};

const autoComplete = async (req, res) => {
    try {
        const query = req.query.query;
        const activeCategories = await Category.find({ isActive: true });
        const activeCategoryIds = activeCategories.map(category => category._id);
        const products = await Product.find({
            isActive: true,
            category: { $in: activeCategoryIds },
            productName: new RegExp(query, "i")
        }).limit(3).populate('category');

        const suggestions = products.map(item => ({
            name: item.productName,
            category: item.category.name,
            photoUrl: item.productImage[0]
        }));
        return res.json(suggestions);
    } catch {
        return res.status(500).json({ message: "Internal server error." });


    }
};

const loadAbout = async (req, res) => {
    try {
        const userData = await User.findById(req.session.user);
        return res.render('user/about', { userData });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};
const loadContact = async (req, res) => {
    try {
        const userData = await User.findById(req.session.user);
        return res.render('user/contact', { userData });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const getWalletTransactions = async (req, res) => {
    try {
        const ITEMS_PER_PAGE = 5;
        const userId = req.session.user._id;
        const page = parseInt(req.query.page, 10) || 1;

        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        const totalTransactions = wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions / ITEMS_PER_PAGE);

        const paginatedTransactions = wallet.transactions
            .sort((a, b) => b.time - a.time)
            .slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

        return res.json({
            transactions: paginatedTransactions,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching wallet transactions', error: error.message });
    }
};

module.exports = {
    loadLogin,
    loadSignup,
    insertUser,
    loadVerify,
    resendOtp,
    verifyOtp,
    verifyLogin,
    loadForgotPassword,
    forgotPassword,
    verifyForgotOtp,
    loadHome,
    userLogout,
    shop,
    productDetails,
    googleFailure,
    googleSuccess,
    profile,
    editName,
    editPhone,
    resetPassword,
    addAddress,
    deleteAddress,
    editAddress,
    setPassword,
    autoComplete,
    loadContact,
    loadAbout,
    getWalletTransactions
};