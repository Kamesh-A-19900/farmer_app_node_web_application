const pool = require('../config/db');

const handleChatEvents = (socket, io, activeUsers) => {
  const userId = socket.user.userId;

  socket.on('send_message', async ({ conversation_id, message_text, message_type = 'text' }) => {
    try {
      // Verify sender is part of conversation
      const conv = await pool.query(
        `SELECT * FROM conversations WHERE id=$1 AND (user1_id=$2 OR user2_id=$2)`,
        [conversation_id, userId]
      );
      if (!conv.rows.length) return;

      const { rows } = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, message_text, message_type)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [conversation_id, userId, message_text, message_type]
      );
      const msg = rows[0];

      // Emit to both users in conversation
      const other = conv.rows[0].user1_id === userId ? conv.rows[0].user2_id : conv.rows[0].user1_id;
      const otherSocketId = activeUsers.get(other);
      if (otherSocketId) io.to(otherSocketId).emit('receive_message', msg);
      socket.emit('receive_message', msg); // echo back to sender
    } catch (err) {
      console.error('send_message error:', err.message);
    }
  });

  socket.on('typing', ({ conversation_id, other_user_id }) => {
    const otherSocketId = activeUsers.get(other_user_id);
    if (otherSocketId) io.to(otherSocketId).emit('typing', { conversation_id, userId });
  });

  socket.on('stop_typing', ({ conversation_id, other_user_id }) => {
    const otherSocketId = activeUsers.get(other_user_id);
    if (otherSocketId) io.to(otherSocketId).emit('stop_typing', { conversation_id, userId });
  });

  socket.on('message_seen', async ({ message_id, conversation_id, other_user_id }) => {
    try {
      await pool.query(`UPDATE messages SET seen_status=TRUE WHERE id=$1`, [message_id]);
      const otherSocketId = activeUsers.get(other_user_id);
      if (otherSocketId) io.to(otherSocketId).emit('message_seen', { message_id, conversation_id });
    } catch (err) {
      console.error('message_seen error:', err.message);
    }
  });
};

module.exports = { handleChatEvents };
