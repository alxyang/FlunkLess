module.exports = function(server) {
  var uuid = require('node-uuid');
  _ = require('underscore')._
  , Room = require('./utils/room')
  , Person = require("./utils/person")
  , people = {}
  , rooms = {}
  , chatHistory = {}
  , roomPosts = {}
  , io = require('socket.io').listen(server)
  , utils = require('./utils/utils')
  , purgatory = require('./utils/purge');
  io.set('log level', 1);

  var ClassModel = require("./models/Class").ClassModel;
  var UserModel = require("./models/User").UserModel;
  var classQuery = new ClassModel();
  var userQuery = new UserModel();

  classQuery.findAll(function(err,classes){
    classes.forEach(function(elm){
      rooms[elm.id] = new Room(elm.name, elm.id, null, true);
      rooms[elm.id].setCategory(elm.group);
    });
  });


function listAvailableRooms(socket, rooms){
  var newrooms = {};
  for(var i in rooms){
    if(rooms[i].pubView || rooms[i].invitedUsers.indexOf(socket.id)>= 0){
      newrooms[i] = rooms[i];
    }
  }
  return newrooms;
}
function createRoom(data, visibility){
  var roomName = data;
  if (roomName.length !== 0) {
    var uniqueRoomID = uuid.v4(); //guarantees uniquness of room
    var room = new Room(roomName, uniqueRoomID, socket.id, visibility);
    rooms[uniqueRoomID] = room;
   utils.sendToAllConnectedClients(io,'listAvailableChatRooms', listAvailableRooms(socket,rooms));
  }
}

function loadFBInfo(user, fbinfo, socket){
  user.id = fbinfo.id;
  user.realname = fbinfo.name;
  userQuery.findByID(fbinfo.id, function(err, user){
    if(user === null){
        userQuery.save({id : fbinfo.id, name : fbinfo.name , rooms : []}, function(user){
          socket.fbUser = user;
        });
    }else{
      socket.fbUser = user;
    }
  });
}

  io.sockets.on('connection', function (socket) {

    socket.on('joinServer', function(data) {
      var fbinfo = data.fbinfo;
      var exists = false;
      _.find(people, function(k, v) {
        if (k.name.toLowerCase() === data.name.toLowerCase())
          return exists = true;
      });

      if (!exists) {
        if (data.name.length !== 0) {
          var user = new Person(data.name, socket.id);
          if(fbinfo != null){
            loadFBInfo(user, data.fbinfo, socket)
          }
          people[socket.id] = user;
          utils.sendToSelf(socket,'listAvailableChatRooms', listAvailableRooms(socket,rooms));
        }
      }
    });

    socket.on('createRoom', function(data) {
      var exists = false;
      _.find(rooms, function(k, v) {
        if (k.name.toLowerCase() === data.toLowerCase())
        return exists = true;
      });
      if (!exists) {
        createRoom(data, false);
      }
    });

    socket.on('joinRoom', function(id) {
    if (typeof people[socket.id] !== 'undefined') {
      var roomToJoin = rooms[id];
      socket.join(roomToJoin.id); // joins actual room
      roomToJoin.addPerson(people[socket.id]); // adds pointer to person from room
      people[socket.id].addRoom(roomToJoin); // adds pointer to room from person
      var peopleIn = roomToJoin.getListOfPeople();
      utils.sendToAllConnectedClients(io, 'roomData', {room : id+"", people : peopleIn})
      utils.sendToSelf(socket, 'roomPosts',
        {
            room : id, 
            posts : roomToJoin.posts,
            pinnedPosts : roomToJoin.pinnedPosts
        });
        if(socket.fbUser != null){
          if(socket.fbUser.rooms.indexOf(id)< 0){
            socket.fbUser.rooms.push(id);
            socket.fbUser.save(function(err){
              console.log(err);
            });
          }
        }
      }
    });

 socket.on('leaveRoom', function(id) {
    if (typeof people[socket.id] !== 'undefined') {
      var roomToJoin = rooms[id];
      socket.leave(roomToJoin.id); // joins actual room
      roomToJoin.removePerson(people[socket.id]); // adds pointer to person from room
      delete people[socket.id];
      var peopleIn = roomToJoin.getListOfPeople();
      utils.sendToAllConnectedClients(io, 'roomData', {room : id+"", people : peopleIn})
      utils.sendToSelf(socket, 'roomPosts',
        {
            room : id, 
            posts : roomToJoin.posts,
            pinnedPosts : roomToJoin.pinnedPosts
        });
        if(socket.fbUser != null){
          var index = socket.fbUser.rooms.indexOf(id);
          if(index >= 0){
            socket.fbUser.rooms.splice(index,1);
            socket.fbUser.save(function(err){
              console.log(err);
            });
          }
        }
      }
    });

    socket.on('send', function(data) {
      if(rooms[data.roomid] == null){
        return;
      }
     
      if(data.type=='message'){
          rooms[data.roomid].addPost(data);
      }else{
          rooms[data.roomid].pinPost(data);
    }
      console.log(rooms[data.roomid]);
      utils.sendToAllClientsInRoom(io,  data.roomid, 'roomPosts',
        {
            room : data.roomid,
            posts : rooms[data.roomid].posts,
            pinnedPosts : rooms[data.roomid].pinnedPosts
        });
  });

  socket.on('disconnect', function() {
    if(people[socket.id] != null){
      console.log(people[socket.id]);
        var user = people[socket.id];
        user.rooms.forEach(function(e){
          rooms[e].removePerson(user.name);
          utils.sendToAllConnectedClients(io, 'roomData', {room : rooms[e].id + "", people : rooms[e].getListOfPeople()});
        }); 
        delete people[socket.id];
        utils.sendToAllConnectedClients(io,'listAvailableChatRooms', listAvailableRooms(socket,rooms));
      }
  });

  socket.on("getClassID", function(fbid, cb){
    userQuery.findByID(fbid, function(err, user){
      console.log(user);
      cb(user.rooms)
    });
  });


  socket.on('checkUniqueUsername', function(username, cb) {
    var exists = false;
    if (username.length !== 0) {
      _.find(people, function(k, v) {
      if (k.name.toLowerCase() === username) {
        return exists = true;
        }
      });
      cb({result: exists});
    }
  });

    socket.on('checkUniqueRoomName', function(roomname, cb) {
      var exists = false;
      if (roomname.length !== 0) {
        _.find(rooms, function(k, v) {
          if (k.name.toLowerCase() === roomname) {
            return exists = true;
          }
        });
        cb({result: exists});
      }
    });

    socket.on('suggest', function(username, cb) {
      var random = Math.floor(Math.random()*1001);
      var suggestedUsername = username + random;
      cb({suggestedUsername: suggestedUsername});
    });
  });
}