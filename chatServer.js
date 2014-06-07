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
  , purgatory = require('./utils/purge')
  , emailUtil = require("./utils/email")
  , anonRoomNo = 0;
  io.set('log level', 1);

  var ClassModel = require("./models/Class").ClassModel;
  var UserModel = require("./models/User").UserModel;
  var classQuery = new ClassModel();
  var userQuery = new UserModel();
  var chatLog = require("./models/chatLog");

  classQuery.findAll(function(err,classes){
    classes.forEach(function(elm){
      rooms[elm.id] = new Room(elm.name, elm.id, null, true);
      rooms[elm.id].setCategory(elm.group);
      chatLog.getTheLog(elm.name, function(val){
        rooms[elm.id].posts = val.slice(val.length-10);
      });
    });
  });

function listAvailableRooms(socket, rooms){
  var newrooms = {};
  for(var i in rooms){
    if(rooms[i].visibility || rooms[i].invitedUsers.indexOf(socket)>= 0){
      newrooms[i] = rooms[i];
    }
  }
  return newrooms;
}

function createRoom(data, visibility, socketid){
  var roomName = data;
  if (roomName.length !== 0) {
    var uniqueRoomID = uuid.v4(); //guarantees uniquness of room
    var room = new Room(roomName, uniqueRoomID, socketid, visibility);
    rooms[uniqueRoomID] = room;
    if(visibility == true){
      utils.sendToAllConnectedClients(io,'listAvailableChatRooms', listAvailableRooms(socket,rooms));
    }
    return room;
  }
}

function loadFBInfo(user, fbinfo, socket){
  user.id = fbinfo.id;
  user.realname = fbinfo.name;
  user.email = fbinfo.email;
  userQuery.findByID(fbinfo.id, function(err, user){
    if(user === null){
        userQuery.save({id : fbinfo.id, name : fbinfo.name , rooms : [], email : fbinfo.email}, function(user){
          socket.fbUser = user;
        });
    }else{
      socket.fbUser = user;
    }
  });
}

function notifyUsers(roomid, type, data, sender){
  userQuery.findAll(function(err, users){
    users.forEach(function(user){
      if(user.rooms.indexOf(roomid)>= 0){
        var subject = "A " + type + " from " + sender;
        if(type == "pin"){
          console.log("emailing a pin");
          // emailUtil.email(user.email, subject, data.message, sender);
        }else if(type == "link"){
          console.log("emailing a link");
          // emailUtil.email(user.email, subject, "The message was '"+data.message+"' and the link was " + data.link, sender);
        }
      }
    });
  })
}

function handleTag(data, sender, room, io){
  var messageFragments = data.message.split(" ");
  var sendees = [];
  var message = {
    content: '',
    id: room.id 
  };
  message.content = sender.name + " has tagged you in a post on " + room.name
     + '! The message was "' +data.message + '"';
  messageFragments.forEach(function(fragment){
    if(fragment[0] == "@"){
      var potentialUser = fragment.slice(1);
      for(var id in people){
        if(people[id].name == potentialUser && sendees.indexOf(people[id].socketid) < 0){
          sendees.push(people[id].socketid);
        }
      }
    }
  });
  sendees.forEach(function(sendee){
    utils.sendToUser(io, sendee, "tag", message);
  })
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
          utils.sendToSelf(socket,'userData', user);
        }
      }
    });

    socket.on('createRoom', function(room) {
      var exists = false;
      _.find(rooms, function(k, v) {
        if (k.name.toLowerCase() === room.name.toLowerCase())
        return exists = true;
      });
      if (!exists) {
        var newroom = createRoom(room.name, false, socket.id);
        newroom.invitedUsers = room.invitedUsers;
        if(newroom.invitedUsers.indexOf(people[socket.id])< 0){
          newroom.invitedUsers.push(people[socket.id]);
        }
        newroom.invitedUsers.forEach(function(person){
          utils.sendToUser(io, person.socketid, 'listAvailableChatRooms', listAvailableRooms(person,rooms));
          utils.sendToUser(io, person.socketid, "invitedToRoom", newroom);
        })
      }
    });

    socket.on("updateRoom", function(room){
      var currentRoom = rooms[room.id];
      console.log(room.invitedUsers);
      console.log(currentRoom.invitedUsers)
      var newPeople = room.invitedUsers.filter(function(e){
        for(var i = 0; i < currentRoom.invitedUsers.length; i++){
          if(currentRoom.invitedUsers[i].socketid == e.socketid){
            return false;
          }
        }
        return true;
      });
      currentRoom.invitedUsers = room.invitedUsers;
      newPeople.forEach(function(person){
        utils.sendToUser(io, person.socketid, 'listAvailableChatRooms', listAvailableRooms(person,rooms));
        utils.sendToUser(io, person.socketid, "invitedToRoom", currentRoom);
      })
      
    });

    socket.on('joinRoom', function(id) {
    if (typeof people[socket.id] !== 'undefined') {
      var roomToJoin = rooms[id];
      var roomToJoin_name = rooms[id].name;
      console.log(roomToJoin_name);
      socket.join(roomToJoin.id); // joins actual room
      roomToJoin.addPerson(people[socket.id]); // adds pointer to person from room
      people[socket.id].addRoom(roomToJoin); // adds pointer to room from person
      var peopleIn = roomToJoin.getListOfPeople();
      if(roomToJoin.visibility == true){
        utils.sendToAllConnectedClients(io, 'roomData', {room : id+"", people : peopleIn});
      }else{ 
        roomToJoin.invitedUsers.forEach(function(person){
          utils.sendToUser(io, person.socketid, "roomData", {room : id+"", people : peopleIn});
        })
      }
      if(rooms[id].visibility === true){
        //how to make this async......
        chatLog.getTheLog(roomToJoin_name, function(val){
            //display most recent 10 messages
            var limit_history = val.length -10;
            if (limit_history <= 0){
              limit_history = 0;
            }

            //use underscore to see if person already exists
  /*          var counter = 0;
            _.filter(people, function(person){ 
              if(person.realname == people[socket.id].realname){
                counter++;
              }
            });
            //what if people already logged in? then itll add another 10 posts when they join the room.
            //make sure you only addPosts once if user is logged in from multiple accounts under the same fb identifier
            if (counter === 1){
              for(var i = limit_history; i < val.length; i++){
                rooms[id].addPost(val[i]);
              }
            }*/

            utils.sendToSelf(socket, 'roomPosts',
            {
                room : id, 
                posts : roomToJoin.posts, //insert chat history here?
                // posts : chatLog.getTheLog(roomToJoin_name), 
                pinnedPosts : roomToJoin.pinnedPosts,
                message_count: false
            });
        });
      } else{
          // if private room, we dont want to get the chat logs
          utils.sendToSelf(socket, 'roomPosts',
            {
                room : id, 
                posts : roomToJoin.posts, //insert chat history here?
                // posts : chatLog.getTheLog(roomToJoin_name), 
                pinnedPosts : roomToJoin.pinnedPosts,
                message_count: false
            });
      }

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
      console.log(roomToJoin);
      var peopleIn = roomToJoin.getListOfPeople();
      if(roomToJoin.visibility == true){
        utils.sendToAllConnectedClients(io, 'roomData', {room : id, people : peopleIn});
      }else{
        roomToJoin.invitedUsers.forEach(function(person){
          utils.sendToUser(io, person.socketid, "roomData", {room : id, people : peopleIn});
        })
      }
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
      //if no existing room
      console.log(data);
      console.log(data.roomid + " is sendroom id");
      if(rooms[data.roomid] == null){
        return;
      }
      switch(data.type){
        case "message" :  
          rooms[data.roomid].addPost(data);
          chatLog.saveToLog(rooms[data.roomid].name, data.name, data.message);
          handleTag(data, people[socket.id], rooms[data.roomid], io);
          break;
        case "pin" :
          rooms[data.roomid].pinPost(data);
          notifyUsers(data.roomid, "pin", data, people[socket.id].name);
          chatLog.saveToLog(rooms[data.roomid].name, data.name, data.message);
          break;
        case "link" :
          rooms[data.roomid].pinPost(data);
          notifyUsers(data.roomid, "link", data, people[socket.id].name);
          chatLog.saveToLog(rooms[data.roomid].name, data.name, data.message);
          break;
        case "question" :
          rooms[data.roomid].pinPost(data);
          notifyUsers(data.roomid, "question", data, people[socket.id].name);
          chatLog.saveToLog(rooms[data.roomid].name, data.name, data.message);
          handleTag(data, people[socket.id], rooms[data.roomid], io);
          data.message = 'has asked a question, "'+data.message + '"';
          rooms[data.roomid].addPost(data);
          break;
        }
      
        utils.sendToAllClientsInRoom(io,  data.roomid, 'roomPosts',
        {
            room : data.roomid,
            posts : rooms[data.roomid].posts,
            pinnedPosts : rooms[data.roomid].pinnedPosts,
            message_count: true
        });  
      
  });

  socket.on('disconnect', function() {
    if(people[socket.id] != null){
        var user = people[socket.id];
        user.rooms.forEach(function(e){
          rooms[e].removePerson(user);
          utils.sendToAllConnectedClients(io, 'roomData', {room : rooms[e].id + "", people : rooms[e].getListOfPeople()});
        }); 
        delete people[socket.id];
        utils.sendToAllConnectedClients(io,'listAvailableChatRooms', listAvailableRooms(socket,rooms));
      }
  });

  socket.on("inviteToChat", function(person){
    if(socket.id != person.socketid){
      var room = createRoom("room " + anonRoomNo++, false, socket.id);
      room.invitedUsers.push(person);
      room.invitedUsers.push(people[socket.id]);
      utils.sendToUser(io, socket.id, "invitedToRoom", room);
      utils.sendToUser(io, person.socketid, "invitedToRoom", room);
    }

  });

  socket.on("getClassID", function(fbid, cb){
    userQuery.findByID(fbid, function(err, user){
      if(user != null)
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