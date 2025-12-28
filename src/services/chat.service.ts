import pool from "../infraestructure/database";

export interface ChatMessage {
  id: string;
  content: string;
  created_at: Date;
}

export interface RoomMessage {
  id: string;
  message: string;
  timestamp: Date;
  user: string;
  role: string;
}

export const isMember = async (
  roomId: string,
  userId: string
): Promise<boolean> => {
  const { rowCount } = await pool.query(
    `
    SELECT 1
    FROM chat_rooms r
    LEFT JOIN chat_room_members m
      ON m.room_id = r.id
     AND m.user_id = $2
    WHERE r.id = $1
      AND (
        r.is_private = false
        OR m.user_id IS NOT NULL
      )
    LIMIT 1;
    `,
    [roomId, userId]
  );

  return (rowCount ?? 0) > 0;
};

export const saveMessage = async (
  roomId: string,
  senderId: string,
  content: string
): Promise<ChatMessage> => {
  const { rows } = await pool.query<ChatMessage>(
    `
    INSERT INTO chat_messages (room_id, sender_id, content)
    VALUES ($1, $2, $3)
    RETURNING id, content, created_at
    `,
    [roomId, senderId, content]
  );

  return rows[0];
};

export const getRoomMessages = async (
  roomId: string,
  limit = 50
): Promise<RoomMessage[]> => {
  const { rows } = await pool.query<RoomMessage>(
    `
    SELECT
      cm.id,
      cm.content AS message,
      cm.created_at AS timestamp,
      a.email AS user,
      a.role AS role
    FROM chat_messages cm
    JOIN accounts a ON a.id = cm.sender_id
    WHERE cm.room_id = $1
    ORDER BY cm.created_at DESC
    LIMIT $2
    `,
    [roomId, limit]
  );

  return rows.reverse();
};
