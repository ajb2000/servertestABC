const mongoose = require("mongoose");

const client_documentsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  caseId: { type: String, required: true },
  bodyText: { type: String, required: true },
  date: { type: String, required: true }
});

module.exports = mongoose.model("NoteData", client_documentsSchema);
