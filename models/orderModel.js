const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    orderId: {
        type: String,
        default: () => {
            return Math.floor(100000 + (Math.random() * 900000)).toString();
        },
        unique: true
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'products',
                required: true
            },
            quantity: {
                type: String,
                required: true
            },
            productPrice: {
                type: Number,
                required: true,
                min: 1
            },
            status: {
                type: String,
                enum: [
                    'Pending',
                    'Processing',
                    'Shipped',
                    'Delivered',
                    'Cancelled',
                    'Return Requested',
                    'Return Approved',
                    'Return Rejected',
                    'Return Cancelled',
                    'Returned'
                ],
                default: 'Pending'
            },
            reason: {
                type: String,
                required: false
            }

        }
    ],
    addressId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'addresses',
        required: true
    },
    payableAmount: {
        type: Number,
        required: true
    },
    returnedAmount: {
        type: Number
    },
    paymentMethod: {
        type: String,
        required: ['COD', 'RazorPay', 'Wallet']
    },
    coupon: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: [
            'Success',
            'Pending',
            'Failed',
            'Cancelled',
            'Refunded'
        ]
    },
    orderDate: {
        type: Date,
        default: Date.now()

    }

},
{ timestamps: true }
);

module.exports = mongoose.model('orders', orderSchema);