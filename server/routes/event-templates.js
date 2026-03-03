const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

function mapTemplate(row) {
  return {
    id: Number(row.id),
    name: row.name,
    title: row.title,
    type: row.type,
    scheduleDivision: row.schedule_division || undefined,
    customerName: row.customer_name || '',
    location: row.location || '',
    contractId: row.contract_id ? Number(row.contract_id) : 0,
    status: row.status === 'cancelled' ? 'scheduled' : row.status,
    description: row.description || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.get('/', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT id, name, title, type, schedule_division, customer_name, location, contract_id, status, description, created_by, created_at, updated_at
       FROM event_templates
       WHERE created_by = ?
       ORDER BY name ASC, id DESC`,
      [req.user.username]
    );
    res.json(rows.map(mapTemplate));
  } catch (error) {
    console.error('Error fetching event templates:', error);
    res.status(500).json({ error: 'Failed to fetch event templates' });
  } finally {
    if (conn) conn.release();
  }
});

router.post('/', authenticateToken, async (req, res) => {
  let conn;
  try {
    const name = String(req.body?.name || '').trim();
    const title = String(req.body?.title || '').trim();
    const type = String(req.body?.type || 'inspection').trim() || 'inspection';

    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Template title is required' });
    }

    conn = await pool.getConnection();
    const result = await conn.query(
      `INSERT INTO event_templates
       (name, title, type, schedule_division, customer_name, location, contract_id, status, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        title,
        type,
        req.body?.scheduleDivision || req.body?.schedule_division || null,
        String(req.body?.customerName || req.body?.customer_name || '').trim() || null,
        String(req.body?.location || '').trim() || null,
        req.body?.contractId || req.body?.contract_id || null,
        req.body?.status || 'scheduled',
        String(req.body?.description || '').trim() || null,
        req.user.username
      ]
    );

    res.status(201).json({ id: Number(result.insertId), message: 'Event template created successfully' });
  } catch (error) {
    console.error('Error creating event template:', error);
    res.status(500).json({ error: 'Failed to create event template' });
  } finally {
    if (conn) conn.release();
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [existingTemplate] = await conn.query('SELECT id, created_by FROM event_templates WHERE id = ?', [req.params.id]);
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Event template not found' });
    }

    const requester = req.user || {};
    const isAdmin = requester.role === 'admin';
    const isOwner = existingTemplate.created_by === requester.username;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Only admin can delete this event template' });
    }

    await conn.query('DELETE FROM event_templates WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event template deleted successfully' });
  } catch (error) {
    console.error('Error deleting event template:', error);
    res.status(500).json({ error: 'Failed to delete event template' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
