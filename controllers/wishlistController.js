
const User = require('../models/userModel');
const Wishlist = require('../models/wishlistModel');
const MESSAGES = require("../constants/messages.constant");
const STATUS_CODES = require('../enum/statusCode.enum');



const wishlist = async (req, res) => {
    try {
        const userData = await User.findById(req.session.user._id);
        const wishlistData = await Wishlist.findOne({ userId: req.session.user._id }).populate("products.productId");

        await Promise.all(wishlistData.products.map(async item => {
            item.finalPrice = await item.productId.getDisplayPrice();
        }));

        return res.status(STATUS_CODES.OK).render('user/wishlist', {
            userData,
            wishlistData
        });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);

    }
};

const addToWishlist = async (req, res) => {
    try {
        const productId = req.body.productId;
        if (req.session.user) {
            let wishlistData = await Wishlist.findOne({
                userId: req.session.user._id
            });
            if (wishlistData) {
                const productCheck = wishlistData.products.find(p => p.productId.toString() === productId);
                if (productCheck) {
                    return res.status(STATUS_CODES.OK).json({ message: MESSAGES.ALREADY_IN_WISHLIST });
                } else {
                    wishlistData.products.unshift({ productId });
                    await wishlistData.save();
                }
            } else {
                wishlistData = new Wishlist({
                    userId: req.session.user._id,
                    products: [{ productId }]
                });
                await wishlistData.save();
            }
            return res.status(STATUS_CODES.OK).json({ message: MESSAGES.SUCCESS });
        } else {
            return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: "Log in to add products to wishlist" });
        }
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: "An error occurred" });
    }
};


const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        const wishlistData = await Wishlist.findOneAndUpdate({ userId: req.session.user._id }, { $pull: { products: { productId } } });
        if (wishlistData) {
            return res.status(STATUS_CODES.OK).json({ message: 'Successfully removed from wishlist' });
        } else {
            return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: 'Product not found' });
        }

    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};


module.exports = {
    wishlist,
    addToWishlist,
    removeFromWishlist
};