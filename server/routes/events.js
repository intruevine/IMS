const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// BigInt serialization helper
function convertBigInt(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(convertBigInt);
  if (typeof obj === 'object') {
    const converted = {};
    for (const key in obj) {
      converted[key] = convertBigInt(obj[key]);
    }
    return converted;
  }
  return obj;
}

// List events (auth required)
router.get('/', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { start, end, type } = req.query;
    
    let query = `
      SELECT
        e.id,
        e.title,
        e.type,
        e.created_by,
        u.display_name AS created_by_name,
        e.customer_name,
        e.location,
        e.start,
        e.end,
        e.contract_id,
        e.asset_id,
        e.status,
        e.support_hours,
        e.description,
        e.created_at,
        c.customer_name AS contract_customer_name,
        a.item AS asset_item
      FROM events e
      LEFT JOIN users u ON e.created_by = u.username
      LEFT JOIN contracts c ON e.contract_id = c.id
      LEFT JOIN assets a ON e.asset_id = a.id
    `;
    let params = [];
    let whereConditions = [];
    
    if (start && end) {
      whereConditions.push('(e.start BETWEEN ? AND ? OR e.end BETWEEN ? AND ?)');
      params.push(start, end, start, end);
    }
    
    if (type) {
      whereConditions.push('e.type = ?');
      params.push(type);
    }
    
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ' ORDER BY e.start DESC';
    
    const events = await conn.query(query, params);
    res.json(convertBigInt(events));
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  } finally {
    if (conn) conn.release();
  }
});

// Get event by id (auth required)
router.get('/:id', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [event] = await conn.query(
      `SELECT
         e.id,
         e.title,
         e.type,
         e.created_by,
         u.display_name AS created_by_name,
         e.customer_name,
         e.location,
         e.start,
         e.end,
         e.contract_id,
         e.asset_id,
         e.status,
         e.support_hours,
         e.description,
         e.created_at,
         c.customer_name AS contract_customer_name,
         a.item AS asset_item
       FROM events e
       LEFT JOIN users u ON e.created_by = u.username
       LEFT JOIN contracts c ON e.contract_id = c.id
       LEFT JOIN assets a ON e.asset_id = a.id
       WHERE e.id = ?`,
      [req.params.id]
    );
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(convertBigInt(event));
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  } finally {
    if (conn) conn.release();
  }
});

// Create event (auth required)
router.post('/', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const {
      id,
      title,
      type,
      customer_name,
      customerName,
      location,
      start,
      end,
      contract_id,
      contractId,
      asset_id,
      assetId,
      status,
      support_hours,
      supportHours,
      description
    } = req.body;
    
    const eventId = id || require('crypto').randomUUID();
    
    await conn.query(
      `INSERT INTO events (id, title, type, created_by, customer_name, location, start, end, contract_id, asset_id, status, support_hours, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        title,
        type,
        req.user?.username || null,
        customer_name || customerName || null,
        location || null,
        start,
        end,
        contract_id || contractId || null,
        asset_id || assetId || null,
        status || 'scheduled',
        support_hours ?? supportHours ?? null,
        description
      ]
    );
    
    res.status(201).json({ id: eventId, message: 'Event created successfully' });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  } finally {
    if (conn) conn.release();
  }
});

// Update event (auth required)
router.put('/:id', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const {
      title,
      type,
      customer_name,
      customerName,
      location,
      start,
      end,
      contract_id,
      contractId,
      asset_id,
      assetId,
      status,
      support_hours,
      supportHours,
      description
    } = req.body;

    const [existingEvent] = await conn.query('SELECT id, created_by FROM events WHERE id = ?', [req.params.id]);
    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const requester = req.user || {};
    const isAdmin = requester.role === 'admin';
    const isOwner = Boolean(existingEvent.created_by && requester.username === existingEvent.created_by);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Only admin can edit this event' });
    }
    
    await conn.query(
      `UPDATE events SET
        title = ?, type = ?, customer_name = ?, location = ?, start = ?, end = ?, contract_id = ?, asset_id = ?, status = ?, support_hours = ?, description = ?
      WHERE id = ?`,
      [
        title,
        type,
        customer_name || customerName || null,
        location || null,
        start,
        end,
        contract_id || contractId || null,
        asset_id || assetId || null,
        status,
        support_hours ?? supportHours ?? null,
        description,
        req.params.id
      ]
    );
    
    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  } finally {
    if (conn) conn.release();
  }
});

// Delete event (auth required)
router.delete('/:id', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [existingEvent] = await conn.query('SELECT id, created_by FROM events WHERE id = ?', [req.params.id]);
    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const requester = req.user || {};
    const isAdmin = requester.role === 'admin';
    const isOwner = Boolean(existingEvent.created_by && requester.username === existingEvent.created_by);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Only admin can delete this event' });
    }

    await conn.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  } finally {
    if (conn) conn.release();
  }
});

// Generate contract-end events (auth required)
router.post('/generate/contract-end', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const contracts = await conn.query('SELECT * FROM contracts');
    const existingEvents = await conn.query('SELECT * FROM events WHERE type = ?', ['contract_end']);
    let createdCount = 0;
    
    for (const contract of contracts) {
      const hasExistingEvent = existingEvents.some(e => 
        e.contract_id === contract.id && 
        e.start.startsWith(contract.end_date)
      );
      
      if (!hasExistingEvent) {
        const eventId = require('crypto').randomUUID();
        await conn.query(
          `INSERT INTO events (id, title, type, start, end, contract_id, status, description) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            eventId,
            `[${contract.customer_name}] 계약 만료`,
            'contract_end',
            `${contract.end_date}T09:00:00`,
            `${contract.end_date}T18:00:00`,
            contract.id,
            'scheduled',
            `프로젝트: ${contract.project_title}\n계약 갱신 준비 필요`
          ]
        );
        createdCount++;
      }
    }
    
    res.json({ message: `Created ${createdCount} contract end events` });
  } catch (error) {
    console.error('Error generating contract end events:', error);
    res.status(500).json({ error: 'Failed to generate events' });
  } finally {
    if (conn) conn.release();
  }
});

// Generate inspection events (auth required)
router.post('/generate/inspections', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { months = 3 } = req.body;
    
    const contracts = await conn.query('SELECT * FROM contracts');
    const assets = await conn.query('SELECT * FROM assets');
    const existingEvents = await conn.query('SELECT * FROM events WHERE type = ?', ['inspection']);
    let createdCount = 0;
    
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + parseInt(months));
    
    const cycleMap = {
      '월': 1,
      '분기': 3,
      '반기': 6,
      '년': 12,
      '수동': 0
    };
    
    for (const contract of contracts) {
      const contractAssets = assets.filter(a => a.contract_id === contract.id);
      
      for (const asset of contractAssets) {
        const cycleMonths = cycleMap[asset.cycle] || 0;
        if (cycleMonths === 0) continue;
        
        let currentDate = new Date(contract.start_date);
        
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const hasExistingEvent = existingEvents.some(e => 
            e.contract_id === contract.id && 
            e.asset_id === asset.id &&
            e.start.startsWith(dateStr)
          );
          
          if (!hasExistingEvent && currentDate >= now) {
            const eventId = require('crypto').randomUUID();
            await conn.query(
              `INSERT INTO events (id, title, type, start, end, contract_id, asset_id, status, description) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                eventId,
                `[${contract.customer_name}] ${asset.item} 점검`,
                'inspection',
                `${dateStr}T10:00:00`,
                `${dateStr}T12:00:00`,
                contract.id,
                asset.id,
                'scheduled',
                `품목: ${asset.item}\n모델: ${asset.product}\n주기: ${asset.cycle}\n엔지니어: ${asset.engineer_main_name || '미정'}`
              ]
            );
            createdCount++;
          }
          
          currentDate.setMonth(currentDate.getMonth() + cycleMonths);
        }
      }
    }
    
    res.json({ message: `Created ${createdCount} inspection events` });
  } catch (error) {
    console.error('Error generating inspection events:', error);
    res.status(500).json({ error: 'Failed to generate events' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;


