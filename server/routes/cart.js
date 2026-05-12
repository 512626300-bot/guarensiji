const express = require('express');
const { getDB } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

router.use(authMiddleware);

// 购物车列表
router.get('/', (req, res) => {
  const db = getDB();
  const items = db.prepare(`
    SELECT c.id, c.product_id, c.quantity, p.name, p.price, p.images, p.status, p.stock
    FROM cart c JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
    ORDER BY c.id DESC
  `).all(req.user.id).map(item => ({
    ...item,
    images: JSON.parse(item.images || '[]'),
    selected: true
  }));
  res.json(items);
});

// 添加到购物车
router.post('/', (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  if (!product_id) return res.status(400).json({ error: '缺少商品ID' });

  const db = getDB();
  const existing = db.prepare('SELECT * FROM cart WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
  if (existing) {
    db.prepare('UPDATE cart SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
  } else {
    db.prepare('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, product_id, quantity);
  }
  res.json({ success: true });
});

// 更新数量
router.put('/:id', (req, res) => {
  const { quantity } = req.body;
  if (quantity < 1) return res.status(400).json({ error: '数量不能少于1' });
  const db = getDB();
  db.prepare('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?').run(quantity, req.params.id, req.user.id);
  res.json({ success: true });
});

// 删除
router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM cart WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// 清空购物车（下单后调用）
router.delete('/', (req, res) => {
  const { product_ids } = req.body;
  const db = getDB();
  if (product_ids && product_ids.length) {
    const placeholders = product_ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM cart WHERE user_id = ? AND product_id IN (${placeholders})`).run(req.user.id, ...product_ids);
  }
  res.json({ success: true });
});

module.exports = router;
