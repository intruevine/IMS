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

// List all assets (auth required)
router.get('/', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { category, search, cycle, page = 1, limit = 50 } = req.query;
    
    let query = `
      SELECT a.*, c.customer_name, c.project_title 
      FROM assets a
      JOIN contracts c ON a.contract_id = c.id
    `;
    let params = [];
    let whereConditions = [];
    
    if (category) {
      whereConditions.push('a.category = ?');
      params.push(category);
    }
    
    if (cycle) {
      whereConditions.push('a.cycle = ?');
      params.push(cycle);
    }
    
    if (search) {
      whereConditions.push('(a.item LIKE ? OR a.product LIKE ? OR c.customer_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ' ORDER BY a.created_at DESC';
    
    // Total count
    const countQuery = query.replace('SELECT a.*, c.customer_name, c.project_title', 'SELECT COUNT(*) as total');
    const [countResult] = await conn.query(countQuery, params);
    const total = countResult.total;
    
    const offset = (page - 1) * Number(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    
    const assets = await conn.query(query, params);
    
    const detailsMap = await fetchDetailsMap(conn, assets.map((asset) => asset.id));
    const formattedAssets = assets.map((asset) => formatAsset(asset, detailsMap));
    
    res.json(convertBigInt({ assets: formattedAssets, total, page: parseInt(page), limit: parseInt(limit) }));
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  } finally {
    if (conn) conn.release();
  }
});

// List assets by contract (auth required)
router.get('/contract/:contractId', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const assets = await conn.query('SELECT * FROM assets WHERE contract_id = ?', [req.params.contractId]);
    
    const detailsMap = await fetchDetailsMap(conn, assets.map((asset) => asset.id));
    const formattedAssets = assets.map((asset) => formatAsset(asset, detailsMap));
    
    res.json(convertBigInt(formattedAssets));
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  } finally {
    if (conn) conn.release();
  }
});

// Get asset by id (auth required)
router.get('/:id', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [asset] = await conn.query('SELECT a.*, c.customer_name, c.project_title FROM assets a JOIN contracts c ON a.contract_id = c.id WHERE a.id = ?', [req.params.id]);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    const detailsMap = await fetchDetailsMap(conn, [asset.id]);
    res.json(convertBigInt(formatAsset(asset, detailsMap)));
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  } finally {
    if (conn) conn.release();
  }
});

// Create asset (auth required)
router.post('/', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    
    const { contract_id, category, item, product, qty, cycle, scope, remark, company, engineer, sales, details } = req.body;
    
    const result = await conn.query(
      `INSERT INTO assets (
        contract_id, category, item, product, qty, cycle, scope, remark, company,
        engineer_main_name, engineer_main_rank, engineer_main_phone, engineer_main_email,
        engineer_sub_name, engineer_sub_rank, engineer_sub_phone, engineer_sub_email,
        sales_name, sales_rank, sales_phone, sales_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contract_id, category, item, product, qty || 1, cycle, scope, remark, company,
        engineer?.main?.name, engineer?.main?.rank, engineer?.main?.phone, engineer?.main?.email,
        engineer?.sub?.name, engineer?.sub?.rank, engineer?.sub?.phone, engineer?.sub?.email,
        sales?.name, sales?.rank, sales?.phone, sales?.email
      ]
    );

    const normalizedDetails = normalizeDetails(details);
    if (normalizedDetails.length > 0) {
      for (const detail of normalizedDetails) {
        await conn.query(
          'INSERT INTO asset_details (asset_id, content, qty, unit) VALUES (?, ?, ?, ?)',
          [result.insertId, detail.content, detail.qty, detail.unit]
        );
      }
    }

    await conn.commit();
    
    res.status(201).json(convertBigInt({ id: result.insertId, message: 'Asset created successfully' }));
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  } finally {
    if (conn) conn.release();
  }
});

// Update asset (auth required)
router.put('/:id', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    
    const { category, item, product, qty, cycle, scope, remark, company, engineer, sales, details } = req.body;
    
    await conn.query(
      `UPDATE assets SET
        category = ?, item = ?, product = ?, qty = ?, cycle = ?, scope = ?, remark = ?, company = ?,
        engineer_main_name = ?, engineer_main_rank = ?, engineer_main_phone = ?, engineer_main_email = ?,
        engineer_sub_name = ?, engineer_sub_rank = ?, engineer_sub_phone = ?, engineer_sub_email = ?,
        sales_name = ?, sales_rank = ?, sales_phone = ?, sales_email = ?
      WHERE id = ?`,
      [
        category, item, product, qty || 1, cycle, scope, remark, company,
        engineer?.main?.name, engineer?.main?.rank, engineer?.main?.phone, engineer?.main?.email,
        engineer?.sub?.name, engineer?.sub?.rank, engineer?.sub?.phone, engineer?.sub?.email,
        sales?.name, sales?.rank, sales?.phone, sales?.email,
        req.params.id
      ]
    );

    await conn.query('DELETE FROM asset_details WHERE asset_id = ?', [req.params.id]);
    const normalizedDetails = normalizeDetails(details);
    if (normalizedDetails.length > 0) {
      for (const detail of normalizedDetails) {
        await conn.query(
          'INSERT INTO asset_details (asset_id, content, qty, unit) VALUES (?, ?, ?, ?)',
          [req.params.id, detail.content, detail.qty, detail.unit]
        );
      }
    }

    await conn.commit();
    
    res.json({ message: 'Asset updated successfully' });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  } finally {
    if (conn) conn.release();
  }
});

// Delete asset (auth required)
router.delete('/:id', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('DELETE FROM assets WHERE id = ?', [req.params.id]);
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;


