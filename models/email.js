const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	emailUUID: { type: String },
	emailAddress: { type: String, required: true },
	emailContactId: { type: String },
	from: { type: String },
	opened: { type: Boolean },
	campaignName: { type: String },
	subject: { type: String },
	bodyHTML: { type: String },
	sentDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("email", userSchema);
