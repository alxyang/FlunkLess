function Person(name, socketid) {
  this.name = name;
  this.socketid = socketid;
  this.id; // facebook id
  this.realname;
  this.rooms = []
  this.email;
};

Person.prototype.addRoom = function(room){
  this.rooms.push(room.id);
} 
module.exports = Person;