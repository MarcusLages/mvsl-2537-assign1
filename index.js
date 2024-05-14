// IMPORTS AND CONFIGS
require("./utils.js");
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const Joi = require('joi');

// INITIALIZING EXPRESS
const app = express();

// SESSION AND DATABASE CONSTANTS
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

// OTHER CONSTANTS
const port = process.env.PORT || 3000;
const saltRounds = 12;
const expireTime = 24 * 60 * 60 * 1000;

// Connect to the database
var { database } = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}?retryWrites=true&w=majority&appName=assign1`,
    crypto: {
        secret: mongodb_session_secret
    }
});

// Express session configuration
app.use(session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true
}));

// EXTRA CONFIGS
app.use(express.urlencoded({ extended: false }));

// APPLY EJS
app.set('view engine', 'ejs');

// AUTHENTICATION
function isValidSession(req) {
    if (req.session.authenticated)
        return true;
    return false;
}

function sessionValidation(req, res, next) {
    if (isValidSession(req))
        next();
    else
        res.redirect('/');
}

function isValidUser(req, res, next) {
    if (isValidSession(req))
        res.redirect('/home');
    else
        next();

}

// AUTHORIZATION
function isAdmin(req) {
    if (req.session.user_type == 'admin')
        return true;
    return false;
}

function adminAuthorization(req, res, next) {
    if (isAdmin(req))
        next();
    else {
        // Forbidden access status code
        res.status(403);
        res.render('errorMessage', { error: "User not authorized" });
        return;
    }
}

app.get('/', isValidUser, (req, res) => {
    res.render('index');
});

app.get('/home', sessionValidation, (req, res) => {
    res.render('home', {username: req.session.username});
})

app.get('/members', sessionValidation, (req, res) => {
    let username = req.session.username;
    let img = ['1.jpg', '2.jpg', '3.jpg'];

    res.render('members', {username: username, img: img});
});

app.get('/login', (req, res) => {
    res.render('login');
})

app.get('/signup', (req, res) => {
    res.render('signup');
})

app.post('/loginin', async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    const schema = Joi.object({
        username: Joi.string().alphanum().max(20).required(),
        password: Joi.string().required()
    });

    const validationResult = schema.validate({ username, password });

    if (validationResult.error != null) {
        let error = validationResult.error.message;
        console.log(error);
        res.render("accountError", {error: error, path: "/login", button: "Log in"});
        return;
    } else {
        const result = await userCollection.find({ username: username }).project({ username: 1, password: 1, user_type: 1, _id: 1 }).toArray();

        if (result.length != 1) {
            console.log("User not found");
            res.render("accountError", {error: "User not found", path: "/login", button: "Log in"});
            return;
        } else {
            if (await bcrypt.compare(password, result[0].password)) {
                req.session.authenticated = true;
                req.session.username = username;
                req.session.cookie.maxAge = expireTime;
                
                if (result[0].user_type)
                    req.session.user_type = result[0].user_type;
                else {
                    req.session.user_type = 'user';
                    await userCollection.updateOne({username: username}, {$set: {user_type: 'user'}});
                }

                console.log(req.session.user_type);

                res.redirect("/home");
            } else {
                console.log("Incorrect password");
                res.render("accountError", {error: "Incorrect password", path: "/login", button: "Log in"});
            }
        }
    }
});

app.post('/signin', async (req, res) => {
    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;

    const schema = Joi.object({
        username: Joi.string().alphanum().max(20).required(),
        email: Joi.string().max(30).required(),
        password: Joi.string().max(20).required()
    });

    const validationResult = schema.validate({ username, email, password });

    if (validationResult.error != null) {
        let error = validationResult.error.message;
        console.log(error);
        res.render("accountError", {error: error, path: "/signup", button: "Sign up"});
        return;
    } else {
        req.session.authenticated = true;
        req.session.username = username;
        req.session.cookie.maxAge = expireTime;
        req.session.user_type = 'user';

        let hashedPassword = await bcrypt.hash(password, saltRounds);

        await userCollection.insertOne({ username: username, password: hashedPassword, user_type: 'user' });

        console.log("User created");
        res.redirect("/home");

    }
});

app.get('/admin', sessionValidation, adminAuthorization, async (req, res) => {
    const result = await userCollection.find().project({username: 1, user_type: 1, _id: 1}).toArray();
    res.render('admin', {users: result});
});

app.post('/changePermission', async (req, res) => {
    let permission = req.body.permission;
    let username = req.body.username;
    
    await userCollection.updateOne({username: username}, {$set: {user_type: permission}});

    res.redirect('/admin');
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.render("404");
});

// Start node
app.listen(port, () => {
    console.log("Node running on port " + port);
});