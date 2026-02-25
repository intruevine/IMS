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

function normalizeDetails(details) {
  if (!Array.isArray(details)) return [];
  return details
    .map((detail) => ({
      content: String(detail?.content || '').trim(),
      qty: String(detail?.qty || '').trim(),
      unit: String(detail?.unit || '').trim() || 'ea'
    }))
    .filter((detail) => detail.content || detail.qty);
}

async function fetchDetailsMap(conn, assetIds) {
  if (!Array.isArray(assetIds) || assetIds.length === 0) return new Map();
  const placeholders = assetIds.map(() => '?').join(', ');
  const details = await conn.query(
    `SELECT asset_id, content, qty, unit
     FROM asset_details
     WHERE asset_id IN (${placeholders})
     ORDER BY id ASC`,
    assetIds
  );

  const map = new Map();
  for (const detail of details) {
    const bucket = map.get(detail.asset_id) || [];
    bucket.push({
      content: detail.content || '',
      qty: detail.qty || '',
      unit: detail.unit || 'ea'
    });
    map.set(detail.asset_id, bucket);
  }
  return map;
}

function formatAsset(asset, detailsMap) {
  return {
    ...asset,
    engineer: {
      main: {
        name: asset.engineer_main_name,
        rank: asset.engineer_main_rank,
        phone: asset.engineer_main_phone,
        email: asset.engineer_main_email
      },
      sub: {
        name: asset.engineer_sub_name,
        rank: asset.engineer_sub_rank,
        phone: asset.engineer_sub_phone,
        email: asset.engineer_sub_email
      }
    },
    sales: {
      name: asset.sales_name,
      rank: asset.sales_rank,
      phone: asset.sales_phone,
      email: asset.sales_email
    },
    details: detailsMap.get(asset.id) || []
  };
}

// List contracts (auth required)
router.get('/', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { search, status, page = 1, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM contracts';
    let params = [];
    let whereConditions = [];
    
    if (search) {
      whereConditions.push('(customer_name LIKE ? OR project_title LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (status) {
      const today = new Date().toISOString().split('T')[0];
      if (status === 'active') {
        whereConditions.push('end_date >= ?');
        params.push(today);
      } else if (status === 'expiring') {
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        whereConditions.push('end_date BETWEEN ? AND ?');
        params.push(today, thirtyDaysLater.toISOString().split('T')[0]);
      } else if (status === 'expired') {
        whereConditions.push('end_date < ?');
        params.push(today);
      }
    }
    
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    // Total count query
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await conn.query(countQuery, params);
    const total = countResult.total;
    
    const offset = (page - 1) * Number(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    
    const contracts = await conn.query(query, params);
    
    // Load assets/details for each contract
    for (const contract of contracts) {
      const assets = await conn.query('SELECT * FROM assets WHERE contract_id = ?', [contract.id]);
      const detailsMap = await fetchDetailsMap(conn, assets.map((asset) => asset.id));
      contract.items = convertBigInt(assets.map((asset) => formatAsset(asset, detailsMap)));
    }
    
    res.json(convertBigInt({ contracts, total, page: parseInt(page), limit: parseInt(limit) }));
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  } finally {
    if (conn) conn.release();
  }
});

// Get contract by id (auth required)
router.get('/:id', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [contract] = await conn.query('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    const assets = await conn.query('SELECT * FROM assets WHERE contract_id = ?', [contract.id]);
    const detailsMap = await fetchDetailsMap(conn, assets.map((asset) => asset.id));
    contract.items = assets.map((asset) => formatAsset(asset, detailsMap));
    
    res.json(convertBigInt(contract));
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  } finally {
    if (conn) conn.release();
  }
});

// Create contract (auth required)
router.post('/', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    
    const { customer_name, project_title, project_type, start_date, end_date, notes, items } = req.body;
    
    const result = await conn.query(
      'INSERT INTO contracts (customer_name, project_title, project_type, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [customer_name, project_title, project_type, start_date, end_date, notes]
    );
    
    const contractId = result.insertId;
    
    // Create child assets
    if (items && items.length > 0) {
      for (const item of items) {
        const insertAssetResult = await conn.query(
          `INSERT INTO assets (
            contract_id, category, item, product, qty, cycle, scope, remark, company,
            engineer_main_name, engineer_main_rank, engineer_main_phone, engineer_main_email,
            engineer_sub_name, engineer_sub_rank, engineer_sub_phone, engineer_sub_email,
            sales_name, sales_rank, sales_phone, sales_email
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            contractId, item.category, item.item, item.product, item.qty || 1, 
            item.cycle, item.scope, item.remark, item.company,
            item.engineer?.main?.name, item.engineer?.main?.rank, 
            item.engineer?.main?.phone, item.engineer?.main?.email,
            item.engineer?.sub?.name, item.engineer?.sub?.rank, 
            item.engineer?.sub?.phone, item.engineer?.sub?.email,
            item.sales?.name, item.sales?.rank, item.sales?.phone, item.sales?.email
          ]
        );

        const normalizedDetails = normalizeDetails(item.details);
        if (normalizedDetails.length > 0) {
          for (const detail of normalizedDetails) {
            await conn.query(
              'INSERT INTO asset_details (asset_id, content, qty, unit) VALUES (?, ?, ?, ?)',
              [insertAssetResult.insertId, detail.content, detail.qty, detail.unit]
            );
          }
        }
      }
    }
    
    await conn.commit();
    
    res.status(201).json(convertBigInt({ id: contractId, message: 'Contract created successfully' }));
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error creating contract:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  } finally {
    if (conn) conn.release();
  }
});

// Update contract (auth required)
router.put('/:id', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    
    const { customer_name, project_title, project_type, start_date, end_date, notes, items } = req.body;
    const contractId = req.params.id;
    
    await conn.query(
      'UPDATE contracts SET customer_name = ?, project_title = ?, project_type = ?, start_date = ?, end_date = ?, notes = ? WHERE id = ?',
      [customer_name, project_title, project_type, start_date, end_date, notes, contractId]
    );
    
    await conn.query('DELETE FROM assets WHERE contract_id = ?', [contractId]);
    
    if (items && items.length > 0) {
      for (const item of items) {
        const insertAssetResult = await conn.query(
          `INSERT INTO assets (
            contract_id, category, item, product, qty, cycle, scope, remark, company,
            engineer_main_name, engineer_main_rank, engineer_main_phone, engineer_main_email,
            engineer_sub_name, engineer_sub_rank, engineer_sub_phone, engineer_sub_email,
            sales_name, sales_rank, sales_phone, sales_email
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            contractId, item.category, item.item, item.product, item.qty || 1, 
            item.cycle, item.scope, item.remark, item.company,
            item.engineer?.main?.name, item.engineer?.main?.rank, 
            item.engineer?.main?.phone, item.engineer?.main?.email,
            item.engineer?.sub?.name, item.engineer?.sub?.rank, 
            item.engineer?.sub?.phone, item.engineer?.sub?.email,
            item.sales?.name, item.sales?.rank, item.sales?.phone, item.sales?.email
          ]
        );

        const normalizedDetails = normalizeDetails(item.details);
        if (normalizedDetails.length > 0) {
          for (const detail of normalizedDetails) {
            await conn.query(
              'INSERT INTO asset_details (asset_id, content, qty, unit) VALUES (?, ?, ?, ?)',
              [insertAssetResult.insertId, detail.content, detail.qty, detail.unit]
            );
          }
        }
      }
    }
    
    await conn.commit();
    
    res.json({ message: 'Contract updated successfully' });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error updating contract:', error);
    res.status(500).json({ error: 'Failed to update contract' });
  } finally {
    if (conn) conn.release();
  }
});

// Delete contract (auth required)
router.delete('/:id', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('DELETE FROM contracts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ error: 'Failed to delete contract' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;


