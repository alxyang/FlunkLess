function Room(name, id, owner, visibility) {
  this.name = name;
  this.id = id;
  this.owner = owner;
  this.posts = [];
  this.pubView = visibility == null ? true : visibility;
  this.invitedUsers = [];
  this.people = [];
  this.pinnedPosts = [];
  this.category = null;
};

Room.prototype.addPerson = function(personID) {
    this.people.push(personID);
};

Room.prototype.setCategory = function(category){
  this.category = category;
};

Room.prototype.removePerson = function(person){
  this.people = this.people.filter(function(e){
    return e.socketid != person.socketid;
  })
}

Room.prototype.getListOfPeople = function(){
  return this.people;
}

Room.prototype.addPost = function(post){
  this.posts.push(post);
}

Room.prototype.pinPost = function(post){
  this.pinnedPosts.push(post);
}
module.exports = Room;