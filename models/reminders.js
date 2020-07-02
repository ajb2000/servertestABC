const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  userNumber: {type: String, required: true},
  reminderSubject: { type: String, required: true },
  reminderText: { type: String, required: false },
  reminderEmail: { type: String, required: true },
  triggerDandT : { type : Date,},
  // triggerTime : { type : Time,}

});

module.exports = mongoose.model("reminders", userSchema);
