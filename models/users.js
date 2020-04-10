const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  isAdmin: {type: Boolean, default: false},
  isActivated: {type: Boolean, default: false}
});

module.exports = mongoose.model("Users", userSchema);
