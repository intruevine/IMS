const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

function convertBigInt(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(convertBigInt);
  if (typeof obj === 'object') {
    const converted = {};
    for (const key in obj) converted[key] = convertBigInt(obj[key]);
    return converted;
  }
  return obj;
}

function isAdmin(req) {
  return req.user?.role === 'admin';
}

function requireAdmin(req, res) {
  if (!isAdmin(req)) {
    res.status(403).json({ error: 'Admin permission required' });
    return false;
  }
  return true;
}

// Public registration request (pending approval)
router.post('/register', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { username, display_name, password } = req.body;

    if (!username || !display_name || !password) {
      return res.status(400).json({ error: 'username, display_name and password are required' });
    }
    if (String(password).length < 4) {
      return res.status(400).json({ error: 'password must be at least 4 characters' });
    }

    const [existing] = await conn.query('SELECT username FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await conn.query(
      `INSERT INTO users (username, display_name, password_hash, role, approval_status, approved_at, approved_by)
       VALUES (?, ?, ?, 'user', 'pending', NULL, NULL)`,
      [username, display_name, hashedPassword]
    );

    res.status(201).json({ message: 'Registration request submitted. Awaiting admin approval.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to submit registration request' });
  } finally {
    if (conn) conn.release();
  }
});

// Login
router.post('/login', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { username, password } = req.body;

    const [user] = await conn.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const approvalStatus = user.approval_status || 'approved';
    if (approvalStatus !== 'approved') {
      if (approvalStatus === 'pending') {
        return res.status(403).json({ error: 'Account pending admin approval' });
      }
      if (approvalStatus === 'rejected') {
        return res.status(403).json({ error: 'Account approval was rejected' });
      }
      return res.status(403).json({ error: 'Account not approved' });
    }

    const { password_hash, ...userWithoutPassword } = user;
    const token = jwt.sign(
      {
        userId: userWithoutPassword.id,
        username: userWithoutPassword.username,
        role: userWithoutPassword.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json(
      convertBigInt({
        user: userWithoutPassword,
        token,
        message: 'Login successful'
      })
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    if (conn) conn.release();
  }
});

// User list (admin only)
router.get('/', authenticateToken, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  let conn;
  try {
    conn = await pool.getConnection();
    const users = await conn.query(
      `SELECT username, display_name, role, approval_status, approved_at, approved_by, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json(convertBigInt(users));
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  } finally {
    if (conn) conn.release();
  }
});

// Pending approvals (admin only)
router.get('/pending', authenticateToken, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  let conn;
  try {
    conn = await pool.getConnection();
    const users = await conn.query(
      `SELECT username, display_name, role, approval_status, created_at
       FROM users
       WHERE approval_status = 'pending'
       ORDER BY created_at ASC`
    );
    res.json(convertBigInt(users));
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  } finally {
    if (conn) conn.release();
  }
});

// Admin creates immediate approved user
router.post('/', authenticateToken, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  let conn;
  try {
    conn = await pool.getConnection();
  const { username, display_name, password, role = 'user' } = req.body;
  const normalizedRole = String(role || 'user').trim();

    if (!username || !display_name || !password) {
      return res.status(400).json({ error: 'username, display_name and password are required' });
    }
    if (!['admin', 'manager', 'user'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'role must be admin, manager, or user' });
    }

    const [existing] = await conn.query('SELECT 1 FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await conn.query(
      `INSERT INTO users (username, display_name, password_hash, role, approval_status, approved_at, approved_by)
       VALUES (?, ?, ?, ?, 'approved', NOW(), ?)`,
      [username, display_name, hashedPassword, normalizedRole, req.user.username || 'admin']
    );

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  } finally {
    if (conn) conn.release();
  }
});

// Approve user (admin only)
router.put('/:username/approve', authenticateToken, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  let conn;
  try {
    conn = await pool.getConnection();
      const { role = 'user' } = req.body || {};
      const normalizedRole = String(role || 'user').trim();
      if (!['admin', 'manager', 'user'].includes(normalizedRole)) {
        return res.status(400).json({ error: 'role must be admin or user' });
      }

    await conn.query(
      `UPDATE users
       SET role = ?, approval_status = 'approved', approved_at = NOW(), approved_by = ?
       WHERE username = ?`,
      [normalizedRole, req.user.username || 'admin', req.params.username]
    );

    res.json({ message: 'User approved successfully' });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  } finally {
    if (conn) conn.release();
  }
});

// Reject user (admin only)
router.put('/:username/reject', authenticateToken, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `UPDATE users
       SET approval_status = 'rejected', approved_at = NULL, approved_by = ?
       WHERE username = ?`,
      [req.user.username || 'admin', req.params.username]
    );
    res.json({ message: 'User rejected successfully' });
  } catch (error) {
    console.error('Error rejecting user:', error);
    res.status(500).json({ error: 'Failed to reject user' });
  } finally {
    if (conn) conn.release();
  }
});

// Update user profile/role (admin only)
router.put('/:username', authenticateToken, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  let conn;
  try {
    conn = await pool.getConnection();
    const { display_name, role } = req.body;
    const normalizedRole = String(role || '').trim();

    if (!display_name || !normalizedRole) {
      return res.status(400).json({ error: 'display_name and role are required' });
    }
    if (!['admin', 'user'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'role must be admin, manager, or user' });
    }

    await conn.query(
      'UPDATE users SET display_name = ?, role = ? WHERE username = ?',
      [display_name, normalizedRole, req.params.username]
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  } finally {
    if (conn) conn.release();
  }
});

// Password change (self or admin)
router.put('/:username/password', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { currentPassword, newPassword } = req.body;
    const requester = req.user || {};
    const targetUsername = req.params.username;
    const isSelf = requester.username === targetUsername;
    const admin = requester.role === 'admin';

    if (!isSelf && !admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!newPassword || String(newPassword).length < 4) {
      return res.status(400).json({ error: 'newPassword must be at least 4 characters' });
    }

    const [user] = await conn.query('SELECT password_hash FROM users WHERE username = ?', [targetUsername]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!admin) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'currentPassword is required' });
      }
      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await conn.query('UPDATE users SET password_hash = ? WHERE username = ?', [hashedPassword, targetUsername]);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  } finally {
    if (conn) conn.release();
  }
});

// Delete user (admin only)
router.delete('/:username', authenticateToken, async (req, res) => {
  if (!requireAdmin(req, res)) return;
  let conn;
  try {
    conn = await pool.getConnection();
    if (req.params.username === req.user?.username) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await conn.query('DELETE FROM users WHERE username = ?', [req.params.username]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;

