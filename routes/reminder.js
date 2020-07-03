const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require('path')
const bodyParser = require("body-parser");
const passport = require("passport");
const cron = require("node-cron");
const moment = require("moment");
const nodemailer = require("nodemailer");

//IMPORT SHOPPINGLIST MODEL FOR MONGOOSE DB
const Reminder = require("../models/reminders.js");

function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next()
  } else {
    req.flash('danger', 'Please login to access this page')
    res.redirect('/user_r/login')
  }
}
var transporter = nodemailer.createTransport({
  // service: 'gmail',
  host: "wharfinger.aserv.co.za",
  auth: {
    user: "attorney@brune.co.za",
    pass: "xrK5A^bbV}9JUk[R",
  },
});

// cron.schedule("*/1 * * * *",()=> {
  // console.log('\n')
  // console.log("*** _______________________________________________ ***");
  // console.log("running a task every 5 minutes");
  // console.log("Current Time: " + moment().format("H:mm"));
  // console.log("*** _______________________________________________ ***");
  // console.log('\n')
//   checkForReminders()
// })

function checkForReminders(){
console.log('\n')
console.log("_______________________________________________________");
console.log('\n')
console.log("running a task every 5 minutes");
console.log("*** Current Period: " + moment().format("hh:mm") + " to " + moment().add(5, "minutes").format("hh:mm") + " ***");
console.log("*** Current Time: " + moment().format("hh:mm" + " ***"));

let st = moment().utc(+2).format()
let et = moment().utc(+2).add(5, 'minutes').format()
let querie = { triggerDandT: { $gte: new Date(st), $lte: new Date(et) } }

Reminder.find(querie, (err, docs)=>{
  if(err) {console.log(err)}
  if(docs) {
    if (docs.length === 0) {
        console.log("No Reminders to send for this period");
        console.log("_______________________________________________________");
        console.log('\n')

      } else {
        for (i = 0; i < docs.length; i++) {
          var mailOptions = {
            from: "attorney@brune.co.za",
            to: docs[i].reminderEmail,
            subject: docs[i].reminderSubject,
            text: docs[i].reminderText,
          };
          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.log(error);
              throw err
            }

            })
            console.log(mailOptions);
            console.log("Reminder No: " + docs[i]._id + " sent");
            var currentID = docs[i]._id
            Reminder.findByIdAndDelete(currentID, (err) =>{
              if (err) {
              console.log(`Could not remove Reminder DB entry for _id: ${currentID}.`)
               }

               console.log(`Successfully removed Reminder DB entry for _id: ${currentID}.`)
               console.log("_______________________________________________________");
               console.log('\n');
          })
          if((i + 1) != (docs.length)){console.log('*** not last one ***')}
          if((i + 1) == (docs.length)){console.log('*** last one ***')}
        }
      }

  }
  })
}

router.get("/getReminders",ensureAuthenticated, (req, res) => {

// router.get("/getReminders", (req, res) => {
  // console.log(req.local.user)
  let docs2 = {}
  let newDoc = []
  let newVar = ''
  Reminder.find({}, (err, docs)=>{
    if (!err) {
      for(i=0; i < docs.length; i++){
        docs2._id = docs[i]._id
        docs2.userNumber = docs[i].userNumber
        docs2.reminderSubject = docs[i].reminderSubject
        docs2.reminderText = docs[i].reminderText
        docs2.reminderEmail = docs[i].reminderEmail
        docs2.triggerDandT =  moment(docs[i].triggerDandT).utc().format('D MMMM YYYY [@] hh:mm')
        newDoc.push(docs2)
        docs2 = {}
            }

      obj = {reminders: newDoc}
      res.render("reminderPage", obj);
  }
  else {
      throw err;
  }
  })
});

router.get("/getReminders-D", ensureAuthenticated,(req, res) => {
  // console.log(req.local.user)
  let docs2 = {}
  let newDoc = []
  let newVar = ''
  Reminder.find({}, (err, docs)=>{
    if (!err) {
      // console.log(docs)
      for(i=0; i < docs.length; i++){
        docs2._id = docs[i]._id
        docs2.userNumber = docs[i].userNumber
        docs2.reminderSubject = docs[i].reminderSubject
        docs2.reminderText = docs[i].reminderText
        docs2.reminderEmail = docs[i].reminderEmail
        docs2.triggerDandT =  moment(docs[i].triggerDandT).utc().format('D MMMM YYYY [@] hh:mm')
        newDoc.push(docs2)
        docs2 = {}
            }

      obj = {reminders: newDoc}
      res.render("reminderPage-D", obj);
  }
  else {
      throw err;
  }
  })
});


router.get("/deleteReminder/:id",ensureAuthenticated, (req, res) => {

// router.get("/deleteReminder/:id", (req, res) => {
    Reminder.deleteOne({_id: req.params.id}, (err, result)=>{
      if(err) {
        console.log(err)
      }
    })
    // This flash does not work - is done/faked through seperate getReminders-D VIEW
    req.flash("success", "Reminder has been removed");
    res.redirect("/reminder/getReminders-D/");

})

router.post("/submitNewReminder/",ensureAuthenticated, (req, res) => {

// router.post("/submitNewReminder/", (req, res) => {


  if(res.locals.user != null){userNumber = res.locals.user._id} else {userNumber = '5e902fefe14cca7bb4127ac8'}
  var reminderSubject = req.body.reminderSubject
  var reminderText = req.body.reminderText
  var reminderEmail = req.body.reminderEmail
  let triggerDandT_temp = req.body.reminderDate+' '+req.body.reminderTime+'+02:00'
  let triggerDandT = moment(triggerDandT_temp).utc(+2).format()


  const newReminder = new Reminder({
    _id: new mongoose.Types.ObjectId(),
    userNumber: userNumber,
    reminderSubject: reminderSubject,
    reminderText: reminderText,
    reminderEmail: reminderEmail,
    triggerDandT: triggerDandT
  });

  newReminder
    .save()
    .then(result => {
      req.flash("success", "New reminder has been scheduled");
      res.redirect("/reminder/getReminders/");
    })
    .catch(err => {
      console.log(err);
    });
})


module.exports = router;
