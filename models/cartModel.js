const mongoose = require('mongoose');
const cartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
            required: true
        },
        product: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "products",
                    required: true
                },
                productPrice: {
                    type: Number,
                    required: true
                },
                quantity: {
                    type: Number,
                    default: 1
                }
            }
        ],
        coupon: {
            type: String
        }
    }
);

module.exports = mongoose.model('carts', cartSchema);