const pool = require('../db');

exports.saveMessage = async (senderId, content) => {
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (sender_id, content)
     VALUES ($1, $2)
     RETURNING id, sender_id, content, created_at`,
    [senderId, content]
  );

  return rows[0];
};

exports.getRecentMessages = async (limit = 50) => {
  const { rows } = await pool.query(
    `SELECT
        cm.id,
        cm.content AS message,
        cm.created_at AS timestamp,
        a.email AS user
     FROM chat_messages cm
     JOIN accounts a ON a.id = cm.sender_id
     ORDER BY cm.created_at DESC
     LIMIT $1`,
    [limit]
  );

  return rows.reverse();
};

