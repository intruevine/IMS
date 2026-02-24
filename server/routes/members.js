const express = require('express');
const router = express.Router();
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

function calculateMonthlyEffort(startDate, endDate) {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(startDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return Number((days / 30).toFixed(2));
}

function normalizePayload(body = {}) {
  const contract_id = body.contract_id ? Number(body.contract_id) : null;
  const project_name = String(body.project_name || '').trim() || String(body.member_name || '').trim();
  const customer_name = String(body.customer_name || '').trim() || String(body.member_company || '').trim();
  const manager_name = String(body.manager_name || '').trim() || String(body.member_name || '').trim();
  const allocation_type = body.allocation_type || null;
  const start_date = body.start_date || null;
  const end_date = body.end_date || null;
  const status = body.status || 'active';
  const notes = body.notes || null;
  const monthly_effort =
    body.monthly_effort !== undefined && body.monthly_effort !== null
      ? Number(body.monthly_effort)
      : calculateMonthlyEffort(start_date, end_date);

  return {
    contract_id,
    project_name,
    customer_name,
    manager_name,
    allocation_type,
    start_date,
    end_date,
    status,
    monthly_effort,
    notes
  };
}

// Project staffing list
router.get('/', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { contract_id, status, allocation_type } = req.query;

    let query = `
      SELECT
        id,
        contract_id,
        member_name,
        position AS member_role,
        department AS member_company,
        email AS member_email,
        phone AS member_phone,
        project_name,
        customer_name,
        manager_name,
        allocation_type,
        start_date,
        end_date,
        monthly_effort,
        status,
        notes,
        created_at,
        updated_at
      FROM project_members
    `;
    const params = [];
    const whereConditions = [];

    if (contract_id) {
      whereConditions.push('contract_id = ?');
      params.push(contract_id);
    }
    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }
    if (allocation_type) {
      whereConditions.push('allocation_type = ?');
      params.push(allocation_type);
    }
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    query += ' ORDER BY start_date DESC, created_at DESC';

    const members = await conn.query(query, params);
    res.json(convertBigInt(members));
  } catch (error) {
    console.error('Error fetching project staffing:', error);
    res.status(500).json({ error: 'Failed to fetch project staffing' });
  } finally {
    if (conn) conn.release();
  }
});

// Single record
router.get('/:id', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [member] = await conn.query(
      `SELECT
         id,
         contract_id,
         member_name,
         position AS member_role,
         department AS member_company,
         email AS member_email,
         phone AS member_phone,
         project_name,
         customer_name,
         manager_name,
         allocation_type,
         start_date,
         end_date,
         monthly_effort,
         status,
         notes,
         created_at,
         updated_at
       FROM project_members
       WHERE id = ?`,
      [req.params.id]
    );
    if (!member) return res.status(404).json({ error: 'Project staffing not found' });
    res.json(convertBigInt(member));
  } catch (error) {
    console.error('Error fetching project staffing:', error);
    res.status(500).json({ error: 'Failed to fetch project staffing' });
  } finally {
    if (conn) conn.release();
  }
});

// Create: all authenticated users
router.post('/', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const payload = normalizePayload(req.body);

    if (!payload.project_name || !payload.customer_name || !payload.manager_name || !payload.allocation_type || !payload.start_date) {
      return res.status(400).json({ error: 'project_name, customer_name, manager_name, allocation_type, start_date are required' });
    }

    const result = await conn.query(
      `INSERT INTO project_members
        (contract_id, project_name, customer_name, manager_name, allocation_type, start_date, end_date, monthly_effort, status, notes, member_name, position, department, email, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.contract_id,
        payload.project_name,
        payload.customer_name,
        payload.manager_name,
        payload.allocation_type,
        payload.start_date,
        payload.end_date,
        payload.monthly_effort,
        payload.status,
        payload.notes,
        payload.manager_name,
        payload.allocation_type,
        payload.customer_name,
        null,
        null
      ]
    );

    res.status(201).json(convertBigInt({ id: result.insertId, message: 'Project staffing created successfully' }));
  } catch (error) {
    console.error('Error creating project staffing:', error);
    res.status(500).json({ error: 'Failed to create project staffing' });
  } finally {
    if (conn) conn.release();
  }
});

// Update: admin only
router.put('/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin permission required' });
  let conn;
  try {
    conn = await pool.getConnection();
    const payload = normalizePayload(req.body);

    if (!payload.project_name || !payload.customer_name || !payload.manager_name || !payload.allocation_type || !payload.start_date) {
      return res.status(400).json({ error: 'project_name, customer_name, manager_name, allocation_type, start_date are required' });
    }

    await conn.query(
      `UPDATE project_members SET
        contract_id = ?,
        project_name = ?,
        customer_name = ?,
        manager_name = ?,
        allocation_type = ?,
        start_date = ?,
        end_date = ?,
        monthly_effort = ?,
        status = ?,
        notes = ?,
        member_name = ?,
        position = ?,
        department = ?
       WHERE id = ?`,
      [
        payload.contract_id,
        payload.project_name,
        payload.customer_name,
        payload.manager_name,
        payload.allocation_type,
        payload.start_date,
        payload.end_date,
        payload.monthly_effort,
        payload.status,
        payload.notes,
        payload.manager_name,
        payload.allocation_type,
        payload.customer_name,
        req.params.id
      ]
    );

    res.json({ message: 'Project staffing updated successfully' });
  } catch (error) {
    console.error('Error updating project staffing:', error);
    res.status(500).json({ error: 'Failed to update project staffing' });
  } finally {
    if (conn) conn.release();
  }
});

// Delete: admin only
router.delete('/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin permission required' });
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('DELETE FROM project_members WHERE id = ?', [req.params.id]);
    res.json({ message: 'Project staffing deleted successfully' });
  } catch (error) {
    console.error('Error deleting project staffing:', error);
    res.status(500).json({ error: 'Failed to delete project staffing' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
