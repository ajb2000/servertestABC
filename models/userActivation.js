const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  userSideUuid: { type: String, required: true },
  serverSideUuid: { type: String, required: true },
  time : { type : Date, default: Date.now }

});

module.exports = mongoose.model("userActivation", userSchema);
