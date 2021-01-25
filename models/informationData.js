const mongoose = require("mongoose");

const client_documentsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  caseId: { type: String, required: true },
  office:  { type: String, required: false },
  memNo:  { type: String, required: false },
  package:  { type: String, required: false },
  yearMem:  { type: String, required: false },
  disputeFundAtRisk:  { type: String, required: false },
  seesaLa:  { type: String, required: false },
  ceoLa:  { type: String, required: false },
  type:  { type: String, required: false },
  procedureUnfair:  { type: String, required: false },
  substanceUnfair:  { type: String, required: false },
  compensationAwarded:  { type: String, required: false },
  compensationAmount:  { type: String, required: false },
  reinstatementAwarded:  { type: String, required: false },
  reinstatementDate:  { type: String, required: false },
  securityRequired:  { type: String, required: false },
  securityAmount:  { type: String, required: false },
  statementOfCaseType:  { type: String, required: false },
});

module.exports = mongoose.model("infoData", client_documentsSchema);
