function setupSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join_trip', ({ user_id, trip_id }) => {
      if (!trip_id || !user_id) return;
      socket.join(`trip:${trip_id}`);
    });
  });
}

function emitTripUpdate(io, tripId, payload) {
  if (!tripId) return;
  io.to(`trip:${tripId}`).emit('trip_update', payload);
}

module.exports = { setupSocket, emitTripUpdate };