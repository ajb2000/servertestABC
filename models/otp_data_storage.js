const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	otpData: { type: Object },
	time: { type: Date, default: Date.now },
});

module.exports = mongoose.model("otp_data_storage", userSchema);
