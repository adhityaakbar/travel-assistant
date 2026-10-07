import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'travel_assistant_japan_secret_key_2026';

// Middleware to verify token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak: Token autentikasi tidak ditemukan' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Sesi kedaluwarsa atau token tidak valid' });
    }
    req.user = user;
    next();
  });
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, passcode } = req.body;

    if (!username || !passcode) {
      return res.status(400).json({ error: 'Username dan passcode wajib diisi' });
    }

    const result = await query(
      'SELECT id, username, full_name, role, passcode FROM users WHERE username = $1',
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Akun tidak ditemukan' });
    }

    const user = result.rows[0];

    // Simple passcode check (or admin passcode bypass)
    if (user.passcode !== passcode && passcode !== 'guardian8' && passcode !== 'japan2026') {
      return res.status(401).json({ error: 'Passcode salah' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Gagal memproses login: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, full_name, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
