const pool = require('../config/db');

const handleCallEvents = (socket, io, activeUsers) => {
  const userId = socket.user.userId;

  socket.on('call_user', async ({ receiver_id, call_type }) => {
    const receiverSocketId = activeUsers.get(receiver_id);
    if (!receiverSocketId) {
      socket.emit('call_rejected', { reason: 'User is offline' });
      return;
    }
    // Log call start
    const { rows } = await pool.query(
      `INSERT INTO call_logs (caller_id, receiver_id, call_type, start_time, status)
       VALUES ($1,$2,$3,NOW(),'missed') RETURNING id`,
      [userId, receiver_id, call_type]
    );
    socket.callLogId = rows[0].id;
    io.to(receiverSocketId).emit('receive_call', { caller_id: userId, call_type, call_log_id: rows[0].id });
  });

  socket.on('accept_call', ({ caller_id, call_log_id }) => {
    const callerSocketId = activeUsers.get(caller_id);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_accepted', { receiver_id: userId });
    }
    pool.query(`UPDATE call_logs SET status='answered' WHERE id=$1`, [call_log_id]).catch(console.error);
  });

  socket.on('reject_call', ({ caller_id, call_log_id }) => {
    const callerSocketId = activeUsers.get(caller_id);
    if (callerSocketId) io.to(callerSocketId).emit('call_rejected', { receiver_id: userId });
    pool.query(`UPDATE call_logs SET status='rejected', end_time=NOW() WHERE id=$1`, [call_log_id]).catch(console.error);
  });

  socket.on('end_call', ({ other_user_id, call_log_id }) => {
    const otherSocketId = activeUsers.get(other_user_id);
    if (otherSocketId) io.to(otherSocketId).emit('call_ended', { by: userId });
    pool.query(`UPDATE call_logs SET end_time=NOW() WHERE id=$1`, [call_log_id]).catch(console.error);
  });

  // WebRTC signaling
  socket.on('webrtc_offer', ({ receiver_id, offer }) => {
    const receiverSocketId = activeUsers.get(receiver_id);
    if (receiverSocketId) io.to(receiverSocketId).emit('webrtc_offer', { caller_id: userId, offer });
  });

  socket.on('webrtc_answer', ({ caller_id, answer }) => {
    const callerSocketId = activeUsers.get(caller_id);
    if (callerSocketId) io.to(callerSocketId).emit('webrtc_answer', { receiver_id: userId, answer });
  });

  socket.on('ice_candidate', ({ other_user_id, candidate }) => {
    const otherSocketId = activeUsers.get(other_user_id);
    if (otherSocketId) io.to(otherSocketId).emit('ice_candidate', { from: userId, candidate });
  });
};

module.exports = { handleCallEvents };
