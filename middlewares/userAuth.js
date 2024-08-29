const User = require('../models/userModel');
const isLoggedIn = async(req, res, next) => {
    try {
        if (req.session.user) {
            const userData = await User.findById(req.session.user._id);
            if (userData && userData.isActive === true) {
                return next();
            } else {
                return res.redirect('/login');
            }
        } else {
            return res.redirect('/login');
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500);
    }
};

const isLoggedOut = async(req, res, next) => {
    try {
        if (req.session.user) {
            const userData = await User.findById(req.session.user._id);
            if (userData && userData.isActive === false) {
                return next();
            } else {
                return res.redirect('/');
            }
        } else {
            return next();
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500);
    }
};

module.exports = {
    isLoggedIn,
    isLoggedOut
};


