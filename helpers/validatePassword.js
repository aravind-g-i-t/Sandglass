const {check}=require('express-validator');

const validate=async(password)=>{
    try {
        console.log(password);
        await check(password)
        .isLength({ min: 8 })
        .withMessage("Password should be at least 8 characters long")
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z\d@$.!%*#?&]/)
        .withMessage(
          "Password must contain uppercase, lowercase, numbers, and special symbols"
        );

    } catch (error) {
        console.log(error.message);
    }
}

module.exports=validate;