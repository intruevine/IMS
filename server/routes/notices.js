const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

function isAdmin(req) {
  return req.user?.role === 'admin';
}

const uploadRoot = path.join(__dirname, '..', 'uploads', 'notices');
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadRoot);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 10 }
});

function toNoticeRow(row) {
  return {
    id: Number(row.id),
    title: row.title,
    content: row.content,
    is_pinned: Boolean(row.is_pinned),
    created_by: row.created_by || null,
    updated_by: row.updated_by || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function formatNoticeFile(file) {
  return {
    id: Number(file.id),
    notice_id: Number(file.notice_id),
    original_name: file.original_name,
    stored_name: file.stored_name,
    file_path: file.file_path,
    file_size: Number(file.file_size || 0),
    uploaded_by: file.uploaded_by || null,
    created_at: file.created_at
  };
}

router.get('/', authenticateToken, async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT id, title, content, is_pinned, created_by, updated_by, created_at, updated_at
       FROM notices
       ORDER BY is_pinned DESC, created_at DESC`
    );
    res.json(rows.map(toNoticeRow));
  } catch (error) {
    console.error('Error fetching notices:', error);
    res.status(500).json({ error: 'Failed to fetch notices' });
  } finally {
    if (conn) conn.release();
  }
});

router.post('/', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin permission required' });

  let conn;
  try {
    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    const isPinned = req.body?.is_pinned ? 1 : 0;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    conn = await pool.getConnection();
    const result = await conn.query(
      `INSERT INTO notices (title, content, is_pinned, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?)`,
      [title, content, isPinned, req.user?.username || null, req.user?.username || null]
    );

    res.status(201).json({ id: Number(result.insertId), message: 'Notice created successfully' });
  } catch (error) {
    console.error('Error creating notice:', error);
    res.status(500).json({ error: 'Failed to create notice' });
  } finally {
    if (conn) conn.release();
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin permission required' });

  let conn;
  try {
    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    const isPinned = req.body?.is_pinned ? 1 : 0;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    conn = await pool.getConnection();
    await conn.query(
      `UPDATE notices
       SET title = ?, content = ?, is_pinned = ?, updated_by = ?
       WHERE id = ?`,
      [title, content, isPinned, req.user?.username || null, req.params.id]
    );

    res.json({ message: 'Notice updated successfully' });
  } catch (error) {
    console.error('Error updating notice:', error);
    res.status(500).json({ error: 'Failed to update notice' });
  } finally {
    if (conn) conn.release();
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin permission required' });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('DELETE FROM notices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({ error: 'Failed to delete notice' });
  } finally {
    if (conn) conn.release();
  }
});

router.get('/:id/files', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT id, notice_id, original_name, stored_name, file_path, file_size, uploaded_by, created_at
       FROM notice_files
       WHERE notice_id = ?
       ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(rows.map(formatNoticeFile));
  } catch (error) {
    console.error('Error fetching notice files:', error);
    res.status(500).json({ error: 'Failed to fetch notice files' });
  } finally {
    if (conn) conn.release();
  }
});

router.post('/:id/files', authenticateToken, upload.array('files', 10), async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin permission required' });

  let conn;
  try {
    const noticeId = Number(req.params.id);
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    conn = await pool.getConnection();
    const [notice] = await conn.query('SELECT id FROM notices WHERE id = ?', [noticeId]);
    if (!notice) {
      for (const file of files) {
        if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
      return res.status(404).json({ error: 'Notice not found' });
    }

    const inserted = [];
    for (const file of files) {
      const relativePath = `/uploads/notices/${file.filename}`;
      const result = await conn.query(
        `INSERT INTO notice_files (notice_id, original_name, stored_name, file_path, file_size, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [noticeId, file.originalname, file.filename, relativePath, file.size, req.user?.username || null]
      );
      inserted.push({
        id: result.insertId,
        notice_id: noticeId,
        original_name: file.originalname,
        stored_name: file.filename,
        file_path: relativePath,
        file_size: file.size,
        uploaded_by: req.user?.username || null
      });
    }

    res.status(201).json({ files: inserted.map(formatNoticeFile), message: 'Files uploaded successfully' });
  } catch (error) {
    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
    }
    console.error('Error uploading notice files:', error);
    res.status(500).json({ error: 'Failed to upload notice files' });
  } finally {
    if (conn) conn.release();
  }
});

router.get('/:id/files/:fileId/download', authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const noticeId = Number(req.params.id);
    const fileId = Number(req.params.fileId);
    const [file] = await conn.query(
      'SELECT id, original_name, file_path FROM notice_files WHERE id = ? AND notice_id = ?',
      [fileId, noticeId]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fullPath = path.join(__dirname, '..', file.file_path.replace(/^\/+/, ''));
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    return res.download(fullPath, file.original_name || 'notice-file');
  } catch (error) {
    console.error('Error downloading notice file:', error);
    return res.status(500).json({ error: 'Failed to download notice file' });
  } finally {
    if (conn) conn.release();
  }
});

router.delete('/:id/files/:fileId', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin permission required' });

  let conn;
  try {
    conn = await pool.getConnection();
    const noticeId = Number(req.params.id);
    const fileId = Number(req.params.fileId);
    const [file] = await conn.query(
      'SELECT id, file_path FROM notice_files WHERE id = ? AND notice_id = ?',
      [fileId, noticeId]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    await conn.query('DELETE FROM notice_files WHERE id = ?', [fileId]);
    if (file.file_path) {
      const fullPath = path.join(__dirname, '..', file.file_path.replace(/^\/+/, ''));
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting notice file:', error);
    res.status(500).json({ error: 'Failed to delete notice file' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
