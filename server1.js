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
const PdfPrinter = require("pdfmake");
const flash = require("express-flash");
const session = require("express-session");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const passport = require("passport");

//IMPORT USERS MODEL FOR MONGOOSE DB
const User = require("./models/users.js");

// CONNECT TO MONGO DB
let url =
  "mongodb+srv://admin:(mongodb)@cluster0-jnx5f.mongodb.net/test?retryWrites=true&w=majority";

// Connect to Mongo
mongoose
  .connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// IMPORTING CUSTOM SCRIPTS FROM JS FILES
const reworkTheData = require("./js/testing.js");
const formutateDocDefinition = require("./js/docDefinition");

//RAW DATA (HERE FROM JS FILE)
var dataIncomming = require("./js/data.js");

// REGISTER NEW CUSTOM HANDLEBARS HELPER
hbs.registerHelper("test", function(v1, v2, options) {
  if (v1 == v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use("/pictures", express.static("pictures"));
app.use("/css", express.static("css"));
app.use("/js", express.static("js"));
app.use(express.static('./public'));

// HANDLEBARS
hbs.registerPartials(__dirname + "/views/partials");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// SESSIONS MIDDLEWARE
app.use(
  session({
    secret: "keyboard cat",
    resave: true,
    saveUninitialized: true
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
app.get('*', function(req, res, next){
  res.locals.user = req.user || null;
  next();
})
app.post('*', function(req, res, next){
  res.locals.user = req.user || null;
  next();
})

//// ROUTES
//SETTING UP THE ROUTE FOR THE /USERS ROUTE
let user_r = require("./routes/user");
app.use("/user_r", user_r);

//SETTING UP THE ROUTE FOR THE /FILEUPLOAD ROUTE
let fileupload = require("./routes/fileupload");
app.use("/fileupload", fileupload);


//HOME ROUTE
app.get("/", (req, res) => {
  res.render("landingPage");
});

//ROUTE FOR TESTING THE FLASH MESSAGING
app.get("/redirect", (req, res) => {
  req.flash("danger", "Data has been successfully updated!");
  res.redirect("/");
});

app.get("/downloadPdf", (req, res) => {
  var newData = reworkTheData(dataIncomming);
  var docDefinition = formutateDocDefinition(newData);

  var fonts = {
    Roboto: {
      normal: "fonts/Roboto-Regular.ttf",
      bold: "fonts/Roboto-Bold.ttf"
    }
  };
  var options = {};

  var printer = new PdfPrinter(fonts);

  var pdfDoc = printer.createPdfKitDocument(docDefinition, options);
  var stream = pdfDoc.pipe(fs.createWriteStream("Ratios_PDF1.pdf"));
  // Waiting for stream for finish before sending the file
  stream.on("close", function() {
    console.log("PDF file writing done, sending PDF file to browser now!");
    res.download(path.join(__dirname, "Ratios_PDF1.pdf"));
  });
  pdfDoc.end();
});

app.get("/test", function(req, res, next) {
  console.log('*** "/test" route called ***');
  fs.readFile(__dirname + "/text_file.txt", "utf8", function(err, data) {
    if (err) {
      console.log(err);
    }
    obj = {};
    obj["text"] = data;
    console.log(obj);
    console.log("*** sending json data(in an object) data ***");
    res.send(obj);
  });
});

app.get("/test1", function(req, res) {
  console.log('*** "/test1" route called ***');
  fs.readFile(__dirname + "/text_file.txt", "utf8", function(err, data) {
    console.log("*** sending string data ***");
    res.send(data);
  });
});

app.get("/test2", function(req, res) {
  console.log('*** "/test2" route called ***');
  fs.readFile(__dirname + "/text_file.txt", "utf8", function(err, data) {
    console.log("*** sending json data ***");
    res.json(data);
  });
});

// Connecting to DB
const knex = require("knex")({
  client: "pg",
  connection: {
    host: "stampy.db.elephantsql.com",
    user: "rsjliwci",
    password: "F8CJsZMJyk4HjvHirRSY5aavwwYoRmTd",
    database: "rsjliwci"
  }
});

app.get("/employeelist/:id", function(req, res, next) {
  knex("empperinftable")
    .where({
      employerid: req.params.id
    })
    .select(
      "employeeid",
      "name",
      "surname",
      "status",
      "idnumber",
      "address",
      "jobtitle",
      "iddocument",
      "workpermit",
      "contractofemployment",
      "contractofemployment_blank"
    )
    .orderBy("surname")
    .then(function(result) {
      app.render(
        "partials/employeeList.hbs",
        { employees: result },
        (err, html) => {
          if (err) return console.error(err);
          res.send({ html: html });
        }
      );
    });
});

app.get("/misconducttype", function(req, res, next) {
  knex("disciplinarycodetable")
    .distinct("misconducttype")
    .select()
    .then(function(result) {
      console.log(result);
    });
});

app.get("/getAppointmentData", (req, res) => {
  fetch("https://next.json-generator.com/api/json/get/NJ_jPtRbd")
    .then(response => {
      return response.json();
    })
    .then(myJson => {
      return myJson;
    })
    .then(myJson => {
      console.log(myJson)
      res.render("view2", { appointments: myJson });
    });
});

app.get("/getAppointmentData1", (req, res) => {
  fetch("https://next.json-generator.com/api/json/get/EyNBLxlGd")
    .then(response => {
      return response.json();
    })
    .then(myJson => {
      res.send(myJson);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
