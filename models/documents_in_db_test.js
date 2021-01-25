const mongoose = require("mongoose");

const client_documentsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  pdf:  Buffer,
  caseId: { type: String, required: true },
  docName: { type: String, required: true },
  date: { type: Date, default: Date.now },
  docDescription: { type: String, required: false }
});

module.exports = mongoose.model("documents_in_db_test", client_documentsSchema);
