const express = require('express');
const { getDB } = require('../db');

const router = express.Router();

// 商品列表
router.get('/', (req, res) => {
  const db = getDB();
  const { category, categories, keyword, page = 1, size = 20 } = req.query;
  let sql = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = ?';
  const params = ['on'];

  if (categories) {
    const ids = categories.split(',').map(Number).filter(n => n > 0);
    if (ids.length) {
      sql += ` AND p.category_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids);
    }
  } else if (category) {
    sql += ' AND p.category_id = ?';
    params.push(category);
  }
  if (keyword) {
    sql += ' AND (p.name LIKE ? OR p.desc LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  sql += ' ORDER BY p.sales DESC, p.id DESC LIMIT ? OFFSET ?';
  params.push(Number(size), (Number(page) - 1) * Number(size));

  const products = db.prepare(sql).all(...params).map(p => ({
    ...p,
    images: JSON.parse(p.images || '[]')
  }));

  const countSql = sql.replace(/SELECT p.*, c.name as category_name/, 'SELECT COUNT(*) as total').replace(/ LIMIT .*/, '');
  const total = db.prepare(countSql).all(...params.slice(0, -2))[0]?.total || 0;

  res.json({ list: products, total, page: Number(page), size: Number(size) });
});

// 分类列表（必须在 :id 之前注册，否则 /categories/list 会被 :id 拦截）
router.get('/categories/list', (req, res) => {
  const db = getDB();
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
  res.json(categories);
});

// 商品详情
router.get('/:id', (req, res) => {
  const db = getDB();
  const product = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: '商品不存在' });
  product.images = JSON.parse(product.images || '[]');
  res.json(product);
});

module.exports = router;
