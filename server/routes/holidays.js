const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

function isAdmin(req) {
  return req.user?.role === 'admin';
}

function toRow(holiday) {
  let dateStr = holiday.date;
  
  if (holiday.date instanceof Date) {
    const d = holiday.date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
  } else if (holiday.date && typeof holiday.date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(holiday.date)) {
      dateStr = holiday.date;
    } else if (/^\d{4}-\d{2}-\d{2}T/.test(holiday.date)) {
      dateStr = holiday.date.slice(0, 10);
    } else {
      const d = new Date(holiday.date);
      if (!Number.isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      } else {
        dateStr = '';
      }
    }
  }
  return {
    ...holiday,
    id: String(holiday.id),
    date: dateStr || ''
  };
}

router.get('/', authenticateToken, async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT id, DATE_FORMAT(date, '%Y-%m-%d') AS date, name, type, created_by, created_at, updated_at
       FROM additional_holidays
       ORDER BY date ASC, name ASC`
    );
    const transformed = rows.map(toRow).filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date));
    res.json(transformed);
  } catch (error) {
    console.error('Error fetching additional holidays:', error);
    res.status(500).json({ error: 'Failed to fetch additional holidays' });
  } finally {
    if (conn) conn.release();
  }
});

router.post('/', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin permission required' });

  let conn;
  try {
    const { date, name, type } = req.body || {};
    console.log('POST /api/holidays - received:', { date, name, type });
    const normalizedDate = String(date || '').slice(0, 10);
    const normalizedName = String(name || '').trim();
    const normalizedType = type === 'national' ? 'national' : 'company';

    console.log('POST /api/holidays - normalized:', { normalizedDate, normalizedName, normalizedType });

    if (!normalizedDate || !normalizedName) {
      return res.status(400).json({ error: 'date and name are required' });
    }

    conn = await pool.getConnection();
    console.log('POST /api/holidays - inserting to DB:', { normalizedDate, normalizedName, normalizedType });
    const result = await conn.query(
      `INSERT INTO additional_holidays (date, name, type, created_by)
       VALUES (?, ?, ?, ?)`,
      [normalizedDate, normalizedName, normalizedType, req.user?.username || null]
    );

    // Fetch the inserted row to verify
    const inserted = await conn.query('SELECT * FROM additional_holidays WHERE id = ?', [result.insertId]);
    console.log('POST /api/holidays - inserted row from DB:', inserted[0]);

    res.status(201).json({ id: result.insertId, message: 'Holiday created successfully' });
  } catch (error) {
    console.error('Error creating additional holiday:', error);
    res.status(500).json({ error: 'Failed to create additional holiday' });
  } finally {
    if (conn) conn.release();
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin permission required' });

  let conn;
  try {
    const { date, name, type } = req.body || {};
    const normalizedDate = String(date || '').slice(0, 10);
    const normalizedName = String(name || '').trim();
    const normalizedType = type === 'national' ? 'national' : 'company';

    if (!normalizedDate || !normalizedName) {
      return res.status(400).json({ error: 'date and name are required' });
    }

    conn = await pool.getConnection();
    await conn.query(
      `UPDATE additional_holidays
       SET date = ?, name = ?, type = ?
       WHERE id = ?`,
      [normalizedDate, normalizedName, normalizedType, req.params.id]
    );

    res.json({ message: 'Holiday updated successfully' });
  } catch (error) {
    console.error('Error updating additional holiday:', error);
    res.status(500).json({ error: 'Failed to update additional holiday' });
  } finally {
    if (conn) conn.release();
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin permission required' });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('DELETE FROM additional_holidays WHERE id = ?', [req.params.id]);
    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Error deleting additional holiday:', error);
    res.status(500).json({ error: 'Failed to delete additional holiday' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
