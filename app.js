require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const userRoute = require('./routes/userRoute');
const adminRoute = require('./routes/adminRoute');
const nocache = require('nocache');
const passport = require('passport');
require('./helpers/oauth20');

// const { Session } = require('inspector');



const app = express();
const PORT = process.env.PORT;




// connect to mongodb

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => {
        console.log('Connected to mongodb successfully');
    })
    .catch((err) => {
        console.log(err);
    });

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));



// view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// static folder
app.use(express.static('./public'));


// express parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use(passport.initialize());
app.use(passport.session());

// cache control
app.use(nocache());
// routes
app.use('/', userRoute);

app.use('/admin', adminRoute);

app.get(
    '*', (req, res) => {
        res.render('user/404');
    }
);

// app.get('/error')


app.listen(PORT, () => {
    console.log(`App running on http://sandglass.store`);
});