const express = require("express");
const bodyParser = require("body-parser");
const mailchimp = require("@mailchimp/mailchimp_marketing");
const ejs = require("ejs");
const alert = require("alert");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

require("dotenv/config");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API,
  server: process.env.MAILCHIMP_SERVER,
});

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(
  process.env.MONGO_URL,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err) => {
    console.log("connected");
  }
);

const blogSchema = new mongoose.Schema({
  title: String,
  content: String,
  url: String,
  image: String,
});

const userSchema = new mongoose.Schema({
  username: String,
  googleId: String,
});

userSchema.plugin(passportLocalMongoose);

Blog = new mongoose.model("Blog", blogSchema);
User = new mongoose.model("User", userSchema);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      // callbackURL: "http://localhost:3000/auth/google/compose",
      callbackURL: "https://sliitmcc.herokuapp.com/auth/google/compose",
    },
    function (accessToken, refreshToken, email, done) {
      User.findOne(
        { googleId: email.id, username: email.emails[0].value },
        function (err, user) {
          if (err) {
            return done(err);
          }
          //No user was found... so create a new user with values from Facebook (all the profile. stuff)
          else {
            //found user. Return
            return done(err, user);
          }
        }
      );
    }
  )
);

app.get("/", (req, res) => {
  Blog.find(
    {},
    {
      _id: 0,
    },
    { sort: { _id: -1 } },
    function (err, items) {
      res.render("index", { blog: items });
    }
  );
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

app.get(
  "/auth/google/compose",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/compose");
  }
);

app.get("/contact_us", (req, res) => {
  res.render("contact_us");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/invaliduser", (req, res) => {
  res.render("invaliduser");
});

app.post("/", (req, res) => {
  const userEmail = req.body.email;
  const listId = process.env.MAILCHIMP_LIST_ID;
  const subscribingUser = {
    email: userEmail,
  };

  async function run() {
    try {
      const response = await mailchimp.lists.addListMember(listId, {
        email_address: subscribingUser.email,
        status: "subscribed",
      });
      alert(" Succesfully Subscribed!");
      res.redirect("/");
    } catch (err) {
      res.render("failure");
      console.log(err.status);
    }
  }

  run();
});

app.get("/compose", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("compose");
  } else {
    res.redirect("/login");
  }
});

app.post("/compose", (req, res) => {
  const post = new Blog({
    title: _.capitalize(req.body.title),
    content: _.capitalize(req.body.content),
    url: req.body.url,
    image: req.body.image,
  });
  post.save((err) => {
    if (!err) {
      res.redirect("/");
    } else {
      console.log(err);
    }
  });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/compose",
    failureRedirect: "/invaliduser",
    session: true,
  })
);

//the POST handler for processing the uploaded file

const port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server started on port 3000");
});
