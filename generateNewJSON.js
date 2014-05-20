require("fs").readFile("classes.json", {encoding: 'utf-8'}, function(err,data){
	data = JSON.parse(data);
	data.map(function(elem){
		delete elem.enrollment;
		delete elem.max_enrollment;
	});
	console.log(data);
	require("fs").writeFile("newClasses.json", JSON.stringify(data), function(err){

	});
});