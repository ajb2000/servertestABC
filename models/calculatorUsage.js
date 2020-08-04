const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	calculatorUsed: { type: String },
	time: { type: Date, default: Date.now },
});

module.exports = mongoose.model("calculatorUsage", userSchema);
