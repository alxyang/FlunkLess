exports.index = function(req, res) {
 res.render('index.ejs');
}
exports.logs = function(req,res){
	res.render("manage.ejs");
}