'use strict';

function ChatAppCtrl($scope, $q, $modal, socket) {
  $scope.viewOptions = ["chat", "create", "manage"];
  $scope.navView = $scope.viewOptions[0];

  $scope.peopleCount = 0;
  $scope.messages = [];
  $scope.user = {}; //holds information about the current user
  $scope.users = {}; //holds information about ALL users
  $scope.rooms = []; //holds information about all rooms
  $scope.error = {};

  $scope.modes = ["Send", "Link", "Pin", "To Professor"];
  $scope.categories = [];
  $scope.category = "";

  $scope.currentRooms = [];
  $scope.viewPage = "addroom"; // this is a hack for the buggy tabs
  $scope.classIDStoLoad = [];

  function getClassIDS(id){
        socket.emit("getClassID", id, function(classids){
            if($scope.rooms.length > 0){
              classids.forEach(function(classid){
                for(var i = 0; i < $scope.rooms.length; i++){
                  if($scope.rooms[i].id == classid){
                    $scope.addRoom($scope.rooms[i]);
                  }
                }
              })
            }else{
              $scope.classIDStoLoad = classids;
            }
        });
  }

  $scope.setUsername = function(suggestedUsername) {
    $scope.username = suggestedUsername;
  }

  $scope.focus = function(bool) {
    $scope.focussed = bool;
  }

  $scope.FBLogin = function(){
    FB.login(function(){
      FB.api('/me', function(response) {
        //console.log(response);
        $scope.joinServer(response);
        getClassIDS(response.id);
      });
    }, {scope: 'email,user_likes'});
  }


  $scope.joinServer = function(fbresponse) {
    var username = this.username;
    if (username === 0) {
      $scope.error.join ='Please enter a username';
    } else {
      $scope.loading=true;
      var usernameExists = false;
      socket.emit('checkUniqueUsername', username, function(data) {
        usernameExists = data.result;
        if (usernameExists) {
          $scope.error.join = 'Username ' + this.username + ' already exists.';
          socket.emit('suggest', this.username, function(data) {
            $scope.suggestedUsername = data.suggestedUsername;
            $scope.loading=false;
          });
        } else {
          $scope.user.name = username;
          if(fbresponse != null){
            $scope.user.realname = fbresponse.name;
          }
          socket.emit('joinServer', {name: $scope.user.name, fbinfo : fbresponse});
          $scope.joined = true;
          $scope.error.join = '';
          $scope.loading=false;
        }
      });
    }
  }

  $scope.send = function(id, writeMode) {
    if (typeof this.message === 'undefined' || (typeof this.message === 'string' && this.message.length === 0)) {
      $scope.error.send = 'Please enter a message';
    } else {
      if(writeMode == $scope.modes[0]){ // send
        socket.emit('send', {
          roomid : id,
          name: this.username,
          message: this.message,
          type : 'message'
        });
        $scope.message = '';
        $scope.error.send = '';
      }else if (writeMode == $scope.modes[1]){
        socket.emit("send", {
          name : this.username,
          roomid : id,
          message : this.message,
          url : this.urllink,
          type : 'link'
        });
      }else if (writeMode == $scope.modes[2]){
        socket.emit("send", {
          name : this.username,
          roomid : id,
          message : this.message,
          type : 'pin'
        });
      }else{
        alert("I DONT KNOW ABOUT THIS ONE");
      }
    }

  }

  $scope.createRoom = function() {
    var roomExists = false;
    var room = this.roomname;
    if (typeof room === 'undefined' || (typeof room === 'string' && room.length === 0)) {
      $scope.error.create = 'Please enter a room name';
    } else {
      socket.emit('checkUniqueRoomName', room, function(data) {
        roomExists = data.result;
        if (roomExists) {
          $scope.error.create = 'Room ' + room + ' already exists.';
        } else {
          socket.emit('createRoom', room);
          $scope.error.create = '';
          if (!$scope.user.inroom) {
            $scope.messages = [];
            $scope.roomname = '';
          }
        }
      });
    }
  }

  $scope.addedInRoom = function(item){
    return $scope.currentRooms.indexOf(item) < 0;
   
  }

  $scope.addRoom = function(room){
    //TODO: need a check here to see if user has already added room!
    room.writeMode = "Send";
    room.messageQueue = 0;
    $scope.currentRooms.unshift(room);
    var roomTab = $("<li><a>"+room.name.slice(0,room.name.indexOf("-")) + " </a></li>");
    var exit = $("<div class='badge bg-red'></div>");
    room.displayBadge = exit;
    room.displayTab = roomTab;
    roomTab.find("a").append(exit);
    roomTab.click(function(){
      $scope.$apply(function(){
        $scope.viewPage = room.id;
        room.messageQueue = 0;
         room.displayBadge.text(room.messageQueue);
      });
    });

    socket.emit('joinRoom', room.id);
    $("#classtabs").prepend(roomTab);
  }

  $scope.leaveRoom = function(roomid) {
    var room = $scope.rooms.filter(function(e){
      return e.id == roomid;
    })[0];
    
    $scope.message = '';
    if(room != null){
      //console.log("LEAVING ROOM " + roomid);
      socket.emit('leaveRoom', room.id);
      room.displayTab.remove(); 
      $scope.currentRooms.splice($scope.currentRooms.indexOf(room),1);
      if($scope.currentRooms == 0){
        $scope.viewPage = "addroom";
      }else{
        $scope.viewPage = $scope.currentRooms[$scope.currentRooms.length-1].id;
      }
    }
  }

  $scope.invitePerson = function(person){
    var invitePerson = confirm("Invite " + person.name + "to a private room?");
    if(invitePerson){
      socket.emit("inviteToChat", person);
    }
  }

  socket.on("invitedToRoom", function(room){
    console.log("INVITED TO ", room);
    $scope.addRoom(room);
     $scope.viewPage = room.id;
  });

  socket.on('sendUserDetail', function(data) {
    $scope.user = data;
  });

  socket.on('listAvailableChatRooms', function(data) {
    angular.forEach(data, function(room, key) {
      room.writeMode = "Send";
      room.messageQueue = 0;
      $scope.rooms.push(room);
      if($scope.categories.indexOf(room.category) < 0){
        $scope.categories.push(room.category);
      }
    });

    $scope.rooms = $scope.rooms.sort(function(e1,e2){
      return e1.name.localeCompare(e2.name);
    });
    if($scope.classIDStoLoad.length > 0){
      var classids = $scope.classIDStoLoad;
      classids.forEach(function(classid){
      for(var i = 0; i < $scope.rooms.length; i++){
        if($scope.rooms[i].id == classid){
          $scope.addRoom($scope.rooms[i]);
          }
        } 
      })
        $scope.classIDStoLoad = [];
    }
  });

  socket.on('sendChatMessage', function(message) {
    $scope.messages.push(message);
  });

  socket.on('sendChatMessageHistory', function(data) {
    angular.forEach(data, function(messages, key) {
      $scope.messages.push(messages);
    });
  });

  socket.on('roomData', function(data){
    //console.log(data);
    angular.forEach($scope.currentRooms, function(room){
      if(data.room.localeCompare(room.id) >= 0){
          room.people = data.people;
     }
    });
  })

  socket.on('roomPosts', function(data){
    angular.forEach($scope.currentRooms, function(room){
      if(data.room === room.id){
          if(room.id != $scope.viewPage){
            //console.log(data.posts, room.posts);
            room.messageQueue += data.posts.length - room.posts.length;
            room.displayBadge.text(room.messageQueue);
          }
          room.posts = data.posts;
          room.pinnedPosts = data.pinnedPosts;
          //console.log(room);
     }
    });
  });

}

