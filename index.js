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
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypt: {
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

app.get('/', (req, res) => {
    if (req.session.authenticated) {
        res.redirect("/home");
        return;
    } else {
        let html = `
            <button onclick="window.location='/signup'">Sign up</button>
            <button onclick="window.location='/login'">Log in</button>
        `;
        res.send(html);
    }
});

app.get('/home', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect("/");
        return;
    }

    let username = req.session.username;

    let html = `
            Hello, ${username}!
            <br/>
            <button onclick="window.location='/members'">Go to members area</button>
            <br/>
            <button onclick="window.location='/logout'">Log out</button>
        `;
    res.send(html);
})

app.get('/members', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect("/");
        return;
    }

    let username = req.session.username;
    let img = Math.ceil(Math.random() * 4);

    let html = `
            Hello, ${username}
            <br/>
            <br/>
            <img src="/${img}.jpg" alt="Motivational phrase" style="width: 400px;"/>
            <br/>
            <button onclick="window.location='/logout'">Sign out</button>
        `;
    res.send(html);
});

app.get('/login', (req, res) => {
    let html = `
        Sign up
        <form action='/loginin' method='post'>
            <input name="username" type="text" placeholder="Username"/>
            <input name="password" type="password" placeholder="password"/>
            <button>Submit</button>
        </form>
    `;
    res.send(html);
})

app.get('/signup', (req, res) => {
    let html = `
        Sign up
        <form action='/signin' method='post'>
            <input name="username" type="text" placeholder="Name">
            <input name="email" type="text" placeholder="Email">
            <input name="password" type="password" placeholder="password">
            <button>Submit</button>
        </form>
    `;
    res.send(html);
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
        console.log(validationResult.error);
        res.send(`
            ${validationResult.error}
            <br/>
            <button onclick="window.location='/login'">Log in</button>
        `);
        return;
    } else {
        const result = await userCollection.find({ username: username }).project({ username: 1, password: 1, _id: 1 }).toArray();   

        if (result.length != 1) {
            console.log("User not found")
            res.send(`
                Incorrect user.
                <br/>
                <button onclick="window.location='/login'">Log in</button>
        `   );
            return;
        } else {
            if (await bcrypt.compare(password, result[0].password)) {
                req.session.authenticated = true;
                req.session.username = username;
                req.session.cookie.maxAge = expireTime;

                res.redirect("/home");
            } else {
                console.log("Incorrect password")
                res.send(`
                    Incorrect password.
                    <br/>
                    <button onclick="window.location='/login'">Log in</button>
        `       );
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
        console.log(validationResult.error);
        res.send(`
            ${validationResult.error}
            <br/>
            <button onclick="window.location='/signup'">Sign up</button>
        `);
        return;
    } else {
        req.session.authenticated = true;
        req.session.username = username;

        let hashedPassword = await bcrypt.hash(password, saltRounds);

        await userCollection.insertOne({ username: username, password: hashedPassword });

        console.log("User created");
        res.redirect("/home");

    }
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.send("Error 404 <br/> WHAT ARE YOU DOING HERE?");
});

// Start node
app.listen(port, () => {
    console.log("Node running on port " + port);
});