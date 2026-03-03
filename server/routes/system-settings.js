const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

function isAdmin(req) {
  return req.user?.role === 'admin';
}

router.get('/brand-logo', async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [row] = await conn.query(
      'SELECT setting_value, updated_by, updated_at FROM system_settings WHERE setting_key = ?',
      ['brand_logo']
    );

    res.json({
      dataUrl: row?.setting_value || null,
      updated_by: row?.updated_by || null,
      updated_at: row?.updated_at || null
    });
  } catch (error) {
    console.error('Error fetching brand logo setting:', error);
    res.status(500).json({ error: 'Failed to fetch brand logo setting' });
  } finally {
    if (conn) conn.release();
  }
});

router.put('/brand-logo', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin permission required' });
  }

  const dataUrl = String(req.body?.dataUrl || '').trim();
  if (!dataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Valid image dataUrl is required' });
  }
  if (dataUrl.length > 2_000_000) {
    return res.status(400).json({ error: 'Image is too large' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_by)
       VALUES ('brand_logo', ?, ?)
       ON DUPLICATE KEY UPDATE
         setting_value = VALUES(setting_value),
         updated_by = VALUES(updated_by)`,
      [dataUrl, req.user?.username || null]
    );

    res.json({ message: 'Brand logo updated successfully' });
  } catch (error) {
    console.error('Error updating brand logo setting:', error);
    res.status(500).json({ error: 'Failed to update brand logo setting' });
  } finally {
    if (conn) conn.release();
  }
});

router.delete('/brand-logo', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin permission required' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('DELETE FROM system_settings WHERE setting_key = ?', ['brand_logo']);
    res.json({ message: 'Brand logo reset successfully' });
  } catch (error) {
    console.error('Error resetting brand logo setting:', error);
    res.status(500).json({ error: 'Failed to reset brand logo setting' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
