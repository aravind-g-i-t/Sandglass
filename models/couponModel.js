const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true
        },
        description: {
            type: String,
            required: true
        },
        discountPercentage: {
            type: Number,
            required: true
        },
        minPurchaseAmount: {
            type: Number,
            required: true
        },
        quantityLimit: {
            type: Number,
            required: true
        },
        expiryDate: {
            type: Date,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("coupons", couponSchema);