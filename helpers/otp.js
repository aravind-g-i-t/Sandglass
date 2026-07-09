const generateOtp = require('otp-generator');
const nodemailer = require('nodemailer');
require('dotenv').config();

const generate = () => {
    const otp = generateOtp.generate(4, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false
    });
    console.log(otp);
    return otp;

};

const sendOtp = async (email, otp) => {
    console.log(process.env.EMAIL, process.env.PASSWORD);

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "OTP for your Timeless Account",
            text: `Your One Time Password for Timeless is ${otp}`
        };

        const info = await transporter.sendMail(mailOptions);


        return info;
    } catch (error) {
        console.log(error);

        throw new Error("Failed to sent otp");
    }



};

module.exports = {
    generate,
    sendOtp
};