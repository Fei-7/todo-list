require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const mongoose = require("mongoose")
const passport = require("passport")
const LocalStrategy = require("passport-local")
const bcrypt = require("bcrypt")
const session = require("express-session")

const saltRounds = 10
const mongodbURI = "mongodb://0.0.0.0:27017/"

const app = express()

app.use(express.static(__dirname + "/public"))
app.set("view engine", "ejs")
app.use(bodyParser.urlencoded({extended: true}))
app.use(passport.initialize())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}))
app.use(passport.authenticate('session'))

mongoose.connect(mongodbURI + "todoUser")
    .then(() => {
        console.log("mongodb connected")
    })
    .catch((err) => {
        console.log(err)
    })

const itemSchema = new mongoose.Schema({
    name: String
})

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    items: [itemSchema]
})

const Item = new mongoose.model("Item", itemSchema)
const User = new mongoose.model("User", userSchema)

passport.use(new LocalStrategy((username, password, cb) => {
    User.findOne({username: username})
        .then((foundUser) => {
            if (!foundUser) {
                return cb(null, false, {message: 'Incorrect username or password.'})
            }

            bcrypt.compare(password, foundUser.password)
                .then((pass) => {
                    if (!pass) {
                        return cb(null, false, {message: 'Incorrect username or password.'})
                    }
                    return cb(null, foundUser)
                })
                .catch((err) => {
                    return cb(err)
                })
        })
}))

passport.serializeUser(function(user, cb) {
    process.nextTick(() => {
        cb(null, { id: user.id, username: user.username })
    })
})
  
passport.deserializeUser((user, cb) => {
    process.nextTick(function() {
        return cb(null, user);
    })
})

app.get("/", (req, res) => {
    res.render("home")
})

app.get("/register", (req, res) => {
    res.render("register")
})

app.get("/login", (req, res) => {
    res.render("login")
})

app.post("/register", (req, res) => {
    const username = req.body.username
    const password = req.body.password

    bcrypt.hash(password, saltRounds)
        .then((hash) => {
            const newUser = new User({
                username: username,
                password: hash,
                items: []
            })
            newUser.save()
                .then(() => {
                    res.redirect("/list")
                })
        })
        .catch((err) => {
            console.log(err)
            res.redirect("/")
        })
    
})

app.post("/login", passport.authenticate("local", {
    successRedirect: "/list",
    failureRedirect: "/login"
}))

app.get("/list", (req, res) => {
    if (!req.isAuthenticated()) {
        res.redirect("/")
    }

    console.log(req.user)

    User.findById(req.user.id)
        .then((user) => {
            console.log(user)
            res.render("list", {
                username: user.username,
                items: user.items
            })
        })
        .catch((err) => {
            console.log(err)
            res.render(err)
        })

})

app.post("/add", (req, res) => {
    if (!req.isAuthenticated()) {
        res.redirect("/")
        return
    }

    User.findById(req.user.id)
        .then((user) => {
            const newTask = new Item({
                name: req.body.task
            })
            user.items.push(newTask)
            user.save()
                .then(() => {
                    res.redirect("/list")
                })
                .catch((err) => {
                    console.log(err)
                    res.render(err)
                })
        })
})

app.post("/delete", (req, res) => {
    if (!req.isAuthenticated) {
        res.redirect("/")
        return
    }

    User.findById(req.user.id)
        .then((user) => {
            user.items = user.items.filter((e) => e._id != req.body.itemId)
            user.save().then(() => res.redirect("/list"))
        })
})

app.listen(3000, () => {
    console.log("Server started at port 3000")
})