const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	emailAddress: { type: String, required: true },
	verified: { type: Boolean, default: false },
	status: { type: String, default: "Active" },
	sentMails: [{ type: String, ref: "email" }],
	tag: { type: String },
	uploadDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("emailContacts", userSchema);
