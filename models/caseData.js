const mongoose = require("mongoose");

const client_documentsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  caseNumber: { type: String, required: true },
  employee:  { type: String, required: true },
  employer:  { type: String, required: true },
  currentProcess:  { type: String, required: true },
  status: { type: String, default: 'Active'},
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("caseData", client_documentsSchema);
