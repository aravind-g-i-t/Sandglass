const bcrypt = require('bcrypt');

const saltRounds = 10;

<<<<<<< HEAD
const hashPassword = async(password) => {
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        return hash;
    } catch (error) {
        console.log(error.message);
    }
};
=======
const hashPassword = async (password) => {
    return await bcrypt.hash(password, saltRounds);
>>>>>>> 003d3dd (update ui)

};

<<<<<<< HEAD
const comparePassword = async(password, hashedPassword) => {
    try {
        const match = await bcrypt.compare(password, hashedPassword);
        return match;
    } catch (error) {
        console.log(error.message);
    }
};
=======
const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
>>>>>>> 003d3dd (update ui)

};

<<<<<<< HEAD



module.exports = {
    hashPassword,
    comparePassword
};
=======
module.exports = {
    hashPassword,
    comparePassword
};
>>>>>>> 003d3dd (update ui)
