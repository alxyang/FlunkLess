var chatLogModel = require('../models/chatLog');

exports.index = function(req, res) {
 res.render('index.ejs');
}
//render chatLogs for appropriate room
exports.chatLogs = function(req, res){
  //query chatLogs by using room name from the front end
  return chatLogModel.chatLog.findOne({ room: req.params.id }, function (err, data) {
    if (err) { throw(err); }
    res.json(data.roomMsgs);
  });
}