var mongoose = require("mongoose");
var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var UserSchema = new Schema({
	id : Number,
	name : String,
  rooms : [String],
  email : String
})

var User = mongoose.model("User", UserSchema);

UserModel = function(){};

//Find all Users
UserModel.prototype.findAll = function(callback) {
  User.find({}, function (err, User) {
    callback( null, User )
  });  
};

UserModel.prototype.findByID = function(id, callback) {
  User.findOne({id : id}, function (err, User) {
    callback( null, User)
  });  
};

UserModel.prototype.addClass = function(id,classid, callback){
    User.findOne({id : id}, function (err, User) {
      User.rooms.push(classid);
      User.save();
    });  
}

UserModel.prototype.removeClass = function(id,classid, callback){
    User.findOne({id : id}, function (err, User) {
      User.rooms = User.rooms.splice(User.rooms.indexOf(classid), 1);
      User.save();
    });  
}

//Create a new User
UserModel.prototype.save = function(params, callback) {
  var person = new User({id : params.id, name : params.name, rooms : params.rooms, email : params.email});
  person.save(function (err) {
    callback(person);
  });
};


exports.UserModel = UserModel;