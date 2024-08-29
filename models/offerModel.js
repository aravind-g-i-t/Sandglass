const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'categories',
        default: null
    },
    product: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'products',
        default: null
    },
    discountPercentage: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    offerType: {
        type: String,
        enum: ['category', 'product'],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('offers', offerSchema);
