
  var mongoose = require("mongoose");
  var Schema = mongoose.Schema
      , ObjectId = Schema.ObjectId;

  var chatLogSchema = new Schema({
      id: ObjectId,
      room: String,
      roomMsgs: [{
        sender: String, 
        message: String,
        created: {type: Date, default: Date.now}
      }]
  });

  var chatLog = mongoose.model('chatLog', chatLogSchema);

  module.exports.chatLog = chatLog;

    //don't call this unless you are adding a new unique room, or it will create duplicate entries in DB
  var generateChatLogs = function(roomName){
    //need a check here to see if rooms have already been created
    var chatLogCreate = new chatLog({room: roomName , roomMsgs:[{ sender: "ChatBot", message: "No Messages Yet." }]});
    chatLogCreate.save(function(err, chatLogCreate){
    if(err) return console.error(err);
       console.log(chatLogCreate + " saved");
    });
  }

  module.exports.generateChatLogs = generateChatLogs;

  //on send, saves message to chatlog by pushing to the rooms roomMsgs array in DB
  var saveToLog = function(roomName, csender, cmessage){
    var saveMessage = {
        sender: csender,
        message: cmessage
    };

    chatLog.update({ 'room': roomName },
         {$push: { 'roomMsgs' : saveMessage }},{upsert:true}, function(err, data) { 
            console.log("message recieved and saved to db");
    });
  }

  module.exports.saveToLog = saveToLog;