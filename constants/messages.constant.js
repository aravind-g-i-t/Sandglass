const MESSAGES = Object.freeze({



    SERVER_ERROR: "Something went wrong",
    INTERNAL_SERVER_ERROR: "Internal Server Error",
    INVALID_REQUEST: "Invalid request",



    INCORRECT_CREDENTIALS: "Incorrect credentials",
    INCORRECT_PASSWORD: "Incorrect password",
    INCORRECT_MAIL: "Incorrect mail",

    USER_BLOCKED: "You were blocked by Admin",

    OTP_ERROR: "There was an error sending OTP.",
    OTP_INVALID: "Incorrect OTP or expired OTP. Please try again.",
    OTP_WRONG: "Entered OTP is wrong or expired",

    PASSWORD_MISMATCH: "Password mismatch. Try again",
    PASSWORD_RESET_SUCCESS: "Password reset successfully",

    GOOGLE_FAILURE: "googleSuccess failure",

    ACCESS_DENIED: "Access denied",
    UNAUTHORIZED_ACCESS: "Unauthorized access",



    USER_NOT_FOUND: "User not found",

    EMAIL_EXISTS: "Email already exists!",
    PHONE_EXISTS: "Phone number already exists!",
    EMAIL_PHONE_EXISTS: "Email and Phone number already exist!",

    USER_DOES_NOT_EXIST: "User doesnot exists",

    NAME_UPDATED: "Name updated successfully",
    PHONE_UPDATED: "Phone number updated successfully",



    PRODUCT_NOT_FOUND: "Product not found",

    PRODUCT_EXISTS: "Product already exists",

    PRODUCT_OUT_OF_STOCK: "Product is out of stock",

    STOCK_EXCEEDED: "Product stock exceeded",

    NOT_ENOUGH_STOCK: "Not enough stock for product",

    PRODUCT_ADDED: "Product added successfully",

    PRODUCT_REMOVED: "Product removed successfully",

    PRODUCT_NOT_IN_CART: "Product not found in cart",

    PRODUCT_ALREADY_IN_OFFER: "Product already in offer",

    PRODUCT_NOT_IN_OFFER: "Product not in offer",

    IMAGE_REMOVED: "Image removed successfully",

    IMAGE_NOT_FOUND: "Image not found in product",



    CART_NOT_FOUND: "Cart not found",

    QUANTITY_UPDATED: "Quantity updated successfully",

    MAXIMUM_QUANTITY: "Maximum quantity is 10",

    MINIMUM_QUANTITY: "Minimum quantity is 1",

    REMOVED_FROM_CART: "Successfully removed from cart",



    CATEGORY_EXISTS: "Category already exists",

    CATEGORY_NOT_IN_OFFER: "Category not in offer",

    CATEGORY_ALREADY_IN_OFFER: "Category already in offer",



    ORDER_NOT_FOUND: "Order not found",

    ORDER_UPDATED: "Order updated successfully",

    ORDER_CANCELLED: "Successfully Cancelled",

    ORDER_OR_PRODUCT_NOT_FOUND: "Order or Product not found",

    PRODUCT_NOT_IN_ORDER: "Product not found in order",



    PAYMENT_VERIFIED: "Payment verified successfully",

    PAYMENT_FAILED: "Payment failed",

    PAYMENT_VERIFICATION_FAILED: "Payment verification failed",

    PAYMENT_SUCCESS: "Payment done successfully",

    FAILED_TO_CREATE_ORDER: "Failed to create order",



    WALLET_NOT_FOUND: "Wallet not found",



    COUPON_EXISTS: "Code already exists",

    INVALID_COUPON: "Invalid or expired coupon code",

    COUPON_APPLIED: "Coupon applied successfully",

    COUPON_REMOVED: "Coupon removed successfully",



    OFFER_NOT_FOUND: "Offer not found",

    INVALID_OFFER_TYPE: "Invalid offer type",



    ADDRESS_NOT_FOUND: "Address doesnot exist.",

    ADDRESS_UPDATE_FAILED: "Failed to update address.",

    ADDRESS_UPDATED: "Successfully updated address",

    ADDRESS_DELETED: "Successfully deleted",



    FILE_CREATED: "File created successfully",

    FILE_WRITTEN: "File written successfully",

    FILE_READ: "File read successfully",

    FILE_RENAMED: "File renamed successfully",

    FILE_DELETED: "File deleted successfully",



    ALREADY_IN_WISHLIST: "Already added to wishlist",

    LOGIN_TO_WISHLIST: "Log in to add products to wishlist",



    INVALID_REPORT_FORMAT:
        'Invalid format. Supported formats are "pdf" and "excel".',

    REPORT_GENERATION_ERROR:
        'An error occurred while generating the report. Please try again later.',



    INVOICE_ERROR: "Error generating invoice",



    SUCCESS: "Success"
});

module.exports = MESSAGES;