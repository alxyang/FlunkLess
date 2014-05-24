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

// var room2 = new chatLog({room: 'fluffy' , roomMsgs:[{ sender: "mark", message: "hi guys testing" },
//   { sender: "derp", message: "lololololol" }]});

// room2.save(function(err, room2){
//   if(err) return console.error(err);
//   console.log(room2 + " saved");
// });

