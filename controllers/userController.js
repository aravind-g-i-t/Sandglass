/* eslint-disable camelcase */
const otp = require('../helpers/otp');
const hashing = require('../helpers/passwordHash');
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
        return res.render('user/signup');
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

// to save the signup credentials in the session storage before otp verification
// eslint-disable-next-line consistent-return
const insertUser = async (req, res) => {
    try {
        const { username, email, phone, password } = req.body;

        const checkMail = await User.findOne({
            email
        });
        const checkPhone = await User.findOne({
            phone
        });
        // checks if the credentials are already used

        if (checkPhone && checkMail) {
            return res.render('user/signup', {
                message: 'Email and Phone number already exist!'
            });
        } else if (checkMail) {
            return res.render('user/signup', {
                message: 'Email already exists!'
            });
        } else if (checkPhone) {
            return res.render('user/signup', {
                message: 'Phone number already exists!'
            });
        } else {

            const hashedPassword = await hashing.hashPassword(password);
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
            await otp.sendOtp(req.session.email, otpCode)
                .then((result) => {
                    return res.redirect('/verify');
                })
                .catch((err) => {
                    return res.render('user/signup', {
                        message: err.message
                    });
                });

        }
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};



//  load OTP

const loadVerify = async (req, res) => {
    try {
        return res.render('user/verify');
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

// resend OTP

const resendOtp = async (req, res) => {
    try {
        const otpCode = otp.generate();
        req.session.otp = otpCode;
        req.session.otpExpire = Date.now() + (5 * 60 * 1000);
        await otp.sendOtp(req.session.email, req.session.otp);
        // .then((result) => {
        //     console.log(result);
        // });
        if (req.session.tempUser) {
            return res.redirect('/verify');
        } else {
            return res.render('user/verifyForgot');
        }

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);

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

            return res.redirect('/');


        } else {
            req.session.otp = null;
            req.session.otpExpire = null;
            return res.render('user/verify', {
                message: 'Incorrect OTP or expired OTP. Please try again.'
            });
        }
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};



// to load the login page
const loadLogin = (req, res) => {
    try {
        return res.render('user/login');
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
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
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
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
        return res.render('user/home', {
            userData,
            featured: featuredWithFinalPrice,
            newArrival: newArrivalWithFinalPrice,
            categories: activeCategories // Send only active categories to the view
        });

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};



const userLogout = async (req, res) => {
    try {
        req.session.user = null;
        return res.redirect('/login');
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};




const loadForgotPassword = async (req, res) => {
    try {
        return res.render('user/forgotPassword');
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
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
            req.session.otpExpire = Date.now() + (5 * 60 * 1000);
            await otp.sendOtp(mail, req.session.otp)
                .then((result) => {
                    return res.render('user/verifyForgot');
                });
        } else {
            return res.render('user/forgotPassword', {
                message: "User doesnot exists"
            });
        }


    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);

    }
};

const verifyForgotOtp = async (req, res) => {
    try {
        const otp = req.body.otp.trim();
        if (otp === req.session.otp && Date.now() < req.session.otpExpire) {

            return res.render('user/setPassword');
        } else {
            return res.render('user/verifyForgot',
                { message: 'Entered OTP is wrong or expired' }
            );
        }
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
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
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
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
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
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
            return res.status(404).render('error', { message: 'Product not found' });
        }

        // Check if the product's category is active
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


        return res.render('user/productDetails', {
            userData,
            product: { ...product.toObject(), finalPrice }, // Add finalPrice to the product object
            wishlisted,
            relatedProducts: relatedProductsWithPrice // Include finalPrice for related products
        });

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};





const googleSuccess = async (req, res) => {
    try {

        if (req.user) {
            req.session.user = await User.findById(req.user._id);
            return res.status(200).redirect('/');
        } else {
            // res.redirect('/failure')
            return res.status(404).render('user/login', { message: 'googleSuccess failure' });
        }
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const googleFailure = async (req, res) => {
    try {
        return res.status(404).render('user/login', { message: 'You have been blocked by SANDGLASS' });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
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
            { new: true } // Return the updated document
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

        return res.redirect("/profile");

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

// eslint-disable-next-line consistent-return
const editAddress = async (req, res) => {
    try {
        const { address, addressId } = req.body;

        const addressData = await Address.findOne({ userId: req.session.user._id });
        if (addressData) {
            const updateAddress = addressData.address.find(
                (addr) => addr._id.toString() === addressId
            );

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

            if (newAddress) {
                return res.status(200).json({ Message: "Successfully updated address" });
            } else {
                return res.status(500);
            }
        }

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

// eslint-disable-next-line consistent-return
const deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.body;
        const addressData = await Address.findOne({ userId: req.session.user._id });
        if (addressData) {
            const findAddress = addressData.address.find(
                (addr) => addr._id.toString() === addressId
            );
            const addressIndex = addressData.address.indexOf(findAddress);
            addressData.address.splice(addressIndex, 1);
            addressData.save();
            return res.status(200).json({ message: "Successfully deleted" });
        }
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
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
        return res.json(suggestions);
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);

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