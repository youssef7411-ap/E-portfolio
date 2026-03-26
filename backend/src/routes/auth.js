import express from 'express';
import { timingSafeEqual } from 'crypto';
import { generateToken } from '../utils/auth.js';
import authenticate from '../middleware/authenticate.js';

const router = express.Router();

// Timing-safe string comparison to prevent timing attacks
const safeEqual = (a, b) => {
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
};

// Login
router.post('/login', async (req, res) => {
  try {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '').trim();
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

    const adminUsername = String(process.env.ADMIN_USERNAME ?? '').trim();
    const adminPassword = String(process.env.ADMIN_PASSWORD ?? '').trim();

    const validUser = safeEqual(username, adminUsername);
    const validPass = safeEqual(password, adminPassword);

    if (validUser && validPass) {
      const token = generateToken({ username });
      return res.json({ token, message: 'Login successful' });
    }

    res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify token
router.get('/verify', authenticate, (req, res) => {
  res.json({ valid: true, user: req.admin });
});

export default router;
