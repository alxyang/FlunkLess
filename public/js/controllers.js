'use strict';

function ChatAppCtrl($scope, $q, $modal, socket) {
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

  $scope.setUsername = function(suggestedUsername) {
    $scope.username = suggestedUsername;
  }

  $scope.focus = function(bool) {
    $scope.focussed = bool;
  }

  $scope.joinServer = function() {
    $scope.user.name = this.username;
    if ($scope.user.name.length === 0) {
      $scope.error.join ='Please enter a username';
    } else {
      $scope.loading=true;
      var usernameExists = false;
      socket.emit('checkUniqueUsername', $scope.user.name, function(data) {
        usernameExists = data.result;
        if (usernameExists) {
          $scope.error.join = 'Username ' + $scope.user.name + ' already exists.';
          socket.emit('suggest', $scope.user.name, function(data) {
            $scope.suggestedUsername = data.suggestedUsername;
            $scope.loading=false;
          });
        } else {
          socket.emit('joinServer', {name: $scope.user.name});
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
    $scope.currentRooms.unshift(room);
    var roomTab = $("<li><a>"+room.name.slice(0,8) + " </a></li>");
    var exit = $("<div class='badge bg-red'></div>");
    room.displayBadge = exit;
    roomTab.find("a").append(exit);
    roomTab.click(function(){
      $scope.$apply(function(){
        $scope.viewPage = room.id;
        roomTab.addClass("active");
        room.messageQueue = 0;
         room.displayBadge.text(room.messageQueue);
      });
    });

    socket.emit('joinRoom', room.id);
    $("#classtabs").prepend(roomTab).tabcontrol();
  }

  $scope.leaveRoom = function(room) {
    $scope.message = '';
    if(room != null)
    socket.emit('leaveRoom', room.id);
  }

  $scope.deleteRoom = function(room) {
    $scope.message = '';
    socket.emit('deleteRoom', room.id)
  }

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
            console.log(data.posts, room.posts);
            room.messageQueue += data.posts.length - room.posts.length;
            room.displayBadge.text(room.messageQueue);
          }
          room.posts = data.posts;
          room.pinnedPosts = data.pinnedPosts;
          console.log(room);
     }
    });
  });

}

