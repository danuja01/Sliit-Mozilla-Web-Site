const express = require("express");
const bodyParser = require("body-parser");
const mailchimp = require("@mailchimp/mailchimp_marketing");
const ejs = require("ejs");
const alert = require("alert");
const _ = require("lodash");

const app = express();

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv/config");

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API,
  server: process.env.MAILCHIMP_SERVER,
});

mongoose.connect(
  process.env.MONGO_URL,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err) => {
    console.log("connected");
  }
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");

const multer = require("multer");
const { stringify } = require("querystring");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now());
  },
});

const upload = multer({ storage: storage });

const imageSchema = new mongoose.Schema({
  img: {
    data: Buffer,
    contentType: String,
  },
});

Image = new mongoose.model("Image", imageSchema);

const blogSchema = new mongoose.Schema({
  title: String,
  content: String,
  url: String,
  image: imageSchema,
});

Blog = new mongoose.model("Blog", blogSchema);

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
  res.render("compose");
});

app.post("/compose", upload.single("image"), (req, res, next) => {
  const obj = {
    img: {
      data: fs.readFileSync(
        path.join(__dirname + "/uploads/" + req.file.filename)
      ),
      contentType: "image/png",
    },
  };
  Image.create(obj, (err, item) => {
    if (err) {
      console.log(err);
    } else {
      const post = new Blog({
        title: _.capitalize(req.body.title),
        content: _.capitalize(req.body.content),
        url: req.body.url,
        image: obj,
      });
      post.save();
    }
  });
  res.redirect("/");
});

//the POST handler for processing the uploaded file

const port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server started on port 3000");
});
