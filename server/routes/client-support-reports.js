const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

function normalizeDateTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.replace('T', ' ');
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(normalized)) return undefined;
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

function parseSupportTypes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
  const text = String(raw).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
  } catch (_) {
    // Keep backward compatibility if old rows were comma-separated.
  }
  return text
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function mapReportRow(row) {
  return {
    id: Number(row.id),
    contract_id: row.contract_id != null ? Number(row.contract_id) : null,
    customer_name: row.customer_name || '',
    support_summary: row.support_summary || '',
    system_name: row.system_name || '',
    support_types: parseSupportTypes(row.support_types),
    requester: row.requester || '',
    request_at: row.request_at || null,
    assignee: row.assignee || '',
    completed_at: row.completed_at || null,
    request_detail: row.request_detail || '',
    cause: row.cause || '',
    support_detail: row.support_detail || '',
    overall_opinion: row.overall_opinion || '',
    note: row.note || '',
    created_by: row.created_by || null,
    created_by_name: row.created_by_name || null,
    contract_project_title: row.contract_project_title || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

router.get('/', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT
         csr.*,
         u.display_name AS created_by_name,
         c.project_title AS contract_project_title
       FROM client_support_reports csr
       LEFT JOIN users u ON csr.created_by = u.username
       LEFT JOIN contracts c ON csr.contract_id = c.id
       ORDER BY csr.created_at DESC`
    );
    res.json(rows.map(mapReportRow));
  } catch (error) {
    console.error('Error fetching client support reports:', error);
    res.status(500).json({ error: 'Failed to fetch client support reports' });
  } finally {
    if (conn) conn.release();
  }
});

router.post('/', authenticateToken, async (req, res) => {
  let conn;
  try {
    const customerName = String(req.body?.customerName || req.body?.customer_name || '').trim();
    if (!customerName) {
      return res.status(400).json({ error: 'customerName is required' });
    }

    const contractIdRaw = req.body?.contractId ?? req.body?.contract_id ?? null;
    const contractId = Number(contractIdRaw);
    const resolvedContractId =
      contractIdRaw === null || contractIdRaw === undefined || Number.isNaN(contractId) || contractId <= 0
        ? null
        : contractId;

    const requestAt = normalizeDateTime(req.body?.requestAt ?? req.body?.request_at);
    const completedAt = normalizeDateTime(req.body?.completedAt ?? req.body?.completed_at);
    if (requestAt === undefined || completedAt === undefined) {
      return res.status(400).json({ error: 'requestAt/completedAt must be YYYY-MM-DD HH:mm or datetime-local format' });
    }

    const supportTypes = Array.isArray(req.body?.supportTypes)
      ? req.body.supportTypes.map((value) => String(value).trim()).filter(Boolean)
      : [];

    conn = await pool.getConnection();
    const result = await conn.query(
      `INSERT INTO client_support_reports (
         contract_id,
         customer_name,
         support_summary,
         system_name,
         support_types,
         requester,
         request_at,
         assignee,
         completed_at,
         request_detail,
         cause,
         support_detail,
         overall_opinion,
         note,
         created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resolvedContractId,
        customerName,
        String(req.body?.supportSummary || req.body?.support_summary || '').trim(),
        String(req.body?.systemName || req.body?.system_name || '').trim(),
        JSON.stringify(supportTypes),
        String(req.body?.requester || '').trim(),
        requestAt || null,
        String(req.body?.assignee || '').trim(),
        completedAt || null,
        String(req.body?.requestDetail || req.body?.request_detail || '').trim(),
        String(req.body?.cause || '').trim(),
        String(req.body?.supportDetail || req.body?.support_detail || '').trim(),
        String(req.body?.overallOpinion || req.body?.overall_opinion || '').trim(),
        String(req.body?.note || '').trim(),
        req.user?.username || null
      ]
    );

    res.status(201).json({ id: Number(result.insertId), message: 'Client support report created successfully' });
  } catch (error) {
    console.error('Error creating client support report:', error);
    res.status(500).json({ error: 'Failed to create client support report' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
