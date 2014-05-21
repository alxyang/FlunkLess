module.exports.sendToSelf = function(socket, method, data) {
  socket.emit(method, data);
}

module.exports.sendToAllConnectedClients = function(io, method, data) {
  io.sockets.emit(method, data);
}

module.exports.sendToAllClientsInRoom = function(io, room, method, data) {
  io.sockets.in(room).emit(method, data);
}

module.exports.sendToUser = function(io, userid, key, message){
	io.sockets.socket(userid).emit(key, message);
}