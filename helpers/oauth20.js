const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const User = require('../models/userModel');
const hashing = require('../helpers/passwordHash');
require('dotenv').config();
const Wallet = require('../models/walletModel');

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    if (!user) {
        return done(new Error("User not found!"));
    }
    return done(null, user);
});


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://sandglass.store/oauth2/redirect/google",
    passReqToCallback: true
},
// eslint-disable-next-line max-params
(async (request, accessToken, refreshToken, profile, done) => {
    try {

        let user = await User.findOne({ googleId: profile.id }).exec();
        const newGenPassword = await hashing.hashPassword(
            Math.random().toString()
        );
        console.log(user);
        if (!user) {
            user = await User.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                username: profile.displayName,
                password: newGenPassword
            });
            const newWallet = new Wallet({
                userId: user._id,
                walletBalance: 0
            });
            await newWallet.save();
            console.log('user :', user);
        } if (!user.isActive) {
            return done(null, false, { message: 'User is blocked' });
        }
        return done(null, user);
    } catch (error) {
        console.log(error.message);
    }
})

));