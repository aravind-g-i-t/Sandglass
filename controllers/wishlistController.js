
const User = require('../models/userModel');
const Wishlist = require('../models/wishlistModel');



const wishlist = async (req, res) => {
    try {
        const userData = await User.findById(req.session.user._id);
        const wishlistData = await Wishlist.findOne({ userId: req.session.user._id }).populate("products.productId");
        await Promise.all(wishlistData.products.map(async item => {
            item.finalPrice = await item.productId.getDisplayPrice();
        }));

        return res.render('user/wishlist', {
            userData,
            wishlistData
        });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);

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
                    return res.status(200).json({ message: 'Already added to wishlist' });
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
            return res.status(200).json({ message: "Success" });
        } else {
            return res.status(500).json({ message: "Log in to add products to wishlist" });
        }
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};


const removeFromWishlist = async (req, res) => {
    try {
        const productId = req.body.productId;

        const wishlistData = await Wishlist.findOneAndUpdate({ userId: req.session.user._id }, { $pull: { products: { productId } } });
        if (wishlistData) {
            return res.status(200).json({ message: 'Successfully removed from wishlist' });
        } else {
            return res.status(500).json({ message: 'Product not found' });
        }

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};


module.exports = {
    wishlist,
    addToWishlist,
    removeFromWishlist
};