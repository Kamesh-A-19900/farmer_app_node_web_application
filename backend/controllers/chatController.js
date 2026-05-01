const pool = require('../config/db');

const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { rows } = await pool.query(
      `SELECT c.*,
         CASE WHEN c.user1_id=$1 THEN u2.username ELSE u1.username END as other_username,
         CASE WHEN c.user1_id=$1 THEN c.user2_id ELSE c.user1_id END as other_user_id,
         (SELECT message_text FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM conversations c
       JOIN users u1 ON u1.id=c.user1_id
       JOIN users u2 ON u2.id=c.user2_id
       WHERE c.user1_id=$1 OR c.user2_id=$1
       ORDER BY c.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

const getMessages = async (req, res, next) => {
  try {
    const { convId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId;
    // Verify user is part of conversation
    const conv = await pool.query(
      `SELECT id FROM conversations WHERE id=$1 AND (user1_id=$2 OR user2_id=$2)`,
      [convId, userId]
    );
    if (!conv.rows.length) return res.status(403).json({ error: 'Access denied' });

    const { rows } = await pool.query(
      `SELECT m.*, u.username as sender_name FROM messages m
       JOIN users u ON u.id=m.sender_id
       WHERE m.conversation_id=$1
       ORDER BY m.created_at DESC LIMIT $2 OFFSET $3`,
      [convId, limit, offset]
    );
    res.json(rows.reverse());
  } catch (err) { next(err); }
};

const startConversation = async (req, res, next) => {
  try {
    const { other_user_id } = req.body;
    const userId = req.user.userId;
    const [u1, u2] = [Math.min(userId, other_user_id), Math.max(userId, other_user_id)];
    const { rows } = await pool.query(
      `INSERT INTO conversations (user1_id, user2_id)
       VALUES ($1,$2)
       ON CONFLICT (user1_id, user2_id) DO UPDATE SET created_at=conversations.created_at
       RETURNING *`,
      [u1, u2]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

module.exports = { getConversations, getMessages, startConversation };
