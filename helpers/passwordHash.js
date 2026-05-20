const bcrypt = require('bcrypt');

const saltRounds = 10;

const hashPassword = async (password) => {
    return await bcrypt.hash(password, saltRounds);

};

const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);

};

module.exports = {
    hashPassword,
    comparePassword
};
