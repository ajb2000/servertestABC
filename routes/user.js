const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
//IMPORT USERS MODEL FOR MONGOOSE DB
const User = require("../models/users");
const passport = require("passport");
//IMPORT SHOPPINGLIST MODEL FOR MONGOOSE DB
const Shoppinglist = require("../models/shoppingList.js");



function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next()
  } else {
    req.flash('danger', 'Please login to access this page')
    res.redirect('/user_r/login')
  }
}

router.get("/login", (req, res) => {
  res.render("login");
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/user_r/login",
    successFlash: 'You are now logged in. Welcome!',
    badRequestMessage: 'Bad username or password',
    failureFlash: true
  })(req, res, next);
});

router.get("/registerNewUser",ensureAuthenticated, (req, res) => {

  res.render("registerNewUser");
});

router.get("/protectedRoute",ensureAuthenticated, (req, res) => {
  obj ={shopItem: [
    {name: 'bread', number: 2, id: '35324213'},
    {name: 'milk', number: 1, id: '234324324'},
    {name: 'beans', number: 3, id: '24234454'}
  ]}
  res.render("protectedRoute", obj);
});

router.get("/admin",ensureAuthenticated, (req, res) => {
  res.render("admin");
});

router.get("/getShoppinglistItems",ensureAuthenticated, (req, res) => {
  Shoppinglist.find({}, (err, docs)=>{
    if (!err) {
      obj = {shopItem: docs}

      res.render("protectedRoute", obj);
  }
  else {
      throw err;
  }
  })

});

router.post("/removeShoppingListItem",ensureAuthenticated, (req, res) => {
  var idsToRemove = req.body
  idsToRemove.forEach((id) =>{
    Shoppinglist.findByIdAndRemove(id, (err, result)=>{
      if(err) console.log(err);
      else console.log(result)
    })
  })
  req.flash("success", "Item(s) have been removed");
  res.redirect("/user_r/getShoppinglistItems/");
})


router.post("/addShoppingListItem",ensureAuthenticated, (req, res) => {
  var item = req.body.item
  var number = req.body.number

  const newItem = new Shoppinglist({
    _id: new mongoose.Types.ObjectId(),
    name: item,
    number: number
  });

  newItem
    .save()
    .then(result => {
      // console.log(result);
      req.flash("success", "New Item has been added");
      res.redirect("/user_r/getShoppinglistItems/");
    })
    .catch(err => {
      console.log(err);
    });

})



router.post(
  "/submitUserInfo",ensureAuthenticated,
  [
    check("userName")
      .notEmpty()
      .withMessage("Name is a required field"),
    check("userName")
      .isLength({ min: 4 })
      .withMessage("Name must be at least 8 characters long"),
    check("userEmail")
      .notEmpty()
      .withMessage("Email is a required field"),
    check("userPassword1")
      .notEmpty()
      .withMessage("Password is a required field"),
    check("userPassword1")
      .isLength({ min: 5 })
      .withMessage("Password must be at least 5 characters long"),
    check("userPassword2").custom((value, { req, loc, path }) => {
      if (value !== req.body.userPassword1) {
        // trow error if passwords do not match
        throw new Error("Passwords don't match");
      } else {
        return value;
      }
    })
  ],
  (req, res) => {
    let errors = validationResult(req);
    // console.log(errors.errors);
    if (errors.errors.length != 0) {
      // console.log("error found");
      res.render("registerNewUser", { errors: errors.array() });
    } else {
      // console.log("no error found");
      const newUser = new User({
        _id: new mongoose.Types.ObjectId(),
        name: req.body.userName,
        email: req.body.userEmail,
        password: req.body.userPassword1
      });

      bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(newUser.password, salt, function(err, hash) {
          if (err) {
            console.log(err);
          }
          newUser.password = hash;
          newUser
            .save()
            .then(result => {
              // console.log(result);
              req.flash("success", "New User has been created and can log in");
              res.redirect("/user_r/login");
            })
            .catch(err => {
              console.log(err);
            });
        });
      });
    }
  }
);
router.get('/logout', function(req, res){
  req.logout();
  req.flash('success', 'You are now logged out');
  res.redirect('/')
})


module.exports = router;
