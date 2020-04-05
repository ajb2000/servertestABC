const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require('path')
const bodyParser = require("body-parser");

const Shoppinglist = require("../models/shoppinglist");
const passport = require("passport");


function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next()
  } else {
    req.flash('danger', 'Please login to access this page')
    res.redirect('/user_r/login')
  }
}

// View Shopping List

// Add New Item To Shopping Listening

// Remove Item From shopping listen

// Clear Entire Shopping LIst


module.exports = router;
