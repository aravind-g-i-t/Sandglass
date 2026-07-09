const { body, validationResult } = require('express-validator');
const STATUS_CODES = require('../enum/statusCode.enum');

const validateSignup = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required.')
        .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters.')
        .matches(/^[a-zA-Z0-9_. ]+$/).withMessage('Username can only contain letters, numbers, spaces, dots, and underscores.'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email address is required.')
        .isEmail().withMessage('Please enter a valid email address.')
        .normalizeEmail(),
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required.')
        .matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number.'),
    body('password')
        .trim()
        .notEmpty().withMessage('Password is required.')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@$.!%*#?&])/).withMessage('Password must contain uppercase, lowercase, numbers, and special symbols.'),
    body('checkbox')
        .custom((value) => {
            if (value !== 'on' && value !== 'true' && value !== true) {
                throw new Error('You must agree to the terms & policy.');
            }
            return true;
        })
];

const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email address is required.')
        .isEmail().withMessage('Please enter a valid email address.')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required.')
];

const validateForgotPassword = [
    body('mail')
        .trim()
        .notEmpty().withMessage('Email address is required.')
        .isEmail().withMessage('Please enter a valid email address.')
        .normalizeEmail()
];

const validateSetPassword = [
    body('password')
        .trim()
        .notEmpty().withMessage('Password is required.')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@$.!%*#?&])/).withMessage('Password must contain uppercase, lowercase, numbers, and special symbols.'),
    body('password2')
        .trim()
        .notEmpty().withMessage('Confirm password is required.')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match.');
            }
            return true;
        })
];

const validateResetPassword = [
    body('oldPassword')
        .notEmpty().withMessage('Old password is required.'),
    body('newPassword')
        .trim()
        .notEmpty().withMessage('New password is required.')
        .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long.')
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@$.!%*#?&])/).withMessage('New password must contain uppercase, lowercase, numbers, and special symbols.'),
    body('confirmNewPassword')
        .trim()
        .notEmpty().withMessage('Confirm new password is required.')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('New passwords do not match.');
            }
            return true;
        })
];

const validateAddress = [
    body('fullName')
        .trim()
        .notEmpty().withMessage('Full Name is required.')
        .matches(/^[a-zA-Z\s.]+$/).withMessage('Full Name must only contain letters, spaces, or dots.'),
    body('addressLine1')
        .trim()
        .notEmpty().withMessage('Address Line 1 is required.'),
    body('addressLine2')
        .trim()
        .optional({ checkFalsy: true }),
    body('city')
        .trim()
        .notEmpty().withMessage('City is required.')
        .matches(/^[a-zA-Z\s]+$/).withMessage('City must only contain letters and spaces.'),
    body('state')
        .trim()
        .notEmpty().withMessage('State is required.')
        .matches(/^[a-zA-Z\s]+$/).withMessage('State must only contain letters and spaces.'),
    body('pincode')
        .trim()
        .notEmpty().withMessage('Pincode is required.')
        .matches(/^[0-9]{6}$/).withMessage('Please enter a valid 6-digit pincode.'),
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required.')
        .matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number.'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email address is required.')
        .isEmail().withMessage('Please enter a valid email address.')
        .normalizeEmail()
];

const validateAdminLogin = [
    body('adminId')
        .trim()
        .notEmpty().withMessage('Admin ID is required.'),
    body('adminPassword')
        .notEmpty().withMessage('Password is required.')
];

const validateEditName = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required.')
        .isLength({ min: 3, max: 50 }).withMessage('Name must be between 3 and 50 characters.')
        .matches(/^[a-zA-Z\s.]+$/).withMessage('Name can only contain letters, spaces, and dots.')
];

const validateEditPhone = [
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required.')
        .matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number.')
];

const handleValidation = (templateName, apiRoute = false) => {
    return (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMap = errors.mapped();
            const firstErrorMsg = errors.array()[0].msg;

            if (apiRoute) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({
                    success: false,
                    message: firstErrorMsg,
                    errors: errorMap
                });
            } else {
                const oldData = { ...req.body };
                delete oldData.password;
                delete oldData.password2;
                delete oldData.confirmNewPassword;
                delete oldData.adminPassword;

                return res.status(STATUS_CODES.BAD_REQUEST).render(templateName, {
                    message: firstErrorMsg,
                    errors: errorMap,
                    oldData
                });
            }
        }
        return next();
    };
};

module.exports = {
    validateSignup,
    validateLogin,
    validateForgotPassword,
    validateSetPassword,
    validateResetPassword,
    validateAddress,
    validateAdminLogin,
    validateEditName,
    validateEditPhone,
    handleValidation
};
