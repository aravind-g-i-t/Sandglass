const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Offer = require('../models/offerModel');
// const User = require('../models/userModel');


const createOffer = async(req, res) => {
    try {
        const categoryData = await Category.find({});
        const productData = await Product.find({});
        return res.render('admin/add_offer', {
            categoryData,
            productData
        });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);

    }
};

const saveOffer = async (req, res) => {
    try {
        const { name, offerType, discountPercentage, startDate, endDate } = req.body;

        // Validate offerType
        if (!['category', 'product'].includes(offerType)) {
            return res.status(400).send('Invalid offer type');
        }

        const offerData = {
            name,
            offerType,
            discountPercentage,
            startDate,
            endDate
        };

        // Create the new offer
        const newOffer = new Offer(offerData);
        await newOffer.save();

        // Redirect to the offers list page after successful save
        return res.redirect('/admin/offers');
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};


const loadOffersPage = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offers = await Offer.find()
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('category', 'name')
            .populate('product', 'productName')
            .sort({ createdAt: -1 });

        const totalOffers = await Offer.countDocuments();
        const totalPages = Math.ceil(totalOffers / limit);

        // Fetch all products and categories
        const products = await Product.find();
        const categories = await Category.find();

        return res.render('admin/offers', {
            offers,
            products,
            categories,
            totalPages,
            currentPage: Number(page)
        });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

// const loadProductsForOffer = async (req, res) => {
//     try {
//         const { offerId } = req.query;
//         const products = await Product.find().populate('category', 'name');
//         res.render('partials/productModal', { products });
//     } catch (error) {
//         console.log('Error loading products:', error);
//         res.status(500).send('Internal Server Error');
//     }
// };

// const loadCategoriesForOffer = async (req, res) => {
//     try {
//         const { offerId } = req.query;
//         const categories = await Category.find();
//         res.render('partials/categoryModal', { categories });
//     } catch (error) {
//         console.log('Error loading categories:', error);
//         res.status(500).send('Internal Server Error');
//     }
// };

const toggleOfferStatus = async (req, res) => {
    try {
        const { offerId } = req.body;
        const offer = await Offer.findById(offerId);

        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }

        offer.isActive = !offer.isActive; // Toggle status
        await offer.save();

        return res.status(200).json({ success: true, newStatus: offer.isActive });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const editOffer = async(req, res) => {
    try {
        const offerId = req.params.id;
        const offer = await Offer.findById(offerId);

        if (!offer) {
            return res.status(404).send('Offer not found');
        }

        return res.render('admin/edit_offer', { offer });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const updateOffer = async(req, res) => {
    try {
        const { offerId, name, discountPercentage, startDate, endDate } = req.body;

        const offer = await Offer.findById(offerId);

        if (!offer) {
            return res.status(404).send('Offer not found');
        }

        // Update the offer details except for the offerType
        offer.name = name;
        offer.discountPercentage = discountPercentage;
        offer.startDate = new Date(startDate);
        offer.endDate = new Date(endDate);

        await offer.save();
        return res.redirect('/admin/offers');
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};


const selectItems = async(req, res) => {
    try {
        const offerId = req.params.id;
        const products = await Product.find({});
        const productsWithFinalPrice = await Promise.all(products.map(async (product) => {
            const finalPrice = await product.getDisplayPrice();
            return { ...product.toObject(), finalPrice };
        }));
        const categories = await Category.find({});
        const offer = await Offer.findById(offerId);
        if (offer.offerType === 'product') {
            return res.render('admin/select_products', {
                offerId,
                products: productsWithFinalPrice,
                offer
            });
        } else {
            return res.render('admin/select_categories', {
                offerId,
                categories,
                offer
            });
        }

    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const addOfferProduct = async (req, res) => {
    const { offerId, productId } = req.body;

    try {
        // Find the offer by offerId
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        // Check if the product is already in the offer
        if (offer.product.includes(productId)) {
            return res.status(400).json({ error: 'Product already in offer' });
        }

        // Find other offers that include this product
        const otherOffers = await Offer.find({ product: productId });

        // Remove the product from other offers
        // eslint-disable-next-line prefer-const
        for (let otherOffer of otherOffers) {
            otherOffer.product = otherOffer.product.filter(p => p.toString() !== productId.toString());
            await otherOffer.save();
        }

        // Add the product to the new offer
        offer.product.push(productId);
        await offer.save();

        return res.status(200).json({ message: 'Product added to offer, and any existing offers were removed.' });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const removeOfferProduct = async (req, res) => {
    const { offerId, productId } = req.body;

    try {
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        // Check if the product is in the offer
        const productIndex = offer.product.indexOf(productId);
        if (productIndex === -1) {

            return res.status(400).json({ error: 'Product not in offer' });
        } else {
            offer.product.splice(productIndex, 1); // Remove product from array
            await offer.save();
            return res.status(200).json({ message: 'Product removed from offer' });
        }
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

const addOfferCategory = async (req, res) => {
    const { offerId, categoryId } = req.body;

    try {
        // Find the offer by offerId
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        // Check if the category is already in the offer
        if (offer.category.includes(categoryId)) {
            return res.status(400).json({ error: 'Category already in offer' });
        }

        // Find other offers that include this category
        const otherOffers = await Offer.find({ category: categoryId });

        // Remove the category from other offers
        // eslint-disable-next-line prefer-const
        for (let otherOffer of otherOffers) {
            otherOffer.category = otherOffer.category.filter(c => c.toString() !== categoryId.toString());
            await otherOffer.save();
        }

        // Add the category to the new offer
        offer.category.push(categoryId);
        await offer.save();

        return res.status(200).json({ message: 'Category added to offer, and any existing offers were removed.' });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};


const removeOfferCategory = async (req, res) => {
    const { offerId, categoryId } = req.body;

    try {
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        // Check if the category is in the offer
        const categoryIndex = offer.category.indexOf(categoryId);
        if (categoryIndex === -1) {
            return res.status(400).json({ error: 'Category not in offer' });
        } else {

            offer.category.splice(categoryIndex, 1); // Remove category from array
            await offer.save();
            return res.status(200).json({ message: 'Category removed from offer' });
        }
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
    }
};

module.exports = {
    createOffer,
    saveOffer,
    loadOffersPage,
    toggleOfferStatus,
    editOffer,
    updateOffer,
    selectItems,
    addOfferProduct,
    removeOfferProduct,
    addOfferCategory,
    removeOfferCategory

};