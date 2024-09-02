const otp = require('../helpers/otp');
const hashing = require('../helpers/passwordHash');
const validate = require('../helpers/validatePassword');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Address = require('../models/addressModel');
const Wishlist = require('../models/wishlistModel');
const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');
// const Offer = require('../models/offerModel');
// const { ResultWithContextImpl } = require('express-validator/lib/chain');

// to load the signup page
const loadSignup = (req, res) => {
    try {
        res.render('user/signup');
    } catch (error) {
        console.log(error.message);
    }
};

// to save the signup credentials in the session storage before otp verification
const insertUser = async (req, res) => {
    try {
        console.log(req.body);
        const { username, email, phone, password } = req.body;

        const checkMail = await User.findOne({
            email
        });
        const checkPhone = await User.findOne({
            phone
        });
        // checks if the credentials are already used

        if (checkPhone && checkMail) {
            res.render('user/signup', {
                message: 'Email and Phone number already exist!'
            });
        } else if (checkMail) {
            res.render('user/signup', {
                message: 'Email already exists!'
            });
        } else if (checkPhone) {
            res.render('user/signup', {
                message: 'Phone number already exists!'
            });
        } else {

            const strongpass = await validate(password);
            console.log(strongpass);
            const hashedPassword = await hashing.hashPassword(password);
            console.log('--password hashing');
            const userData = {
                username,
                email,
                phone,
                password: hashedPassword
            };

            req.session.tempUser = userData;

            // generate otp

            const otpCode = otp.generate();
            req.session.email = email;
            req.session.otp = otpCode;
            req.session.otpExpire = Date.now() + (5 * 60 * 1000);
            console.log('OTP:', req.session.otp);
            await otp.sendOtp(req.session.email, otpCode)
                .then((result) => {
                    res.redirect('/verify');
                    console.log(result);
                })
                .catch((err) => {
                    res.render('user/signup', {
                        message: 'There was an error sending OTP.'
                    });
                    console.log(err);
                });

        }

    } catch (error) {

        console.log(error.message);
    }
};



//  load OTP

const loadVerify = async (req, res) => {
    try {
        res.render('user/verify');
    } catch (error) {
        console.log(error.message);
    }
};

// resend OTP

const resendOtp = async (req, res) => {
    try {
        const otpCode = otp.generate();
        req.session.otp = otpCode;
        console.log(otpCode);
        req.session.otpExpire = Date.now() + (5 * 60 * 1000);
        await otp.sendOtp(req.session.email, req.session.otp)
            .then((result) => {
                console.log(result);
            });
        if (req.session.tempUser) {
            res.redirect('/verify');
        } else {
            res.render('user/verifyForgot');
        }

    } catch (error) {
        console.log('Error in resendOtp', error);

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

            res.redirect('/');


        } else {
            req.session.otp = null;
            req.session.otpExpire = null;
            res.render('user/verify', {
                message: 'Incorrect OTP or expired OTP. Please try again.'
            });
        }
    } catch (error) {
        console.log(error.message);
    }
};



// to load the login page
const loadLogin = (req, res) => {
    try {
        res.render('user/login');
    } catch (error) {
        console.log(error.message);
    }
};


// verify login credentials

const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;


        const userData = await User.findOne({
            email
        });
        if (userData) {
            console.log('email matched');
            if (userData.isActive) {
                const passwordMatch = await hashing.comparePassword(password, userData.password);
                if (passwordMatch) {
                    console.log('password matched');
                    req.session.user = userData;
                    res.redirect('/');
                } else {
                    console.log('Incorrect password');
                    res.render('user/login', {
                        message: 'Incorrect password'
                    });
                }
            } else {
                res.render('user/login', {
                    message: 'You were blocked by Admin'
                });
            }
        } else {
            res.render('user/login', {
                message: 'Incorrect mail'
            });
        }
    } catch (error) {
        console.log(error.message);
    }
};




// to load the home page
const loadHome = async (req, res) => {
    try {
        let userData;
        // Fetch active categories
        const activeCategories = await Category.find({ isActive: true });
        const activeCategoryIds = activeCategories.map(category => category._id);

        // Fetch featured products with active categories and calculate final price
        const featuredProducts = await Product.find({ isActive: true, category: { $in: activeCategoryIds } })
            .sort({ orderCount: -1 })
            .limit(8);
        const featuredWithFinalPrice = await Promise.all(
            featuredProducts.map(async (product) => {
                const finalPrice = await product.getDisplayPrice();
                return { ...product.toObject(), finalPrice }; // Add finalPrice to the product object
            })
        );

        // Fetch new arrival products with active categories and calculate final price
        const newArrivalProducts = await Product.find({ isActive: true, category: { $in: activeCategoryIds } })
            .sort({ _id: -1 })
            .limit(8);
        const newArrivalWithFinalPrice = await Promise.all(
            newArrivalProducts.map(async (product) => {
                const finalPrice = await product.getDisplayPrice();
                return { ...product.toObject(), finalPrice }; // Add finalPrice to the product object
            })
        );

        if (req.session.user) {
            userData = await User.findById(req.session.user._id);
        }

        // Render the home page with user data, featured products, new arrivals, and categories
        res.render('user/home', {
            userData,
            featured: featuredWithFinalPrice,
            newArrival: newArrivalWithFinalPrice,
            categories: activeCategories // Send only active categories to the view
        });

    } catch (error) {
        console.log(`Error loading home page: ${error.message}`);
        res.status(500).send('Internal Server Error');
    }
};



const userLogout = async (req, res) => {
    try {
        req.session.user = null;
        console.log('user logged out');
        res.redirect('/login');
    } catch (error) {
        console.log(error.message);
    }
};




const loadForgotPassword = async (req, res) => {
    try {
        res.render('user/forgotPassword');
    } catch (error) {
        console.log(error.message);
    }
};

const forgotPassword = async (req, res) => {
    try {
        console.log("Entered forgotPassword");

        const mail = req.body.mail;
        const userExists = await User.findOne({ email: mail });
        if (userExists) {
            req.session.email = mail;
            req.session.otp = otp.generate();
            req.session.otpExpire = Date.now() + (5 * 60 * 1000);
            console.log(req.session.otp);
            await otp.sendOtp(mail, req.session.otp)
                .then((result) => {
                    res.render('user/verifyForgot');
                    console.log(result);
                });
        } else {
            res.render('user/forgotPassword', {
                message: "User doesnot exists"
            });
        }


    } catch (error) {
        console.log("Error in forgotPassword", error);

    }
};

const verifyForgotOtp = async (req, res) => {
    try {
        const otp = req.body.otp.trim();
        if (otp === req.session.otp && Date.now() < req.session.otpExpire) {

            res.render('user/setPassword');
        } else {
            res.render('user/verifyForgot',
                { message: 'Entered OTP is wrong or expired' }
            );
        }
    } catch (error) {
        console.log("Error in verifyForgerOtp", error);
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
            res.redirect('/login');
        } else {
            res.render('user/setPassword',
                { message: 'Password mismatch. Try again' }
            );
        }
    } catch (error) {
        console.log("Error in setPassword", error);
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



        // Fetch active categories
        const activeCategories = await Category.find({ isActive: true });
        const activeCategoryIds = activeCategories.map(category => category._id);

        // Update search query to include only products with active categories
        searchQuery.category = { $in: activeCategoryIds };

        if (req.query.category && req.query.category !== 'all-categories') {
            searchQuery.category = categoryFilter;
        }

        const sortOptions = {
            'popularity': { orderCount: -1 },
            "price-low-high": { salePrice: 1 },
            "price-high-low": { salePrice: -1 },
            'featured': { orderCount: -1, _id: -1 },
            "new-arrivals": { _id: -1 },
            "aA-zZ": { productName: 1 },
            "zZ-aA": { productName: -1 }
        };
        const sortBy = req.query.sort || 'new-arrivals';
        const sortCriteria = sortOptions[sortBy] || sortOptions['new-arrivals'];

        // Fetch products and calculate final prices
        const products = await Product.find(searchQuery)
            .populate({
                path: 'category',
                match: { isActive: true }
            })
            .sort(sortCriteria)
            .skip(startIndex)
            .limit(limit);

        // Calculate final prices
        const productsWithFinalPrice = await Promise.all(products.map(async (product) => {
            const finalPrice = await product.getDisplayPrice();
            return { ...product.toObject(), finalPrice };
        }));

        const totalDocuments = await Product.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalDocuments / limit);
        const categories = await Category.find({ isActive: true });
        console.log('Category filter:', categoryFilter);

        res.render("user/shop", {
            products: productsWithFinalPrice,
            categories,
            page,
            totalPages,
            search,
            categoryFilter,
            userData,
            sortBy
        });
    } catch (error) {
        console.log(`Error in shop -- ${error}`);
        res.status(500).send('Server Error');
    }
};



// const productDetails=async(req,res)=>{
//     try {
//         let userData;

//         if (req.session.user){
//             userData=await User.findById(req.session.user._id);
//         };



//         let id=req.query.id;
//         let product=await Product.findById(id);
//         console.log('product:',product);
//         const wishlisted = await Wishlist.findOne({
//             userId: req.session.user._id,
//             'products.productId': product._id
//         });
//         console.log('wishlisted:',wishlisted);
//         if (product) {
//             res.render('user/productDetails',{userData,
//                                             product,
//                                             wishlisted
//                                             })
//         } else {
//             console.log('Error in productDetails:');
//         }

//     } catch (error) {
//         console.log(error.message);
//     }
// }

const productDetails = async (req, res) => {
    try {
        let userData = null;

        // Fetch user data if logged in
        if (req.session.user) {
            userData = await User.findById(req.session.user._id).exec();
        }

        const productId = req.query.id;
        const product = await Product.findById(productId).exec();

        if (!product) {
            console.log('Product not found');
            return res.status(404).render('error', { message: 'Product not found' });
        }

        // Check if the product's category is active
        const category = await Category.findById(product.category).exec();
        if (!category || !category.isActive) {
            console.log('Product category is not active');
            return res.status(404).render('error', { message: 'Product not found' });
        }

        let wishlisted = false;
        if (req.session.user) {
            wishlisted = await Wishlist.findOne({
                userId: req.session.user._id,
                'products.productId': product._id
            }).exec();
            wishlisted = wishlisted ? true : false;
        }

        // Fetch active categories
        const activeCategories = await Category.find({ isActive: true }).select('_id');
        const activeCategoryIds = activeCategories.map(category => category._id);

        // Fetch related products excluding the current product and only include active categories
        const relatedProducts = await Product.find({
            category: { $in: activeCategoryIds },
            isActive: true,
            _id: { $ne: product._id }
        }).sort({ createdAt: -1 }).limit(4);

        // Calculate final price for the current product
        const finalPrice = await product.getDisplayPrice();

        // Calculate final price for each related product
        const relatedProductsWithPrice = await Promise.all(
            relatedProducts.map(async (relatedProduct) => {
                const finalPrice = await relatedProduct.getDisplayPrice();
                return { ...relatedProduct.toObject(), finalPrice };
            })
        );

        console.log('Product:', product);
        console.log('Wishlisted:', wishlisted);

        return res.render('user/productDetails', {
            userData,
            product: { ...product.toObject(), finalPrice }, // Add finalPrice to the product object
            wishlisted,
            relatedProducts: relatedProductsWithPrice // Include finalPrice for related products
        });

    } catch (error) {
        console.error('Error in productDetails:', error.message);
        return res.status(500).render('error', { message: 'Internal Server Error' });
    }
};





const googleSuccess = async (req, res) => {
    try {

        if (req.user) {
            req.session.user = await User.findById(req.user._id);
            res.status(200).redirect('/');
        } else {
            // res.redirect('/failure')
            res.status(404).render('user/login', { message: 'googleSuccess failure' });
        }
    } catch (error) {
        console.log('Error in googleSuccess', error.message);
    }
};

const googleFailure = async (req, res) => {
    try {
        res.status(404).render('user/login', { message: 'You have been blocked by SANDGLASS' });
    } catch (error) {
        console.log('Error in googleFailure', error.message);
    }
};

const profile = async (req, res) => {
    try {

        const userData = await User.findById(req.session.user._id);
        const addressData = await Address.findOne({ userId: req.session.user._id });
        const orderData = await Order.find({ userId: req.session.user._id }).populate('products.productId').sort({ createdAt: -1 });
        const walletData = await Wallet.findOne({ userId: req.session.user._id }).sort({ time: 1 });

        res.render('user/profile', {
            userData,
            addressData,
            orderData,
            walletData

        });
    } catch (error) {
        console.log('Error in profile', error);
    }
};




const editName = async (req, res) => {
    try {
        const userId = req.params.id;
        const newName = req.body.name;
        console.log('Received PUT request:', userId, newName);
        const nameUpdated = await User.findByIdAndUpdate(userId, { $set: { username: newName } }, { new: true });
        if (nameUpdated) {
            console.log('Name updated successfully');
            res.status(200).json({
                message: 'Name updated successfully',
                user: nameUpdated
            });
        } else {
            console.log('User not found');
            res.status(404).json({
                message: 'User not found'
            });
        }
    } catch (error) {
        console.log('Error in editName:', error);
        res.status(500).json({
            message: 'An error occurred while updating the name',
            error: error.message
        });
    }
};

const editPhone = async (req, res) => {
    try {
        const userId = req.params.id;
        const newPhone = req.body.phone;

        console.log('User ID:', userId, 'New Phone:', newPhone);

        const phoneUpdated = await User.findByIdAndUpdate(userId,
            { $set: { phone: newPhone } },
            { new: true } // Return the updated document
        );

        if (phoneUpdated) {
            console.log('Phone number updated successfully');
            res.status(200).json({
                message: 'Phone number updated successfully',
                user: phoneUpdated
            });
        } else {
            console.log('User not found');
            res.status(404).json({
                message: 'User not found'
            });
        }
    } catch (error) {
        console.log('Error in editPhone', error);
        res.status(500).json({
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
        console.error('Error in resetPassword:', error);
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
            fullname,
            billing_address1,
            billing_address2,
            city,
            state,
            pincode,
            phone,
            email
        } = req.body;
        console.log(
            fullname,
            billing_address1,
            billing_address2,
            city,
            state,
            pincode,
            phone,
            email
        );
        console.log(req.session.user._id);
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

        res.redirect("/profile");

    } catch (error) {
        console.log('Error in addAddress', error);
    }
};

const editAddress = async (req, res) => {
    try {
        const { address, addressId } = req.body;
        console.log(`Req.body - ${req.body}`);

        const addressData = await Address.findOne({ userId: req.session.user._id });
        if (addressData) {
            const updateAddress = addressData.address.find(
                (addr) => addr._id.toString() === addressId
            );

            console.log(`the selected address is - ${updateAddress}`);
            if (updateAddress) {
                // Update the fields of the found address
                updateAddress.fullName = address.fullname || updateAddress.fullName;
                updateAddress.addressLine1 = address.billing_address1 || updateAddress.addressLine1;
                updateAddress.addressLine2 = address.billing_address2 || updateAddress.addressLine2;
                updateAddress.city = address.city || updateAddress.city;
                updateAddress.state = address.state || updateAddress.state;
                updateAddress.pincode = address.pincode || updateAddress.pincode;
                updateAddress.phoneNo = address.phoneNo || updateAddress.phoneNo;
                updateAddress.email = address.email || updateAddress.email;
            }
            const newAddress = await addressData.save();
            // console.log("saved", newAddress);
            console.log(`UpdateAddress - ${updateAddress}`);

            if (newAddress) {
                res.status(200).json({ Message: "Successfully updated address" });
            } else {
                res.status(500);
            }
        }

    } catch (error) {
        console.log('Error in editAddress', error);
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.body;
        console.log(`addressId -- ${addressId}`);
        const addressData = await Address.findOne({ userId: req.session.user._id });
        if (addressData) {
            const findAddress = addressData.address.find(
                (addr) => addr._id.toString() === addressId
            );
            const addressIndex = addressData.address.indexOf(findAddress);
            console.log(`index of ${addressIndex}`);
            addressData.address.splice(addressIndex, 1);
            res.status(200).json({ message: "Successfully deleted" });
            addressData.save();
        }
    } catch (error) {
        console.log('Error in deleteAddress', error);
    }
};

const autoComplete = async(req, res) => {
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
            category: item.category.name, // Adjust based on your data structure
            photoUrl: item.productImage[0] // Adjust to the correct path of the product photo
        }));
        res.json(suggestions);
    } catch (error) {
        console.log('Error in autoComplete', error);

    }
};

const loadAbout = async (req, res) => {
    try {
        const userData = await User.findById(req.session.user);
        res.render('user/about', { userData });
    } catch (error) {
        console.log('Error in autoComplete', error);
    }
};
const loadContact = async (req, res) => {
    try {
        const userData = await User.findById(req.session.user);
        res.render('user/contact', { userData });
    } catch (error) {
        console.log('Error in autoComplete', error);
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
    loadAbout
};