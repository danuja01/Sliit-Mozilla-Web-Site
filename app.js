const express = require("express");
const bodyParser = require("body-parser");
const mailchimp = require("@mailchimp/mailchimp_marketing");
const alert = require("alert");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mailchimp.setConfig({
  apiKey: "3d180a816a5ccbe653fb1644f4dd9c08-us20",
  server: "us20",
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/", (req, res) => {
  const userEmail = req.body.email;
  const listId = "cc6f91bd54";
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
      res.sendFile(__dirname + "/failure.html");
      console.log(err);
    }
  }

  run();
});

app.get("/failure", (req, res) => {
  res.sendFile(__dirname + "/failure.html");
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server started on port 3000`);
});
