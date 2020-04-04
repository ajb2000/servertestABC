const express = require("express");
const router = express.Router();
const multer = require('multer')
const mongoose = require("mongoose");
const path = require('path')
const bodyParser = require("body-parser");

const User = require("../models/users");
const Client_documents = require("../models/Client_documents");
const passport = require("passport");


function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next()
  } else {
    req.flash('danger', 'Please login to access this page')
    res.redirect('/user_r/login')
  }
}

////MULTER
//SET STORAGE ENGINE ("STORAGE")
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function(req, file, cb){
    // console.log('inside name generation thingy . . .')
    // console.log(req.user._id)

    cb(null, file.fieldname + '.' + Date.now() + path.extname(file.originalname))
    // cb( null, file.originalname)
    // cb(null, file.fieldname + '.' + req.user._id + path.extname(file.originalname))

  }
})
//iINITIALIZE UPLOAD VARIABLE ('UPLOAD')
const upload = multer({
  storage: storage
}).single('myImage')


router.get('/getOneDoc/:id', (req, res) =>{
  Client_documents.findOne({_id: req.params.id})
  .then(doc => {
    let file_path = doc.path
    res.sendFile(path.resolve(__dirname, '../', file_path))
  })
  .catch(err =>{
    console.log(err)
    res.send('error')
    // res.redirect('user/documents'))
  })

})

router.post('/displayDoc', (req, res) =>{
    let file_path = 'http://localhost:5000/fileupload/getOneDoc/'+req.body.docNumber+'#toolbar=0&navpanes=0&scrollbar=0'
    // let obj = {}
    // obj.obj = {'source':file_path}
    // res.render('fileupload', obj)
    res.render('fileupload', {obj:{'source': file_path}})

})


router.get("/fileUpload",ensureAuthenticated, (req, res) => {
  res.render("fileUpload");
});

router.post('/fileupload', (req, res) =>{

  upload(req, res, (err )=>{
    if (err){
      req.flash('danger', err)
      res.render("fileUpload");
    } else {
      console.log(req.file)
      const newDocument = new Client_documents({
        _id: new mongoose.Types.ObjectId(),
        client_id: req.user._id,
        description: 'verbal warning',
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      newDocument
        .save()
        .then(result => {
          req.flash("success", "Document has been uploaded successfully");
          res.redirect("/fileupload/fileUpload");
        })
        .catch(err => {
          req.flash("danger", err.message);
          res.redirect("/fileupload/fileUpload");
        });
    }
  })
})


module.exports = router;
