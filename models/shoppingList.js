const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: { type: String, required: true },
  number: { type: Number, required: false, default: 1 }
});

module.exports = mongoose.model("shoppingList", userSchema);
