const pool = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const { createSessionHash } = require('../utils/sessionHash');

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { username, phone, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password and role are required' });
    }
    if (!['farmer', 'customer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be farmer or customer' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    // Check duplicate username
    const exists = await pool.query(
      `SELECT id FROM users WHERE username=$1`, [username]
    );
    if (exists.rows.length) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const password_hash = await hashPassword(password);
    const { rows } = await pool.query(
      `INSERT INTO users (role, username, phone, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, role, username`,
      [role, username, phone || null, password_hash]
    );
    const user = rows[0];

    if (role === 'farmer') {
      await pool.query(`INSERT INTO farmers (farmer_id) VALUES ($1)`, [user.id]);
    } else {
      await pool.query(`INSERT INTO customers (customer_id) VALUES ($1)`, [user.id]);
    }

    // Auto-login after register
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || '';
    const sessionHash = createSessionHash(user.id, ip, userAgent);
    const token = generateToken({ userId: user.id, role: user.role, sessionHash });

    res.status(201).json({
      message: 'Registration successful',
      token,
      userId: user.id,
      role: user.role,
      username: user.username,
      // Return farmer ID for farmers to note down
      ...(role === 'farmer' && { farmerId: user.id })
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already taken' });
    }
    next(err);
  }
};

// POST /api/auth/login
// Customer: username + password
// Farmer:   farmerId (numeric) + password
const login = async (req, res, next) => {
  try {
    const { username, farmer_id, password, role } = req.body;

    if (!password || !role) {
      return res.status(400).json({ error: 'Password and role are required' });
    }

    let user;

    if (role === 'farmer') {
      if (!farmer_id) return res.status(400).json({ error: 'Farmer ID is required' });
      const { rows } = await pool.query(
        `SELECT u.* FROM users u
         JOIN farmers f ON f.farmer_id = u.id
         WHERE u.id = $1 AND u.role = 'farmer'`,
        [parseInt(farmer_id)]
      );
      if (!rows.length) return res.status(401).json({ error: 'Invalid Farmer ID or password' });
      user = rows[0];
    } else {
      if (!username) return res.status(400).json({ error: 'Username is required' });
      const { rows } = await pool.query(
        `SELECT * FROM users WHERE username = $1 AND role IN ('customer','admin')`, [username]
      );
      if (!rows.length) return res.status(401).json({ error: 'Invalid username or password' });
      user = rows[0];
      // Ensure role matches what was submitted
      if (user.role !== role) return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await comparePassword(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: role === 'farmer' ? 'Invalid Farmer ID or password' : 'Invalid username or password' });
    }

    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || '';
    const sessionHash = createSessionHash(user.id, ip, userAgent);
    const token = generateToken({ userId: user.id, role: user.role, sessionHash });

    res.json({
      token,
      role: user.role,
      userId: user.id,
      username: user.username,
      ...(user.role === 'farmer' && { farmerId: user.id })
    });
  } catch (err) { next(err); }
};

// POST /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const { rows } = await pool.query(`SELECT password_hash FROM users WHERE id=$1`, [req.user.userId]);
    const match = await comparePassword(currentPassword, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await hashPassword(newPassword);
    await pool.query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [hash, req.user.userId]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
};

module.exports = { register, login, changePassword };
