const isLoggedIn = async(req, res, next) => {
    try {
        if (req.session.admin) {
            return next();
        } else {
            return res.redirect('/admin');
        }
    } catch (error) {
        console.log(error);
        return res.status(500);
    }
};

const isLoggedOut = async(req, res, next) => {
    try {
        if (req.session.admin) {
            return res.redirect('/admin/dashboard');
        } else {
            return next();
        }
    } catch (error) {
        console.log(error);
        return res.status(500);
    }
};

module.exports = {
    isLoggedIn,
    isLoggedOut
};