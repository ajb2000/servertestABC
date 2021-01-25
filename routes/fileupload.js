const express = require("express");
const router = express.Router();
const multer = require('multer')
const mongoose = require("mongoose");
const path = require('path')
const bodyParser = require("body-parser");
// const fs = require('fs')

const User = require("../models/users");
const Documents_in_db_test = require("../models/documents_in_db_test");
const CaseData = require("../models/caseData");
const NoteData = require("../models/noteData");
const CaseInfo = require('../models/informationData')
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

// *** for memory storage only starts***
//SET STORAGE ENGINE ("STORAGE") 
const storageMem = multer.memoryStorage()

//INITIALIZE UPLOAD VARIABLE ('UPLOAD')
const uploadMemoryStorage = multer({storage: storageMem}).single('myImage')
// *** for memory storage only ends***

// router.get("/fileUpload",ensureAuthenticated, (req, res) => {
//   res.render("fileUpload");
// });

// ***** file storage in DB *****
router.post('/fileuploadMem', (req, res) =>{
  uploadMemoryStorage(req, res, (err )=>{
    if (err){
      res.send({'data': 'failure'})
      console.log(err)
    } else {
      var newString = Buffer.from(req.file.buffer, 'base64').toString("base64")

      const newPDFtoDb = new Documents_in_db_test({
        _id: new mongoose.Types.ObjectId(),
        pdf: newString,
        docName: req.body.docName,
        docDescription: req.body.docDescription,
        caseId: req.body.caseId
      });
      newPDFtoDb
        .save()
        .then(result => {
          console.log('Document successfully uploaded to DB')
          res.send({'data': 'success'})
        })
        .catch(err => {
          console.log(err)
          res.send({'data': 'failure'})
        });
    }
  })
})

// Add New Case To Db
router.post('/addNewCase', (req, res) =>{
      const newCase = new CaseData({
        _id: new mongoose.Types.ObjectId(),
        caseNumber: req.body.obj.caseNumber,
        employee: req.body.obj.employee,
        employer: req.body.obj.employer,
        currentProcess: req.body.obj.currentProcess,
      });
     newCase
        .save()
        .then(result => {
          createNewCaseInfo(result._id)
          console.log('New Case successfully uploaded to DB')
          res.send({'data': 'success'})
        })
        .catch(err => {
          console.log(err)
          res.send({'data': 'failure'})
        });
    })

// Update CaseData in Db
router.post('/updateCaseData', (req, res) =>{
  var obj = {}
  obj[req.body.obj.field] = req.body.obj.value
  CaseData.findByIdAndUpdate(req.body.obj.id,obj, function(err, result){
    if(err){
        console.log('Failure: '+err)
        res.send({'data': 'failure'})
    } else {
        console.log('Success: Date updated in DB')
        res.send({'data': 'success'})
    }
})
})

// Update InfoData in Db
router.post('/updateCaseInfo', (req, res) =>{
  var update = {}
  update[req.body.obj.field] = req.body.obj.value
  var filter = {}
  filter['caseId'] = req.body.obj.id
  CaseInfo.findOneAndUpdate(filter, update, function(err, result){
    if(err){
        console.log('Failure: '+err)
        res.send({'data': 'failure'})
    } else {
        console.log('Success: Case Info updated in DB')
        res.send({'data': 'success'})
    }
})
})

function createNewCaseInfo(id){
  const newInfo = new CaseInfo({
    _id: new mongoose.Types.ObjectId(),
    caseId: id,
    office:  '',
    memNo:  '',
    package:  '',
    yearMem:  '',
    disputeFundAtRisk:  '',
    seesaLa:  '',
    ceoLa:  '',
    type:  '',
    procedureUnfair:  '',
    substanceUnfair:  '',
    compensationAwarded:  '',
    compensationAmount:  '',
    reinstatementAwarded:  '',
    reinstatementDate:  '',
    securityRequired:  '',
    securityAmount:  '',
    statementOfCaseType:  '',
  });
 newInfo
    .save()
    .then(result => {
      console.log('Success: New caseInfo created in Db for new Case')
    })
    .catch(err => {
      console.log('Failure: '+err)
    });
}

// Get All casesInfo's From DB
router.get('/getAllCaseInfo/', (req, res) =>{
  CaseInfo.find({})
  .then(docs => {
    console.log('Success: caseInfo retrieved from DB and sent to frontend')
    res.send(docs)
  })
  .catch(err =>{
    console.log(err)
    res.send('error')
  })
})
// Get All Cases From DB
router.get('/getAllCases/', (req, res) =>{
  CaseData.find({})
  .then(docs => {
    console.log('Success: caseData retrieved from DB and sent to frontend')
    res.send(docs)
  })
  .catch(err =>{
    console.log(err)
    res.send('error')
  })
})

// Get All Notes From DB
router.get('/getAllNotes/', (req, res) =>{
  var mySort = {date:-1};
  NoteData.find({}).sort(mySort)
  .then(docs => {
    console.log('Success: notesData retrieved from DB and sent to frontend')
    res.send(docs)
  })
  .catch(err =>{
    console.log('Failure:'+err)
    res.send('error')
  })
})

// Add New Note To Db
router.post('/addNewNote', (req, res) =>{
  const newNote = new NoteData({
    _id: new mongoose.Types.ObjectId(),
    caseId: req.body.obj.caseId,
    bodyText: req.body.obj.bodyText,
    date: req.body.obj.date,
  });
 newNote
    .save()
    .then(result => {
      console.log('Success: New Note successfully uploaded to DB')
      res.send({'data': 'success'})
    })
    .catch(err => {
      console.log('Failure: '+err)
      res.send({'data': 'failure'})
    });
})

router.get('/displayDocMem/:id', (req, res) =>{
  Documents_in_db_test.findOne({_id: req.params.id})
  .then(doc => {
    let base64data = doc.pdf.toString('base64')
    return
    res.render('fileuploadMem', {'pdfBuffer': doc.pdf})
  })
  .catch(err =>{
    console.log(err)
    return
    res.send('error')
    // res.redirect('user/documents'))
  })
})

//Find Document by Id and Delete
router.get('/deleteDocById/:id', (req, res) =>{
  Documents_in_db_test.findByIdAndDelete(req.params.id, function (err, docs) { 
    if (err){ 
        console.log(err) 
        res.send({'data': 'failure'})
    } 
    else{ 
        // console.log("Deleted : ", docs);
        res.send({'data': 'success'})
    } 
}); 
})

router.get('/sendDocBase64/:id', (req, res) =>{
  console.log('request received for MEm doc')
  Documents_in_db_test.findOne({_id: req.params.id})
  .then(doc => {
    // Render the <Embed> element with the PDF data and send to browser
    res.render('fileuploadMem1', {'pdfBuffer': doc.pdf}, (err, html) => {
      if(err) {return console.error(err);}
      res.send({'data': html})
      });
  })
  .catch(err =>{
    console.log(err)
    res.send('error')
  })
})

router.get('/sendDocBackAsFile/:id', (req, res) =>{
  console.log('request received for MEm doc')
  Documents_in_db_test.findOne({_id: req.params.id})
  .then(doc => {
    // Render the <Embed> element with the PDF data and send to browser
    res.render('fileuploadMem1', {'pdfBuffer': doc.pdf}, (err, html) => {
      if(err) {return console.error(err);}
      // res.send({'data': html})
     
      var str = html.substring(25);
      var str2 = str.substring(0, str.length - 64);
      str3 = str2+'='
      res.set("Content-disposition", "attachment; filename=" + `PDFtestABC` + `.pdf`);
      res.contentType("application/pdf");
      res.send(str3)
      });
  })
  .catch(err =>{
    console.log(err)
    res.send('error')
  })
})

router.get('/getAllDocs/', (req, res) =>{
  var mySort={date:-1}
  Documents_in_db_test.find({}).select({
    caseId: 1,
    docName: 1,
    date: 1,
    docDescription: 1
    }).sort(mySort)
  .then(docs => {
    res.send(docs)
  })
  .catch(err =>{
    console.log(err)
    res.send('error')
  })
})

module.exports = router;
