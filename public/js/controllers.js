'use strict';

function ChatAppCtrl($scope, $q, $modal, $http, $filter, socket) {

  $scope.viewOptions = ["main", "chat", "create", "manage", "chatLog"];
  $scope.navView = $scope.viewOptions[0];

  $scope.usersCount = 0;
  $scope.messages = [];
  $scope.user = {}; //holds information about the current user
  $scope.users = []; //holds information about ALL users
  $scope.rooms = []; //holds information about all rooms
  $scope.error = {};
  $scope.logs = [];

  $scope.modes = ["Send", "Link", "Announce", "Question"];
  $scope.categories = [];
  $scope.category = "";

  $scope.currentRooms = [];
  $scope.viewPage = "addroom"; // this is a hack for the buggy tabs
  $scope.pinViews = [{name : "Announcements", type : "pin", active : true},
                     {name : "Questions", type : "question", active : true}, 
                     {name : "Links", type : "link", active : true}];
  $scope.pinMap = {'pin' : 0, 'question' : 1, 'link' : 2}
  $scope.roomsToLoad = [];

  $scope.tags = [];
  $scope.colors = [];

  var emptyRoom = function(){
    this.name = "Place Room Name Here",
    this.description ="Place Description Here",
    this.invitedUsers  =[],
    this.status ="New"
  }

  $scope.modifyRoom = new emptyRoom();

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
              $scope.roomsToLoad = classids;
            }
        });
  }


  $scope.changeModifiedRoom = function(room){
    $scope.modifyRoom = room;
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
      }else if (writeMode == $scope.modes[3]){
        socket.emit("send", {
          name : this.username,
          roomid : id,
          message : this.message,
          type : 'question'
        });
      }
      this.message = "";
    }

  }

  $scope.setUpNewRoom = function(){
    $scope.modifyRoom = new emptyRoom();
  }

  $scope.submitRoom = function(room){
    console.log(room);
    if(room.status == "New"){
      $scope.createRoom(room);
      $scope.modifyRoom = new emptyRoom();
    }else{
      console.log("UPDATING ROOM");
      socket.emit('updateRoom', room);
    }
  }

  $scope.createRoom = function(room) {
    var roomExists = false;
    if ((typeof room.name === 'string' && room.name.length === 0)) {
      $scope.error.create = 'Please enter a room name';
    } else {
      socket.emit('checkUniqueRoomName', room.name, function(data) {
        roomExists = data.result;
        if (roomExists) {
          $scope.error.create = 'Room ' + room + ' already exists.';
        } else {
          room.status = "Created";
          socket.emit('createRoom', room);
        }
      });
    }
  }

  $scope.addedInRoom = function(item){
    return $scope.currentRooms.indexOf(item) < 0;
  }

  $scope.checkPrivacy = function(item){
    return item.visibility == false;
  }

  $scope.addToInvitedUsers = function(){
    var invitee = $scope.selectedPerson.originalObject;
    if($scope.modifyRoom.invitedUsers.indexOf(invitee) < 0)
      $scope.modifyRoom.invitedUsers.push(invitee)
  }

  $scope.addRoom = function(room){
    //TODO: need a check here to see if user has already added room!
    room.writeMode = "Send";
    room.messageQueue = 0;
    $scope.currentRooms.unshift(room)
    socket.emit('joinRoom', room.id);
  }

  $scope.switchRoom = function(room){
    room.messageQueue = 0;
    $scope.viewPage = room.id;
  }

  $scope.leaveRoom = function(room) {
    $scope.message = '';
    if(room != null){
      //console.log("LEAVING ROOM " + roomid);
      socket.emit('leaveRoom', room.id);
      $scope.currentRooms.splice($scope.currentRooms.indexOf(room),1);
      if($scope.currentRooms.length == 0){
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

  //currently does not work if room name has slashes, the special chars need to be escaped
  //makes a get request using $http service to a url using roomname as key
  $scope.getChatLog = function(roomName){
    $http.get('/chatLogs/' + roomName).success(function(data){
      //set array of messages recieved from backend into an array to be displayed on page
      $scope.logs = data;
    });
  }

  //check and compare log dates for date picker
  $scope.checkStatus = function(log, dt, dt2){
    //javascript filter piped to the correct output style
    var filterLogDate = $filter('date')(log.created, 'MM/dd/yyyy');
    var filterDatepickerDateStart = $filter('date')(dt, 'MM/dd/yyyy');
    var filterDatepickerDateEnd = $filter('date')(dt2, 'MM/dd/yyyy');
    return ((filterLogDate >= filterDatepickerDateStart) && (filterLogDate <= filterDatepickerDateEnd));
  }

  socket.on("invitedToRoom", function(room){
    var check = confirm("You have been invited to " + room.name + ". Do you wish to accept?");
    if(confirm){
       $scope.addRoom(room);
       $scope.viewPage = room.id;
    }
  });

  socket.on('sendUserDetail', function(data) {
    $scope.user = data;
  });

  socket.on('listAvailableChatRooms', function(data) {
    console.log(data);
    angular.forEach(data, function(room, key) {
      room.writeMode = "Send";
      room.messageQueue = 0;
      $scope.rooms.push(room);
      angular.forEach(room.people, function(e){
        var index = -1;
        for(var i = 0; i < $scope.users.length; i++){
          if($scope.users[i].socketid == e.socketid){
            index = i;
          }
        }
        if(index == -1){
          $scope.users.push(e);
        }
      })
      if($scope.categories.indexOf(room.category) < 0){
        $scope.categories.push(room.category);
      }
    });

    $scope.rooms = $scope.rooms.sort(function(e1,e2){
      return e1.name.localeCompare(e2.name);
    });
    if($scope.roomsToLoad.length > 0){
      var classids = $scope.roomsToLoad;
      classids.forEach(function(classid){
      for(var i = 0; i < $scope.rooms.length; i++){
        if($scope.rooms[i].id == classid){
          $scope.addRoom($scope.rooms[i]);
          }
        } 
      })
        $scope.roomsToLoad = [];
    }
  });

  socket.on('sendChatMessage', function(message) {
    $scope.messages.push(message);
  });

  socket.on("tag", function(tag){
    $scope.tags.unshift(tag);
  })

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
          angular.forEach(room.people, function(e){
            var index = -1;
            for(var i = 0; i < $scope.users.length; i++){
              if($scope.users[i].socketid == e.socketid){
                index = i;
              }
            }
            if(index == -1){
              $scope.users.push(e);
              }
          })
     }
    });
  })

  socket.on('roomPosts', function(data){
    angular.forEach($scope.currentRooms, function(room){
      if(data.room === room.id){
          if(room.id != $scope.viewPage){
            //console.log(data.posts, room.posts);
            room.messageQueue += data.posts.length - room.posts.length;
          }
          room.posts = data.posts;
          room.pinnedPosts = data.pinnedPosts;
          //console.log(room);
     }
    });
  });

}

var DatepickerCtrl = function ($scope) {
  $scope.today = function() {
    $scope.dt = new Date();
    $scope.dt2 = new Date();
  };
  $scope.today();

  $scope.clear = function () {
    $scope.dt = null;
    $scope.dt2 = null;
  };

  $scope.toggleMin = function() {
    $scope.minDate = $scope.minDate ? null : new Date();
  };
  $scope.toggleMin();

  $scope.open = function($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.opened = true;
  };

  $scope.open2 = function($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.opened2 = true;
  };

  $scope.dateOptions = {
    formatYear: 'yy',
    startingDay: 1
  };

  $scope.initDate = new Date('2016-15-20');
  $scope.formats = ['MM/dd/yyyy', 'dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
  $scope.format = $scope.formats[0];

};
