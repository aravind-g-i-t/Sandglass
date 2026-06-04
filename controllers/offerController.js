const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Offer = require('../models/offerModel');
const MESSAGES = require("../constants/messages.constant");
const STATUS_CODES = require('../enum/statusCode.enum');



const createOffer = async (req, res) => {
    try {
        const categoryData = await Category.find({});
        const productData = await Product.find({});
        return res.render('admin/add_offer', {
            categoryData,
            productData
        });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);

    }
};

const saveOffer = async (req, res) => {
    try {
        const { name, offerType, discountPercentage, startDate, endDate } = req.body;

        if (!['category', 'product'].includes(offerType)) {
            return res.status(STATUS_CODES.BAD_REQUEST).send('Invalid offer type');
        }

        const offerData = {
            name,
            offerType,
            discountPercentage,
            startDate,
            endDate
        };

        const newOffer = new Offer(offerData);
        await newOffer.save();

        return res.redirect('/admin/offers');
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
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

        const products = await Product.find();
        const categories = await Category.find();

        return res.render('admin/offers', {
            offers,
            products,
            categories,
            totalPages,
            currentPage: Number(page)
        });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};



const toggleOfferStatus = async (req, res) => {
    try {
        const { offerId } = req.body;
        const offer = await Offer.findById(offerId);

        if (!offer) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.OFFER_NOT_FOUND });
        }

        offer.isActive = !offer.isActive;
        await offer.save();

        return res.status(STATUS_CODES.OK).json({ success: true, newStatus: offer.isActive });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

const editOffer = async (req, res) => {
    try {
        const offerId = req.params.id;
        const offer = await Offer.findById(offerId);

        if (!offer) {
            return res.status(STATUS_CODES.NOT_FOUND).send(MESSAGES.OFFER_NOT_FOUND);
        }

        return res.render('admin/edit_offer', { offer });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

const updateOffer = async (req, res) => {
    try {
        const { name, discountPercentage, startDate, endDate } = req.body;
        const { id } = req.params;

        const offer = await Offer.findById(id);

        if (!offer) {
            return res.status(STATUS_CODES.NOT_FOUND).send(MESSAGES.OFFER_NOT_FOUND);
        }

        offer.name = name;
        offer.discountPercentage = discountPercentage;
        offer.startDate = new Date(startDate);
        offer.endDate = new Date(endDate);

        await offer.save();
        return res.status(200).json({
            success: true,
            message: 'Offer updated successfully'
        });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.INTERNAL_SERVER_ERROR
        });
    }
};


const selectItems = async (req, res) => {
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

    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

const addOfferProduct = async (req, res) => {
    const { offerId, productId } = req.body;

    try {
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ error: MESSAGES.OFFER_NOT_FOUND });
        }

        if (offer.product.includes(productId)) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: 'Product already in offer' });
        }

        const otherOffers = await Offer.find({ product: productId });

        // eslint-disable-next-line prefer-const
        for (let otherOffer of otherOffers) {
            otherOffer.product = otherOffer.product.filter(p => p.toString() !== productId.toString());
            await otherOffer.save();
        }

        offer.product.push(productId);
        await offer.save();

        return res.status(STATUS_CODES.OK).json({ message: 'Product added to offer, and any existing offers were removed.' });
    } catch (error) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(`An error occurred: ${error.message}`);
    }
};

const removeOfferProduct = async (req, res) => {
    const { offerId, productId } = req.body;

    try {
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ error: MESSAGES.OFFER_NOT_FOUND });
        }

        const productIndex = offer.product.indexOf(productId);
        if (productIndex === -1) {

            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: 'Product not in offer' });
        } else {
            offer.product.splice(productIndex, 1);
            await offer.save();
            return res.status(STATUS_CODES.OK).json({ message: 'Product removed from offer' });
        }
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
};

const addOfferCategory = async (req, res) => {
    const { offerId, categoryId } = req.body;

    try {
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ error: MESSAGES.OFFER_NOT_FOUND });
        }

        if (offer.category.includes(categoryId)) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: 'Category already in offer' });
        }

        const otherOffers = await Offer.find({ category: categoryId });

        // eslint-disable-next-line prefer-const
        for (let otherOffer of otherOffers) {
            otherOffer.category = otherOffer.category.filter(c => c.toString() !== categoryId.toString());
            await otherOffer.save();
        }

        offer.category.push(categoryId);
        await offer.save();

        return res.status(STATUS_CODES.OK).json({ message: 'Category added to offer, and any existing offers were removed.' });
    } catch (error) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(`An error occurred: ${error.message}`);
    }
};


const removeOfferCategory = async (req, res) => {
    const { offerId, categoryId } = req.body;

    try {
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ error: MESSAGES.OFFER_NOT_FOUND });
        }

        const categoryIndex = offer.category.indexOf(categoryId);
        if (categoryIndex === -1) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: 'Category not in offer' });
        } else {

            offer.category.splice(categoryIndex, 1);
            await offer.save();
            return res.status(STATUS_CODES.OK).json({ message: 'Category removed from offer' });
        }
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
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