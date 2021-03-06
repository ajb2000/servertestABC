const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const passport = require("passport");
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

//IMPORT MODELS FOR MONGOOSE DB
const User = require("../models/users");
const Shoppinglist = require("../models/shoppingList.js");
const Useractivation = require("../models/userActivation.js");

// FUNCTION FOR PROTECTED ROUTES
function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next()
  } else {
    req.flash('danger', 'Please login to access this page')
    res.redirect('/user_r/login')
  }
}

function ensureActivated(req, res, next){
  console.log(res.locals.user.isActivated)
   if(res.locals.user.isActivated === true){
   return next()
   } else {
     req.flash('danger', 'Please Activate this account before logging in')
     res.redirect('/user_r/login')
   }
}

//initialize userSideUuid & serverSideUuid
let userSideUuid = ''
let serverSideUuid = ''

// SETUP NODEMAILER
var transporter = nodemailer.createTransport({
  // service: 'gmail',
  host: 'wharfinger.aserv.co.za',
  auth: {
  user: 'attorney@brune.co.za',
  pass: 'xrK5A^bbV}9JUk[R'
  }
});

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

router.get("/registerNewUser",ensureAuthenticated, ensureActivated,(req, res) => {
  res.render("registerNewUser");
});

router.get("/admin",ensureAuthenticated, (req, res) => {
  res.render("admin");
});

router.post("/submitUserInfo",ensureAuthenticated,
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
        throw new Error("Passwords don't match");
      } else {
        return value;
      }
    })
  ],
  (req, res) => {
    let errors = validationResult(req);
    if (errors.errors.length != 0) {
      res.render("registerNewUser", { errors: errors.array() });
    } else {
      const newUser = new User({
        _id: new mongoose.Types.ObjectId(),
        name: req.body.userName,
        email: req.body.userEmail,
        password: req.body.userPassword1,
        idAdmin: false,
        isActivated: false
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
              // START ACCOUNT ACTIVATION PROCESS
              let serverSideUuid = result._id
              let userSideUuid = uuidv4()
              // console.log(serverSideUuid);
              // console.log(userSideUuid);
              const newUserActivation = new Useractivation({
                _id: new mongoose.Types.ObjectId(),
                serverSideUuid: serverSideUuid,
                userSideUuid: userSideUuid
              })
              newUserActivation
              .save()
              .then(result => {
                console.log(`New account activation started for userSideUuid:${userSideUuid} and serverSideUuid: ${serverSideUuid}`)
                // SET EMAIL OPTIONS
                let uniqueUUID = userSideUuid
                var mailOptions = {
                      from: 'WebApp <attorney@brune.co.za>',
                      to: newUser.email,
                      subject: 'Account Activation Link',
                      html: activationEmailBody1+userSideUuid+activationEmailBody2
                    };
                console.log(mailOptions)
                // SEND ACTIVATION EMAIL TO user_r
                transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                } else {
                  console.log('Activation email sent to: ' + newUser.email);
                }
              });
              })
              .catch(err => console.log(err))
              // END ACCOUNT ACTIVATION PROCESS
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

function removeUsedUserActivation(id) {
 Useractivation.findByIdAndRemove(id, (err) =>{
   if (err) {
   console.log(`Could not remove Useractivation DB entry for _id: ${id}`)
    }
    console.log(`Successfully removed Useractivation DB entry for _id: ${id}.`)
 })
}

router.get("/accountVerification/:id", (req, res) => {
  const query = {userSideUuid: req.params.id}
  Useractivation.findOne(query, function(err, entry) {
    if (err) {
      console.log(err)
      req.flash("danger", "Unable to activate account");
      res.redirect("/");
    }
    if (entry === null) {
      console.log(`Entry for userSideUuid: ${req.params.id} not found in Acount Verification DB`)
      req.flash("danger", "Unable to activate account");
      res.redirect("/");
    } else {
      const filter = {_id: entry.serverSideUuid}
      const update = {isActivated: true}
      User.findOneAndUpdate(filter,update, { new: true }, (err , updatedUser)=>{
        if (err) {
        console.log("Something wrong when updating data!");
        req.flash("danger", "Unable to activate account");
        res.redirect("/");
        }
        console.log(`Successfully updated user: ${updatedUser}.`)
        removeUsedUserActivation(entry._id)
        req.flash("success", `Account for user: ${updatedUser.name}, activated Successfully`);
        res.redirect("/");
      })
    }
  })
});

router.get('/logout', function(req, res){
  req.logout();
  req.flash('success', 'You are now logged out');
  res.redirect('/')
})

// ACCOUNT ACTIVATION EMAIL

let activationEmailBody1 = `<!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"> <head> <meta charset="utf-8"/> <meta name="viewport" content="width=device-width"/> <meta http-equiv="X-UA-Compatible" content="IE=edge"/> <meta name="x-apple-disable-message-reformatting"/> <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no"/> <meta name="color-scheme" content="light"/> <meta name="supported-color-schemes" content="light"/> <title></title><!--[if gte mso 9]> <xml> <o:OfficeDocumentSettings> <o:AllowPNG/> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings> </xml><![endif]--><!--[if mso]> <style>*{font-family: sans-serif !important;}</style><![endif]--> <style>/* What it does: Tells the email client that only light styles are provided but the client can transform them to dark. A duplicate of meta color-scheme meta tag above. */ :root{color-scheme: light; supported-color-schemes: light;}/* What it does: Remove spaces around the email design added by some email clients. */ /* Beware: It can remove the padding / margin and add a background color to the compose a reply window. */ html, body{margin: 0 auto !important; padding: 0 !important; height: 100% !important; width: 100% !important;}/* What it does: Stops email clients resizing small text. */ *{-ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;}/* What it does: Centers email on Android 4.4 */ div[style*="margin: 16px 0"]{margin: 0 !important;}/* What it does: forces Samsung Android mail clients to use the entire viewport */ #MessageViewBody, #MessageWebViewDiv{width: 100% !important;}/* What it does: Stops Outlook from adding extra spacing to tables. */ table, td{mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important;}/* What it does: Fixes webkit padding issue. */ table{border-spacing: 0 !important; border-collapse: collapse !important; table-layout: fixed !important; margin: 0 auto !important;}/* What it does: Uses a better rendering method when resizing images in IE. */ img{-ms-interpolation-mode: bicubic;}/* What it does: Prevents Windows 10 Mail from underlining links despite inline CSS. Styles for underlined links should be inline. */ a{text-decoration: none;}/* What it does: A work-around for email clients meddling in triggered links. */ a[x-apple-data-detectors], /* iOS */ .unstyle-auto-detected-links a, .aBn{border-bottom: 0 !important; cursor: default !important; color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important;}/* What it does: Prevents Gmail from changing the text color in conversation threads. */ .im{color: inherit !important;}/* What it does: Prevents Gmail from displaying a download button on large, non-linked images. */ .a6S{display: none !important; opacity: 0.01 !important;}/* If the above doesnt work, add a .g-img class to any image in question. */ img.g-img + div{display: none !important;}/* What it does: Removes right gutter in Gmail iOS app: https://github.com/TedGoas/Cerberus/issues/89 */ /* Create one of these media queries for each additional viewport size you like to fix */ /* iPhone 4, 4S, 5, 5S, 5C, and 5SE */ @media only screen and (min-device-width: 320px) and (max-device-width: 374px){u ~ div .email-container{min-width: 320px !important;}}/* iPhone 6, 6S, 7, 8, and X */ @media only screen and (min-device-width: 375px) and (max-device-width: 413px){u ~ div .email-container{min-width: 375px !important;}}/* iPhone 6+, 7+, and 8+ */ @media only screen and (min-device-width: 414px){u ~ div .email-container{min-width: 414px !important;}}</style> <style>/* What it does: Hover styles for buttons */ .button-td, .button-a{transition: all 100ms ease-in;}.button-td-primary:hover, .button-a-primary:hover{background: #555555 !important; border-color: #555555 !important;}/* Media Queries */ @media screen and (max-width: 480px){/* What it does: Forces table cells into full-width rows. */ .stack-column, .stack-column-center{display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important;}/* And center justify these ones. */ .stack-column-center{text-align: center !important;}/* What it does: Generic utility class for centering. Useful for images, buttons, and nested tables. */ .center-on-narrow{text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; float: none !important;}table.center-on-narrow{display: inline-block !important;}/* What it does: Adjust typography on small screens to improve readability */ .email-container p{font-size: 17px !important;}}</style> </head><!--The email background color (#222222) is defined in three places:1. body tag: for most email clients2. center tag: for Gmail and Inbox mobile apps and web versions of Gmail, GSuite, Inbox, Yahoo, AOL, Libero, Comcast, freenet, Mail.ru, Orange.fr3. mso conditional: For Windows 10 Mail--> <body width="100%" style=" margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: none; " > <center role="article" aria-roledescription="email" lang="en" style="width: 100%; background-color: none;" ><!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: none;"> <tr> <td><![endif]--> <div style="max-height: 0; overflow: hidden; mso-hide: all;" aria-hidden="true" > WebApp Subscription confirmation </div><div style=" display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif; " > &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp; </div><!-- Set the email width. Defined in two places: 1. max-width for all clients except Desktop Windows Outlook, allowing the email to squish on narrow but never go wider than 680px. 2. MSO tags for Desktop Windows Outlook enforce a 680px width. Note: The Fluid and Responsive templates have a different width (600px). The hybrid grid is more "fragile", and Ive found that 680px is a good width. Change with caution. --> <div style="max-width: 680px; margin: 0 auto;" class="email-container"><!--[if mso]> <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="680"> <tr> <td><![endif]--> <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto;" > <tr> <td style="padding: 5px 0 10px 0; text-align: center;"> <a href="https://testingwp1234.herokuapp.com/" ><webversion style=" color: #cccccc; text-decoration: underline; font-weight: bold; " >View this mail in your browser</webversion ></a > <img src="https://testingwp1234.herokuapp.com/js/WebAppLogo.png" width="100%" alt="Webapp Logo Goes Here" border="0" style=" padding-top: 5px; height: auto; font-family: sans-serif; font-size: 15px; line-height: 15px; "/> </td></tr><tr> <td style="background-color: none;"> <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" > <tr> <td style=" padding: 20px; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #555555; " > <h1 style=" margin: 0 0 10px; font-size: 25px; line-height: 30px; color: #333333; font-weight: normal; " > Account Activation </h1> <p style="margin: 0 0 10px;"> Thank you for your interest in WebApp. Please click on the link below to activate your account </p></td></tr><tr> <td style="padding: 0 20px 20px;"> <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: auto;" > <tr> <td class="button-td button-td-primary" style="border-radius: 4px; background: #006699;" > <a class="button-a button-a-primary" href="https://testingwp1234.herokuapp.com/user_r/accountVerification/`
let activationEmailBody = `" style=" background: #006699; border: 1px solid #006699; font-family: sans-serif; font-size: 15px; line-height: 15px; text-decoration: none; padding: 13px 17px; color: #ffffff; display: block; border-radius: 4px; " >Click here to activate your account</a > </td></tr></table> </td></tr></table> </td></tr><!-- <tr> <td aria-hidden="true" height="40" style="font-size: 0px; line-height: 0px;"> &nbsp; </td></tr>--> </table><!--[if mso]> </td></tr></table><![endif]--> </div><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="" > <tr> <td> <div align="center" style="max-width: 680px; margin: auto; background-color: #006699;" class="email-container" ><!--[if mso]> <table style="background-color: #006699" role="presentation" cellspacing="0" cellpadding="0" border="0" width="680" align="center"> <tr> <td><![endif]--> <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" > <tr><!-- <td style=" padding: 20px; text-align: left; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #fff; " > --><!-- <p style="margin: 0;"> Maecenas sed ante pellentesque, posuere leo id, eleifend dolor. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Praesent laoreet malesuada cursus. Maecenas scelerisque congue eros eu posuere. Praesent in felis ut velit pretium lobortis rhoncus ut&nbsp;erat. </p>--> <td style=" padding: 10px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff; " > WebApp<br/><span class="unstyle-auto-detected-links" >info@webapp.co.za</span > <br/><br/> <unsubscribe style="text-decoration: underline;" >unsubscribe</unsubscribe > </td></tr></table><!--[if mso]> </td></tr></table><![endif]--> </div></td></tr></table><!--[if mso | IE]> </td></tr></table><![endif]--> </center> </body></html>`




module.exports = router;
