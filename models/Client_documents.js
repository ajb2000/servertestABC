const mongoose = require("mongoose");

const client_documentsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  date: {type: Date, default: Date.now},
  client_id: { type: String, required: true },
  employee_id: { type: Number, required: false },
  description: { type: String, required: true },
  path: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
});

module.exports = mongoose.model("Client_documents", client_documentsSchema);
