const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Offer = require('../models/offerModel');


const createOffer = async (req, res) => {
    try {
        const categoryData = await Category.find({});
        const productData = await Product.find({});
        return res.render('admin/add_offer', {
            categoryData,
            productData
        });
<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).send('Internal Server Error');
>>>>>>> 003d3dd (update ui)

    }
};

const saveOffer = async (req, res) => {
    try {
        const { name, offerType, discountPercentage, startDate, endDate } = req.body;

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

        const newOffer = new Offer(offerData);
        await newOffer.save();

<<<<<<< HEAD
        // Redirect to the offers list page after successful save
        return res.redirect('/admin/offers');
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
        return res.redirect('/admin/offers');
    } catch {
        return res.status(500).send('Internal Server Error');
>>>>>>> 003d3dd (update ui)
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
<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).send('Internal Server Error');
>>>>>>> 003d3dd (update ui)
    }
};



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
<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).send('Internal Server Error');
>>>>>>> 003d3dd (update ui)
    }
};

const editOffer = async (req, res) => {
    try {
        const offerId = req.params.id;
        const offer = await Offer.findById(offerId);

        if (!offer) {
            return res.status(404).send('Offer not found');
        }

        return res.render('admin/edit_offer', { offer });
<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).send('Internal Server Error');
>>>>>>> 003d3dd (update ui)
    }
};

const updateOffer = async (req, res) => {
    try {
        const { offerId, name, discountPercentage, startDate, endDate } = req.body;

        const offer = await Offer.findById(offerId);

        if (!offer) {
            return res.status(404).send('Offer not found');
        }

        offer.name = name;
        offer.discountPercentage = discountPercentage;
        offer.startDate = new Date(startDate);
        offer.endDate = new Date(endDate);

        await offer.save();
        return res.redirect('/admin/offers');
<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).send('Internal Server Error');
>>>>>>> 003d3dd (update ui)
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

<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).send('Internal Server Error');
>>>>>>> 003d3dd (update ui)
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

        if (offer.product.includes(productId)) {
            return res.status(400).json({ error: 'Product already in offer' });
        }
<<<<<<< HEAD

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
=======
    } catch {
        return res.status(500).json({ error: 'Internal server error' });
>>>>>>> 003d3dd (update ui)
    }
};

const removeOfferProduct = async (req, res) => {
    const { offerId, productId } = req.body;

    try {
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        const productIndex = offer.product.indexOf(productId);
        if (productIndex === -1) {

            return res.status(400).json({ error: 'Product not in offer' });
        } else {
            offer.product.splice(productIndex, 1);
            await offer.save();
            return res.status(200).json({ message: 'Product removed from offer' });
        }
<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).json({ error: 'Internal server error' });
>>>>>>> 003d3dd (update ui)
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

        if (offer.category.includes(categoryId)) {
            return res.status(400).json({ error: 'Category already in offer' });
        }
<<<<<<< HEAD

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
=======
    } catch {
        return res.status(500).json({ error: 'Internal server error' });
>>>>>>> 003d3dd (update ui)
    }
};


const removeOfferCategory = async (req, res) => {
    const { offerId, categoryId } = req.body;

    try {
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        const categoryIndex = offer.category.indexOf(categoryId);
        if (categoryIndex === -1) {
            return res.status(400).json({ error: 'Category not in offer' });
        } else {

            offer.category.splice(categoryIndex, 1); 
            await offer.save();
            return res.status(200).json({ message: 'Category removed from offer' });
        }
<<<<<<< HEAD
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error.message}`);
=======
    } catch {
        return res.status(500).json({ error: 'Internal server error' });
>>>>>>> 003d3dd (update ui)
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