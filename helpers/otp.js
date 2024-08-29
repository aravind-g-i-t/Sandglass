const generateOtp = require('otp-generator');
const nodemailer = require('nodemailer');
require('dotenv').config();

const generate = () => {
    const otp = generateOtp.generate(4, {
        length: 4,
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false
    });
    return otp;
};

const sendOtp = (email, otp) => {
    return new Promise((resolve, reject) => {
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

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("transporter error ", err);
                reject(err);
            } else {
                console.log(`Email sent:${info.response}`);
                resolve(info);
            }
        });
    });
};

module.exports = {
    generate,
    sendOtp
};