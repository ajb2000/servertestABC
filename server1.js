const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();
var cors = require("cors");
const path = require("path");
const fetch = require("node-fetch");
const handlebars = require("handlebars");
const hbs = require("hbs");
const helpers = require("handlebars-helpers")();
// const PdfPrinter = require("pdfmake");
const flash = require("express-flash");
const session = require("express-session");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const passport = require("passport");

//IMPORT USERS MODEL FOR MONGOOSE DB
const User = require("./models/users.js");

//IMPORT SHOPPINGLIST MODEL FOR MONGOOSE DB
const Shoppinglist = require("./models/shoppingList.js");

// IMPORT FUNCTIONS FROM CHECKFORREMINDERS.JS IN /accountVerification
const checkForReminders = require("./config/checkForReminders.js");
checkForReminders();

// CONNECT TO MONGO DB
let url =
  "mongodb+srv://admin:(mongodb)@cluster0-jnx5f.mongodb.net/test?retryWrites=true&w=majority";

// Connect to Mongo
mongoose
  .connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// IMPORTING CUSTOM SCRIPTS FROM JS FILES
// const reworkTheData = require("./js/testing.js");
// const formutateDocDefinition = require("./js/docDefinition");

//RAW DATA (HERE FROM JS FILE)
// var dataIncomming = require("./js/data.js");

// REGISTER NEW CUSTOM HANDLEBARS HELPER
hbs.registerHelper("test", function (v1, v2, options) {
  if (v1 == v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.use("/email-imgs", express.static("email-imgs"));
app.use("/css", express.static("css"));
app.use("/js", express.static("js"));
app.use(express.static("./public"));

// HANDLEBARS
hbs.registerPartials(__dirname + "/views/partials");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// SESSIONS MIDDLEWARE
app.use(
  session({
    secret: "keyboard cat",
    resave: true,
    saveUninitialized: true,
  })
);

// EXPRESS EXPRESS-FLASH MIDDLEWARE

app.use(flash());

// PASSPORT CONFIG
require("./config/passport")(passport);
//PASSPORT MIDDLEWARE
app.use(passport.initialize());
app.use(passport.session());

// SET GLOBAL USER OBJECT
app.get("*", function (req, res, next) {
  res.locals.user = req.user || null;
  next();
});
app.post("*", function (req, res, next) {
  res.locals.user = req.user || null;
  next();
});

//serves main html files
app.get("/test", function (req, res) {
  // res.render("testView.hbs");
  res.sendFile(path.join(__dirname, 'slideshow.html'))
  console.log("Main Landing Page Served");
});

//serves the OTP html files
app.get("/otptest", function (req, res) {
  // res.render("testView.hbs");
  res.sendFile(path.join(__dirname, 'otp.html'))
  console.log("Main Landing Page Served");
});

//// ROUTES
//SETTING UP THE ROUTE FOR THE /USERS ROUTE
let user_r = require("./routes/user");
app.use("/user_r", user_r);

//SETTING UP THE ROUTE FOR THE /FILEUPLOAD ROUTE
let fileupload = require("./routes/fileupload");
app.use("/fileupload", fileupload);

//SETTING UP THE ROUTE FOR THE /SHOPPINSLIST ROUTE
let shoppinglist = require("./routes/shoppinglist");
app.use("/shoppinglist", shoppinglist);

//SETTING UP THE ROUTE FOR THE /EMAIL ROUTE
let email = require("./routes/email");
app.use("/email", email);

//SETTING UP THE ROUTE FOR THE /REMINDER ROUTE
let reminder = require("./routes/reminder");
app.use("/reminder", reminder);

//SETTING UP THE ROUTE FOR THE /OTP ROUTE
let otp = require("./routes/otp");
app.use("/otp", otp);

//HOME ROUTE
app.get("/", (req, res) => {
  res.render("landingPage");
});

//ROUTE FOR TESTING THE FLASH MESSAGING
app.get("/redirect", (req, res) => {
  req.flash("danger", "Data has been successfully updated!");
  res.redirect("/");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
