const express = require('express');
const { getDB } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

router.use(authMiddleware);

// 地址列表
router.get('/', (req, res) => {
  const db = getDB();
  const list = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(req.user.id);
  res.json(list);
});

// 新增地址
router.post('/', (req, res) => {
  const { name, phone, province, city, district, detail, is_default = 0 } = req.body;
  if (!name || !phone || !detail) return res.status(400).json({ error: '请填写完整地址信息' });

  const db = getDB();
  if (is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }
  const result = db.prepare(
    'INSERT INTO addresses (user_id, name, phone, province, city, district, detail, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, name, phone, province || '', city || '', district || '', detail, is_default);

  res.json({ id: result.lastInsertRowid, success: true });
});

// 编辑地址
router.put('/:id', (req, res) => {
  const { name, phone, province, city, district, detail, is_default } = req.body;
  const db = getDB();
  const addr = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!addr) return res.status(404).json({ error: '地址不存在' });

  if (is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }
  db.prepare(
    'UPDATE addresses SET name=?, phone=?, province=?, city=?, district=?, detail=?, is_default=? WHERE id=? AND user_id=?'
  ).run(
    name || addr.name, phone || addr.phone,
    province ?? addr.province, city ?? addr.city, district ?? addr.district,
    detail || addr.detail, is_default ?? addr.is_default,
    req.params.id, req.user.id
  );
  res.json({ success: true });
});

// 删除地址
router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
