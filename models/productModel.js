const mongoose = require('mongoose');
const Offer = require('./offerModel'); // Adjust the path as necessary

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'categories',
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    salePrice: { // Permanent discount price
        type: Number,
        required: true
    },
    // promoPrice: {
    //     type: Number,
    //     default: null // Use null if no promotion is applied
    // },
    isActive: {
        type: Boolean,
        default: true
    },
    productImage: [
        {
            type: String,
            required: true
        }
    ],
    reviews: {
        ratings: Number,
        comments: String
    },
    stock: {
        type: Number,
        required: true
    },
    orderCount: {
        type: Number,
        default: 0
    }

}, { timestamps: true });

// Method to calculate the display price considering offers
productSchema.methods.getDisplayPrice = async function() {
    const now = new Date();
    let finalPrice = this.salePrice; // Default to salePrice

    // Fetch the active product-specific offer
    const productOffer = await Offer.findOne({
        product: this._id,
        startDate: { $lte: now },
        endDate: { $gte: now },
        offerType: 'product',
        isActive: true
    });

    // Fetch the active category-wide offer
    const categoryOffer = await Offer.findOne({
        category: this.category,
        startDate: { $lte: now },
        endDate: { $gte: now },
        offerType: 'category',
        isActive: true
    });

    // Apply the product-specific offer if it exists
    if (productOffer) {
        finalPrice = this.price - (this.price * (productOffer.discountPercentage / 100));
    }

    // Apply the category-wide offer if no product-specific offer is applied
    if (categoryOffer && !productOffer) {
        finalPrice = this.price - (this.price * (categoryOffer.discountPercentage / 100));
    }

    return finalPrice;
};

module.exports = mongoose.model('products', productSchema);