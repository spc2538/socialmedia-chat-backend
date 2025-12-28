import { Request, Response } from 'express';
import pool from '../infraestructure/database';

interface MeUserRow {
  id: number;
  name: string;
  lastname: string;
  birthdate: string;
  phone_number: string | null;
  role: string;
  email: string;
}

export const me = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  try {
    const { rows } = await pool.query<MeUserRow>(
      `SELECT id, name, lastname, birthdate, phone_number, role, email
       FROM accounts
       WHERE id = $1`,
      [req.user.id]
    );

    const user = rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json(user);

  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Server error fetching user data.' });
  }
};
