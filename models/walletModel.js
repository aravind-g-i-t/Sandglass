const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    walletBalance: {
        type: Number,
        default: 0
    },
    transactions: [
        {
            type: {
                type: String,
                enum: ['Credit', 'Debit'],
                required: true
            },
            amount: {
                type: Number,
                required: true
            },
            time: {
                type: Date,
                default: Date.now()
            }
        }
    ]
}, { timestamps: true }
);

module.exports = mongoose.model('wallets', walletSchema);