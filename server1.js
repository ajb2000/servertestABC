const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
var cors = require('cors')

var knex = require('knex')

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use('/pictures', express.static('pictures'))
app.use('/css', express.static('css'))
app.use('/js', express.static('js'))
const PORT = process.env.PORT || 5000
// db = knex({
//   client: 'pg',
//   connection: {
//     host : '127.0.0.1',
//     user : 'postgres',
//     password : 'banana12',
//     database : 'testdb'
//   }
// });

// Get Request for employees with spesific employernumber - START

// app.get('/', function(req,res) {
app.get('/', function(req,res) {
  // res.sendFile(__dirname + '/pictures/index.html');
  res.send("this worked now!!!");
});
// FINISH


// app.post('/addnewemployee', (req,res) =>{
//   const {emloyernumber, employeename, employeesurname, employeeidnumber} = req.body;
//   console.log(emloyernumber, employeename, employeesurname, employeeidnumber);
//   db('employeelist').insert({
//       emloyernumber: emloyernumber,
//       employeename: employeename,
//       employeesurname: employeesurname,
//       employeeidnumber: employeeidnumber,
//     }).then(console.log);
//     return res.json("user received")
//
// });
// console.log(data);


// .then(data =>{
//      console.log(data)
// });
// get list op employees
// db.select('employeename','employeesurname').from('employeelist').where(id='0001')then(data =>{
//     console.log(data);
// });
// Insert New Employee
// db('employeelist').insert({
//     emloyernumber: '0002',
//     employeename: 'Anton',
//     employeesurname: 'Brune',
//     employeeidnumber: '58698742586982',
//   }).then(console.log);

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
