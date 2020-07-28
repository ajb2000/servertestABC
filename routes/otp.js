const express = require("express");
const router = express.Router();
const path = require("path");
const bodyParser = require("body-parser");
const passport = require("passport");
const nodemailer = require("nodemailer");
const fs = require("fs");
const moment = require("moment");
const mongoose = require("mongoose");

//IMPORT MODELS FOR MONGOOSE DB
const otpStorage = require("../models/otp_data_storage");
const emailContacts = require("../models/emailContacts");
const email = require("../models/email");

//*** SETUP pdfmake - STARTS
// Define font files
var fonts = {
	Roboto: {
		normal: "fonts/Roboto-Regular.ttf",
		bold: "fonts/Roboto-Medium.ttf",
		italics: "fonts/Roboto-Italic.ttf",
		bolditalics: "fonts/Roboto-MediumItalic.ttf",
	},
};

var PdfPrinter = require("pdfmake");
const { AggregationCursor } = require("mongodb");
var printer = new PdfPrinter(fonts);
//*** SETUP pdfmake - ENDS

// *** SETUP NODEMAILER - STARTS
var transporter = nodemailer.createTransport({
	host: "wharfinger.aserv.co.za",
	auth: {
		user: "attorney@brune.co.za",
		pass: "xrK5A^bbV}9JUk[R",
	},
});
// *** SETUP NODEMAILER - ENDS

// *** Pings Server to wake it up
router.post("/serverPing", (req, res) => {
	console.log("Server Received Ping From: " + req.connection.remoteAddress);
	res.send({ txt: "Ping Received By Server" });
});

// *** Unsubscribe -page render- Request received
router.get("/unsubscribe", (req, res) => {
	console.log("Unsubscribe Page Server");
	res.render("unsubscribe");
});

// *** Unsubscribe -page render- Request received
router.post("/unsubscribe", (req, res) => {
	console.log(`Unsubscribe request received for: ${req.body.unsubscribeEmail}`);
	unsubscribeEmail(req.body.unsubscribeEmail);
	res.render("unsubscribeDone");
});

async function unsubscribeEmail(address) {
	const filter = { emailAddress: address };
	const update = { status: "Unsubscribed" };

	try {
		let emailToUpdate = await emailContacts.findOneAndUpdate(filter, update);
		console.log(`Email address: ${address} : unsubscribed`);
	} catch (err) {
		console.log(`Email with UUID : ${address} : could not be unsubscribed`);
	}
}

async function emailOpenedUpdate(UUID) {
	const filter = { emailUUID: UUID };
	const update = { opened: true };

	try {
		let emailToUpdate = await email.findOneAndUpdate(filter, update);
		console.log(`Email with UUID : ${UUID} ; updated to true`);
	} catch (err) {
		console.log(`Email with UUID : ${UUID} ; could not be updated to true`);
	}
}

router.get("/email_opened_confirmation/:id", function (req, res) {
	console.log(`email opened received for: ${req.params.id}`);
	emailOpenedUpdate(req.params.id);
	// prettier-ignore
	let buffer = Buffer.alloc(35)
	buffer.write("R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=", "base64");
	res.writeHead("200", { "Content-Type": "image/gif" });
	res.end(buffer, "binary");
});

// *** Route the receives object form FrontEnd, conttructs the OTP and changes the data out
router.post("/otp_landing", (req, res) => {
	console.log("*  *  *  new call received from frontend  *  *  * ");
	console.log(moment().format("DD MMMM YYYY hh:mm:ss"));
	let data = req.body;

	new Promise(function (resolve, reject) {
		// Pick the correct parts of OTP to user
		let content = [];
		var agentsDetails = {
			"5555": ["Aloe Real Estate", "pixie@aloerealestate.co.za", "073 353 0881"],
		};
		var agents = ["5555"];
		if (data.agentCode != "" || data.agentCode != undefined) {
			if (agents.includes(data.agentCode)) {
				let agentLogo = fs.readFileSync(path.join(__dirname, "../agentFiles/" + data.agentCode + ".png"), { encoding: "base64" });
				let agentHeader = {
					image: "data:image/jpeg;base64," + agentLogo,
					width: "588",
					alignment: "center",
				};
				content.push(agentHeader);
				content.push(insertSpace);
				agentLogo = "";
				agentHeader = {};
			}
		}
		// Heading - Starts
		content.push(part_1_heading);
		// Heading - Ends

		// Seller - STARTS
		let new_seller = {};

		if (data.defaultCheck1 === true) {
			// seller 2 ACTIVE
			if (data.seller3_on === true) {
				if ((data.marriedInCommunityOfProperty === "No") & (data.marriedInCommunityOfProperty1 === "No")) {
					new_seller = part_25_seller_1_seller_2;
				}
				if ((data.marriedInCommunityOfProperty === "Yes") & (data.marriedInCommunityOfProperty1 === "No")) {
					new_seller = part_26_seller_1S_seller_2;
				}
				if ((data.marriedInCommunityOfProperty === "Yes") & (data.marriedInCommunityOfProperty1 === "Yes")) {
					new_seller = part_27_seller_1S_seller_2S;
				}
				if ((data.marriedInCommunityOfProperty === "No") & (data.marriedInCommunityOfProperty1 === "Yes")) {
					new_seller = part_28_seller_1_seller_2S;
				}

				//  seller 2 NOT ACTIVE
			} else {
				if (data.marriedInCommunityOfProperty === "No") {
					new_seller = part_21_seller_basic;
				} else {
					new_seller = part_22_seller_spouse;
				}
			}
		}
		if (data.defaultCheck2 === true) {
			new_seller = part_23_seller_company;
		}
		if (data.defaultCheck3 === true) {
			new_seller = part_24_seller_trust;
		}
		// Object to string to make changes
		let new_seller_string = JSON.stringify(new_seller);
		if (data.sellerSAResident === "Yes") {
			new_seller_string = new_seller_string.split("asdf___saresident___asdf").join("(Who warrants that he/she is a South African resident)");
		} else {
			new_seller_string = new_seller_string.split("asdf___saresident___asdf").join("(Who warrants that he/she is not a South African resident)");
		}

		if (data.sellerSAResident1 === "Yes") {
			new_seller_string = new_seller_string.split("asdf___saresident1___asdf").join("(Who warrants that he/she is a South African resident)");
		} else {
			new_seller_string = new_seller_string.split("asdf___saresident1___asdf").join("(Who warrants that he/she is not a South African resident)");
		}

		if (data.sellerPhoneNumber === "") {
			new_seller_string = new_seller_string.split("sellerPhoneNumber").join("");
		}
		if (data.sellerFaxNumber === "") {
			new_seller_string = new_seller_string.split("sellerFaxNumber").join("");
		}
		if (data.sellerCompanyPhoneNumber === "") {
			new_seller_string = new_seller_string.split("sellerCompanyPhoneNumber").join("");
		}
		if (data.sellerCompanyFaxNumber === "") {
			new_seller_string = new_seller_string.split("sellerCompanyFaxNumber").join("");
		}
		if (data.sellerTrustPhoneNumber === "") {
			new_seller_string = new_seller_string.split("sellerTrustPhoneNumber").join("");
		}
		if (data.sellerTrustFaxNumber === "") {
			new_seller_string = new_seller_string.split("sellerTrustFaxNumber").join("");
		}

		// String back to Object
		var final_seller = JSON.parse(new_seller_string);

		content.push(part_20_seller_heading);
		content.push(final_seller);
		content.push(insertSpace);
		// Seller - ENDS

		// PURCHASER - STARTS
		let new_purchaser = {};
		if (data.purchaserCheck1 === true) {
			if (data.numPurchasers === "One") {
				new_purchaser = part_31_purchaser_one;
			} else {
				new_purchaser = part_32_purchaser_two;
			}
		}
		if (data.purchaserCheck2 === true) {
			new_purchaser = part_33_purchaser_company;
		}
		if (data.purchaserCheck3 === true) {
			new_purchaser = part_34_purchaser_trust;
		}
		// object to string to make changes
		new_purchaser1 = JSON.stringify(new_purchaser);
		if (data.purchaserPhoneNumber === "") {
			new_purchaser1 = new_purchaser1.split("purchaserPhoneNumber").join("");
		}
		if (data.purchaserFaxNumber === "") {
			new_purchaser1 = new_purchaser1.split("purchaserFaxNumber").join("");
		}
		if (data.purchaserCompanyPhoneNumber === "") {
			new_purchaser1 = new_purchaser1.split("purchaserCompanyPhoneNumber").join("");
		}
		if (data.purchaserCompanyFaxNumber === "") {
			new_purchaser1 = new_purchaser1.split("purchaserCompanyFaxNumber").join("");
		}
		if (data.purchaserTrustPhoneNumber === "") {
			new_purchaser1 = new_purchaser1.split("purchaserTrustPhoneNumber").join("");
		}
		if (data.purchaserTrustFaxNumber === "") {
			new_purchaser1 = new_purchaser1.split("purchaserTrustFaxNumber").join("");
		}
		// String back to Object
		new_purchaser = JSON.parse(new_purchaser1);

		var tt = [];
		var temp_stack = {
			stack: [],
			unbreakable: true,
		};
		tt.push(part_30_purchaser_heading);
		tt.push(new_purchaser);
		temp_stack["stack"] = tt;

		content.push(temp_stack);
		content.push(insertSpace);

		// PURCHASER - ENDS

		// Property description- STARTS
		var tt3 = [];
		let new_property = {};
		if (data.propertyCheck1 === true) {
			new_property = part_41A_proptery;
		}

		if (data.propertyCheck2 === true) {
			// Both Empty - STARTS
			if ((data.propertySTeuaType1 === "") & (data.propertySTeuaType2 === "")) {
				var temp = JSON.stringify(part_42A_proptery);
				var newObj = JSON.parse(temp);

				newObj.table.body.splice(11, 8, ["3.3", { text: "No exclusive Use areas" }, "", "", { text: "" }], ["", { text: "" }, { text: "" }, "", { text: "" }]);
				new_property = newObj;
			}
			// Both Empty - ENDS

			// Second One Empty - STARTS
			if ((data.propertySTeuaType1 != "") & (data.propertySTeuaType2 === "")) {
				var temp = JSON.stringify(part_42A_proptery);
				var newObj = JSON.parse(temp);
				newObj.table.body.splice(15, 4);
				new_property1 = JSON.stringify(newObj);

				// NOW insert first EUA into the first EUA's spaces . . .
				new_property1 = new_property1.split("propertySTeuaType1").join(data.propertySTeuaType1);
				new_property1 = new_property1.split("propertySTeuaNum1").join(data.propertySTeuaNum1);
				new_property1 = new_property1.split("propertySTeuaArea1").join(data.propertySTeuaArea1);
				// back to object
				new_property = JSON.parse(new_property1);
			}
			// Second One Empty - ENDS

			// First One Empty - STARTS
			if ((data.propertySTeuaType1 === "") & (data.propertySTeuaType2 != "")) {
				var temp = JSON.stringify(part_42A_proptery);
				var newObj = JSON.parse(temp);
				newObj.table.body.splice(15, 4);
				new_property = newObj;
				new_property1 = JSON.stringify(newObj);
				// NOW insert second EUA into the first EUA's spaces . . .
				new_property1 = new_property1.split("propertySTeuaType1").join(data.propertySTeuaType2);
				new_property1 = new_property1.split("propertySTeuaNum1").join(data.propertySTeuaNum2);
				new_property1 = new_property1.split("propertySTeuaArea1").join(data.propertySTeuaArea2);
				// back to object
				new_property = JSON.parse(new_property1);
			}
			// First One Empty - ENDS

			// Both filled in - STARTS
			if ((data.propertySTeuaType1 != "") & (data.propertySTeuaType2 != "")) {
				new_property = part_42A_proptery;
			}
			// Both filled in - ENDS
		}

		// Add the property heading
		if (data.propertyCheck1 === true) {
			tt3.push(part_41A_proptery_heading);
		}

		if (data.propertyCheck2 === true) {
			tt3.push(part_42A_proptery_heading);
		}
		// Add the property body
		tt3.push(new_property);
		tt3.push(insertSpace);
		var temp_stack3 = {
			stack: tt3,
			unbreakable: true,
		};
		content.push(temp_stack3);
		// Property description - ENDS

		// 41B_price STARTS
		let new_price_string = JSON.stringify(part_41B_price);

		new_price_string = new_price_string.split("purchasePrice").join(numberWithSpaces(data.purchasePrice));

		if (data.depositAmount === "") {
			new_price_string = new_price_string.split("depositAmount").join(" 0");
			new_price_string = new_price_string.split("depositDatePayable").join("(not applicable)");
		} else {
			new_price_string = new_price_string.split("depositAmount").join(numberWithSpaces(data.depositAmount));
			new_price_string = new_price_string.split("depositDatePayable").join(moment(data.depositDatePayable).utc().format("D MMMM YYYY"));
		}
		if (data.loanAmount === "") {
			new_price_string = new_price_string.split("loanAmount").join(" 0");
			new_price_string = new_price_string.split("loanDatePayable").join("(not applicable)");
		} else {
			new_price_string = new_price_string.split("loanAmount").join(numberWithSpaces(data.loanAmount));
			new_price_string = new_price_string.split("loanDatePayable").join(moment(data.loanDatePayable).utc().format("D MMMM YYYY"));
		}
		if (data.cashAmount === "") {
			new_price_string = new_price_string.split("cashAmount").join(" 0");
			new_price_string = new_price_string.split("cashDatePayable").join("(not applicable)");
		} else {
			new_price_string = new_price_string.split("cashAmount").join(numberWithSpaces(data.cashAmount));
			new_price_string = new_price_string.split("cashDatePayable").join(moment(data.cashDatePayable).utc().format("D MMMM YYYY"));
		}

		if (data.proceedsFromSaleOfPurchaserPropertyAmount === "") {
			new_price_string = new_price_string.split("proceedsFromSaleOfPurchaserPropertyAmount").join(" 0");
			new_price_string = new_price_string.split("saleOfPropertyLastDateOfSale").join("(not applicable)");
			new_price_string = new_price_string.split("propertyToBeSoldDescription").join("(not applicable)");
		} else {
			new_price_string = new_price_string
				.split("proceedsFromSaleOfPurchaserPropertyAmount")
				.join(numberWithSpaces(data.proceedsFromSaleOfPurchaserPropertyAmount));
			new_price_string = new_price_string.split("saleOfPropertyLastDateOfSale").join(moment(data.saleOfPropertyLastDateOfSale).utc().format("D MMMM YYYY"));
		}

		new_price = JSON.parse(new_price_string);

		// Stack items together for page break purposes
		var tt2 = [];
		tt2.push(part_41B_price_heading);
		tt2.push(new_price);
		tt2.push(insertSpace);
		var temp_stack2 = {
			stack: tt2,
			unbreakable: true,
		};
		content.push(temp_stack2);

		// 41B_price ENDS

		// Occupation - STARTS
		// Stack items together for page break purposes
		let new_occupation_string = JSON.stringify(part_41C_occupation);
		if (data.occupationCheck1 === true) {
			new_occupation_string = new_occupation_string.split("occupationDate").join("On Transfer");
		} else {
			new_occupation_string = new_occupation_string.split("occupationDate").join(moment(data.occupationDate).utc().format("D MMMM YYYY"));
		}

		if (data.possessionCheck1 === true) {
			new_occupation_string = new_occupation_string.split("possessionDate").join("On Transfer");
		} else {
			new_occupation_string = new_occupation_string.split("possessionDate").join(moment(data.possessionDate).utc().format("D MMMM YYYY"));
		}
		final_occupation_string = JSON.parse(new_occupation_string);

		var tt1 = [];
		tt1.push(part_41C_occupation_heading);
		tt1.push(final_occupation_string);
		tt1.push(insertSpace);
		var temp_stack1 = {
			stack: tt1,
			unbreakable: true,
		};
		content.push(temp_stack1);
		// Occupation - ENDS

		// Property - Agent - STARTS
		let new_agent_string = JSON.stringify(part_41D_agent);
		if (data.agentInvolved === "No") {
			new_agent_string = new_agent_string.split("agencyName").join("(not applicable)");
			new_agent_string = new_agent_string.split("agentName").join("(not applicable)");
			new_agent_string = new_agent_string.split("commissionPercentage").join("(not applicable)");
		}
		new_agent = JSON.parse(new_agent_string);

		var tt4 = [];
		tt4.push(part_41D_agent_heading);
		tt4.push(new_agent);
		tt4.push(insertSpace);
		var temp_stack4 = {
			stack: tt4,
			unbreakable: true,
		};
		content.push(temp_stack4);
		// Property - Agent - ENDS

		// Fixtures 1 - Starts
		var tt5 = [];
		tt5.push(part_41E_fixtures_heading);
		tt5.push(part_41E_fixtures);
		tt5.push(insertSpace);

		var newFixtures = part_5_fixtures;
		if (req.body.fixtures.length === 0) {
			newFixtures.table.body[1][1].ul = ["None"];
		} else {
			newFixtures.table.body[1][1].ul = req.body.fixtures;
		}
		tt5.push(newFixtures);
		var temp_stack5 = {
			stack: tt5,
			unbreakable: true,
		};
		content.push(temp_stack5);
		// Fixtures - Ends
		var tt6 = [];
		tt6.push(part_6_condtitionA_heading);
		tt6.push(part_6_condtitionA);
		tt6.push(insertSpace);
		var temp_stack6 = {
			stack: tt6,
			unbreakable: true,
		};
		content.push(temp_stack6);

		var tt7 = [];
		tt7.push(part_6_condtitionB_heading);
		tt7.push(part_6_condtitionB);
		tt7.push(insertSpace);
		var temp_stack7 = {
			stack: tt7,
			unbreakable: true,
		};
		content.push(temp_stack7);

		var tt8 = [];
		tt8.push(part_6_condtitionC_heading);
		tt8.push(part_6_condtitionC);
		tt8.push(insertSpace);
		var temp_stack8 = {
			stack: tt8,
			unbreakable: true,
		};
		content.push(temp_stack8);

		// SIGNATURE PURCHASER - STARTS
		let new_purchaser_signature = {};
		if (data.purchaserCheck1 === true) {
			if (data.numPurchasers === "One") {
				new_purchaser_signature = part_71_signature_purchaser_one;
			} else {
				new_purchaser_signature = part_72_signature_purchaser_two;
			}
		}
		if (data.purchaserCheck2 === true) {
			new_purchaser_signature = part_73_signature_purchaser_company;
		}
		if (data.purchaserCheck3 === true) {
			new_purchaser_signature = part_74_signature_purchaser_trust;
		}
		var tt9 = [];
		tt9.push(part_70_purchaser_heading);
		tt9.push(new_purchaser_signature);
		var temp_stack9 = {
			stack: tt9,
			unbreakable: true,
		};
		content.push(temp_stack9);
		// SIGNATURE PURCHASER - ENDS

		// SIGNATURE SELLER - STARTS
		let new_seller_signature = {};
		if (data.defaultCheck1 === true) {
			// seller 2 ACTIVE
			if (data.seller3_on === true) {
				if ((data.marriedInCommunityOfProperty === "No") & (data.marriedInCommunityOfProperty1 === "No")) {
					new_seller_signature = part_85_signature_seller_1_seller_2;
				}
				if ((data.marriedInCommunityOfProperty === "Yes") & (data.marriedInCommunityOfProperty1 === "No")) {
					new_seller_signature = part_86_signature_seller_1S_seller_2;
				}
				if ((data.marriedInCommunityOfProperty === "Yes") & (data.marriedInCommunityOfProperty1 === "Yes")) {
					new_seller_signature = part_87_signature_seller_1S_seller_2S;
				}
				if ((data.marriedInCommunityOfProperty === "No") & (data.marriedInCommunityOfProperty1 === "Yes")) {
					new_seller_signature = part_88_signature_seller_1_seller_2S;
				}

				//  seller 2 NOT ACTIVE
			} else {
				if (data.marriedInCommunityOfProperty === "No") {
					new_seller_signature = part_81_signature_seller_one;
				} else {
					new_seller_signature = part_82_signature_seller_two;
				}
			}
		}

		if (data.defaultCheck2 === true) {
			new_seller_signature = part_83_signature_seller_company;
		}
		if (data.defaultCheck3 === true) {
			new_seller_signature = part_84_signature_seller_trust;
		}
		var tt10 = [];
		tt10.push(part_80_seller_heading);
		tt10.push(new_seller_signature);
		var temp_stack10 = {
			stack: tt10,
			unbreakable: true,
		};
		content.push(temp_stack10);
		// SIGNATURE SELLER - ENDS

		// DEFINITIONS - STARTS
		var definitions_heading = {
			pageBreak: "before",
			text: "Terms and Conditions of Agreement of Purchase and Sale",
			style: "header0",
		};
		var tt11 = [];
		tt11.push(definitions_heading);
		if (data.agentInvolved === "No") {
			tt11.push(part_9_definitians_withoutEsateAgent);
		} else {
			tt11.push(part_9_definitians);
		}
		var temp_stack11 = {
			stack: tt11,
		};
		content.push(temp_stack11);
		// DEFINITIONS - ENDS

		// SPECIAL CONDITIONS - Start
		var newConditions = part_10_specialConditions;
		if (req.body.specialConditions.length === 0) {
			newConditions.table.body[1][1].ul = ["None"];
		} else {
			newConditions.table.body[1][1].ul = req.body.specialConditions;
		}

		content.push(part_10_specialConditions);
		// SPECIAL CONDITIONS - Ends
		// SIGNATURE PURCHASER FINAL- STARTS
		let new_purchaser_signature1 = {};
		if (data.purchaserCheck1 === true) {
			if (data.numPurchasers === "One") {
				new_purchaser_signature1 = part_11_signature_purchaser_one;
			} else {
				new_purchaser_signature1 = part_11_signature_purchaser_two;
			}
		}
		if (data.purchaserCheck2 === true) {
			new_purchaser_signature1 = part_11_signature_purchaser_company;
		}
		if (data.purchaserCheck3 === true) {
			new_purchaser_signature1 = part_11_signature_purchaser_trust;
		}

		content.push(new_purchaser_signature1);
		content.push(insertSpace);
		// SIGNATURE PURCHASER FINAL- ENDS

		// SIGNATURE SELLER FINAL- STARTS
		let new_seller_signature1 = {};
		if (data.defaultCheck1 === true) {
			// seller 2 ACTIVE
			if (data.seller3_on === true) {
				if ((data.marriedInCommunityOfProperty === "No") & (data.marriedInCommunityOfProperty1 === "No")) {
					new_seller_signature1 = part_12_signature_seller1_seller3;
				}
				if ((data.marriedInCommunityOfProperty === "Yes") & (data.marriedInCommunityOfProperty1 === "No")) {
					new_seller_signature1 = part_12_signature_seller1S_seller3;
				}
				if ((data.marriedInCommunityOfProperty === "Yes") & (data.marriedInCommunityOfProperty1 === "Yes")) {
					new_seller_signature1 = part_12_signature_seller1S_seller3S;
				}
				if ((data.marriedInCommunityOfProperty === "No") & (data.marriedInCommunityOfProperty1 === "Yes")) {
					new_seller_signature1 = part_12_signature_seller1_seller3S;
				}

				//  seller 2 NOT ACTIVE
			} else {
				if (data.marriedInCommunityOfProperty === "No") {
					new_seller_signature1 = part_12_signature_seller_one;
				} else {
					new_seller_signature1 = part_12_signature_seller_two;
				}
			}
		}

		if (data.defaultCheck2 === true) {
			new_seller_signature1 = part_12_signature_seller_company;
		}
		if (data.defaultCheck3 === true) {
			new_seller_signature1 = part_12_signature_seller_trust;
		}
		content.push(new_seller_signature1);
		// SIGNATURE SELLER FINAL- ENDS

		var AnexA = createAnexureA();
		content.push(AnexA);
		let test1 = otp_master;

		test1["content"] = content;

		// Change data into a string to make the changes
		var docDefinition = test1;
		let string_object = JSON.stringify(docDefinition);

		// Make the changes according to die object received from FrontEnd
		let replaced = "";
		Object.keys(req.body).forEach((key, i) => {
			if ((req.body[key] != "") & (req.body[key] != undefined)) {
				string_object = string_object.split(key).join(req.body[key]);
			}
		});
		// Change data back into an object
		var replacedBack = JSON.parse(string_object);
		// Insert the Footer (after all the changes are complete)
		if (data.agentCode != "" || data.agentCode != undefined) {
			if (agents.includes(data.agentCode)) {
				var newFooter = new Function(
					["currentPage", "pageCount"],
					`return {
								table: {
									widths: [34, "*", "*", 34],

									body: [
										[
											{ border: [false, false, false, false], text: "" },
											{
												style: "left",
												border: [false, true, false, false],
												text: "${agentsDetails["5555"][0]} | ${agentsDetails["5555"][1]} | ${agentsDetails["5555"][2]}",
											},
											{
												style: "right",
												border: [false, true, false, false],
												text: "Page " + currentPage + " of " + pageCount,
											},
											{ border: [false, false, false, false], text: "" },
										],
									],
								},
							}`
				);
				replacedBack["footer"] = newFooter;
			}
		} else {
			replacedBack["footer"] = footer2;
		}

		var obj = {};
		obj["email"] = data.emailToBeSent;
		obj["docDefinition"] = replacedBack;
		if (data.purchasePrice > 5000000) {
		} else {
			obj["data"] = calctransferduty(data.purchasePrice);
		}

		// stores the data in the DB
		storeOtpData(data);
		// resolves the promise and moves on to first .then
		resolve(obj);
	}).then(function (obj) {
		if (data.purchasePrice > 5000000) {
			var emailBodyTest2 =
				'<!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><meta http-equiv="X-UA-Compatible" content="IE=edge" /><meta name="x-apple-disable-message-reformatting" /><meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" /><meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" /><title></title> <!--[if gte mso 9]> <xml> <o:OfficeDocumentSettings> <o:AllowPNG /> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings> </xml><! [endif]--> <!--[if mso ]><style>*{font-family:sans-serif !important}</style><! [endif]--><style>:root{color-scheme:light;supported-color-schemes:light}html,body{margin:0 auto !important;padding:0 !important;height:100% !important;width:100% !important}*{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}div[style*="margin: 16px 0"]{margin:0 !important}#MessageViewBody,#MessageWebViewDiv{width:100% !important}table,td{mso-table-lspace:0pt !important;mso-table-rspace:0pt !important}table{border-spacing:0 !important;table-layout:fixed !important;margin:0 auto !important}img{-ms-interpolation-mode:bicubic}a{text-decoration:none}a[x-apple-data-detectors], .unstyle-auto-detected-links a,.aBn{border-bottom:0 !important;cursor:default !important;color:inherit !important;text-decoration:none !important;font-size:inherit !important;font-family:inherit !important;font-weight:inherit !important;line-height:inherit !important}.im{color:inherit !important}.a6S{display:none !important;opacity:0.01 !important}img.g-img+div{display:none !important}@media only screen and (min-device-width: 320px) and (max-device-width: 374px){u ~ div .email-container{min-width:320px !important}}@media only screen and (min-device-width: 375px) and (max-device-width: 413px){u ~ div .email-container{min-width:375px !important}}@media only screen and (min-device-width: 414px){u ~ div .email-container{min-width:414px !important}}</style><style>.button-td,.button-a{transition:all 100ms ease-in}.button-td-primary:hover,.button-a-primary:hover{background:#555 !important;border-color:#555 !important}@media screen and (max-width: 480px){.stack-column,.stack-column-center{display:block !important;width:100% !important;max-width:100% !important;direction:ltr !important}.stack-column-center{text-align:center !important}.center-on-narrow{text-align:center !important;display:block !important;margin-left:auto !important;margin-right:auto !important;float:none !important}table.center-on-narrow{display:inline-block !important}.email-container p{font-size:17px !important}}</style></head><body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: none;"><center role="article" aria-roledescription="email" lang="en" style="width: 100%; background-color: none;"> <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: none;"><tr><td><![endif]--><div style="max-height: 0; overflow: hidden; mso-hide: all;" aria-hidden="true">Contract of Sale</div><div style=" display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif; " > &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div><div style="max-width: 680px; margin: 0 auto;" class="email-container"> <!--[if mso]><table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="680"><tr><td><![endif]--><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto;"><tr><td style="padding: 5px 0 0px 0; text-align: center;"> <img src="https://brune.co.za/pictures/Brune_Attorneys_Logo.png" width="100%" alt="Logo Goes Here" border="0" style="padding-top: 5px; height: auto; font-family: sans-serif; font-size: 15px; line-height: 15px;" /></td></tr><tr><td style="background-color: none;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr align="justify"><td style="padding: 10px 10px; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #555555;"><p>Dear Client</p><p>Thank you for using our Contract of Sale | OTP Generator. Your Contract is attached to this email.</p><p> Property transactions are always very stressful for the seller and purchaser. Starting off with a properly drafted Contract is an important first step.</p><p> The seller has the right to appoint the transferring attorney (conveyancer). It is important that you choose a conveyancer who will look after your interests.</p><p> Costs is also an important factor. Should you want us to provide you with a cost estimate for registering the Transfer and/or the Bond please contact us. Our contact details are at the bottom of this email.</p><p> The Contract of Sale | OTP Generator is a new service we are providing so we would apprectiate any feedback you might have on how we could improve it.</p><p>If you require any other assistance or advice we will gladly assist.</p> <br /><p>Brune Attorneys</p></td></tr></table></td></tr></table> <!--[if mso]></td></tr></table><![endif]--></div><table align="center" role="presentation" cellspacing="0" cellpadding="0" style="border-collapse: separate; margin: auto;"><tr><td><div align="center" style="max-width: 680px; margin: auto; background-color: #006699;" class="email-container"> <!--[if mso]><table style="background-color: #006699" role="presentation" cellspacing="0" cellpadding="0" border="0" width="680" align="center"><tr><td><![endif]--><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="padding: 10px 10px 10px 0px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff;" > <strong>Brune Attorneys</strong></td></tr><tr><td style="padding: 0px 10px 10px 0px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff;"> nina@brune.co.za | 084 548 4808 | <a style="color: #fff;" href="https://www.brune.co.za">www.brune.co.za</a></td></tr><tr><td style="padding: 0px 10px 10px 0px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff;"> Postnet 246, Private Bag x37, Lynnwood Ridge, 0040</td></tr><tr><td style="padding: 0px 10px 10px 0px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff;"> <unsubscribe href="https://www.brune.co.za" style="text-decoration: underline;">unsubscribe</unsubscribe></td></tr></table> <!--[if mso]></td></tr></table><![endif]--></div></td></tr></table> <!--[if mso | IE]></td></tr></table><![endif]--></center></body></html>';
			var emailSubject = "Contract of Sale";
		} else {
			var emailSubject = "Contract of Sale (and Cost Estimate)";
			var emailBodyTest2 = `<!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><meta http-equiv="X-UA-Compatible" content="IE=edge" /><meta name="x-apple-disable-message-reformatting" /><meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" /><meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" /><title></title> <!--[if gte mso 9]> <xml> <o:OfficeDocumentSettings> <o:AllowPNG /> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings> </xml><! [endif]--> <!--[if mso ]><style>*{font-family:sans-serif !important}</style><! [endif]--><style>:root{color-scheme:light;supported-color-schemes:light}html,body{margin:0 auto !important;padding:0 !important;height:100% !important;width:100% !important}*{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}div[style*="margin: 16px 0"]{margin:0 !important}#MessageViewBody,#MessageWebViewDiv{width:100% !important}table,td{mso-table-lspace:0pt !important;mso-table-rspace:0pt !important}table{border-spacing:0 !important;table-layout:fixed !important;margin:0 auto !important}img{-ms-interpolation-mode:bicubic}a{text-decoration:none}a[x-apple-data-detectors], .unstyle-auto-detected-links a,.aBn{border-bottom:0 !important;cursor:default !important;color:inherit !important;text-decoration:none !important;font-size:inherit !important;font-family:inherit !important;font-weight:inherit !important;line-height:inherit !important}.im{color:inherit !important}.a6S{display:none !important;opacity:0.01 !important}img.g-img+div{display:none !important}@media only screen and (min-device-width: 320px) and (max-device-width: 374px){u ~ div .email-container{min-width:320px !important}}@media only screen and (min-device-width: 375px) and (max-device-width: 413px){u ~ div .email-container{min-width:375px !important}}@media only screen and (min-device-width: 414px){u ~ div .email-container{min-width:414px !important}}</style><style>.button-td,.button-a{transition:all 100ms ease-in}.button-td-primary:hover,.button-a-primary:hover{background:#555 !important;border-color:#555 !important}@media screen and (max-width: 480px){.stack-column,.stack-column-center{display:block !important;width:100% !important;max-width:100% !important;direction:ltr !important}.stack-column-center{text-align:center !important}.center-on-narrow{text-align:center !important;display:block !important;margin-left:auto !important;margin-right:auto !important;float:none !important}table.center-on-narrow{display:inline-block !important}.email-container p{font-size:17px !important}}</style></head><body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: none;"><center role="article" aria-roledescription="email" lang="en" style="width: 100%; background-color: none;"> <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: none;"><tr><td><![endif]--><div style="max-height: 0; overflow: hidden; mso-hide: all;" aria-hidden="true">Contract of Sale and Cost Estimate</div><div style=" display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif; " > &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div><div style="max-width: 680px; margin: 0 auto;" class="email-container"> <!--[if mso]><table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="680"><tr><td><![endif]--><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto;"><tr><td style="padding: 5px 0 0px 0; text-align: center;"> <img src="https://brune.co.za/pictures/Brune_Attorneys_Logo.png" width="100%" alt="Logo Goes Here" border="0" style="padding-top: 5px; height: auto; font-family: sans-serif; font-size: 15px; line-height: 15px;" /></td></tr><tr><td style="background-color: none;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr align="justify"><td style="padding: 10px 10px; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #555555;"><p>Dear Client</p><p>Thank you for using our Contract of Sale | OTP Generator. Your Contract is attached to this email.</p><p> Property transactions are always very stressful for the seller and purchaser. Starting off with a properly drafted Contract is an important first step.</p><p> The seller has the right to appoint the transferring attorney (conveyancer). It is important that you choose a conveyancer who will look after your interests.</p><p>Costs is also an important factor.</p><p> Therefore we have taken the liberty of preparing a draft cost estimate (based on the purchase price of <strong>R ${numberWithSpaces(
				data.purchasePrice
			)}</strong>, payable by the purchaser:</p></td></tr><tr><td style="padding: 0 20px 20px;"><table align="center" role="presentation" cellspacing="0" cellpadding="0" style="border-collapse: separate; margin: auto;"><tr><td style="border: 1px solid #555555; border-radius: 0.5em; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #555555;" ><table style="padding: 10px 10px;" class=""><tbody><tr><td align="center" colspan="3"><strong>Transfer Cost Estimate</strong></td></tr><tr><td style="padding: 5px 10px;">Transfer Fees:</td><td style="padding: 5px 5px;"></td><td style="padding: 5px 10px;" align="right">${
				obj.data.OTPtransfer_fees
			}</td></tr><tr><td style="padding: 5px 10px;">Postages and Petties:</td><td style="padding: 5px 5px;"></td><td style="padding: 5px 10px;" align="right">${
				obj.data.OTPpost_and_petties
			}</td></tr><tr><td style="padding: 5px 10px;">Deeds Office Levy:</td><td style="padding: 5px 5px;"></td><td style="padding: 5px 10px;" align="right">${
				obj.data.OTPd_office_levy
			}</td></tr><tr><td style="padding: 5px 10px;">Other costs:</td><td style="padding: 5px 5px;"></td><td style="padding: 5px 10px;" align="right">${
				obj.data.OTPother_costs
			}</td></tr><tr><td style="padding: 5px 10px;"><strong>Total:</strong></td><td style="padding: 5px 5px;"></td><td style="padding: 5px 10px;"><strong>${
				obj.data.OTPtotal
			}</strong></td></tr></tbody></table></td></tr></table></td></tr><tr align="justify"><td style="padding: 10px 10px; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #555555;"><p> If you wish to instruct us to attend to the transfer on your behalf give us a call or send us an email. Our contact details are at the bottom of this mail. If you wish to use another conveyancer, you can still use the estimate to ensure that your purchaser is receiving a competitive price</p><p> If you require an estimate on the Bond Registration Cost you can use the convenient calculator on <a style="text-decoration: underline;" href="https://brune.co.za/">www.brune.co.za</a></p><p> The Contract of Sale | OTP Generator is a new service we are providing so we would apprectiate any feedback you might have on how we could improve it.</p><p>If you require any other assistance or advice we will gladly assist.</p> <br /><p>Brune Attorneys</p></td></tr></table></td></tr></table> <!--[if mso]></td></tr></table><![endif]--></div><table align="center" role="presentation" cellspacing="0" cellpadding="0" style="border-collapse: separate; margin: auto;"><tr><td><div align="center" style="max-width: 680px; margin: auto; background-color: #006699;" class="email-container"> <!--[if mso]><table style="background-color: #006699" role="presentation" cellspacing="0" cellpadding="0" border="0" width="680" align="center"><tr><td><![endif]--><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="padding: 10px 10px 10px 0px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff;" > <strong>Brune Attorneys</strong></td></tr><tr><td style="padding: 0px 10px 10px 0px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff;"> nina@brune.co.za | 084 548 4808 | <a style="color: #fff;" href="https://www.brune.co.za">www.brune.co.za</a></td></tr><tr><td style="padding: 0px 10px 10px 0px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff;"> Postnet 246, Private Bag x37, Lynnwood Ridge, 0040</td></tr><tr><td style="padding: 0px 10px 10px 0px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff;"> <unsubscribe href="https://www.brune.co.za" style="text-decoration: underline;">unsubscribe</unsubscribe></td></tr></table> <!--[if mso]></td></tr></table><![endif]--></div></td></tr></table> <!--[if mso | IE]></td></tr></table><![endif]--></center></body></html>`;
		}

		// uses data to create the PDF - STARTS
		// var pdfDoc = printer.createPdfKitDocument(obj.docDefinition);
		// pdfDoc.pipe(fs.createWriteStream('document-new.pdf'));
		// pdfDoc.end();
		// console.log('PDF Created ! ! !')
		// uses data to create the PDF - STARTS

		const doc = printer.createPdfKitDocument(obj.docDefinition);

		let buffers = [];

		doc.on("data", buffers.push.bind(buffers));

		doc.on("end", () => {
			let pdfData = Buffer.concat(buffers);

			// Sets the Email options for NodeMailer
			var mailOptions = {
				from: "Brune Attorneys <attorney@brune.co.za>",
				to: obj.email,
				subject: emailSubject,
				html: emailBodyTest2,
				attachments: [
					{
						filename: "Contract of sale.pdf",
						content: pdfData,
					},
				],
			};

			// Send the actual Email with NodeMailer
			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					console.log(error);
					res.send({ txt: "failure" });
				} else {
					console.log(obj.email);
					console.log("Email sent: " + info.response);
					console.log(moment().format("DD MMMM YYYY hh:mm:ss"));
					console.log("* * * call finalized * * *");
					res.send({ txt: "success" });
				}
			});
		});
		//end buffer
		doc.end();

		// uses data to create the PDF - STARTS
	});
});

// *** End of Route "/otp_landing" ***

router.get("/otp_landing2", (req, res) => {
	console.log("opt_landing2reached");
	console.log("sending email to anton@brune.co.za");

	var emailBodyTest3 = `<!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><meta http-equiv="X-UA-Compatible" content="IE=edge" /><meta name="x-apple-disable-message-reformatting" /><meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" /><meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" /><title></title> <!--[if gte mso 9]> <xml> <o:OfficeDocumentSettings> <o:AllowPNG /> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings> </xml><! [endif]--> <!--[if mso]><style>*{font-family:sans-serif !important}</style><! [endif]--><style>:root{color-scheme:light;supported-color-schemes:light}html,body{margin:0 auto !important;padding:0 !important;height:100% !important;width:100% !important}*{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}div[style*="margin: 16px 0"]{margin:0 !important}#MessageViewBody,#MessageWebViewDiv{width:100% !important}table,td{mso-table-lspace:0pt !important;mso-table-rspace:0pt !important}table{border-spacing:0 !important;border-collapse:collapse !important;table-layout:fixed !important;margin:0 auto !important}img{-ms-interpolation-mode:bicubic}a{text-decoration:none}a[x-apple-data-detectors], .unstyle-auto-detected-links a,.aBn{border-bottom:0 !important;cursor:default !important;color:inherit !important;text-decoration:none !important;font-size:inherit !important;font-family:inherit !important;font-weight:inherit !important;line-height:inherit !important}.im{color:inherit !important}.a6S{display:none !important;opacity:0.01 !important}img.g-img+div{display:none !important}@media only screen and (min-device-width: 320px) and (max-device-width: 374px){u ~ div .email-container{min-width:320px !important}}@media only screen and (min-device-width: 375px) and (max-device-width: 413px){u ~ div .email-container{min-width:375px !important}}@media only screen and (min-device-width: 414px){u ~ div .email-container{min-width:414px !important}}</style><style>.button-td,.button-a{transition:all 100ms ease-in}.button-td-primary:hover,.button-a-primary:hover{background:#555 !important;border-color:#555 !important}@media screen and (max-width: 480px){.stack-column,.stack-column-center{display:block !important;width:100% !important;max-width:100% !important;direction:ltr !important}.stack-column-center{text-align:center !important}.center-on-narrow{text-align:center !important;display:block !important;margin-left:auto !important;margin-right:auto !important;float:none !important}table.center-on-narrow{display:inline-block !important}.email-container p{font-size:17px !important}}</style></head ><body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: none;"><center role="article" aria-roledescription="email" lang="en" style="width: 100%; background-color: none;"> <!-- [if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: none;"><tr><td><![endif]--><div style="max-width: 680px; margin: 0 auto;" class="email-container"> <!--[if mso]><table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="680"><tr><td><![endif]--><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto;"><tr><td style="padding: 5px 0 0px 0; text-align: center;"> <img src="https://brune.co.za/pictures/Brune_Attorneys_Logo.png" width="100%" alt="Logo Goes Here" border="0" style="padding-top: 5px; height: auto; font-family: sans-serif; font-size: 15px; line-height: 15px;" /></td></tr><tr><td style="background-color: none;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="padding: 0px 10px; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #555555;"><p style='display: none'>Generate an OTP on your mobile device and have the completed contract sent straight to your inbox</p><p>Dear Client</p><ul><li>Still completing OTP's by hand?</li><li>Manually crossing out unnecessary parts?</li><li>Clients initialing next to every change?</li><li> Struggling with access to printers and scanners during Covid-19?</li><li>Having difficulty with getting OTP's to clients?</li></ul><h3 style="margin: 0 0 10px; font-size: 15px; color: #333333; font-weight: normal; color: #006699;"> Maybe it's time to move with the times . . .</h3><h3 style="margin: 0 0 10px; font-size: 25px; font-weight: normal; color: #006699;"> Contract of Sale | OTP Generator</h3><ul><li>100% free Webapp</li><li>Accessible on pc,tablet and mobile phone</li><li>Guides you through the process</li><li>Handy and insightful information on every step</li><li> Draft, perfectly formulated OTP's on your mobile phone in minutes</li><li> Receive the completed document in PDF format right in your inbox</li></ul></td></tr><tr><td style="padding: 0 20px 20px;"><table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: auto;"><tr><td class="button-td button-td-primary" style="border-radius: 4px; background: #006699;"> <a class="button-a button-a-primary" href="https://brune.co.za/otp.html " style=" background: #006699; border: 1px solid #006699; font-family: sans-serif; font-size: 15px; line-height: 15px; text-decoration: none; padding: 13px 17px; color: #ffffff; display: block; border-radius: 4px; " >Click here to take a look for yourself</a ></td></tr></table></td></tr></table></td></tr></table> <!--[if mso]></td></tr></table><![endif]--></div><table align="center" width="100%" role="presentation" cellspacing="0" cellpadding="0" style="border-collapse: separate; margin: auto;"><tr><td><div align="center" style="max-width: 680px; margin: auto; background-color: #006699;" class="email-container"> <!--[if mso]><table style="background-color: #006699" role="presentation" cellspacing="0" cellpadding="0" border="0" width="680" align="center"><tr><td><![endif]--><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="padding: 10px 10px 10px 0px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff;" > <strong>Brune Attorneys</strong></td></tr><tr><td style="padding: 0px 10px 10px 0px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff;"> nina@brune.co.za | 084 548 4808 | <a style="color: #fff;" href="https://www.brune.co.za">www.brune.co.za</a></td></tr><tr><td style="padding: 0px 10px 10px 0px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff;"> Postnet 246, Private Bag x37, Lynnwood Ridge, 0040</td></tr><tr><td style="padding: 0px 10px 10px 0px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff;"> <unsubscribe href="https://www.brune.co.za" style="text-decoration: underline;">unsubscribe</unsubscribe></td></tr></table> <!--[if mso]></td></tr></table><![endif]--></div></td></tr></table> <!--[if mso | IE]></td></tr></table><![endif]--></body></html>`;

	// Sets the Email options for NodeMailer
	var mailOptions = {
		from: "Brune Attorneys <attorney@brune.co.za>",
		to: "anton.brune@gmail.com",
		to: "anton.brune@gmail.com",
		subject: "Contract of Sale | OTP Generator",
		html: emailBodyTest3,
	};

	// Send the actual Email with NodeMailer
	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			console.log(error);
		} else {
			console.log("Email sent: " + info.response);
		}
	});
});

// *** End of the "/otp_landing2" route

// *** MASTER OTP FILES - STARTS
// prettier-ignore
const otp_master = {
	footer: "",
	styles: {
		header0: {
			alignment: "center",
			fontSize: 16,
			bold: true,
			margin: [0, 0, 0, 20],
			decoration: "underline",
		},
		header1: {
			fontSize: 12,
		},
		signed: {
			fontSize: 10,
			alignment: "justify",
		},
		header2: {
			fontSize: 12,
			bold: true,
			decoration: "underline",
		},
		header3: {
			alignment: "center",
			fontSize: 16,
			bold: true,
		},
		header4: {
			fontSize: 10,
			bold: true,
		},
		parEnd: {
			margin: [0, 0, 0, 15],
			alignment: "justify",
		},
		justify: {
			alignment: "justify",
		},
		parSpaceAfter: {
			margin: [0, 0, 0, 15],
		},
		parSpaceAfter1: {
			margin: [0, 0, 0, 5],
		},
		bold: {
			bold: true,
			decoration: "underline",
		},
		bold1: {
			bold: true,
		},
		right: {
			fontSize: 8,
			alignment: "right",
		},
		left: {
			fontSize: 8,
			alignment: "left",
		},
	},
	defaultStyle: {
		columnGap: 0,
		fontSize: 10,
	},
};
//{text:"", style: "parSpaceAfter"}
var insertSpace = { text: "\n" };
// prettier-ignore
var part_1_heading = {
	text: "Agreement of Purchase and Sale",
	style: "header0",
};
// prettier-ignore
var part_20_seller_heading = {
	table: {
		widths: [34, "*"],
		body: [
			[
				{ text: "", border: [false, false, false, false] },
				{
					margin: [-5, 0, 0, 0],
					text: "Seller",
					border: [false, false, false, true],
				},
			],
		],
	},
};
// prettier-ignore
var part_21_seller_basic = {
	table: {
		widths: [34, 90, 134, 90, 134],
		body: [
			["", "", { text: "" }, "", ""],
			["1.1", "Name:", { style: "bold", text: "sellerName1 sellerSurname1" }, "", ""],
			["", { text: "asdf___saresident___asdf", colSpan: 4 }, "", "", ""],
			["", "", { text: "" }, "", ""],
			["1.2", "Identity Number:", { style: "bold", text: "sellerIdNumber1" }, "", ""],
			["", "", { text: "" }, "", ""],
			["1.3", "Physical Address:", { style: "bold", text: "sellerPhysicalAddress", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["1.4", "Cell No:", { style: "bold", text: "sellerCellphoneNumber" }, "Email:", { style: "bold", text: "sellerEmailAddress" }],
			["", "", { text: "" }, "", ""],
			["", "Phone No:", { style: "bold", text: "sellerPhoneNumber" }, "Fax No:", { style: "bold", text: "sellerFaxNumber" }],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_22_seller_spouse = {
	table: {
		widths: [34, 90, 134, 90, 134],
		body: [
			["", "", { text: "" }, "", ""],
			[
				"1.",
				"Seller 1:",
				{ style: "bold", text: "sellerName1 sellerSurname1", colSpan: 1 },
				"Seller 2:",
				{ style: "bold", text: "sellerName2 sellerSurname2" },
			],
			["", { text: "asdf___saresident___asdf", colSpan: 4 }, "", "", ""],
			["", "", { text: "" }, "", ""],
			["1.2", "Identity Number:", { style: "bold", text: "sellerIdNumber1" }, "Identity Number:", { style: "bold", text: "sellerIdNumber2" }],
			["", "", { text: "" }, "", ""],
			["1.3", "Physical Address:", { style: "bold", text: "sellerPhysicalAddress", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["1.4", "Cell No:", { style: "bold", text: "sellerCellphoneNumber" }, "Email:", { style: "bold", text: "sellerEmailAddress" }],
			["", "", { text: "" }, "", ""],
			["", "Phone No:", { style: "bold", text: "sellerPhoneNumber" }, "Fax No:", { style: "bold", text: "sellerFaxNumber" }],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_23_seller_company = {
	table: {
		widths: [34, 100, 124, 70, 124],
		body: [
			["", "", { text: "" }, "", ""],
			["1.1", "Seller:", { style: "bold", text: "sellerCompanyName" }, "Registration Number:", { style: "bold", text: "sellerCompanyRegistrationNumber" }],
			["", "", { text: "" }, "", ""],
			["1.2", "Representative Name:", { style: "bold", text: "sellerCompanyRepresentativeName", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["1.3", "Physical Address:", { style: "bold", text: "sellerCompanyPhysicalAddress", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["", "Cell No:", { style: "bold", text: "sellerCompanyCellphoneNumber" }, "Email:", { style: "bold", text: "sellerCompanyEmail" }],
			["", "", { text: "" }, "", ""],
			["", "Phone No:", { style: "bold", text: "sellerCompanyPhoneNumber" }, "Fax No:", { style: "bold", text: "sellerCompanyFaxNumber" }],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_24_seller_trust = {
	table: {
		widths: [34, 95, 134, 95, "*"],
		body: [
			["", "", { text: "" }, "", ""],
			["1.1", "Seller:", { style: "bold", text: "sellerTrustName" }, "Registration Number:", { style: "bold", text: "sellerTrustRegistrationNumber" }],
			["", "", { text: "" }, "", ""],
			["1.2", "Trustee Name:", { style: "bold", text: "sellerTrustRepresentativeName", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["1.3", "Physical Address:", { style: "bold", text: "sellerTrustPhysicalAddress", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["1.4", "Cell No:", { style: "bold", text: "sellerTrustCellphoneNumber" }, "Email:", { style: "bold", text: "sellerTrustEmail" }],
			["", "", { text: "" }, "", ""],
			["", "Phone No:", { style: "bold", text: "sellerTrustPhoneNumber" }, "Fax No:", { style: "bold", text: "sellerTrustFaxNumber" }],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_25_seller_1_seller_2 = {
	table: {
		widths: [34, 90, 134, 90, 134],
		body: [
			["", "", { text: "" }, "", ""],
			[
				"1.1",
				"Seller 1:",
				{ style: "bold", text: "sellerName1 sellerSurname1", colSpan: 1 },
				"",
				{ style: "bold", text: "" },
			],
			["", { text: "asdf___saresident___asdf", colSpan: 4 }, "", "", ""],
			["", "", { text: "" }, "", ""],
			["1.1.1", "Identity Number:", { style: "bold", text: "sellerIdNumber1" }, "", { style: "bold", text: "" }],
			[
				"1.2",
				"Seller 2:",
				{ style: "bold", text: "sellerName3 sellerSurname3", colSpan: 1 },
				"",
				{ style: "bold", text: "" },
			],
			["", { text: "asdf___saresident1___asdf", colSpan: 4 }, "", "", ""],
			["", "", { text: "" }, "", ""],
			["1.2.1", "Identity Number:", { style: "bold", text: "sellerIdNumber3" }, "", { style: "bold", text: "" }],
			["", "", { text: "" }, "", ""],
			["1.3", "Physical Address:", { style: "bold", text: "sellerPhysicalAddress", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["1.4", "Cell No:", { style: "bold", text: "sellerCellphoneNumber" }, "Email:", { style: "bold", text: "sellerEmailAddress" }],
			["", "", { text: "" }, "", ""],
			["", "Phone No:", { style: "bold", text: "sellerPhoneNumber" }, "Fax No:", { style: "bold", text: "sellerFaxNumber" }],
		],
	},
	layout: "noBorders",
}
// prettier-ignore
var part_26_seller_1S_seller_2 = {
	table: {
		widths: [34, 90, 134, 90, 134],
		body: [
			["", "", { text: "" }, "", ""],
			[
				"1.1",
				"Seller 1:",
				{ style: "bold", text: "sellerName1 sellerSurname1", colSpan: 1 },
				"Seller 2:",
				{ style: "bold", text: "sellerName2 sellerSurname2" },
			],
			["", { text: "asdf___saresident___asdf", colSpan: 4 }, "", "", ""],
			["", "", { text: "" }, "", ""],
			["1.1.1", "Identity Number:", { style: "bold", text: "sellerIdNumber1" }, "Identity Number:", { style: "bold", text: "sellerIdNumber2" }],
			[
				"1.2",
				"Seller 3:",
				{ style: "bold", text: "sellerName3 sellerSurname3", colSpan: 1 },
				"",
				{ style: "bold", text: "" },
			],
			["", { text: "asdf___saresident2___asdf", colSpan: 4 }, "", "", ""],
			["", "", { text: "" }, "", ""],
			["1.2.1", "Identity Number:", { style: "bold", text: "sellerIdNumber3" }, "", { style: "bold", text: "" }],
			["", "", { text: "" }, "", ""],
			["1.3", "Physical Address:", { style: "bold", text: "sellerPhysicalAddress", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["1.4", "Cell No:", { style: "bold", text: "sellerCellphoneNumber" }, "Email:", { style: "bold", text: "sellerEmailAddress" }],
			["", "", { text: "" }, "", ""],
			["", "Phone No:", { style: "bold", text: "sellerPhoneNumber" }, "Fax No:", { style: "bold", text: "sellerFaxNumber" }],
		],
	},
	layout: "noBorders",
}
// prettier-ignore
var part_27_seller_1S_seller_2S = {
	table: {
		widths: [34, 90, 134, 90, 134],
		body: [
			["", "", { text: "" }, "", ""],
			[
				"1.1",
				"Seller 1:",
				{ style: "bold", text: "sellerName1 sellerSurname1", colSpan: 1 },
				"Seller 2:",
				{ style: "bold", text: "sellerName2 sellerSurname2" },
			],
			["", { text: "asdf___saresident___asdf", colSpan: 4 }, "", "", ""],
			["", "", { text: "" }, "", ""],
			["1.1.1", "Identity Number:", { style: "bold", text: "sellerIdNumber1" }, "Identity Number:", { style: "bold", text: "sellerIdNumber2" }],
			[
				"1.2",
				"Seller 3:",
				{ style: "bold", text: "sellerName3 sellerSurname3", colSpan: 1 },
				"Seller 4:",
				{ style: "bold", text: "sellerName4 sellerSurname4" },
			],
			["", { text: "asdf___saresident1___asdf", colSpan: 4 }, "", "", ""],
			["", "", { text: "" }, "", ""],
			["1.2.1", "Identity Number:", { style: "bold", text: "sellerIdNumber3" }, "Identity Number:", { style: "bold", text: "sellerIdNumber4" }],
			["", "", { text: "" }, "", ""],
			["1.3", "Physical Address:", { style: "bold", text: "sellerPhysicalAddress", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["1.4", "Cell No:", { style: "bold", text: "sellerCellphoneNumber" }, "Email:", { style: "bold", text: "sellerEmailAddress" }],
			["", "", { text: "" }, "", ""],
			["", "Phone No:", { style: "bold", text: "sellerPhoneNumber" }, "Fax No:", { style: "bold", text: "sellerFaxNumber" }],
		],
	},
	layout: "noBorders",
}
// prettier-ignore
var part_28_seller_1_seller_2S = {
	table: {
		widths: [34, 90, 134, 90, 134],
		body: [
			["", "", { text: "" }, "", ""],
			[
				"1.1",
				"Seller 1:",
				{ style: "bold", text: "sellerName1 sellerSurname1", colSpan: 1 },
				"",
				{ style: "bold", text: "" },
			],
			["", { text: "asdf___saresident___asdf", colSpan: 4 }, "", "", ""],
			["", "", { text: "" }, "", ""],
			["1.1.1", "Identity Number:", { style: "bold", text: "sellerIdNumber1" }, "", { style: "bold", text: "" }],
			[
				"1.2",
				"Seller 2:",
				{ style: "bold", text: "sellerName3 sellerSurname3", colSpan: 1 },
				"Seller 3:",
				{ style: "bold", text: "sellerName4 sellerSurname4" },
			],
			["", { text: "asdf___saresident1___asdf", colSpan: 4 }, "", "", ""],
			["", "", { text: "" }, "", ""],
			["1.2.1", "Identity Number:", { style: "bold", text: "sellerIdNumber3" }, "Identity Number:", { style: "bold", text: "sellerIdNumber4" }],
			["", "", { text: "" }, "", ""],
			["1.3", "Physical Address:", { style: "bold", text: "sellerPhysicalAddress", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["1.4", "Cell No:", { style: "bold", text: "sellerCellphoneNumber" }, "Email:", { style: "bold", text: "sellerEmailAddress" }],
			["", "", { text: "" }, "", ""],
			["", "Phone No:", { style: "bold", text: "sellerPhoneNumber" }, "Fax No:", { style: "bold", text: "sellerFaxNumber" }],
		],
	},
	layout: "noBorders",
}

// prettier-ignore
var part_30_purchaser_heading = {
	table: {
		widths: [34, "*"],
		body: [
			[
				{ text: "", border: [false, false, false, false] },
				{
					margin: [-5, 0, 0, 0],
					text: "Purchaser",
					border: [false, false, false, true],
				},
			],
		],
	},
};
// prettier-ignore
var part_31_purchaser_one = {
	table: {
		widths: [34, 90, 134, 90, 134],
		body: [
			["", "", { text: "" }, "", ""],
			["2.1", "Purchaser:", { style: "bold", text: "purchaserName1 purchaserSurname1", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["2.2", { text: "Identity Number:" }, { style: "bold", text: "purchaserIdNumber1", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["2.3", "Physical Address:", { style: "bold", text: "purchaserPhysicalAddress", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["2.4", "Cell No:", { style: "bold", text: "purchaserCellphoneNumber" }, "Email:", { style: "bold", text: "purchaserEmailAddress" }],
			["", "", { text: "" }, "", ""],
			["", "Phone No:", { style: "bold", text: "purchaserPhoneNumber" }, "Fax No:", { text: "purchaserFaxNumber", style: "bold" }],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_32_purchaser_two = {
	table: {
		widths: [34, 90, 134, 90, 134],
		body: [
			["", "", { text: "" }, "", ""],
			[
				"2.1",
				"Purchaser1:",
				{ style: "bold", text: "purchaserName1 purchaserSurname1", colSpan: 1 },
				"Purchaser2:",
				{ style: "bold", text: "purchaserName2 purchaserSurname2" },
			],
			["", "", { text: "" }, "", ""],
			[
				"2.2",
				{ text: "Identity Number:" },
				{ style: "bold", text: "purchaserIdNumber1", colSpan: 1 },
				"Identity Number:",
				{ style: "bold", text: "purchaserIdNumber2" },
			],
			["", "", { text: "" }, "", ""],
			["2.3", "Physical Address:", { style: "bold", text: "purchaserPhysicalAddress", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["2.4", "Cell No:", { style: "bold", text: "purchaserCellphoneNumber" }, "Email:", { style: "bold", text: "purchaserEmailAddress" }],
			["", "", { text: "" }, "", ""],
			["", "Phone No:", { style: "bold", text: "purchaserPhoneNumber" }, "Fax No:", { text: "purchaserFaxNumber", style: "bold" }],
			["", "", { text: "" }, "", ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_33_purchaser_company = {
	table: {
		widths: [34, 95, 134, 74, 134],
		body: [
			["", "", { text: "" }, "", ""],
			[
				"2.1",
				"Purchaser:",
				{ style: "bold", text: "purchaserCompanyName" },
				{ text: "Registration Number:" },
				{ style: "bold", text: "purchaserCompanyRegistrationNumber" },
			],
			["", "", { text: "" }, "", ""],
			[
				"2.2",
				{ text: "Representative Name:" },
				{
					style: "bold",
					text: "purchaserCompanyRepresentativeName",
					colSpan: 3,
				},
				"",
				"",
			],
			["", "", { text: "" }, "", ""],
			["2.3", "Physical Address:", { style: "bold", text: "purchaserCompanyPhysicalAddress", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["2.4", "Cell No:", { style: "bold", text: "purchaserCompanyCellphoneNumber" }, "Email:", { style: "bold", text: "purchaserCompanyEmail" }],
			["", "", { text: "" }, "", ""],
			["", "Phone No:", { style: "bold", text: "purchaserCompanyPhoneNumber" }, "Fax No:", { style: "bold", text: "purchaserCompanyFaxNumber" }],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_34_purchaser_trust = {
	table: {
		widths: [34, 95, 134, 95, "*"],
		body: [
			["", "", { text: "" }, "", ""],
			[
				"2.1",
				"Purchaser:",
				{ style: "bold", text: "purchaserTrustName" },
				{ text: "Trust Number:" },
				{ style: "bold", text: "purchaserTrustRegistrationNumber" },
			],
			["", "", { text: "" }, "", ""],
			["2.2", { text: "Trustee Name:" }, { style: "bold", text: "purchaserTrustRepresentativeName", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["2.3", "Physical Address:", { style: "bold", text: "purchaserTrustPhysicalAddress", colSpan: 3 }, "", ""],
			["", "", { text: "" }, "", ""],
			["2.4", "Cell No:", { style: "bold", text: "purchaserTrustCellphoneNumber" }, "Email:", { style: "bold", text: "purchaserTrustEmail" }],
			["", "", { text: "" }, "", ""],
			["", "Phone No:", { style: "bold", text: "purchaserTrustPhoneNumber" }, "Fax No:", { text: "purchaserTrustFaxNumber", style: "bold" }],
		],
	},
	layout: "noBorders",
};
// Property - Freehold
// prettier-ignore
var part_41A_proptery_heading = {
	table: {
		widths: [34, "*"],
		body: [
			[
				{ text: "", border: [false, false, false, false] },
				{
					margin: [-5, 0, 0, 0],
					text: "Property Description ( Freehold )",
					border: [false, false, false, true],
				},
			],
		],
	},
};
// prettier-ignore
var part_41A_proptery = {
	table: {
		widths: [34, 90, 125, 90, 125],
		body: [
			["", "", { text: "" }, "", ""],
			["3.1.", { text: "Address:", colSpan: 1 }, { style: "bold", text: "propertyFreeholdAddress", colSpan: 2 }, "", ""],
			["", "", { text: "" }, "", ""],
			[
				"3.2",
				{ text: "Erf Number:", colSpan: 1 },
				{ style: "bold", text: "propertyFreeholdErfNumber" },
				"Situated at:",
				{ style: "bold", text: "propertyFreeholdSituatedAt" },
			],
			["", "", { text: "" }, "", ""],
			["3.3", { text: "Approximate Extent:", colSpan: 1 }, { style: "bold", text: "propertyFreeholdExtent" }, "", ""],
		],
	},
	layout: "noBorders",
};
// Property - SECTIONAL TITLE
// prettier-ignore
var part_42A_proptery_heading = {
	table: {
		widths: [34, "*"],
		body: [
			[
				{ text: "", border: [false, false, false, false] },
				{
					margin: [-5, 0, 0, 0],
					text: "Property Description ( Sectional Title )",
					border: [false, false, false, true],
				},
			],
		],
	},
};
// prettier-ignore
var part_42A_proptery = {
	table: {
		widths: [34, 145, 75, 145, "*"],
		body: [
			["", "", { text: "" }, "", ""],
			["3.1", { text: "Property Address:", colSpan: 1 }, { style: "bold", text: "propertySTAddress", colSpan: 2 }, "", ""],
			["", "", { text: "" }, "", ""],
			[
				"3.2.1",
				{ text: "Section Name and Number:", colSpan: 1 },
				{ style: "bold", text: "propertySTSectionNumber" },
				{ text: "Door Number:" },
				{ style: "bold", text: "propertySTDoorNumber" },
			],
			["", "", { text: "" }, "", ""],
			[
				"3.2.2",
				{ text: "Approximate Extent:" },
				{ style: "bold", text: "propertySTArea" },
				{ text: "Sectional Plan Number:" },
				{ style: "bold", text: "propertySTPlanNumber" },
			],
			["", "", { text: "" }, "", ""],
			["3.2.3", { text: "Monthly Levy:" }, { style: "bold", text: "propertySTMonthlyLevy" }, "", ""],
			["", "", { text: "" }, "", ""],
			[
				"3.2.4",
				{ text: "Body Corporate Rules Attached?" },
				{ style: "bold", text: "propertySTBCRulesAttached" },
				{ text: "Can the scheme be extended?" },
				{ style: "bold", text: "propertySTRightToExtend" },
			],
			["", "", { text: "" }, "", ""],
			["3.3.1", { text: "Exclusive Use Area 1:" }, { style: "bold", text: "propertySTeuaType1" }, "EUA Number:", { style: "bold", text: "propertySTeuaNum1" }],
			["", "", { text: "" }, "", ""],
			["", { text: "EUA Area:" }, { style: "bold", text: "propertySTeuaArea1" }, "", ""],
			["", "", { text: "" }, "", ""],
			["3.3.2", { text: "Exclusive Use Area 2:" }, { style: "bold", text: "propertySTeuaType2" }, "EUA Number:", { style: "bold", text: "propertySTeuaNum2" }],
			["", "", { text: "" }, "", ""],
			["", { text: "EUA Area:" }, { style: "bold", text: "propertySTeuaArea2" }, "", ""],
			["", "", { text: "" }, "", ""],
			["3.4", { text: "Any Special Levy Due:" }, { style: "bold", text: "propertySTLevyDue" }, "Amount:", { style: "bold", text: "propertySTLevyDue" }],
			["", "", { text: "" }, "", ""],
			[
				"3.5",
				{
					style: "justify",
					text:
						"an undivided share in the common property in the land and buildings as shown and more fully described in the said Plan apportioned to the said Section in accordance with the participation quota designated thereto.",
					colSpan: 4,
				},
				"",
				"",
				"",
			],
			["", "", { text: "" }, "", ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_41B_price_heading = {
	table: {
		widths: [34, "*"],
		body: [
			[
				{ text: "", border: [false, false, false, false] },
				{
					margin: [-5, 0, 0, 0],
					text: "Price",
					border: [false, false, false, true],
				},
			],
		],
	},
};
// prettier-ignore
var part_41B_price = {
	table: {
		widths: [34, 195, 60, 85, 108],
		body: [
			["", "", { text: "" }, "", ""],
			[
				"4.1",
				"Purchase Price:",
				{
					style: "bold",
					text: "R purchasePrice  (inclusive of VAT if applicable)",
					colSpan: 3,
				},
				"",
				"",
			],
			["", "", { text: "" }, "", ""],
			["4.2", "Deposit Amount:", { style: "bold", text: "R depositAmount" }, "Date Payable:", { style: "bold", text: "depositDatePayable" }],
			["", "", { text: "" }, "", ""],
			["4.3", "Loan Amount:", { style: "bold", text: "R loanAmount" }, "Date Approved:", { style: "bold", text: "loanDatePayable" }],
			["", "", { text: "" }, "", ""],
			["4.4", "Cash Amount:", { style: "bold", text: "R cashAmount" }, "Date Payable:", { style: "bold", text: "cashDatePayable" }],
			["", "", { text: "" }, "", ""],
			[
				"4.5",
				{ text: "Proceeds from sale of Purchasers property:" },
				{ style: "bold", text: "R proceedsFromSaleOfPurchaserPropertyAmount" },
				{ text: "Last Date of sale:" },
				{ style: "bold", text: "saleOfPropertyLastDateOfSale" },
			],
			["", "", { text: "" }, "", ""],
			["4.6", { text: "Description of property to be sold:" }, { style: "bold", text: "propertyToBeSoldDescription", colSpan: 3 }, "", ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_41C_occupation_heading = {
	table: {
		widths: [34, "*"],
		body: [
			[
				{ text: "", border: [false, false, false, false] },
				{
					margin: [-5, 0, 0, 0],
					text: "Occupation and Possession",
					border: [false, false, false, true],
				},
			],
		],
	},
};
// prettier-ignore
var part_41C_occupation = {
	table: {
		widths: [34, 120, 100, 120, 100],
		body: [
			["", "", { text: "" }, "", ""],
			["5.1", "Occupation Date:", { style: "bold", text: "occupationDate" }, "Occupational Rent:", { style: "bold", text: "R occupationalRent" }],
			["", "", { text: "" }, "", ""],
			["5.2", "Possession Date:", { style: "bold", text: "possessionDate", colSpan: 3 }, "", ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_41D_agent_heading = {
	table: {
		widths: [34, "*"],
		body: [
			[
				{ text: "", border: [false, false, false, false] },
				{
					margin: [-5, 0, 0, 0],
					text: "Estate Agent and Conveyancer",
					border: [false, false, false, true],
				},
			],
		],
	},
};
// prettier-ignore
var part_41D_agent = {
	table: {
		widths: [34, 120, 100, 120, 100],
		body: [
			["", "", { text: "" }, "", ""],
			["6.1", "Agency:", { style: "bold", text: "agencyName" }, "Agent:", { style: "bold", text: "agentName" }],
			["", "", { text: "" }, "", ""],
			["6.2", { text: "Commission Percentage" }, { style: "bold", text: "commissionPercentage %" }, "", ""],
			["", "", { text: "" }, "", ""],
			["6.3", "Conveyancer:", { style: "bold", text: "conveyancerName" }, "Tel No:", { style: "bold", text: "conveyancerTelNumber" }],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_41E_fixtures_heading = {
	table: {
		widths: [34, "*"],
		body: [
			[
				{ text: "", border: [false, false, false, false] },
				{
					margin: [-5, 0, 0, 0],
					text: "Fixtures and Fittings",
					border: [false, false, false, true],
				},
			],
		],
	},
};
// prettier-ignore
var part_41E_fixtures = {
	table: {
		widths: [34, 120, 100, 100, 100],
		body: [
			["", "", { text: "" }, "", ""],
			["7.1", { text: "Fixtures/fittings included, refer to clause 32:", colSpan: 4 }, "", "", ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_5_fixtures = {
	table: {
		widths: [34, "*"],
		body: [
			["7.2", { text: "Fixtures/fittings excluded:" }],
			["", { style: "parSpaceAfter", ul: ["item 1", "item 2", "item 3"] }],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_6_condtitionA_heading = {
	table: {
		widths: [34, "*"],
		body: [
			[
				{ text: "", border: [false, false, false, false] },
				{
					margin: [-5, 0, 0, 0],
					text: "Acceptance Period",
					border: [false, false, false, true],
				},
			],
		],
	},
};
// prettier-ignore
var part_6_condtitionA = {
	table: {
		widths: [34, "*"],
		body: [
			["", ""],
			[
				"8.1",
				{
					style: "justify",
					text:
						"The first signature to this agreement shall constitute an irrevocable offer, which may not be withdrawn prior to presentation to the Seller or the Purchaser, which ever the case may be, and which thereafter shall remain available for acceptance until acceptanceTime on acceptanceDate whereafter it shall lapse and be of no further force and effect.",
				},
			],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_6_condtitionB_heading = {
	table: {
		widths: [34, "*"],
		body: [
			[
				{ text: "", border: [false, false, false, false] },
				{
					margin: [-5, 0, 0, 0],
					text: "Signature in Counterparts",
					border: [false, false, false, true],
				},
			],
		],
	},
};
// prettier-ignore
var part_6_condtitionB = {
	table: {
		widths: [34, "*"],
		body: [
			["", ""],
			[
				"9.1",
				{
					style: "justify",
					text:
						"This Offer to Purchase may be signed in separate counterparts, each of which shall be deemed to be an original and all of which, taken together, shall constitute one and the same instrument. A counterpart of this Offer to Purchase in telefax form or a scanned document via email shall be conclusive evidence of the original signature and shall be as effective in law as the counterparts in original form showing the original signatures.",
				},
			],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_6_condtitionC_heading = {
	table: {
		widths: [34, "*"],
		body: [
			[
				{ text: "", border: [false, false, false, false] },
				{
					margin: [-5, 0, 0, 0],
					text: "Acceptance of Offer",
					border: [false, false, false, true],
				},
			],
		],
	},
};
// prettier-ignore
var part_6_condtitionC = {
	table: {
		widths: [34, "*"],
		body: [
			["", ""],
			[
				"10.1",
				{
					style: "justify",
					text:
						"The parties acknowledge that the signature by the first signing of the parties shall constitute an offer in favour of the other party to enter into this Agreement upon the terms and conditions recorded in The Schedule, in the Special Conditions (if any) and in Annexure “A”, which shall remain open for acceptance and shall be irrevocable until the time and date referred to in Clause 8 of the Schedule.",
				},
			],
			["", ""],
			[
				"10.2",
				{
					style: "justify",
					text:
						"The agreement will be deemed to have been duly concluded upon the timeous signature by the Seller and its validity will in no way be dependant upon the fact of such signature being communicated to the Purchaser.",
				},
			],
			["", ""],
			[
				"10.3",
				{
					style: "justify",
					text:
						"In the event of a signatory signing this Agreement he/she, warrants that consent of a spouse or resolution from a legal entity is not required by law to bring about a lawful contract.",
				},
			],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_70_purchaser_heading = {
	table: {
		widths: [34, "*"],
		body: [
			[
				{ text: "", border: [false, false, false, false] },
				{
					margin: [-5, 0, 0, 0],
					text: "Purchaser Signature",
					border: [false, false, false, true],
				},
			],
		],
	},
};
// prettier-ignore
var part_71_signature_purchaser_one = {
	table: {
		widths: [34, 119, 118, 119, 118],
		body: [
			["", "", "", "", ""],
			["11.1", { text: "Purchaser", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ______ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "purchaserName1 purchaserSurname1", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_72_signature_purchaser_two = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			["11.1", { text: "Purchaser 1", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at __________ at ______ am/pm on this _____ day of ____________ 20__",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "purchaserName1 purchaserSurname1", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["11.2", { text: "Purchaser 2", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at __________ at ______ am/pm on this _____ day of ____________ 20__",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "purchaserName2 purchaserSurname2", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_73_signature_purchaser_company = {
	table: {
		widths: [34, 121, 121, 121, "*"],
		body: [
			["", "", "", "", ""],
			["11.1", { text: "Purchaser", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text:
						"Signed on behalf of purchaserCompanyName with Registration Number purchaserCompanyRegistrationNumber by purchaserCompanyRepresentativeName on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],

			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "purchaserCompanyRepresentativeName", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_74_signature_purchaser_trust = {
	table: {
		widths: [34, 121, 121, 121, "*"],
		body: [
			["", "", "", "", ""],
			["11.1", { text: "Purchaser", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text:
						"Signed on behalf of purchaserTrustName with Registration Number purchaserTrustRegistrationNumber by purchaserTrustRepresentativeName on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],

			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "purchaserTrustRepresentativeName", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_80_seller_heading = {
	table: {
		widths: [34, "*"],
		body: [
			[
				{ text: "", border: [false, false, false, false] },
				{
					margin: [-5, 0, 0, 0],
					text: "Seller Signature",
					border: [false, false, false, true],
				},
			],
		],
	},
};
// prettier-ignore
var part_81_signature_seller_one = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			["", "", "", "", ""],
			["12.1", { text: "Seller", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at ____________________ at ________ am/pm on this ______ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName1 sellerSurname1", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_82_signature_seller_two = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			["", "", "", "", ""],
			["12.1", { text: "Seller 1", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName1 sellerSurname1", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["12.2", { text: "Seller 2", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName2 sellerSurname2", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_83_signature_seller_company = {
	table: {
		widths: [34, 121, 121, 121, "*"],
		body: [
			["", "", "", "", ""],
			["12.1", { text: "Seller", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text:
						"Signed on behalf of sellerCompanyName with Registration Number sellerCompanyRegistrationNumber by sellerCompanyRepresentativeName on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],

			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerCompanyRepresentativeName", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_84_signature_seller_trust = {
	table: {
		widths: [34, 121, 121, 121, "*"],
		body: [
			["", "", "", "", ""],
			["12.1", { text: "Seller", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text:
						"Signed on behalf of sellerTrustName with Registration Number sellerTrustRegistrationNumber by sellerTrustRepresentativeName on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],

			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerTrustRepresentativeName", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};

// prettier-ignore
var part_85_signature_seller_1_seller_2 = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			["", "", "", "", ""],
			["12.1", { text: "Seller 1", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName1 sellerSurname1", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["12.2", { text: "Seller 2", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName3 sellerSurname3", colSpan: 2 }, ""],
			["\n", "", "", "", ""],


		],
	},
	layout: "noBorders",
}
// prettier-ignore
var part_86_signature_seller_1S_seller_2 = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			["", "", "", "", ""],
			["12.1", { text: "Seller 1", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName1 sellerSurname1", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["12.2", { text: "Seller 2", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName2 sellerSurname2", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["12.3", { text: "Seller 3", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName3 sellerSurname3", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
		],
	},
	layout: "noBorders",
}

// prettier-ignore
var part_87_signature_seller_1S_seller_2S = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			["", "", "", "", ""],
			["12.1", { text: "Seller 1", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName1 sellerSurname1", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["12.2", { text: "Seller 2", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName2 sellerSurname2", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["12.3", { text: "Seller 3", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName3 sellerSurname3", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["12.4", { text: "Seller 4", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName4 sellerSurname4", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
		],
	},
	layout: "noBorders",
}
// prettier-ignore
var part_88_signature_seller_1_seller_2S = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			["", "", "", "", ""],
			["12.1", { text: "Seller 1", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName1 sellerSurname1", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["12.2", { text: "Seller 2", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName3 sellerSurname3", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["12.3", { text: "Seller 3", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName4 sellerSurname4", colSpan: 2 }, ""],
			["\n", "", "", "", ""],

		],
	},
	layout: "noBorders",
}

// prettier-ignore
var part_9_definitians = {
	table: {
		widths: [34, "*"],
		body: [
			[{ text: "1." }, { style: "header2", text: "DEFINITIONS" }],
			[
				"1.1",
				{
					style: "parEnd",
					text: "In this Agreement unless the context clearly indicates the contrary, the following terms shall have the meanings assigned to them hereunder:",
				},
			],
			[
				"1.1.1",
				{
					style: "parEnd",
					text:
						'"the Schedule" shall mean the Schedule appearing at the beginning of this Agreement and Schedule 1, which Schedules form part of this Agreement.',
				},
			],
			[
				"1.1.2",
				{
					style: "parEnd",
					text:
						'"the Seller" shall mean the persons, companies or other legal entities their Heirs, Administrators, Executors or Assigns referred to in Clause 1 of the Schedule.',
				},
			],
			[
				"1.1.3",
				{
					style: "parEnd",
					text:
						'"the Purchaser" shall mean the persons, companies or other legal entities their Heirs, Executors, Administrators or Assigns referred to in Clause 2 of the Schedule, jointly and severally.',
				},
			],
			[
				"1.1.4",
				{
					style: "parEnd",
					text:
						'"the Property" shall mean the immovable Property referred to in Clause 3 of the Schedule,  which Property is situated at the street address referred to in Clause 3 of the Schedule.',
				},
			],
			[
				"1.2",
				{
					style: "parEnd",
					text:
						"Headings of clauses shall be deemed to have been included for the purposes of convenience only and shall not affect the interpretation of this Agreement.",
				},
			],
			[
				"1.3",
				{
					style: "parEnd",
					text:
						"Unless inconsistent with the context, words relating to one gender shall include the other gender, words relating to the singular shall include the plural and vice versa and words relating to natural persons shall include associations of persons having corporate status by statute or common law.",
				},
			],
			["2.", { style: "header2", text: "SALE" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"The Seller hereby sells to the Purchaser who hereby purchases the Property for the purchase price referred to in Clause 4 of the Schedule, upon the terms and conditions contained herein.",
				},
			],
			["3.", { style: "header2", text: "PURCHASE PRICE" }],
			[
				"3.1",
				{
					style: "parEnd",
					text:
						"The purchase price payable by the Purchaser to the Seller for the Property shall be paid in cash against registration of transfer and shall be secured as follows:",
				},
			],
			[
				"3.1.1",
				{
					style: "parEnd",
					text:
						"The deposit referred to in Clause 4.2 of the Schedule, if applicable, shall be paid by no later than the date referred to in Clause 4.2 of the Schedule;",
				},
			],
			[
				"3.1.2",
				{
					style: "parEnd",
					text:
						"The loan amount referred to in Clause 10 of the Schedule, if applicable, shall be paid on registration of transfer and secured by a bank guarantee to be lodged with the Conveyancer upon Purchaser obtaining a quotation as referred to in the National Credit Act.",
				},
			],
			[
				"3.1.3",
				{
					style: "parEnd",
					text:
						"If the balance of the purchase price referred to in Clause 4.5 of the Schedule is to be paid from the proceeds of the sale of the Purchasers Property, the balance shall be secured by a bank guarantee or Attorney’s undertaking in a form acceptable by the Sellers conveyancers, within fourteen (14) days of the fulfilment of all suspensive conditions contained herein.",
				},
			],
			["4.", { style: "header2", text: "SUSPENSIVE CONDITIONS" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"In the event of a loan amount being specified in Clause 4.3 of the Schedule then this Agreement shall be subject to the Purchaser obtaining an AIP (Approval in Principle) as referred to in the National Credit Act from a Financial Institution on security of a first mortgage bond to be registered against the property for the amount referred to therein, or such lesser amount acceptable to the Purchaser, by no later than the date referred to in Clause 4.3 of the Schedule, failing which this Agreement shall lapse and be of no further force or effect.",
				},
			],
			["5.", { style: "header2", text: "PRIOR SALE" }],
			[
				"5.1.1",
				{
					style: "parEnd",
					text:
						"This agreement is subject to condition that the Purchaser sells his property referred to in Clause 4.6 of the Schedule (if applicable) by no later than the date referred to in Clause 4.5 of the Schedule. This condition shall be deemed to have been fulfilled upon receipt of written confirmation of such sale by the Agent within the aforesaid period, failing which this agreement shall lapse and be of no further force or effect.",
				},
			],
			[
				"5.1.2",
				{
					style: "parEnd",
					text:
						"The Purchaser acknowledges that , until the suspensive conditions referred to in Clause 4.5 of the Schedule have been met , the Seller may continue to market his/her property , and should the Seller receive a further, more favourable, non-subjective offer whereby  all conditions in such agreement have been met ,  and final bond grant has been provided, this Purchaser will then be placed on 3 (three) calendar days written notice by the Seller to waive all suspensive conditions within this period failing which this offer will cease and be of no further force or effect. Should the Purchaser waive then he/she shall provide the Conveyancer with guarantees for the full purchase price within 7 (seven) days of such waiver.",
				},
			],
			[
				"5.2",
				{
					style: "parEnd",
					text:
						"The Seller acknowledges that the Purchaser requires the balance of the Purchase Price, transfer and bond costs  (delete whichever is not applicable) from the proceeds of the sale of his/her property and hereby undertakes to obtain a guarantee or letter of undertaking on written request by the Agent or Conveyancer for such amount.",
				},
			],
			[
				"5.3",
				{
					style: "parEnd",
					text:
						"Should the sale of the Purchaser’s property not be transferred within 90 days of the suspensive conditions in that agreement becoming conclusive then the Seller may elect to cancel this agreement by giving 7 days written notice to such effect. In this event the Conveyancers shall be entitled to their wasted costs from the Purchaser.",
				},
			],
			["6.", { style: "header2", text: "POSSESSION AND OCCUPATION" }],
			[
				"6.1",
				{
					style: "parEnd",
					text:
						"Vacant occupation of the property shall be given by the Seller to the Purchaser on the date referred to in Clause 5.1 of the Schedule. The Purchaser undertakes to maintain the property in the condition in which it was on occupation date.",
				},
			],
			[
				"6.2",
				{
					style: "parEnd",
					text:
						"Should the Purchaser take occupation of the property prior to registration of transfer, the Purchaser shall pay the Seller an agreed occupation rental in the sum referred to in Clause 5.1 of the Schedule calculated from the date mentioned in clause 5.1 of the schedule to the day immediately prior to the date of registration of transfer, both days inclusive.  Such payments are to be made monthly in advance on the first of each and every month to the Seller without deduction or demand. ",
				},
			],
			[
				"6.3",
				{
					style: "parEnd",
					text:
						"Should transfer be registered before the Purchaser takes occupation, the Seller shall pay the Purchaser from date of registration of transfer to the date the Purchaser takes occupation in the same manner set out above.",
				},
			],
			[
				"6.4",
				{
					style: "parEnd",
					text:
						"Possession of the property shall take place on the date in clause 5.2 of the Schedule from which date risk in and to the property shall pass to the Purchaser and from which date he/she shall be liable for payment of rates and or levies and all outgoings in respect of the property and shall likewise be entitled to all income and other benefits there from.",
				},
			],
			[
				"6.5",
				{
					style: "parEnd",
					text:
						"The Seller shall be fully responsible for the upkeep and maintenance of the property to date of occupation by the Purchaser, the Purchaser being entitled to take occupation of the property in the same condition as on viewing the property",
				},
			],

			["7.", { style: "header2", text: "VOETSTOOTS" }],
			[
				"7.1",
				{
					style: "parEnd",
					text:
						"The Purchaser agrees and acknowledges that the property is purchased voetstoots, absolutely as it stands and without any warranties, expressed or implied.  The Purchaser is deemed to have made himself acquainted with the property, its nature, condition, extent, beacons, locality and subject to all defects, whether latent or patent, and all servitudes and conditions to which the property maybe subject whether contained in the Title Deeds or otherwise, the Seller and / or the Agents being entirely free from all liability in respect thereof.",
				},
			],
			[
				"7.2",
				{
					style: "parEnd",
					text:
						"The Seller, to the best of his/her knowledge confirms that at the time of signing this agreement, he/she is not aware of any major defects to the property except for those items disclosed on Annexure “A” attached.",
				},
			],
			[
				"7.3",
				{
					style: "parEnd",
					text:
						"The terms on which the property is let (if applicable) have been disclosed to the Purchaser and he is fully aware and has been informed of the tenant’s statutory rights.",
				},
			],
			[
				"7.4",
				{
					style: "parEnd",
					text:
						"If the Property has been erroneously described herein, such mistake or error shall not be binding on the SELLER but the description of the Property as set out in the SELLER’S title deed shall apply and in such event, the parties hereto agree to the rectification thereof to conform to the intention of the parties.  It is further noted and agreed that if the Surveyor-General has altered the description of the Property in pursuance of any scheme of revision of numbering of Lots in any municipal area that the new description shall apply and if necessary, both SELLER and PURCHASER will agree to the rectification thereof to conform to the intention of the parties and will sign all necessary documents reflecting such amended description.",
				},
			],
			[
				"7.5",
				{
					style: "parEnd",
					text:
						"Notwithstanding the provisions of paragraph 7.1, the SELLER warrants that the Property has been built according to plans approved by the Local Authority and that all building plans and by-laws have been complied with, to the satisfaction of the Local Authority.   In the event that the Property has not been built according to such plans, or in the event that any building laws or by-laws have not been complied with to the satisfaction of the Local Authority, the SELLER shall ensure that building plans be submitted and passed and such laws complied with (and an occupation certificate issued), within a period of  eighty (80) days of this Agreement, at his own expense. The parties agree that in this event, transfer may be affected but the conveyancers shall retain R50 000.00 from the proceeds of the sale to ensure that the occupation certificate is issued. Once they are in receipt of the occupation certificate they shall refund the SELLER the retained funds. Should the SELLER fail to obtain the necessary certificate due to his failure to act timeously (not just as a result of the Local Authority not passing the plans in time) then the deposit may be used to attend to the necessary.",
				},
			],
			["8.", { style: "header2", text: "TRANSFER" }],
			[
				"8.1",
				{
					style: "parEnd",
					text:
						"Registration of transfer of the unit shall be affected by the Conveyancers referred to in clause 6.3 of the Schedule and registration of transfer shall take place as close as possible to the occupation date referred to in clause 5.1 of the Schedule.",
				},
			],
			[
				"8.2",
				{
					style: "parEnd",
					text:
						"All conveyancing fees and disbursements incidental to the preparation and registration of transfer and bonds including transfer duty, as well as an estimate of the Purchaser’s pro rata share of any rates, levies and the like, shall be paid by the Purchaser to the Conveyancer upon request whether verbal or in writing.",
				},
			],
			[
				"8.3",
				{
					style: "parEnd",
					text:
						"The Purchaser and Seller acknowledge that failure to comply with the request by the Conveyancers to furnish information or documents, or to sign their Transfer and Bond documents, or to pay conveyancing costs, shall constitute a breach of such parties obligations and shall entitle the other party to give notice in terms of clause 11.1 hereof.",
				},
			],
			[
				"8.4",
				{
					style: "parEnd",
					text:
						"The Conveyancer on behalf of the Seller shall obtain the necessary clearance certificate from the relevant Local Authority in terms of Section 118 of the Municipal Systems Act 32 of 2000 (as amended). The Conveyancer hereby warrants and acknowledges that once the necessary Clearance Certificate figures have been obtained from the relevant Local Authority, full payment of the outstanding debt shall be made and shall not limit such payment in terms of Section 118(1) of the Municipal Systems Act (as amended) to an amount equal to the outstanding figures for a period of 2 (two) years preceding the application for rates clearances. The Seller hereby indemnifies the Purchaser against any claims which may be instituted by the local authority in respect of any debts which arose prior to the date of Transfer of the Property into the name of the Purchaser.",
				},
			],
			[
				"8.5",
				{
					style: "parEnd",
					text:
						"The Purchaser shall not be entitled to transfer of the property until the whole of the purchase price, costs, interest and other charges have been paid or secured to the Conveyancer’s satisfaction.  Upon registration of transfer an adjustment in respect of occupational rental, rates and other charges relating to the property shall be made by the Conveyancers.",
				},
			],
			["9.", { style: "header2", text: "ESTATE AGENT" }],
			[
				"9.1",
				{
					style: "parEnd",
					text:
						"The PURCHASER AND SELLER warrant that the PURCHASER was introduced to the property by agentName of agencyName (hereinafter referred to as the “Agent”) and by no other Agent and that no other Agent was the effective cause of the sale.",
				},
			],
			[
				"9.2",
				{
					style: "parEnd",
					text: "The Seller shall pay to the Agent a Commission referred to in Clause 6.2. of the Schedule.",
				},
			],

			[
				"9.3",
				{
					style: "parEnd",
					text:
						"The SELLER shall pay Agent’s commission to the AGENT, who will receive the comission as referred to in Clause 6.1., which commission will be earned upon acceptance of this offer and the subsequent fulfilment of any suspensive conditions contained herein, and shall be payable not later than the date of transfer of the Property into the name of the PURCHASER. Provided, however, that in the event that the sale is cancelled ",
				},
			],
			[
				"9.3.1",
				{
					style: "parEnd",
					text: "due to default by either the SELLER or the PURCHASER, the defaulting party shall be liable for payment of commission as aforesaid; OR",
				},
			],
			[
				"9.3.2",
				{
					style: "parEnd",
					text:
						"by mutual agreement between the SELLER and the PURCHASER; the SELLER shall remain liable for payment of commission as aforesaid; which commission shall become due and payable forthwith upon such cancellation. This clause shall be deemed to have survived any cancellation of the sale and remain enforceable by the AGENT",
				},
			],
			[
				"9.4",
				{
					style: "parEnd",
					text:
						"AGENT’S commission shall be a first charge against any deposit held by the AGENT or the CONVEYANCERS and the SELLER hereby irrevocably authorises and instructs the attorney attending to the transfer of the Property to effect payment of the AGENT’S commission, or the balance thereof, in terms of this clause, forthwith upon such commission becoming due and payable.",
				},
			],
			[
				"9.5",
				{
					style: "parEnd",
					text:
						"The AGENT shall not be responsible in any way for any defects or other errors in the description of the Property or for any other matter relating to it whether so described by the SELLER or the AGENT and the AGENT is not responsible in any way whatever for the carrying out of the terms of this Agreement by either party notwithstanding that the AGENT may assist one or both parties towards the completion of the transaction whether by way of raising the bonds or otherwise, or any misrepresentation that may have been made by either the SELLER or PURCHASER.",
				},
			],
			[
				"9.6",
				{
					style: "parEnd",
					text:
						"In the event that there are not sufficient funds payable from the proceeds of the sale to cover the Agent’s commission, the CONVEYANCERS are hereby irrevocably instructed not to effect transfer until such shortfall has been secured.",
				},
			],
			["10.", { style: "header2", text: "MORA INTEREST" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"In the event of there being any delay in connection with the registration of transfer for which the Purchaser is responsible, the Purchaser undertakes, in addition to any payment due, to pay interest on the full purchase price at the current prime lending rate of The Reserve Bank of South Africa, calculated from the date that the Purchaser has been notified in writing by the Seller, the Seller’s Agent or Conveyancer’s, as being in mora, to the date upon which the Purchaser has ceased to be in mora.",
				},
			],
			["11.", { style: "header2", text: "BREACH" }],
			[
				"11.1",
				{
					style: "parEnd",
					text:
						"Should the Purchaser or Seller commit any breach of the provisions of this agreement, all of which shall be deemed to be material, and fail to remedy such breach within seven (7) days of receipt of a written notice given to him/her by the aggrieved party or on their behalf calling upon the defaulting party to remedy such breach then the aggrieved party shall be entitled at his/her election and without prejudice to any other rights which he/she may have at law out of this agreement either to cancel this agreement forthwith by notice in writing to the other party or claim specific performance of all the defaulting party’s obligations whether or not same are then due for performance or not.   The Party causing cancellation of the agreement shall be responsible for the payment of the Agent’s commission.",
				},
			],
			[
				"11.2.1",
				{
					style: "parEnd",
					text:
						"In the event of the Purchaser cancelling this agreement then the Seller shall, without prejudice to any of his/her rights to recover damages howsoever incurred as a result of such cancellation, be entitled to retake possession of the property and demand that all monies paid by the Purchaser to the Conveyancers, including interest thereon, be retained by the Conveyancers pending the outcome of Clause 11.2.2",
				},
			],
			[
				"11.2.2",
				{
					style: "parEnd",
					text:
						"Claim such damages as the Seller may have actually suffered and to resell the property and appropriate the proceeds thereof to the claim of the Seller, in which case any amounts retained in terms of Clause 11.2.1 shall be set off or partially set off against the damages claimed by the Seller.",
				},
			],
			[
				"11.3",
				{
					style: "parEnd",
					text: "Any improvements made to the property shall become the property of the Seller without compensation to the Purchaser.",
				},
			],
			[
				"11.4",
				{
					style: "parEnd",
					text:
						"For the purposes of all proceedings arising out of this Agreement the parties hereby consent to the jurisdiction of the Magistrates Court having jurisdiction over them, but the Seller shall not be precluded from instituting proceedings in any other competent Court.",
				},
			],
			[
				"11.5",
				{
					style: "parEnd",
					text:
						"Should the Seller or Purchaser consult an attorney in relation to any breach by the Seller/ Purchaser of his/her obligations in terms of this Agreement, then the Seller/ Purchaser shall be obliged to pay all legal costs incurred on an Attorney and own client scale.",
				},
			],
			["12.", { style: "header2", text: "ALTERATION AND IMPROVEMENTS" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"Pending transfer, the Purchaser shall not, without the prior written consent of the Seller, which consent shall not be unreasonably withheld, make any structural improvements to the property nor alterations to any existing improvements thereon nor remove, destroy or cut down any shrubs, hedges, creepers or trees.",
				},
			],
			["13.", { style: "header2", text: "DOMICILIA" }],
			[
				"13.1",
				{
					style: "parEnd",
					text:
						"All notices by one party to the other shall be given in writing by prepaid registered post, email, fax or delivered by hand to the Seller at the address, email or fax number referred to in Clause 2 of the Schedule and the Purchaser at the address, email or fax number referred to in Clause 4 of the Schedule which addresses, fax numbers and email addresses the parties choose as their respective domicilia citandi et executandi.",
				},
			],
			[
				"13.2",
				{
					style: "parEnd",
					text:
						"Any notice dispatched by hand, fax or email shall be deemed to have been received on the date of delivery thereof, date of email or fax transmission and pre-paid registered post on the 4th day after posting.",
				},
			],
			["14.", { style: "header2", text: "ENTOMOLOGIST’S CERTIFICATE (IF APPLICABLE)" }],
			[
				"14.1",
				{
					style: "parEnd",
					text:
						"The Seller shall, at his expense and upon fulfilment of all suspensive conditions contained herein, cause all buildings on the property to be inspected by a Government approved entomologist and, furnish to the Purchaser a certificate by the said entomologist that such inspection disclosed no visible sign of active infestation of the buildings by timber destroying insects or damage thereby that in the Eradicator’s opinion should be treated, repaired or replaced.",
				},
			],
			[
				"14.2",
				{
					style: "parEnd",
					text:
						"Should there be evidence of infestation or damage that the Eradicator recommends should be treated, repaired or replaced, the Seller shall, within 21 (twenty one) days of receipt of such report carry out such treatment and repair and replace such damaged and obtain the clearance certificate referred to in sub-paragraph 15.1 above.",
				},
			],
			[
				"15.",
				{
					style: "header2",
					text: "ELECTRICAL INSTALLATION COMPLIANCE CERTIFICATE",
				},
			],
			[
				"",
				{
					style: "parEnd",
					text:
						"The Seller shall, at his expense and upon fulfilment of all suspensive conditions contained herein arrange for an accredited person registered with the Electrical Contracting Board of South Africa to inspect the property and issue a valid Certificate of Compliance in terms of Government Regulation No. 2920 of 1992.  Should the aforesaid accredited person report that there is a fault or defect in the electrical installation, the Seller shall be obliged, at his expense, within 21 (twenty one) days of receipt of such report and recommendations, to contact an electrical contractor or any other qualified person to carry out the repairs as recommended so as to enable the accredited person to issue the Certificate aforesaid.",
				},
			],
			["16.", { style: "header2", text: "ELECTRIC FENCE SYSTEM CERTIFICATE (IF APPLICABLE)" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"The Seller shall obtain at his cost the required Electric Fence System Certificate as mentioned in Regulation 12 of the Electrical Machinery Regulations, 2011 promulgated in terms of the Occupational Health and Safety Act 1983 (Act No 6 of 1983) in respect of the electric fence  system and deliver the said Electric Fence System Certificate to the Purchaser within 15 days of acceptance of this offer by the Seller.  If the electric fence system on the premises is faulty, the Seller shall at his cost repair the electrical fence system in order to deliver the required Electric Fence System Certificate to the Purchaser.  The Seller undertakes not to make any alterations to the electrical fence system after the issue of the certificate.  If the certificate has not been delivered within the period referred to above, the Purchaser shall be entitled but not obliged to obtain an Electric Fence System Certificate in respect of such system at his own costs and the Conveyancer is hereby irrevocably instructed to pay to the Purchaser from the proceeds of the sale, on the date of registration of transfer of the Property into the name of the Purchaser, the costs incurred by the Purchaser of obtaining such Electric Fence System Certificate (including the costs of effecting any rectifications or repairs to enable the relevant party to issue such certificate). ",
				},
			],
			[
				"17.",
				{
					style: "header2",
					text: "GAS INSTALLATION COMPLIANCE CERTIFICATE",
				},
			],
			[
				"",
				{
					style: "parEnd",
					text:
						"The Seller shall, at his expense and within 14 (fourteen) days of fulfilment of all suspensive conditions contained herein arrange for an accredited person to inspect all gas installations including outside gas appliances and issue a valid Certificate of Compliance.  Should the aforesaid accredited person report that there is a fault or defect in the gas installation, the Seller shall be obliged, at his expense, within 21 (twenty one) days of receipt of such report and recommendations, to carry out the repairs as recommended so as to enable the accredited person to issue the Certificate aforesaid.",
				},
			],
			["18.", { style: "header2", text: "RECEIVER OF REVENUE" }],
			[
				"18.1",
				{
					style: "parEnd",
					text:
						"The Purchaser and Seller are aware that Transfer Duty Clearance cannot be obtained in the event that either of their tax affairs not being in order and warrant that all their Tax Returns, Income Tax payments and if applicable Vat returns and VAT payments are up to date and in order.",
				},
			],
			[
				"18.2",
				{
					style: "parEnd",
					text:
						"In the event of the Purchaser Price as referred to in Clause 8 of the Schedule being R2 000 000.00 (Two million rand) or more and the Seller a non-South African resident, in terms of Section 35A of the Income Tax Act the Purchaser is obliged to withhold a certain percentage (Natural person 5%; Company or Close Corporation 7.5%; Trust 10%) of the purchase price payable to the Seller and pay this to SARS as an advance in terms of the Seller’s liability for tax for the year of assessment within 14 days of registration of transfer and the parties hereby irrevocably instruct and authorise the Conveyancer to make payment to SARS accordingly.",
				},
			],
			[
				"18.3",
				{
					style: "parEnd",
					text:
						"The Seller hereby indemnifies both the Estate Agent and the Conveyancer against any claim howsoever arising by virtue of the Estate Agent and Conveyancer having acted in terms of the Section 35A or on information supplied by the Seller or from any other source.  The Seller further waives any claim howsoever arising against the Estate Agent and/or Conveyancer arising from any act or omission by the Conveyancer and/or the Estate Agent in their acting in terms of the Act.",
				},
			],
			["19.", { style: "header2", text: "VAT" }],
			[
				"19.1",
				{
					style: "parEnd",
					text:
						"The Seller hereby warrants that he/she is not / neither required to register as a vendor within the meaning of the VAT Act and that consequently no VAT is payable pursuant to this sale;  or",
				},
			],
			[
				"19.2",
				{
					style: "parEnd",
					text:
						"The Seller declares that he/she is a vendor within the mean of the VAT Act and the sale consequently attracts the payment of VAT.  It is accordingly agreed that:",
				},
			],
			[
				"19.2.1",
				{
					style: "parEnd",
					text: "The Purchase price described in clause 8 hereof shall be deemed to include VAT;",
				},
			],
			[
				"19.2.2",
				{
					style: "parEnd",
					text:
						"The Seller irrevocably instructs the conveyancing attorneys to establish such certificates, guarantees, payments or undertakings payable out of the proceeds of the sale upon registration of transfer as the Receiver of Revenue may require",
				},
			],
			[
				"19.2.3",
				{
					style: "parEnd",
					text:
						"The Seller shall furnish tax invoices to the Purchaser or the Seller as the case may be within 21 days of the liability for VAT payment arising should such tax invoices be requested by the Purchaser or the Seller respectively as the context may require.",
				},
			],
			["20", { style: "header2", text: "SECTIONAL TITLE PROVISIONS" }],
			["", { style: "parEnd", text: "It is agreed between the parties that:" }],
			[
				"20.1",
				{
					style: "parEnd",
					text:
						"The Seller shall not be liable for the levies and other costs due and payable to the Body Corporate as from the date of registration of transfer into the Purchaser’s name.  Accordingly, the Purchaser shall be liable and shall pay all levies and other costs due to the Body Corporate from the date of registration of transfer.  The Purchaser hereby indemnifies the Seller against any claims in terms of Section 37 of the Sectional Titles Act.  If after registration of the transfer, the Body Corporate imposes a special levy to meet expenses which have been under-estimated for any period up to the date of registration of transfer, the Seller shall refund to the Purchaser such amount which it becomes payable by the Purchaser.  If after acceptance hereof, but before transfer is effected, the Body Corporate passes any resolution imposing a special levy to cater for any future improvements to the scheme, the Purchaser shall be liable for the payment thereof.  The Seller warrants that he is not aware of any pending resolution.",
				},
			],
			[
				"20.2",
				{
					style: "parEnd",
					text:
						"The property is sold subject to all the provisions of the Sectional Title Act 95 of 1986 (as amended) and subject to the provisions of the rules of the body corporate lodged with the Registrar of Deeds in terms of Section 27 of the Sectional Titles Act.  The Purchaser hereby undertakes to abide by all such rules and provisions of the Act and not to do anything which may cause the Seller to be in breach of its obligations to the body corporate from the occupation date.",
				},
			],
			[
				"20.3",
				{
					style: "parEnd",
					text:
						"The Seller warrants that he/she has not received any official notification nor is he/she aware of any special or unusual levy that the Body Corporate intends to be collected from owners in the Scheme",
				},
			],
			["21", { style: "header2", text: "RIGHT TO EXTEND SCHEME" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"*Delete if not applicable* It is hereby recorded that the developer / Body Corporate* has a real right to extend the Scheme pursuant to the provisions of Section 25 of the Sectional Titles Act 95 of 1986. (*Delete whichever does not apply*)",
				},
			],
			["22", { style: "header2", text: "JOINT AND SEVERAL LIABILITY" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"In the event of either party to this Agreement consisting of more than one person, then the liabilities of such persons to the other in terms of this Agreement shall be joint and several.",
				},
			],
			["23", { style: "header2", text: "SEVERABILITY" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"Should any portion or provision of this Agreement held to be void, invalid or unenforceable, for any reason whatsoever, then such provision or portion shall be deemed to be severable and excluded from this Agreement, and all the remaining terms shall continue to remain in full force and effect.",
				},
			],
			["24", { style: "header2", text: "GENERAL" }],
			[
				"24.1",
				{
					style: "parEnd",
					text:
						"The parties hereto acknowledge that this Agreement of Sale concluded between the Seller and the Purchaser constitutes the entire agreement between them and that no other conditions, stipulations, warranties or representations whatsoever have been made or implied by either party or the Agent, other than are specifically included herein. No alteration or amendment to this agreement shall be binding unless reduced to writing and signed by the parties.",
				},
			],
			[
				"24.2",
				{
					style: "parEnd",
					text:
						"Any extension or extensions of time granted for the making of any payments or other indulgences or concessions granted by the Seller, shall not prejudice any rights of the Seller under this agreement.",
				},
			],
			[
				"24.3",
				{
					style: "parEnd",
					text:
						"Whilst the Agency has taken all reasonable steps to obtain and verify all relevant information regarding the Property from the Seller, including possible presence of latent and patent defects, it does not assume any liability in respect of incorrect information supplied by the Seller.",
				},
			],
			["25", { style: "header2", text: "CALCULATION OF DAYS" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"It is agreed that the calculation of any period of time for the purposes of this agreement shall be by the computatio civilis method (ie the first day shall be included in the period and the last day excluded). Weekends and public holidays shall be included in the calculation of days.",
				},
			],
			["26", { style: "header2", text: "CONSUMER PROTECTION ACT" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"The Seller warrants that he is an ordinary Seller who does not sell property in the ordinary course of business. The Consumer Protection Act therefore does not apply to the Sale of this Property.",
				},
			],
			[
				"27",
				{
					style: "header2",
					text: "NATIONAL ENVIRONMENTAL BIODIVERSITY ACT (ACT 10 OF 2004)",
				},
			],
			[
				"",
				{
					style: "parEnd",
					text:
						"The parties agree that the seller/s has/have complied with his/her obligations in terms of Section 29(3) of the Regulations of the National Environmental Management: Biodiversity Act 2004 (Act No 10 of 2004) and particularly with regards to the disclosures contained therein regarding the Alien and Invasive Species Lists 2014 published on the website of the Department of Environmental Affairs. www.environmental.gov.za",
				},
			],
			[
				"28",
				{
					style: "header2",
					text: "ELECTRONIC COMMUNICATIONS AND TRANSACTIONS ACT 25 OF 2002 (AS AMENDED) “ECTA”",
				},
			],
			[
				"",
				{
					style: "parEnd",
					text:
						"This agreement shall constitute the entire contract between the seller and the purchaser. The seller shall not be bound by any other preceding agreement, negotiations, terms or conditions, promises or statements, warranties or representations, express or implied made by the seller of any of its agents or any of its employees, or any other person purporting to act for or on behalf of the seller. No variation, amendment or consensual cancellation shall be of any force or effect unless reduced to writing and signed by the parties hereto by hand. For the avoidance of doubt the parties expressly agree that no variation, amendment or consensual cancellation shall arise pursuant to an exchange of “data” by means of an “electronic signature”, and an “advanced electronic signature” (as envisaged in the Electronic Communications and Communication Act 25 of 2002, (as amended) - (“ECTA”), or otherwise by means of electronic and/or written signed correspondence. Further the parties agree, to the extent allowed in law, that section 13 of ECTA 25 of 2002 shall not apply to this agreement. For the purposes of this agreement, the parties agree that the fact that their name or the name of the entity that they represent appears at or near the end of any email, electronic correspondence or other written correspondence shall not in any way be deemed or considereto be their signature or electronic signature.",
				},
			],
			["29", { style: "header2", text: "FICA REQUIREMENTS" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"The parties hereby undertake, within 5 days of being requested to do so, to furnish the Conveyancers and/or the Mortgage Originator with all the necessary documentation required by law in terms of the Financial Intelligence Centre Act.",
				},
			],
			[
				"30",
				{
					style: "header2",
					text: "PURCHASER A COMPANY, CLOSE CORPORATION OR TRUST",
				},
			],
			[
				"30.1",
				{
					style: "parEnd",
					text:
						"In the event of the PURCHASER acting in the capacity of an Agent or Trustee for a Company to be formed, the PURCHASER shall be personally liable should the Purchasing Company or Close Corporation not be formed within 30 (Thirty) days of date hereof, or if when it is formed it does not ratify this Agreement within 7 (Seven) days. In addition, the said PURCHASER shall be deemed to have guaranteed the obligations of the Company or Close Corporation to be formed in terms of this Agreement, as surety and co-principal debtor.",
				},
			],
			[
				"30.1",
				{
					style: "parEnd",
					text:
						"In the event of the PURCHASER acting on behalf of a Company, Corporation or Trust already formed he warrants that he has the necessary authority to act on behalf of such entity. Should he breach this warranty then he shall become jointly and severally liable in his personal capacity for the obligations of the Company, Trust or Close Corporation contemplated in terms of this agreement.",
				},
			],
			[
				"30.3",
				{
					style: "parEnd",
					text:
						"Should the SIGNATORY be acting in a representative capacity on behalf of an entity or trust and should that entity breach any of the terms of this agreement then he/she agrees to stand as surety and co-principal debtor with the entity and further shall become personally liable, in solidum therewith. The SIGNATORY specifically and waives the benefit of excussion, division, non causa debiti and revision of accounts.",
				},
			],
			["31.", { style: "header2", text: "ACCEPTANCE PERIOD" }],
			["", { style: "parEnd", text: "Refer to clause 20." }],
			["32", { style: "header2", text: "FIXTURES AND FITTINGS:" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"The Property is sold with all fixtures and fittings of a permanent nature, situated on/in it at the date of this offer, unless specifically excluded, which shall include but be limited to, stove/s and extractor fans, all light fittings, pelmets and curtain rails, fitted carpets, blinds and awnings, pumps and engines, pool equipment and automatic pool cleaner, fitted alarm systems, electronic consoles, and all keys, bar stools, all fences and gardens trees, pshrubs and plants, TV aerial, DSTV satellite dish, Gemini /wendy hut/s, bathroom mirrors, security gates, gas bottles, ceiling fans, air conditioners, all remotes. The Seller undertakes that all such fixtures and fittings are his property, are fully paid for at date of occupation. The Purchaser undertakes to maintain the fixtures and fittings in the same condition and from date of occupation to date of transfer.",
				},
			],
			[
				"33.",
				{
					style: "header2",
					text: "PURCHASER’S RIGHT OF REVOCATION (NOT APPLICABLE IF THE PURCHASE PRICE EXCES R250 000.00):",
				},
			],
			[
				"",
				{
					style: "parEnd",
					text:
						"The PURCHASER is, in terms of Section 29A of the Alienation Act 1981, as amended, entitled within 5 (FIVE) days after signature hereof by the PURCHASER, to revoke this offer or, in the event of the offer having been accepted by the SELLER, terminate his deed of alienation by delivering to the SELLER or his/her AGENT written notice to that effect in the manner prescribed in the said Act. The period of 5 days shall be calculated with the exclusion of the day upon which the offer or deed of alienation was signed by the PURCHASER, and of any Saturday, Sunday, or public holiday.",
				},
			],
			["34.", { style: "header2", text: "HEAT PUMP INSTALLATIONS" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"The PURCHASER is hereby made aware that in terms of SANS 10254, as from 29 December 2017, an owner is required to obtain a certificate of compliance in respect of any heat pump installations (i.e. geysers) when same is installed, maintained, repaired or replaced. The SELLER warrants that the geyser has not been tampered since this date and accordingly is not in possession of a compliance certificate. The PURCHASER shall accordingly be required to obtain same, should he maintain, replace or repair the geyser/s.",
				},
			],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_9_definitians_withoutEsateAgent = {
	table: {
		widths: [34, "*"],
		body: [
			[{ text: "1." }, { style: "header2", text: "DEFINITIONS" }],
			[
				"1.1",
				{
					style: "parEnd",
					text: "In this Agreement unless the context clearly indicates the contrary, the following terms shall have the meanings assigned to them hereunder:",
				},
			],
			[
				"1.1.1",
				{
					style: "parEnd",
					text:
						'"the Schedule" shall mean the Schedule appearing at the beginning of this Agreement and Schedule 1, which Schedules form part of this Agreement.',
				},
			],
			[
				"1.1.2",
				{
					style: "parEnd",
					text:
						'"the Seller" shall mean the persons, companies or other legal entities their Heirs, Administrators, Executors or Assigns referred to in Clause 1 of the Schedule.',
				},
			],
			[
				"1.1.3",
				{
					style: "parEnd",
					text:
						'"the Purchaser" shall mean the persons, companies or other legal entities their Heirs, Executors, Administrators or Assigns referred to in Clause 2 of the Schedule, jointly and severally.',
				},
			],
			[
				"1.1.4",
				{
					style: "parEnd",
					text:
						'"the Property" shall mean the immovable Property referred to in Clause 3 of the Schedule,  which Property is situated at the street address referred to in Clause 3 of the Schedule.',
				},
			],
			[
				"1.2",
				{
					style: "parEnd",
					text:
						"Headings of clauses shall be deemed to have been included for the purposes of convenience only and shall not affect the interpretation of this Agreement.",
				},
			],
			[
				"1.3",
				{
					style: "parEnd",
					text:
						"Unless inconsistent with the context, words relating to one gender shall include the other gender, words relating to the singular shall include the plural and vice versa and words relating to natural persons shall include associations of persons having corporate status by statute or common law.",
				},
			],
			["2.", { style: "header2", text: "SALE" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"The Seller hereby sells to the Purchaser who hereby purchases the Property for the purchase price referred to in Clause 4 of the Schedule, upon the terms and conditions contained herein.",
				},
			],
			["3.", { style: "header2", text: "PURCHASE PRICE" }],
			[
				"3.1",
				{
					style: "parEnd",
					text:
						"The purchase price payable by the Purchaser to the Seller for the Property shall be paid in cash against registration of transfer and shall be secured as follows:",
				},
			],
			[
				"3.1.1",
				{
					style: "parEnd",
					text:
						"The deposit referred to in Clause 4.2 of the Schedule, if applicable, shall be paid by no later than the date referred to in Clause 4.2 of the Schedule;",
				},
			],
			[
				"3.1.2",
				{
					style: "parEnd",
					text:
						"The loan amount referred to in Clause 10 of the Schedule, if applicable, shall be paid on registration of transfer and secured by a bank guarantee to be lodged with the Conveyancer upon Purchaser obtaining a quotation as referred to in the National Credit Act.",
				},
			],
			[
				"3.1.3",
				{
					style: "parEnd",
					text:
						"If the balance of the purchase price referred to in Clause 4.5 of the Schedule is to be paid from the proceeds of the sale of the Purchasers Property, the balance shall be secured by a bank guarantee or Attorney’s undertaking in a form acceptable by the Sellers conveyancers, within fourteen (14) days of the fulfilment of all suspensive conditions contained herein.",
				},
			],
			["4.", { style: "header2", text: "SUSPENSIVE CONDITIONS" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"In the event of a loan amount being specified in Clause 4.3 of the Schedule then this Agreement shall be subject to the Purchaser obtaining an AIP (Approval in Principle) as referred to in the National Credit Act from a Financial Institution on security of a first mortgage bond to be registered against the property for the amount referred to therein, or such lesser amount acceptable to the Purchaser, by no later than the date referred to in Clause 4.3 of the Schedule, failing which this Agreement shall lapse and be of no further force or effect.",
				},
			],
			["5.", { style: "header2", text: "PRIOR SALE" }],
			[
				"5.1.1",
				{
					style: "parEnd",
					text:
						"This agreement is subject to condition that the Purchaser sells his property referred to in Clause 4.6 of the Schedule (if applicable) by no later than the date referred to in Clause 4.5 of the Schedule. This condition shall be deemed to have been fulfilled upon receipt of written confirmation of such sale by the Agent within the aforesaid period, failing which this agreement shall lapse and be of no further force or effect.",
				},
			],
			[
				"5.1.2",
				{
					style: "parEnd",
					text:
						"The Purchaser acknowledges that , until the suspensive conditions referred to in Clause 4.5 of the Schedule have been met , the Seller may continue to market his/her property , and should the Seller receive a further, more favourable, non-subjective offer whereby  all conditions in such agreement have been met ,  and final bond grant has been provided, this Purchaser will then be placed on 3 (three) calendar days written notice by the Seller to waive all suspensive conditions within this period failing which this offer will cease and be of no further force or effect. Should the Purchaser waive then he/she shall provide the Conveyancer with guarantees for the full purchase price within 7 (seven) days of such waiver.",
				},
			],
			[
				"5.2",
				{
					style: "parEnd",
					text:
						"The Seller acknowledges that the Purchaser requires the balance of the Purchase Price, transfer and bond costs  (delete whichever is not applicable) from the proceeds of the sale of his/her property and hereby undertakes to obtain a guarantee or letter of undertaking on written request by the Agent or Conveyancer for such amount.",
				},
			],
			[
				"5.3",
				{
					style: "parEnd",
					text:
						"Should the sale of the Purchaser’s property not be transferred within 90 days of the suspensive conditions in that agreement becoming conclusive then the Seller may elect to cancel this agreement by giving 7 days written notice to such effect. In this event the Conveyancers shall be entitled to their wasted costs from the Purchaser.",
				},
			],
			["6.", { style: "header2", text: "POSSESSION AND OCCUPATION" }],
			[
				"6.1",
				{
					style: "parEnd",
					text:
						"Vacant occupation of the property shall be given by the Seller to the Purchaser on the date referred to in Clauses 5.1 and 5.2 of the Schedule. The Purchaser undertakes to maintain the property in the condition in which it was on occupation date.",
				},
			],
			[
				"6.2",
				{
					style: "parEnd",
					text:
						"Should the Purchaser take occupation of the property prior to registration of transfer, the Purchaser shall pay the Seller an agreed occupation rental in the sum referred to in Clause 5.1 of the Schedule calculated from the date mentioned in clause 5.1 of the schedule to the day immediately prior to the date of registration of transfer, both days inclusive.  Such payments are to be made monthly in advance on the first of each and every month to the Seller without deduction or demand. ",
				},
			],
			[
				"6.3",
				{
					style: "parEnd",
					text:
						"Should transfer be registered before the Purchaser takes occupation, the Seller shall pay the Purchaser from date of registration of transfer to the date the Purchaser takes occupation in the same manner set out above.",
				},
			],
			[
				"6.4",
				{
					style: "parEnd",
					text:
						"Possession of the property shall take place on the date in clause 5.2 of the Schedule from which date risk in and to the property shall pass to the Purchaser and from which date he/she shall be liable for payment of rates and or levies and all outgoings in respect of the property and shall likewise be entitled to all income and other benefits there from.",
				},
			],
			[
				"6.5",
				{
					style: "parEnd",
					text:
						"The Seller shall be fully responsible for the upkeep and maintenance of the property to date of occupation by the Purchaser, the Purchaser being entitled to take occupation of the property in the same condition as on viewing the property",
				},
			],

			["7.", { style: "header2", text: "VOETSTOOTS" }],
			[
				"7.1",
				{
					style: "parEnd",
					text:
						"The Purchaser agrees and acknowledges that the property is purchased voetstoots, absolutely as it stands and without any warranties, expressed or implied.  The Purchaser is deemed to have made himself acquainted with the property, its nature, condition, extent, beacons, locality and subject to all defects, whether latent or patent, and all servitudes and conditions to which the property maybe subject whether contained in the Title Deeds or otherwise, the Seller and / or the Agents being entirely free from all liability in respect thereof.",
				},
			],
			[
				"7.2",
				{
					style: "parEnd",
					text:
						"The Seller, to the best of his/her knowledge confirms that at the time of signing this agreement, he/she is not aware of any major defects to the property except for those items disclosed on Annexure “A” attached.",
				},
			],
			[
				"7.3",
				{
					style: "parEnd",
					text:
						"The terms on which the property is let (if applicable) have been disclosed to the Purchaser and he is fully aware and has been informed of the tenant’s statutory rights.",
				},
			],
			[
				"7.4",
				{
					style: "parEnd",
					text:
						"If the Property has been erroneously described herein, such mistake or error shall not be binding on the SELLER but the description of the Property as set out in the SELLER’S title deed shall apply and in such event, the parties hereto agree to the rectification thereof to conform to the intention of the parties.  It is further noted and agreed that if the Surveyor-General has altered the description of the Property in pursuance of any scheme of revision of numbering of Lots in any municipal area that the new description shall apply and if necessary, both SELLER and PURCHASER will agree to the rectification thereof to conform to the intention of the parties and will sign all necessary documents reflecting such amended description.",
				},
			],
			[
				"7.5",
				{
					style: "parEnd",
					text:
						"Notwithstanding the provisions of paragraph 7.1, the SELLER warrants that the Property has been built according to plans approved by the Local Authority and that all building plans and by-laws have been complied with, to the satisfaction of the Local Authority.   In the event that the Property has not been built according to such plans, or in the event that any building laws or by-laws have not been complied with to the satisfaction of the Local Authority, the SELLER shall ensure that building plans be submitted and passed and such laws complied with (and an occupation certificate issued), within a period of  eighty (80) days of this Agreement, at his own expense. The parties agree that in this event, transfer may be affected but the conveyancers shall retain R50 000.00 from the proceeds of the sale to ensure that the occupation certificate is issued. Once they are in receipt of the occupation certificate they shall refund the SELLER the retained funds. Should the SELLER fail to obtain the necessary certificate due to his failure to act timeously (not just as a result of the Local Authority not passing the plans in time) then the deposit may be used to attend to the necessary.",
				},
			],
			["8.", { style: "header2", text: "TRANSFER" }],
			[
				"8.1",
				{
					style: "parEnd",
					text:
						"Registration of transfer of the unit shall be affected by the Conveyancers referred to in clause 6.3 of the Schedule and registration of transfer shall take place as close as possible to the occupation date referred to in clause 5.1 of the Schedule.",
				},
			],
			[
				"8.2",
				{
					style: "parEnd",
					text:
						"All conveyancing fees and disbursements incidental to the preparation and registration of transfer and bonds including transfer duty, as well as an estimate of the Purchaser’s pro rata share of any rates, levies and the like, shall be paid by the Purchaser to the Conveyancer upon request whether verbal or in writing.",
				},
			],
			[
				"8.3",
				{
					style: "parEnd",
					text:
						"The Purchaser and Seller acknowledge that failure to comply with the request by the Conveyancers to furnish information or documents, or to sign their Transfer and Bond documents, or to pay conveyancing costs, shall constitute a breach of such parties obligations and shall entitle the other party to give notice in terms of clause 11.1 hereof.",
				},
			],
			[
				"8.4",
				{
					style: "parEnd",
					text:
						"The Conveyancer on behalf of the Seller shall obtain the necessary clearance certificate from the relevant Local Authority in terms of Section 118 of the Municipal Systems Act 32 of 2000 (as amended). The Conveyancer hereby warrants and acknowledges that once the necessary Clearance Certificate figures have been obtained from the relevant Local Authority, full payment of the outstanding debt shall be made and shall not limit such payment in terms of Section 118(1) of the Municipal Systems Act (as amended) to an amount equal to the outstanding figures for a period of 2 (two) years preceding the application for rates clearances. The Seller hereby indemnifies the Purchaser against any claims which may be instituted by the local authority in respect of any debts which arose prior to the date of Transfer of the Property into the name of the Purchaser.",
				},
			],
			[
				"8.5",
				{
					style: "parEnd",
					text:
						"The Purchaser shall not be entitled to transfer of the property until the whole of the purchase price, costs, interest and other charges have been paid or secured to the Conveyancer’s satisfaction.  Upon registration of transfer an adjustment in respect of occupational rental, rates and other charges relating to the property shall be made by the Conveyancers.",
				},
			],
			["9.", { style: "header2", text: "ESTATE AGENT" }],
			[
				"",
				{
					style: "parEnd",
					text: "(Not applicable)",
				},
			],
			["10.", { style: "header2", text: "MORA INTEREST" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"In the event of there being any delay in connection with the registration of transfer for which the Purchaser is responsible, the Purchaser undertakes, in addition to any payment due, to pay interest on the full purchase price at the current prime lending rate of The Reserve Bank of South Africa, calculated from the date that the Purchaser has been notified in writing by the Seller, the Seller’s Agent or Conveyancer’s, as being in mora, to the date upon which the Purchaser has ceased to be in mora.",
				},
			],
			["11.", { style: "header2", text: "BREACH" }],
			[
				"11.1",
				{
					style: "parEnd",
					text:
						"Should the Purchaser or Seller commit any breach of the provisions of this agreement, all of which shall be deemed to be material, and fail to remedy such breach within seven (7) days of receipt of a written notice given to him/her by the aggrieved party or on their behalf calling upon the defaulting party to remedy such breach then the aggrieved party shall be entitled at his/her election and without prejudice to any other rights which he/she may have at law out of this agreement either to cancel this agreement forthwith by notice in writing to the other party or claim specific performance of all the defaulting party’s obligations whether or not same are then due for performance or not.   The Party causing cancellation of the agreement shall be responsible for the payment of the Agent’s commission.",
				},
			],
			[
				"11.2.1",
				{
					style: "parEnd",
					text:
						"In the event of the Purchaser cancelling this agreement then the Seller shall, without prejudice to any of his/her rights to recover damages howsoever incurred as a result of such cancellation, be entitled to retake possession of the property and demand that all monies paid by the Purchaser to the Conveyancers, including interest thereon, be retained by the Conveyancers pending the outcome of Clause 11.2.2",
				},
			],
			[
				"11.2.2",
				{
					style: "parEnd",
					text:
						"Claim such damages as the Seller may have actually suffered and to resell the property and appropriate the proceeds thereof to the claim of the Seller, in which case any amounts retained in terms of Clause 11.2.1 shall be set off or partially set off against the damages claimed by the Seller.",
				},
			],
			[
				"11.3",
				{
					style: "parEnd",
					text: "Any improvements made to the property shall become the property of the Seller without compensation to the Purchaser.",
				},
			],
			[
				"11.4",
				{
					style: "parEnd",
					text:
						"For the purposes of all proceedings arising out of this Agreement the parties hereby consent to the jurisdiction of the Magistrates Court having jurisdiction over them, but the Seller shall not be precluded from instituting proceedings in any other competent Court.",
				},
			],
			[
				"11.5",
				{
					style: "parEnd",
					text:
						"Should the Seller or Purchaser consult an attorney in relation to any breach by the Seller/ Purchaser of his/her obligations in terms of this Agreement, then the Seller/ Purchaser shall be obliged to pay all legal costs incurred on an Attorney and own client scale.",
				},
			],
			["12.", { style: "header2", text: "ALTERATION AND IMPROVEMENTS" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"Pending transfer, the Purchaser shall not, without the prior written consent of the Seller, which consent shall not be unreasonably withheld, make any structural improvements to the property nor alterations to any existing improvements thereon nor remove, destroy or cut down any shrubs, hedges, creepers or trees.",
				},
			],
			["13.", { style: "header2", text: "DOMICILIA" }],
			[
				"13.1",
				{
					style: "parEnd",
					text:
						"All notices by one party to the other shall be given in writing by prepaid registered post, email, fax or delivered by hand to the Seller at the address, email or fax number referred to in Clause 2 of the Schedule and the Purchaser at the address, email or fax number referred to in Clause 4 of the Schedule which addresses, fax numbers and email addresses the parties choose as their respective domicilia citandi et executandi.",
				},
			],
			[
				"13.2",
				{
					style: "parEnd",
					text:
						"Any notice dispatched by hand, fax or email shall be deemed to have been received on the date of delivery thereof, date of email or fax transmission and pre-paid registered post on the 4th day after posting.",
				},
			],
			["14.", { style: "header2", text: "ENTOMOLOGIST’S CERTIFICATE" }],
			[
				"14.1",
				{
					style: "parEnd",
					text:
						"The Seller shall, at his expense and upon fulfilment of all suspensive conditions contained herein, cause all buildings on the property to be inspected by a Government approved entomologist and, furnish to the Purchaser a certificate by the said entomologist that such inspection disclosed no visible sign of active infestation of the buildings by timber destroying insects or damage thereby that in the Eradicator’s opinion should be treated, repaired or replaced.",
				},
			],
			[
				"14.2",
				{
					style: "parEnd",
					text:
						"Should there be evidence of infestation or damage that the Eradicator recommends should be treated, repaired or replaced, the Seller shall, within 21 (twenty one) days of receipt of such report carry out such treatment and repair and replace such damaged and obtain the clearance certificate referred to in sub-paragraph 15.1 above.",
				},
			],
			[
				"15.",
				{
					style: "header2",
					text: "ELECTRICAL INSTALLATION COMPLIANCE CERTIFICATE",
				},
			],
			[
				"",
				{
					style: "parEnd",
					text:
						"The Seller shall, at his expense and upon fulfilment of all suspensive conditions contained herein arrange for an accredited person registered with the Electrical Contracting Board of South Africa to inspect the property and issue a valid Certificate of Compliance in terms of Government Regulation No. 2920 of 1992.  Should the aforesaid accredited person report that there is a fault or defect in the electrical installation, the Seller shall be obliged, at his expense, within 21 (twenty one) days of receipt of such report and recommendations, to contact an electrical contractor or any other qualified person to carry out the repairs as recommended so as to enable the accredited person to issue the Certificate aforesaid.",
				},
			],
			["16.", { style: "header2", text: "ELECTRIC FENCE SYSTEM CERTIFICATE" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"The Seller shall obtain at his cost the required Electric Fence System Certificate as mentioned in Regulation 12 of the Electrical Machinery Regulations, 2011 promulgated in terms of the Occupational Health and Safety Act 1983 (Act No 6 of 1983) in respect of the electric fence  system and deliver the said Electric Fence System Certificate to the Purchaser within 15 days of acceptance of this offer by the Seller.  If the electric fence system on the premises is faulty, the Seller shall at his cost repair the electrical fence system in order to deliver the required Electric Fence System Certificate to the Purchaser.  The Seller undertakes not to make any alterations to the electrical fence system after the issue of the certificate.  If the certificate has not been delivered within the period referred to above, the Purchaser shall be entitled but not obliged to obtain an Electric Fence System Certificate in respect of such system at his own costs and the Conveyancer is hereby irrevocably instructed to pay to the Purchaser from the proceeds of the sale, on the date of registration of transfer of the Property into the name of the Purchaser, the costs incurred by the Purchaser of obtaining such Electric Fence System Certificate (including the costs of effecting any rectifications or repairs to enable the relevant party to issue such certificate). ",
				},
			],
			[
				"17.",
				{
					style: "header2",
					text: "GAS INSTALLATION COMPLIANCE CERTIFICATE",
				},
			],
			[
				"",
				{
					style: "parEnd",
					text:
						"The Seller shall, at his expense and within 14 (fourteen) days of fulfilment of all suspensive conditions contained herein arrange for an accredited person to inspect all gas installations including outside gas appliances and issue a valid Certificate of Compliance.  Should the aforesaid accredited person report that there is a fault or defect in the gas installation, the Seller shall be obliged, at his expense, within 21 (twenty one) days of receipt of such report and recommendations, to carry out the repairs as recommended so as to enable the accredited person to issue the Certificate aforesaid.",
				},
			],
			["18.", { style: "header2", text: "RECEIVER OF REVENUE" }],
			[
				"18.1",
				{
					style: "parEnd",
					text:
						"The Purchaser and Seller are aware that Transfer Duty Clearance cannot be obtained in the event that either of their tax affairs not being in order and warrant that all their Tax Returns, Income Tax payments and if applicable Vat returns and VAT payments are up to date and in order.",
				},
			],
			[
				"18.2",
				{
					style: "parEnd",
					text:
						"In the event of the Purchaser Price as referred to in Clause 8 of the Schedule being R2 000 000.00 (Two million rand) or more and the Seller a non-South African resident, in terms of Section 35A of the Income Tax Act the Purchaser is obliged to withhold a certain percentage (Natural person 5%; Company or Close Corporation 7.5%; Trust 10%) of the purchase price payable to the Seller and pay this to SARS as an advance in terms of the Seller’s liability for tax for the year of assessment within 14 days of registration of transfer and the parties hereby irrevocably instruct and authorise the Conveyancer to make payment to SARS accordingly.",
				},
			],
			[
				"18.3",
				{
					style: "parEnd",
					text:
						"The Seller hereby indemnifies both the Estate Agent and the Conveyancer against any claim howsoever arising by virtue of the Estate Agent and Conveyancer having acted in terms of the Section 35A or on information supplied by the Seller or from any other source.  The Seller further waives any claim howsoever arising against the Estate Agent and/or Conveyancer arising from any act or omission by the Conveyancer and/or the Estate Agent in their acting in terms of the Act.",
				},
			],
			["19.", { style: "header2", text: "VAT" }],
			[
				"19.1",
				{
					style: "parEnd",
					text:
						"The Seller hereby warrants that he/she is not / neither required to register as a vendor within the meaning of the VAT Act and that consequently no VAT is payable pursuant to this sale;  or",
				},
			],
			[
				"19.2",
				{
					style: "parEnd",
					text:
						"The Seller declares that he/she is a vendor within the mean of the VAT Act and the sale consequently attracts the payment of VAT.  It is accordingly agreed that:",
				},
			],
			[
				"19.2.1",
				{
					style: "parEnd",
					text: "The Purchase price described in clause 8 hereof shall be deemed to include VAT;",
				},
			],
			[
				"19.2.2",
				{
					style: "parEnd",
					text:
						"The Seller irrevocably instructs the conveyancing attorneys to establish such certificates, guarantees, payments or undertakings payable out of the proceeds of the sale upon registration of transfer as the Receiver of Revenue may require",
				},
			],
			[
				"19.2.3",
				{
					style: "parEnd",
					text:
						"The Seller shall furnish tax invoices to the Purchaser or the Seller as the case may be within 21 days of the liability for VAT payment arising should such tax invoices be requested by the Purchaser or the Seller respectively as the context may require.",
				},
			],
			["20", { style: "header2", text: "SECTIONAL TITLE PROVISIONS" }],
			["", { style: "parEnd", text: "It is agreed between the parties that:" }],
			[
				"20.1",
				{
					style: "parEnd",
					text:
						"The Seller shall not be liable for the levies and other costs due and payable to the Body Corporate as from the date of registration of transfer into the Purchaser’s name.  Accordingly, the Purchaser shall be liable and shall pay all levies and other costs due to the Body Corporate from the date of registration of transfer.  The Purchaser hereby indemnifies the Seller against any claims in terms of Section 37 of the Sectional Titles Act.  If after registration of the transfer, the Body Corporate imposes a special levy to meet expenses which have been under-estimated for any period up to the date of registration of transfer, the Seller shall refund to the Purchaser such amount which it becomes payable by the Purchaser.  If after acceptance hereof, but before transfer is effected, the Body Corporate passes any resolution imposing a special levy to cater for any future improvements to the scheme, the Purchaser shall be liable for the payment thereof.  The Seller warrants that he is not aware of any pending resolution.",
				},
			],
			[
				"20.2",
				{
					style: "parEnd",
					text:
						"The property is sold subject to all the provisions of the Sectional Title Act 95 of 1986 (as amended) and subject to the provisions of the rules of the body corporate lodged with the Registrar of Deeds in terms of Section 27 of the Sectional Titles Act.  The Purchaser hereby undertakes to abide by all such rules and provisions of the Act and not to do anything which may cause the Seller to be in breach of its obligations to the body corporate from the occupation date.",
				},
			],
			[
				"20.3",
				{
					style: "parEnd",
					text:
						"The Seller warrants that he/she has not received any official notification nor is he/she aware of any special or unusual levy that the Body Corporate intends to be collected from owners in the Scheme",
				},
			],
			["21", { style: "header2", text: "RIGHT TO EXTEND SCHEME" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"*Delete if not applicable* It is hereby recorded that the developer / Body Corporate* has a real right to extend the Scheme pursuant to the provisions of Section 25 of the Sectional Titles Act 95 of 1986. (*Delete whichever does not apply*)",
				},
			],
			["22", { style: "header2", text: "JOINT AND SEVERAL LIABILITY" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"In the event of either party to this Agreement consisting of more than one person, then the liabilities of such persons to the other in terms of this Agreement shall be joint and several.",
				},
			],
			["23", { style: "header2", text: "SEVERABILITY" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"Should any portion or provision of this Agreement held to be void, invalid or unenforceable, for any reason whatsoever, then such provision or portion shall be deemed to be severable and excluded from this Agreement, and all the remaining terms shall continue to remain in full force and effect.",
				},
			],
			["24", { style: "header2", text: "GENERAL" }],
			[
				"24.1",
				{
					style: "parEnd",
					text:
						"The parties hereto acknowledge that this Agreement of Sale concluded between the Seller and the Purchaser constitutes the entire agreement between them and that no other conditions, stipulations, warranties or representations whatsoever have been made or implied by either party or the Agent, other than are specifically included herein. No alteration or amendment to this agreement shall be binding unless reduced to writing and signed by the parties.",
				},
			],
			[
				"24.2",
				{
					style: "parEnd",
					text:
						"Any extension or extensions of time granted for the making of any payments or other indulgences or concessions granted by the Seller, shall not prejudice any rights of the Seller under this agreement.",
				},
			],
			[
				"24.3",
				{
					style: "parEnd",
					text:
						"Whilst the Agency has taken all reasonable steps to obtain and verify all relevant information regarding the Property from the Seller, including possible presence of latent and patent defects, it does not assume any liability in respect of incorrect information supplied by the Seller.",
				},
			],
			["25", { style: "header2", text: "CALCULATION OF DAYS" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"It is agreed that the calculation of any period of time for the purposes of this agreement shall be by the computatio civilis method (ie the first day shall be included in the period and the last day excluded). Weekends and public holidays shall be included in the calculation of days.",
				},
			],
			["26", { style: "header2", text: "CONSUMER PROTECTION ACT" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"The Seller warrants that he is an ordinary Seller who does not sell property in the ordinary course of business. The Consumer Protection Act therefore does not apply to the Sale of this Property.",
				},
			],
			[
				"27",
				{
					style: "header2",
					text: "NATIONAL ENVIRONMENTAL BIODIVERSITY ACT (ACT 10 OF 2004)",
				},
			],
			[
				"",
				{
					style: "parEnd",
					text:
						"The parties agree that the seller/s has/have complied with his/her obligations in terms of Section 29(3) of the Regulations of the National Environmental Management: Biodiversity Act 2004 (Act No 10 of 2004) and particularly with regards to the disclosures contained therein regarding the Alien and Invasive Species Lists 2014 published on the website of the Department of Environmental Affairs. www.environmental.gov.za",
				},
			],
			[
				"28",
				{
					style: "header2",
					text: "ELECTRONIC COMMUNICATIONS AND TRANSACTIONS ACT 25 OF 2002 (AS AMENDED) “ECTA”",
				},
			],
			[
				"",
				{
					style: "parEnd",
					text:
						"This agreement shall constitute the entire contract between the seller and the purchaser. The seller shall not be bound by any other preceding agreement, negotiations, terms or conditions, promises or statements, warranties or representations, express or implied made by the seller of any of its agents or any of its employees, or any other person purporting to act for or on behalf of the seller. No variation, amendment or consensual cancellation shall be of any force or effect unless reduced to writing and signed by the parties hereto by hand. For the avoidance of doubt the parties expressly agree that no variation, amendment or consensual cancellation shall arise pursuant to an exchange of “data” by means of an “electronic signature”, and an “advanced electronic signature” (as envisaged in the Electronic Communications and Communication Act 25 of 2002, (as amended) - (“ECTA”), or otherwise by means of electronic and/or written signed correspondence. Further the parties agree, to the extent allowed in law, that section 13 of ECTA 25 of 2002 shall not apply to this agreement. For the purposes of this agreement, the parties agree that the fact that their name or the name of the entity that they represent appears at or near the end of any email, electronic correspondence or other written correspondence shall not in any way be deemed or considereto be their signature or electronic signature.",
				},
			],
			["29", { style: "header2", text: "FICA REQUIREMENTS" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"The parties hereby undertake, within 5 days of being requested to do so, to furnish the Conveyancers and/or the Mortgage Originator with all the necessary documentation required by law in terms of the Financial Intelligence Centre Act.",
				},
			],
			[
				"30",
				{
					style: "header2",
					text: "PURCHASER A COMPANY, CLOSE CORPORATION OR TRUST",
				},
			],
			[
				"30.1",
				{
					style: "parEnd",
					text:
						"In the event of the PURCHASER acting in the capacity of an Agent or Trustee for a Company to be formed, the PURCHASER shall be personally liable should the Purchasing Company or Close Corporation not be formed within 30 (Thirty) days of date hereof, or if when it is formed it does not ratify this Agreement within 7 (Seven) days. In addition, the said PURCHASER shall be deemed to have guaranteed the obligations of the Company or Close Corporation to be formed in terms of this Agreement, as surety and co-principal debtor.",
				},
			],
			[
				"30.1",
				{
					style: "parEnd",
					text:
						"In the event of the PURCHASER acting on behalf of a Company, Corporation or Trust already formed he warrants that he has the necessary authority to act on behalf of such entity. Should he breach this warranty then he shall become jointly and severally liable in his personal capacity for the obligations of the Company, Trust or Close Corporation contemplated in terms of this agreement.",
				},
			],
			[
				"30.3",
				{
					style: "parEnd",
					text:
						"Should the SIGNATORY be acting in a representative capacity on behalf of an entity or trust and should that entity breach any of the terms of this agreement then he/she agrees to stand as surety and co-principal debtor with the entity and further shall become personally liable, in solidum therewith. The SIGNATORY specifically and waives the benefit of excussion, division, non causa debiti and revision of accounts.",
				},
			],
			["31.", { style: "header2", text: "ACCEPTANCE PERIOD" }],
			["", { style: "parEnd", text: "Refer to clause 20." }],
			["32", { style: "header2", text: "FIXTURES AND FITTINGS:" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"The Property is sold with all fixtures and fittings of a permanent nature, situated on/in it at the date of this offer, unless specifically excluded, which shall include but be limited to, stove/s and extractor fans, all light fittings, pelmets and curtain rails, fitted carpets, blinds and awnings, pumps and engines, pool equipment and automatic pool cleaner, fitted alarm systems, electronic consoles, and all keys, bar stools, all fences and gardens trees, pshrubs and plants, TV aerial, DSTV satellite dish, Gemini /wendy hut/s, bathroom mirrors, security gates, gas bottles, ceiling fans, air conditioners, all remotes. The Seller undertakes that all such fixtures and fittings are his property, are fully paid for at date of occupation. The Purchaser undertakes to maintain the fixtures and fittings in the same condition and from date of occupation to date of transfer.",
				},
			],
			[
				"33.",
				{
					style: "header2",
					text: "PURCHASER’S RIGHT OF REVOCATION (NOT APPLICABLE IF THE PURCHASE PRICE EXCES R250 000.00):",
				},
			],
			[
				"",
				{
					style: "parEnd",
					text:
						"The PURCHASER is, in terms of Section 29A of the Alienation Act 1981, as amended, entitled within 5 (FIVE) days after signature hereof by the PURCHASER, to revoke this offer or, in the event of the offer having been accepted by the SELLER, terminate his deed of alienation by delivering to the SELLER or his/her AGENT written notice to that effect in the manner prescribed in the said Act. The period of 5 days shall be calculated with the exclusion of the day upon which the offer or deed of alienation was signed by the PURCHASER, and of any Saturday, Sunday, or public holiday.",
				},
			],
			["34.", { style: "header2", text: "HEAT PUMP INSTALLATIONS" }],
			[
				"",
				{
					style: "parEnd",
					text:
						"The PURCHASER is hereby made aware that in terms of SANS 10254, as from 29 December 2017, an owner is required to obtain a certificate of compliance in respect of any heat pump installations (i.e. geysers) when same is installed, maintained, repaired or replaced. The SELLER warrants that the geyser has not been tampered since this date and accordingly is not in possession of a compliance certificate. The PURCHASER shall accordingly be required to obtain same, should he maintain, replace or repair the geyser/s.",
				},
			],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_10_specialConditions = {
	table: {
		widths: [34, "*"],
		body: [
			["35.", { style: "header2", text: "SPECIAL CONDITIONS" }],
			["", { style: "parEnd", text: "ASDF_specialConditions_ASDF" }],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_11_signature_purchaser_one = {
	table: {
		widths: [34, 119, 118, 119, 118],
		body: [
			[{ text: "36" }, { style: "header2", text: "PURCHASER SIGNATURE", colSpan: 2 }, "", "", ""],
			["", "", "", "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ______ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "purchaserName1 purchaserSurname1", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
	unbreakable: true,
};
// prettier-ignore
var part_11_signature_purchaser_two = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			[{ text: "36" }, { style: "header2", text: "PURCHASER SIGNATURES", colSpan: 2 }, "", "", ""],
			[{ text: "" }, { text: "" }, "", "", ""],
			["", { text: "Purchaser 1", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at __________ at ______ am/pm on this _____ day of ____________ 20__",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "purchaserName1 purchaserSurname1", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "Purchaser 2", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at __________ at ______ am/pm on this _____ day of ____________ 20__",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "purchaserName2 purchaserSurname2", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_11_signature_purchaser_company = {
	table: {
		widths: [34, 121, 121, 121, "*"],
		body: [
			[{ text: "36" }, { style: "header2", text: "PURCHASER SIGNATURE", colSpan: 2 }, "", "", ""],
			["", { text: "" }, { text: "" }, "", ""],
			[
				"",
				{
					style: "signed",
					text:
						"Signed on behalf of purchaserCompanyName with Registration Number purchaserCompanyRegistrationNumber by purchaserCompanyRepresentativeName on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],

			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "purchaserCompanyRepresentativeName", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_11_signature_purchaser_trust = {
	table: {
		widths: [34, 121, 121, 121, "*"],
		body: [
			[{ text: "36" }, { style: "header2", text: "PURCHASER SIGNATURE", colSpan: 2 }, "", "", ""],
			["", { text: "" }, { text: "" }, "", ""],
			[
				"",
				{
					style: "signed",
					text:
						"Signed on behalf of purchaserTrustName with Registration Number purchaserTrustRegistrationNumber by purchaserTrustRepresentativeName on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],

			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "purchaserTrustRepresentativeName", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_12_signature_seller_one = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			[{ text: "37" }, { style: "header2", text: "SELLER SIGNATURE", colSpan: 2 }, "", "", ""],
			["", "", "", "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at ____________________ at ________ am/pm on this ______ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName1 sellerSurname1", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_12_signature_seller_two = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			[{ text: "37" }, { style: "header2", text: "SELLER SIGNATURE", colSpan: 2 }, "", "", ""],
			[{ text: "" }, { text: "" }, "", "", ""],
			["", { text: "Seller 1", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName1 sellerSurname1", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "Seller 2", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName2 sellerSurname2", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};

// prettier-ignore
var part_12_signature_seller1_seller3 = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			[{ text: "37" }, { style: "header2", text: "SELLER SIGNATURES", colSpan: 2 }, "", "", ""],
			[{ text: "" }, { text: "" }, "", "", ""],
			["", { text: "Seller 1", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName1 sellerSurname1", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "Seller 2", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName3 sellerSurname3", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
}
// prettier-ignore
var part_12_signature_seller1S_seller3 = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			[{ text: "37" }, { style: "header2", text: "SELLER SIGNATURES", colSpan: 2 }, "", "", ""],
			[{ text: "" }, { text: "" }, "", "", ""],
			["", { text: "Seller 1", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName1 sellerSurname1", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "Seller 2", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName2 sellerSurname2", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "Seller 3", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName3 sellerSurname3", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
}
// prettier-ignore
var part_12_signature_seller1S_seller3S = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			[{ text: "37" }, { style: "header2", text: "SELLER SIGNATURES", colSpan: 2 }, "", "", ""],
			[{ text: "" }, { text: "" }, "", "", ""],
			["", { text: "Seller 1", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName1 sellerSurname1", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "Seller 2", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName2 sellerSurname2", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "Seller 3", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName3 sellerSurname3", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "Seller 4", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName4 sellerSurname4", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
}
// prettier-ignore
var part_12_signature_seller1_seller3S = {
	table: {
		widths: [34, 121, 121, 121, 121],
		body: [
			[{ text: "37" }, { style: "header2", text: "SELLER SIGNATURES", colSpan: 2 }, "", "", ""],
			[{ text: "" }, { text: "" }, "", "", ""],
			["", { text: "Seller 1", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName1 sellerSurname1", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "Seller 2", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName3 sellerSurname3", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "Seller 3", style: "header4" }, { text: "", colSpan: 3 }, "", ""],
			[
				"",
				{
					style: "signed",
					text: "Signed at _______________ at ________ am/pm on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],
			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerName4 sellerSurname4", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
}

// prettier-ignore
var part_12_signature_seller_company = {
	table: {
		widths: [34, 121, 121, 121, "*"],
		body: [
			[{ text: "37" }, { style: "header2", text: "SELLER SIGNATURE", colSpan: 2 }, "", "", ""],
			["", { text: "" }, { text: "" }, "", ""],
			[
				"",
				{
					style: "signed",
					text:
						"Signed on behalf of sellerCompanyName with Registration Number sellerCompanyRegistrationNumber by sellerCompanyRepresentativeName on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],

			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerCompanyRepresentativeName", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};
// prettier-ignore
var part_12_signature_seller_trust = {
	table: {
		widths: [34, 121, 121, 121, "*"],
		body: [
			[{ text: "37" }, { style: "header2", text: "SELLER SIGNATURE", colSpan: 2 }, "", "", ""],
			["", { text: "" }, { text: "" }, "", ""],
			[
				"",
				{
					style: "signed",
					text:
						"Signed on behalf of sellerTrustName with Registration Number sellerTrustRegistrationNumber by sellerTrustRepresentativeName on this _____ day of ____________ 20___.",
					colSpan: 4,
				},
				"",
				"",
			],

			["", { text: "As Witneses", colSpan: 2 }, "", { text: "", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "1.  ______________________________", colSpan: 2 }, "", { text: " ______________________________", colSpan: 2 }, ""],
			["\n", "", "", "", ""],
			["", { text: "2.  ______________________________", colSpan: 2 }, "", { text: "sellerTrustRepresentativeName", colSpan: 2 }, ""],
		],
	},
	layout: "noBorders",
};

// *** MASTER OTP FILES - ENDS

// prettier-ignore
var footer2 = function (currentPage, pageCount) {
	return {
		table: {
			widths: [34, "*", "*", 34],

			body: [
				[
					{ border: [false, false, false, false], text: "" },
					{
						style: "left",
						border: [false, true, false, false],
						text: "Brune Attorneys | nina@brune.co.za | 084 548 4808",
					},
					{
						style: "right",
						border: [false, true, false, false],
						text: "Page " + currentPage + " of " + pageCount,
					},
					{ border: [false, false, false, false], text: "" },
				],
			],
		},
	};
};

var footer3 = function (currentPage, pageCount) {
	return {
		table: {
			widths: [34, "*", "*", 34],

			body: [
				[
					{ border: [false, false, false, false], text: "" },
					{
						style: "left",
						border: [false, true, false, false],
						text: "asdf-Name-asdf | asdf-Email-asdf | asdf-number-asdf",
					},
					{
						style: "right",
						border: [false, true, false, false],
						text: "Page " + currentPage + " of " + pageCount,
					},
					{ border: [false, false, false, false], text: "" },
				],
			],
		},
	};
};

function numberWithSpaces(x) {
	var parts = x.toString().split(".");
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	return parts.join(".");
}

function storeOtpData(dataObject) {
	const new_otpStorage = new otpStorage({
		_id: new mongoose.Types.ObjectId(),
		otpData: dataObject,
	});

	new_otpStorage
		.save()
		.then((result) => {
			console.log("Opt saved to DB");
		})
		.catch((err) => {
			console.log(err);
		});
}
var emailBodyTest =
	'<!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" ><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><meta http-equiv="X-UA-Compatible" content="IE=edge" /><meta name="x-apple-disable-message-reformatting" /><meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" /><meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" /><title></title> <!--[if gte mso 9]> <xml> <o:OfficeDocumentSettings> <o:AllowPNG /> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings> </xml><! [endif]--> <!--[if mso]><style>*{font-family:sans-serif !important}</style><! [endif]--><style>:root{color-scheme:light;supported-color-schemes:light}html,body{margin:0 auto !important;padding:0 !important;height:100% !important;width:100% !important}*{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}div[style*="margin: 16px 0"]{margin:0 !important}#MessageViewBody,#MessageWebViewDiv{width:100% !important}table,td{mso-table-lspace:0pt !important;mso-table-rspace:0pt !important}table{border-spacing:0 !important;border-collapse:collapse !important;table-layout:fixed !important;margin:0 auto !important}img{-ms-interpolation-mode:bicubic}a{text-decoration:none}a[x-apple-data-detectors], .unstyle-auto-detected-links a,.aBn{border-bottom:0 !important;cursor:default !important;color:inherit !important;text-decoration:none !important;font-size:inherit !important;font-family:inherit !important;font-weight:inherit !important;line-height:inherit !important}.im{color:inherit !important}.a6S{display:none !important;opacity:0.01 !important}img.g-img+div{display:none !important}@media only screen and (min-device-width: 320px) and (max-device-width: 374px){u ~ div .email-container{min-width:320px !important}}@media only screen and (min-device-width: 375px) and (max-device-width: 413px){u ~ div .email-container{min-width:375px !important}}@media only screen and (min-device-width: 414px){u ~ div .email-container{min-width:414px !important}}</style><style>.button-td,.button-a{transition:all 100ms ease-in}.button-td-primary:hover,.button-a-primary:hover{background:#555 !important;border-color:#555 !important}@media screen and (max-width: 480px){.stack-column,.stack-column-center{display:block !important;width:100% !important;max-width:100% !important;direction:ltr !important}.stack-column-center{text-align:center !important}.center-on-narrow{text-align:center !important;display:block !important;margin-left:auto !important;margin-right:auto !important;float:none !important}table.center-on-narrow{display:inline-block !important}.email-container p{font-size:17px !important}}</style></head ><body width="100%" style=" margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: none; " ><center role="article" aria-roledescription="email" lang="en" style="width: 100%; background-color: none;" > <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: none;"><tr><td><![endif]--><div style="max-height: 0; overflow: hidden; mso-hide: all;" aria-hidden="true" > WebApp Subscription confirmation</div><div style=" display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif; " > &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div><div style="max-width: 680px; margin: 0 auto;" class="email-container"> <!--[if mso]><table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="680"><tr><td><![endif]--><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto;" ><tr><td style="padding: 5px 0 0px 0; text-align: center;"> <a href="https://brune.co.za/otp.html" ><webversion style=" color: #cccccc; text-decoration: underline; font-weight: bold; " >View this mail in your browser</webversion ></a > <img src="https://brune.co.za/pictures/heading.png" width="100%" alt="Logo Goes Here" border="0" style=" padding-top: 5px; height: auto; font-family: sans-serif; font-size: 15px; line-height: 15px; " /></td></tr><tr><td style="background-color: none;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" ><tr><td style=" padding: 10px 10px; font-family: sans-serif; font-size: 15px; line-height: 20px; color: #555555; " ><ul><li>Still completing OTPs by hand?</li><li>Manually crossing out unnecessary parts?</li><li>Clients initialing next to every change?</li><li> Struggling with access to printers and scanners during Covid-19?</li></ul><h3 style=" margin: 0 0 10px; font-size: 15px; color: #333333; font-weight: normal; color: #006699; " > Maybe its time to move with the times . . .</h3><h3 style=" margin: 0 0 10px; font-size: 25px; color: #333333; font-weight: normal; color: #006699; " > Contract of Sale | OTP Generator</h3><ul><li>100% free Webapp</li><li>Accessible on pc, laptop, tablet and mobile phone</li><li>Guides you through the process</li><li>Handy and insightful information on every step</li><li> Draft, perfectly formulated OTPs on your mobile phone in minutes</li><li> Receive the completed document in PDF format right in your inbox</li></ul></td></tr><tr><td style="padding: 0 20px 20px;"><table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: auto;" ><tr><td class="button-td button-td-primary" style="border-radius: 4px; background: #006699;" > <a class="button-a button-a-primary" href="https://brune.co.za/otp.html " style=" background: #006699; border: 1px solid #006699; font-family: sans-serif; font-size: 15px; line-height: 15px; text-decoration: none; padding: 13px 17px; color: #ffffff; display: block; border-radius: 4px; " >Click here to take a look for yourself</a ></td></tr></table></td></tr></table></td></tr></table> <!--[if mso]></td></tr></table><![endif]--></div><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="" ><tr><td><div align="center" style="max-width: 680px; margin: auto; background-color: #006699;" class="email-container" > <!--[if mso]><table style="background-color: #006699" role="presentation" cellspacing="0" cellpadding="0" border="0" width="680" align="center"><tr><td><![endif]--><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" ><tr><td style=" padding: 10px; font-family: sans-serif; font-size: 12px; line-height: 15px; text-align: center; color: #fff; " > Brune Attorneys<br /><span class="unstyle-auto-detected-links" >nina@brune.co.za</span > <br /> <unsubscribe style="text-decoration: underline;" >unsubscribe</unsubscribe ></td></tr></table> <!--[if mso]></td></tr></table><![endif]--></div></td></tr></table> <!--[if mso | IE]></td></tr></table><![endif]--></center></body></html> `';

function getOtpData(date) {
	const today = moment(date).startOf("day");

	var querie = {
		time: {
			$gte: today.toDate(),
			$lte: moment(today).endOf("day").toDate(),
		},
	};
	console.log(querie);
	otpStorage.find(querie, (err, docs) => {
		if (err) {
			console.log(err);
		}
		if (docs) {
			if (docs.length === 0) {
				console.log("No Items found for: " + date);
			} else {
				for (i = 0; i < docs.length; i++) {
					console.log(docs[i]);
				}
			}
		}
	});
}
// getOtpData("2020-07-06");
function calctransferduty(purprice) {
	var a = 0.0;
	if (purprice <= 1000000) {
		var a = 0;
	}
	if ((purprice > 1000000) & (purprice <= 1375000)) {
		var a = (purprice - 100000) * 0.03;
	}
	if ((purprice > 1375000) & (purprice <= 1925000)) {
		var a = (purprice - 1375000) * 0.06 + 11250;
	}
	if ((purprice > 1925000) & (purprice <= 2475000)) {
		var a = (purprice - 1925000) * 0.08 + 44250;
	}
	if ((purprice > 2475000) & (purprice <= 11000000)) {
		var a = (purprice - 2475000) * 0.11 + 88250;
	}
	if (purprice > 11000000) {
		var a = (purprice - 11000000) * 0.13 + 1026000;
	}

	for (i = 0; i < transfer_table.length; i++) {
		var temp = parseInt(purprice);
		if ((temp >= transfer_table[i].purchase_price1) & (temp <= transfer_table[i].purchase_price2)) {
			var other_costs = transfer_table[i].other_costs;
			var post_and_petties = transfer_table[i].post_and_petties;
			var transfer_fees = transfer_table[i].transfer_fees;
			var d_office_levy = transfer_table[i].d_office_levy;
		} else {
		}
	}
	transfer_duty1 = a.toFixed(2);
	var purprice1 = numberWithSpaces(purprice);
	var totals = parseFloat(other_costs) + parseFloat(post_and_petties) + parseFloat(transfer_fees) + parseFloat(d_office_levy);
	var totals2 = parseFloat(totals).toFixed(2);
	var totalx = numberWithSpaces(totals);

	var obj = {
		OTPtransfer_duty: "R " + numberWithSpaces(transfer_duty1),
		OTPother_costs: "R " + numberWithSpaces(other_costs),
		OTPpurchace_price: "R " + numberWithSpaces(purprice1),
		OTPpost_and_petties: "R " + numberWithSpaces(post_and_petties),
		OTPtransfer_fees: "R " + numberWithSpaces(transfer_fees),
		OTPd_office_levy: "R " + numberWithSpaces(d_office_levy),
		OTPtotal: "R " + numberWithSpaces(totals2),
	};
	// console.log(obj);
	return obj;
}

// prettier-ignore
var annexureAList = [
	["1.", "Electrical faults/ problems relating to the installation or fitted accessories?", "If Yes, details thereof"],
	["2.","Illegal electrical extensions, disconnections or damaged or inoperative fittings or permanent appliances / equipment? E.g. Stove, extractor, oven, air conditioner, heaters, ceiling fans, or illegal extensions such as light fittings, water feature pumps etc?","If Yes, details thereof",],
	["3.", "Faults relating to the geyser e.g. Leaks, faulty seal kits, low geyser pressure?", "If Yes, details thereof"],
	["4.", "Faults relating to the drainage installation e.g. Blocked drains, sewers, storm water pipes or gutters?", "If Yes, details thereof"],
	["5.", "Problems relating to leaking taps or geysers or ruptured pipes?", "If Yes, details thereof"],
	["6.", "Are there keys to all the doors?", "If No, details thereof"],
	["7.", "How many remote controls are there for gates, garage doors etc?", "Number of remotes"],
	["8.", "Are all security installations in sound working order e.g. Alarms, burglar bars and security gates?", "If No, details thereof"],
	["9.","Is the pool, its equipment, piping and pump all in good working order (consider cracks, leaks and general operation of the equipment etc.)?","If No, details thereof",],
	["10.", "Have there been any recent repairs to any of the items specified in 9 above?", "If Yes, details thereof"],
	["11.", "Are there damp problems in any of the buildings e.g. rising or lateral damp?", "If Yes, details thereof"],
	["12.", "Are there roof leaks of any kind?", "If Yes, details thereof"],
	["13.", "Are there any cracks, leaks or problems with the baths, basins toilet, cisterns or showers?", "If Yes, details thereof"],
	["14.", "Are there any cracked or broken floor tiles or damage to wood flooring?", "If Yes, details thereof"],
	["15.", "Are there any structural defects that you are aware of e.g. Cracks in walls, floor slab or any settlement of any kind?", "If Yes, details thereof"],
	["16.", "Are there any burns, tears or badly worn areas relating to the fitted carpets?", "If Yes, details thereof"],
	["17.", "Are all built-in cupboards intact?", "If No, details thereof"],
	["18.", "Are all door handles and window catches in working order?", "If No, details thereof"],
	["19.", "Do the physical positions of the present boundary fences/ walls represent the true boundary of the property?", "If No, details thereof"],
	["20.", "Are there any interdicts, attachments or usufructs on or over the property?", "If Yes, details thereof"],
	["21.", "Are there any building restrictions or registered servitudes on the property?", "If Yes, details thereof"],
	["22.", "Do the building improvements and solid roofed areas (e.g. Carports) confirm to the registered building plans?", "If No, details thereof"],
	["23.", "Do you possess copies of the building plans?", ""],
  ["24.", "Is the above Property subject to a lease?", "If Yes, what date does the lease expires?"],
  ["25.", "The following items are excluded from the sale of the Property", "fourLines"],
  ["26.", "Comments or qualifications on any of the above", "fourLines"],
];

function createAnexureA() {
	var AA = [
		{ pageBreak: "before", text: "Annexure A", style: "header0" },
		{ text: "List of defects known to the seller.", style: "bold" },
		{ text: "\n" },
		{
			table: {
				widths: [30, 394, 4, 20, 0, "*"],
				body: [
					[
						{ text: "", border: [false, false, false, false] },
						{ text: "", border: [false, false, false, false] },
						{ text: "", border: [false, false, false, false] },
						{ text: "YES", border: [false, false, false, false] },
						{ text: "", border: [false, false, false, false] },
						{ text: "NO", border: [false, false, false, false] },
					],
				],
			},
		},
	];
	for (let i = 0; i < annexureAList.length; i++) {
		if (annexureAList[i][2] === "fourLines") {
			var temp = {
				table: {
					widths: [30, 396, 5, 10, 5, 10],
					body: [
						[
							{ text: "asdf_number_asdf", border: [false, false, false, false] },
							{ text: "asdf_content_asdf", border: [false, false, false, false] },
							{ text: "", border: [false, false, false, false] },
							{ text: "", border: [false, false, false, false] },
							{ text: "", border: [false, false, false, false] },
							{ text: "", border: [false, false, false, false] },
						],
					],
				},
			};
			temp = JSON.stringify(temp);
			temp = temp.split("asdf_number_asdf").join(annexureAList[i][0]);
			temp = temp.split("asdf_content_asdf").join(annexureAList[i][1]);
			temp = JSON.parse(temp);
			AA.push(temp);
		} else {
			var temp = {
				table: {
					widths: [30, 396, 5, 10, 5, 10],
					body: [
						[
							{ text: "asdf_number_asdf", border: [false, false, false, false] },
							{ text: "asdf_content_asdf", border: [false, false, false, false] },
							{ text: "", border: [false, false, false, false] },
							{ canvas: [{ type: "rect", x: 0, y: 0, w: 16, h: 16 }], border: [false, false, false, false] },
							{ text: "", border: [false, false, false, false] },
							{ canvas: [{ type: "rect", x: 0, y: 0, w: 16, h: 16 }], border: [false, false, false, false] },
						],
					],
				},
			};
			temp = JSON.stringify(temp);
			temp = temp.split("asdf_number_asdf").join(annexureAList[i][0]);
			temp = temp.split("asdf_content_asdf").join(annexureAList[i][1]);
			temp = JSON.parse(temp);
			AA.push(temp);
		}

		if (annexureAList[i][2] === "fourLines") {
			var temp1 = {
				table: {
					style: "parSpaceAfter",
					widths: ["auto", "*"],
					margin: [0, 0, 0, 0],
					heights: [12, 12, 12, 12],
					body: [
						[
							{ text: "", border: [false, false, false, false] },
							{ text: "", border: [false, false, false, true] },
						],
						[
							{ text: "", border: [false, false, false, false] },
							{ text: "", border: [false, false, false, true] },
						],
						[
							{ text: "", border: [false, false, false, false] },
							{ text: "", border: [false, false, false, true] },
						],
						[
							{ text: "", border: [false, false, false, false] },
							{ text: "", border: [false, false, false, true] },
						],
					],
				},
			};
			AA.push(temp1);
		} else {
			var temp1 = {
				table: {
					widths: ["auto", "*"],
					margin: [0, 0, 0, 0],
					body: [
						[
							{ text: "asdf_content1_asdf", border: [false, false, false, false] },
							{ text: "", border: [false, false, false, true] },
						],
					],
				},
			};
			temp1 = JSON.stringify(temp1);
			temp1 = temp1.split("asdf_content1_asdf").join(annexureAList[i][2]);
			temp1 = JSON.parse(temp1);
			AA.push(temp1);
		}

		var temp2 = { text: "", style: "parSpaceAfter1" };
		AA.push(temp2);
	}
	// prettier-ignore
	var temp3 = [
    {style:'bold1',text:'Dated at _______________________ on this the __________ day of ___________________ 20_____ '},
    {text:'', style:"parSpaceAfter1"},
    {text:'', style:"parSpaceAfter1"},
    {text:'', style:"parSpaceAfter1"},
    {	columns: [{width: 240,text: '______________________________________________'}, {width: 20,text: ''},{width: 240,text: '______________________________________________'},]},{columns: [{width: 240,text: 'Seller ( or authorised representative)' },{ width: 20, text:''},{width: 240,text: 'Purchaser ( or authorised representative)'},]},
  ]
	AA.push(temp3);
	return AA;
}
// prettier-ignore
var transfer_table = [
	{"purchase_price1":"0","purchase_price2":"100000","transfer_fees":"5200.00","post_and_petties":"1100.00","d_office_levy":"39.00","other_costs":"3150.00"},
	{"purchase_price1":"100001","purchase_price2":"150000","transfer_fees":"6000.00","post_and_petties":"1100.00","d_office_levy":"86.00","other_costs":"3150.00"},
	{"purchase_price1":"150001","purchase_price2":"200000","transfer_fees":"6800.00","post_and_petties":"1100.00","d_office_levy":"86.00","other_costs":"3150.00"},
	{"purchase_price1":"200001","purchase_price2":"250000","transfer_fees":"7600.00","post_and_petties":"1100.00","d_office_levy":"539.00","other_costs":"3150.00"},
	{"purchase_price1":"250001","purchase_price2":"300000","transfer_fees":"8400.00","post_and_petties":"1100.00","d_office_levy":"539.00","other_costs":"3150.00"},
	{"purchase_price1":"300001","purchase_price2":"350000","transfer_fees":"9200.00","post_and_petties":"1100.00","d_office_levy":"673.00","other_costs":"3150.00"},
	{"purchase_price1":"350001","purchase_price2":"400000","transfer_fees":"10000.00","post_and_petties":"1100.00","d_office_levy":"673.00","other_costs":"3150.00"},
	{"purchase_price1":"400001","purchase_price2":"450000","transfer_fees":"10800.00","post_and_petties":"1100.00","d_office_levy":"673.00","other_costs":"3150.00"},
	{"purchase_price1":"450001","purchase_price2":"500000","transfer_fees":"11600.00","post_and_petties":"1100.00","d_office_levy":"673.00","other_costs":"3150.00"},
	{"purchase_price1":"500001","purchase_price2":"600000","transfer_fees":"13200.00","post_and_petties":"1100.00","d_office_levy":"673.00","other_costs":"3150.00"},
	{"purchase_price1":"600001","purchase_price2":"700000","transfer_fees":"14800.00","post_and_petties":"1100.00","d_office_levy":"946.00","other_costs":"3150.00"},
	{"purchase_price1":"700001","purchase_price2":"800000","transfer_fees":"16400.00","post_and_petties":"1100.00","d_office_levy":"946.00","other_costs":"3150.00"},
	{"purchase_price1":"800001","purchase_price2":"900000","transfer_fees":"18000.00","post_and_petties":"1100.00","d_office_levy":"1086.00","other_costs":"3150.00"},
	{"purchase_price1":"900001","purchase_price2":"1000000","transfer_fees":"19600.00","post_and_petties":"1100.00","d_office_levy":"1086.00","other_costs":"3150.00"},
	{"purchase_price1":"1000001","purchase_price2":"1100000","transfer_fees":"21200.00","post_and_petties":"1100.00","d_office_levy":"1220.00","other_costs":"3150.00"},
	{"purchase_price1":"1100001","purchase_price2":"1200000","transfer_fees":"21200.00","post_and_petties":"1100.00","d_office_levy":"1220.00","other_costs":"3150.00"},
	{"purchase_price1":"1200001","purchase_price2":"1300000","transfer_fees":"22800.00","post_and_petties":"1100.00","d_office_levy":"1220.00","other_costs":"3150.00"},
	{"purchase_price1":"1300001","purchase_price2":"1400000","transfer_fees":"22800.00","post_and_petties":"1100.00","d_office_levy":"1220.00","other_costs":"3150.00"},
	{"purchase_price1":"1400001","purchase_price2":"1500000","transfer_fees":"24400.00","post_and_petties":"1100.00","d_office_levy":"1220.00","other_costs":"3150.00"},
	{"purchase_price1":"1500001","purchase_price2":"1600000","transfer_fees":"24400.00","post_and_petties":"1100.00","d_office_levy":"1220.00","other_costs":"3150.00"},
	{"purchase_price1":"1600001","purchase_price2":"1700000","transfer_fees":"26000.00","post_and_petties":"1100.00","d_office_levy":"1220.00","other_costs":"3150.00"},
	{"purchase_price1":"1700001","purchase_price2":"1800000","transfer_fees":"26000.00","post_and_petties":"1100.00","d_office_levy":"1220.00","other_costs":"3150.00"},
	{"purchase_price1":"1800001","purchase_price2":"1900000","transfer_fees":"27600.00","post_and_petties":"1100.00","d_office_levy":"1220.00","other_costs":"3150.00"},
	{"purchase_price1":"1900001","purchase_price2":"2000000","transfer_fees":"27600.00","post_and_petties":"1100.00","d_office_levy":"1220.00","other_costs":"3150.00"},
	{"purchase_price1":"2000001","purchase_price2":"2100000","transfer_fees":"29200.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"2100001","purchase_price2":"2200000","transfer_fees":"29200.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"2200001","purchase_price2":"2300000","transfer_fees":"30800.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"2300001","purchase_price2":"2400000","transfer_fees":"30800.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"2400001","purchase_price2":"2500000","transfer_fees":"32400.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"2500001","purchase_price2":"2600000","transfer_fees":"32400.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"2600001","purchase_price2":"2700000","transfer_fees":"34000.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"2700001","purchase_price2":"2800000","transfer_fees":"34000.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"2800001","purchase_price2":"2900000","transfer_fees":"35600.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"2900001","purchase_price2":"3000000","transfer_fees":"35600.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"3000001","purchase_price2":"3100000","transfer_fees":"37200.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"3100001","purchase_price2":"3200000","transfer_fees":"37200.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"3200001","purchase_price2":"3300000","transfer_fees":"38800.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"3300001","purchase_price2":"3400000","transfer_fees":"38800.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"3400001","purchase_price2":"3500000","transfer_fees":"40400.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"3500001","purchase_price2":"3600000","transfer_fees":"40400.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"3600001","purchase_price2":"3700000","transfer_fees":"42000.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"3700001","purchase_price2":"3800000","transfer_fees":"42000.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"3800001","purchase_price2":"3900000","transfer_fees":"43600.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"3900001","purchase_price2":"4000000","transfer_fees":"43600.00","post_and_petties":"1100.00","d_office_levy":"1691.00","other_costs":"3150.00"},
	{"purchase_price1":"4000001","purchase_price2":"4100000","transfer_fees":"45200.00","post_and_petties":"1100.00","d_office_levy":"2051.00","other_costs":"3150.00"},
	{"purchase_price1":"4100001","purchase_price2":"4200000","transfer_fees":"45200.00","post_and_petties":"1100.00","d_office_levy":"2051.00","other_costs":"3150.00"},
	{"purchase_price1":"4200001","purchase_price2":"4300000","transfer_fees":"46800.00","post_and_petties":"1100.00","d_office_levy":"2051.00","other_costs":"3150.00"},
	{"purchase_price1":"4300001","purchase_price2":"4400000","transfer_fees":"46800.00","post_and_petties":"1100.00","d_office_levy":"2051.00","other_costs":"3150.00"},
	{"purchase_price1":"4400001","purchase_price2":"4500000","transfer_fees":"48400.00","post_and_petties":"1100.00","d_office_levy":"2051.00","other_costs":"3150.00"},
	{"purchase_price1":"4500001","purchase_price2":"4600000","transfer_fees":"48400.00","post_and_petties":"1100.00","d_office_levy":"2051.00","other_costs":"3150.00"},
	{"purchase_price1":"4600001","purchase_price2":"4700000","transfer_fees":"50000.00","post_and_petties":"1100.00","d_office_levy":"2051.00","other_costs":"3150.00"},
	{"purchase_price1":"4700001","purchase_price2":"4800000","transfer_fees":"50000.00","post_and_petties":"1100.00","d_office_levy":"2051.00","other_costs":"3150.00"},
	{"purchase_price1":"4800001","purchase_price2":"4900000","transfer_fees":"51600.00","post_and_petties":"1100.00","d_office_levy":"2051.00","other_costs":"3150.00"},
	{"purchase_price1":"4900001","purchase_price2":"5000000","transfer_fees":"51600.00","post_and_petties":"1100.00","d_office_levy":"2051.00","other_costs":"3150.00"}]

module.exports = router;
