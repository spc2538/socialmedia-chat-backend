const pool = require('../db');

exports.me = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, lastname, birthdate, phone_number, role, email
        FROM accounts
        WHERE id = $1`,
      [req.user.id]
    );

    const user = rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json(user);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching user data.' });
  }
};
