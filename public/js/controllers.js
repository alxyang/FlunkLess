'use strict';
app.factory('StateService', function(socket){
  var init_rooms = [];
  var current_rooms = [];
  var addroom = function(room){
    room.writeMode = "Send";
    room.messageQueue = 0;
    current_rooms.unshift(room);
    // console.log("added something to " + current_rooms);
    socket.emit('joinRoom', room.id);
    // console.log(room.name);
  };

  var get_current_rooms = function(){
    // console.log("hooray current_rooms: " + current_rooms);
    return current_rooms;
  }

  var get_rooms_to_load = function(){
      return init_rooms;
  };

  var rooms_to_load = function(classids){
    init_rooms = classids;
    // console.log("hooray rooms set to load: " + classids);
  };

  var init_username;
  var set_user_join = function(username){
    init_username = username;
    console.log("username set: " + init_username);
  }
  var get_user_join = function(){
    return init_username;
  }

  var init_fb_response = {};
  var set_user_fb_info = function(fbresponse){
    init_fb_response = fbresponse;
    console.log("fbresponse set: " + init_fb_response);
  }
  var get_user_fb_info = function(){
    return init_fb_response;
  }

  return {
    addroom: addroom,
    rooms_to_load: rooms_to_load,
    get_rooms_to_load: get_rooms_to_load,
    set_user_join: set_user_join,
    get_user_join: get_user_join,
    get_user_fb_info: get_user_fb_info,
    set_user_fb_info: set_user_fb_info,
    get_current_rooms: get_current_rooms
  }

});
function loginCtrl($scope, $q, $modal, $http, $filter, $location, socket, StateService){
  $scope.FBLogin = function(){
    FB.login(function(){
      FB.api('/me', function(response) {
        console.log(response);
        $scope.joinServer(response);
        getClassIDS(response.id);
        $location.path('/main');
        $scope.$apply();
      });
    }, {scope: 'email,user_likes'});
  };

  function getClassIDS(id){
        socket.emit("getClassID", id, function(classids){
            console.log($scope.rooms.length + " uh oh thi might be 0 ");
            if($scope.rooms.length > 0){
              classids.forEach(function(classid){
                console.log("adfasdfasdfasf");
                for(var i = 0; i < $scope.rooms.length; i++){
                  console.log(12312312312312);
                  if($scope.rooms[i].id == classid){
                    console.log("adding initial rooms!!!!!");
                    $scope.addRoom = StateService.addroom($scope.rooms[i]);
                  }
                }
              })
            }else{
              console.log("wtf what if it goes into here");
              $scope.roomsToLoad = StateService.rooms_to_load(classids);
            }
        });
  }

  $scope.setUsername = function(suggestedUsername) {
    $scope.username = suggestedUsername;
  };

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
          StateService.set_user_join(username);
          StateService.set_user_fb_info(fbresponse);
          // socket.emit('joinServer', {name: $scope.user.name, fbinfo : fbresponse});
          // $scope.joined = true;
          // $scope.error.join = '';
          // $scope.loading=false;
        }
      });
    }
  }
}

function mainCtrl($scope, $q, $modal, $http, $filter, socket, StateService){

}

function chatCtrl($scope, $q, $modal, $http, $filter, socket, StateService){


  $scope.modes = ["Send", "Link", "Announce", "Question"];
  $scope.categories = [];
  $scope.category = "";


  $scope.viewPage = "addroom"; // this is a hack for the buggy tabs
  $scope.pinViews = [{name : "Announcements", type : "pin"},
                     {name : "Questions", type : "question"}, 
                     {name : "Links", type : "link"}];
  $scope.pinView = 0;
  $scope.roomsToLoad = StateService.get_rooms_to_load();
  $scope.currentRooms = StateService.get_current_rooms();
  console.log("we are in chatCtrl, rooms to load are: " + $scope.roomsToLoad);
  console.log("we are in chatCtrl, current rooms are: " + $scope.currentRooms);

  $scope.colors = [];

    socket.emit('joinServer', {name: StateService.get_user_join(), fbinfo : StateService.get_user_fb_info()});
    $scope.addRoom = function(room){
      StateService.addroom(room);
      $scope.currentRooms = StateService.get_current_rooms();
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

  $scope.switchRoom = function(room){
    room.messageQueue = 0;
    $scope.viewPage = room.id;
  }


  $scope.addedInRoom = function(item){
    return $scope.currentRooms.indexOf(item) < 0;
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
    socket.on('sendUserDetail', function(data) {
    $scope.user = data;
  });

  socket.on('listAvailableChatRooms', function(data) {
    // console.log(data);
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
          $scope.addRoom = StateService.addroom($scope.rooms[i]);
          }
        } 
      })
      $scope.roomsToLoad = [];
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

function createCtrl($scope, $q, $modal, $http, $filter, socket){
  
  var emptyRoom = function(){
    this.name = "Place Room Name Here",
    this.description ="Place Description Here",
    this.invitedUsers  =[],
    this.status ="New"
  }

  $scope.modifyRoom = new emptyRoom();

  $scope.changeModifiedRoom = function(room){
    $scope.modifyRoom = room;
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

  $scope.addToInvitedUsers = function(){
    var invitee = $scope.selectedPerson.originalObject;
    if($scope.modifyRoom.invitedUsers.indexOf(invitee) < 0)
      $scope.modifyRoom.invitedUsers.push(invitee)
  }

    $scope.invitePerson = function(person){
    var invitePerson = confirm("Invite " + person.name + "to a private room?");
    if(invitePerson){
      socket.emit("inviteToChat", person);
    }
  }

    socket.on("invitedToRoom", function(room){
    var check = confirm("You have been invited to " + room.name + ". Do you wish to accept?");
    if(confirm){
       $scope.addRoom(room);
       $scope.viewPage = room.id;
    }
  });

}

function ChatAppCtrl($scope, $q, $modal, $http, $filter, socket) {

  $scope.usersCount = 0;
  $scope.messages = [];
  $scope.user = {}; //holds information about the current user
  $scope.users = []; //holds information about ALL users
  $scope.rooms = []; //holds information about all rooms
  $scope.error = {};
  $scope.logs = [];
  $scope.viewOptions = ["main", "chat", "create", "manage", "chatLog"];
  $scope.navView = $scope.viewOptions[0];

    $scope.tags = [];
  socket.on("tag", function(tag){
    $scope.tags.unshift(tag);
  })
  $scope.focus = function(bool) {
    $scope.focussed = bool;
  }

  $scope.checkPrivacy = function(item){
    return item.visibility == false;
  }

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
