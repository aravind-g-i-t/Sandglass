const bcrypt = require('bcrypt');

const saltRounds = 10;

const hashPassword = async(password) => {
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        return hash;
    } catch (error) {
        console.log(error.message);
    }
};


const comparePassword = async(password, hashedPassword) => {
    try {
        const match = await bcrypt.compare(password, hashedPassword);
        return match;
    } catch (error) {
        console.log(error.message);
    }
};





module.exports = {
    hashPassword,
    comparePassword
};