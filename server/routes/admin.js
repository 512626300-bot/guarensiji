const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db');

const router = express.Router();
const SECRET = 'shop-miniapp-secret-key-2024';

function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: '未登录' });
  try {
    const user = jwt.verify(header.replace('Bearer ', ''), SECRET);
    if (user.role !== 'admin') return res.status(403).json({ error: '无权限' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND role = ?').get(username, 'admin');
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: '账号或密码错误' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

// ===== 商品管理 =====
router.get('/products', adminAuth, (req, res) => {
  const db = getDB();
  const { page = 1, size = 20 } = req.query;
  const list = db.prepare(
    'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.id DESC LIMIT ? OFFSET ?'
  ).all(Number(size), (Number(page) - 1) * Number(size));
  const total = db.prepare('SELECT COUNT(*) as t FROM products').get().t;
  res.json({ list: list.map(p => ({ ...p, images: JSON.parse(p.images || '[]') })), total });
});

router.post('/products', adminAuth, (req, res) => {
  const { category_id, name, desc, price, images, stock, status } = req.body;
  const db = getDB();
  db.prepare(
    'INSERT INTO products (category_id, name, desc, price, images, stock, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(category_id || 0, name, desc || '', price, JSON.stringify(images || []), stock || 0, status || 'on');
  res.json({ success: true });
});

router.put('/products/:id', adminAuth, (req, res) => {
  const { category_id, name, desc, price, images, stock, status } = req.body;
  const db = getDB();
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  db.prepare(
    'UPDATE products SET category_id=?, name=?, desc=?, price=?, images=?, stock=?, status=? WHERE id=?'
  ).run(
    category_id ?? p.category_id, name ?? p.name, desc ?? p.desc,
    price ?? p.price, images ? JSON.stringify(images) : p.images,
    stock ?? p.stock, status ?? p.status, req.params.id
  );
  res.json({ success: true });
});

router.delete('/products/:id', adminAuth, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== 订单管理 =====
router.get('/orders', adminAuth, (req, res) => {
  const db = getDB();
  const { status, page = 1, size = 20 } = req.query;
  let sql = 'SELECT o.*, u.username FROM orders o LEFT JOIN users u ON o.user_id = u.id';
  const params = [];
  if (status) { sql += ' WHERE o.status = ?'; params.push(status); }
  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(size), (Number(page) - 1) * Number(size));

  const totalSql = status ? 'SELECT COUNT(*) as t FROM orders WHERE status = ?' : 'SELECT COUNT(*) as t FROM orders';
  const total = db.prepare(totalSql).get(...(status ? [status] : [])).t;

  const orders = db.prepare(sql).all(...params);
  const ids = orders.map(o => o.id);
  if (ids.length) {
    const ph = ids.map(() => '?').join(',');
    const items = db.prepare(`SELECT * FROM order_items WHERE order_id IN (${ph})`).all(...ids);
    const itemsMap = {};
    for (const item of items) {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
      itemsMap[item.order_id].push(item);
    }
    for (const o of orders) {
      o.address_info = JSON.parse(o.address_info || '{}');
      o.items = itemsMap[o.id] || [];
    }
  }
  res.json({ list: orders, total });
});

router.put('/orders/:id/status', adminAuth, (req, res) => {
  const { status } = req.body;
  const db = getDB();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

router.post('/orders/:id/logistics', adminAuth, (req, res) => {
  const { company, tracking_no } = req.body;
  if (!company || !tracking_no) return res.status(400).json({ error: '请填写物流公司和单号' });
  const db = getDB();
  const existing = db.prepare('SELECT * FROM logistics WHERE order_id = ?').get(req.params.id);
  const info = [{ time: new Date().toLocaleString(), desc: '包裹已揽收' }];
  if (existing) {
    db.prepare('UPDATE logistics SET company=?, tracking_no=?, status=?, info=?, updated_at=datetime(?) WHERE order_id=?')
      .run(company, tracking_no, 'shipped', JSON.stringify(info), new Date().toISOString(), req.params.id);
  } else {
    db.prepare('INSERT INTO logistics (order_id, company, tracking_no, status, info) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.id, company, tracking_no, 'shipped', JSON.stringify(info));
  }
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('shipped', req.params.id);
  res.json({ success: true });
});

// ===== 分类管理 =====
router.get('/categories', adminAuth, (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort_order').all());
});

router.post('/categories', adminAuth, (req, res) => {
  const { name, sort_order } = req.body;
  const db = getDB();
  db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run(name, sort_order || 0);
  res.json({ success: true });
});

router.delete('/categories/:id', adminAuth, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
