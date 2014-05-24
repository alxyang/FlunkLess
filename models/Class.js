var mongoose = require("mongoose");
var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var ClassSchema = Schema({
	id : Number,
	name : String,
	instructor : String,
	group : String
})

var Class = mongoose.model("Class", ClassSchema, 'Class');

ClassModel = function(){};

//Find all Classes
ClassModel.prototype.findAll = function(callback) {
  Class.find({}, function (err, Class) {
    callback( null, Class )
  });  
};

//Find Class by ID
ClassModel.prototype.findById = function(id, callback) {
  Class.findById(id, function (err, Class) {
    if (!err) {
	  callback(null, Class);
	}
  });
};


//Create a new Class
ClassModel.prototype.save = function(params, callback) {
  var Class = new Class({id : 0, name : params.name, instructor : params.instructor, group : params.group});
  Class.save(function (err) {
    callback();
  });
};


exports.ClassModel = ClassModel;