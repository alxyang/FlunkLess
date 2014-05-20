var nodemailer = require("nodemailer");

var smtpTransport = nodemailer.createTransport("SMTP",{
   service: "Gmail",
   auth: {
       user: "fortrex@gmail.com",
       pass: "102092Aa"
   }
});

module.exports.email = function(emailAddress, subject, message, sender){
	smtpTransport.sendMail({
   from: sender, // sender address
   to: emailAddress, // comma separated list of receivers
   subject: subject, // Subject line
   text: message // plaintext body
}, function(error, response){
   if(error){
       console.log(error);
   }else{
       console.log("Message sent: " + response.message);
   }
});
}