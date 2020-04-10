const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require('path')
const bodyParser = require("body-parser");
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

router.get("/getShoppinglistItems",ensureAuthenticated, (req, res) => {

  Shoppinglist.find({}, (err, docs)=>{
    if (!err) {
      obj = {shopItem: docs}

      console.log('inside getShoppinglistItems')
      console.log(req.session.flash)


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
      if(err) {
        req.flash("danger", "Item(s) could not be removed");
        // res.redirect("/shoppinglist/getShoppinglistItems/");

        throw err;
      }
      else {
        req.flash("success", "Item(s) have been removed");
        res.redirect("/shoppinglist/getShoppinglistItems/");
      }
    })
  })


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
      req.flash("success", "New Item has been added");
      // console.log(req.session.flash)
      res.redirect("/shoppinglist/getShoppinglistItems/");
    })
    .catch(err => {
      console.log(err);
    });
})


module.exports = router;
