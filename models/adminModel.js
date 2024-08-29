const mongoose = require('mongoose');
const adminSchema = new mongoose.Schema({
    adminId: {
        type: String,
        required: true
    },
    adminPassword: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('admins', adminSchema);