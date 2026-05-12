const express = require('express');
const { getDB } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

router.use(authMiddleware);

// 生成订单号
function genOrderNo() {
  const now = new Date();
  const d = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const r = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `ORD${d}${r}`;
}

// 创建订单
router.post('/create', (req, res) => {
  const { items, address_id, remark } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: '请选择商品' });
  if (!address_id) return res.status(400).json({ error: '请选择收货地址' });

  const db = getDB();

  const address = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(address_id, req.user.id);
  if (!address) return res.status(404).json({ error: '地址不存在' });

  const orderNo = genOrderNo();
  let totalAmount = 0;
  const orderItems = [];

  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, price) VALUES (?, ?, ?, ?, ?, ?)');
  const updateStock = db.prepare('UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ?');

  const createOrder = db.transaction(() => {
    // 验证商品在用户购物车中
    const cartProductIds = new Set(
      db.prepare('SELECT product_id FROM cart WHERE user_id = ?').all(req.user.id).map(r => r.product_id)
    );

    for (const item of items) {
      if (!cartProductIds.has(item.product_id)) throw new Error(`商品 ${item.product_id} 不在购物车中，请重新添加`);
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND status = ?').get(item.product_id, 'on');
      if (!product) throw new Error(`商品ID ${item.product_id} 不存在或已下架`);
      if (product.stock < item.quantity) throw new Error(`${product.name} 库存不足`);

      totalAmount += product.price * item.quantity;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_image: JSON.parse(product.images || '[]')[0] || '',
        quantity: item.quantity,
        price: product.price
      });
    }

    const result = db.prepare(
      'INSERT INTO orders (order_no, user_id, total_amount, address_info, remark) VALUES (?, ?, ?, ?, ?)'
    ).run(orderNo, req.user.id, totalAmount, JSON.stringify(address), remark || '');

    const orderId = result.lastInsertRowid;
    for (const oi of orderItems) {
      insertItem.run(orderId, oi.product_id, oi.product_name, oi.product_image, oi.quantity, oi.price);
      updateStock.run(oi.quantity, oi.quantity, oi.product_id);
    }

    // 清空购物车中已下单的商品
    const pids = items.map(i => i.product_id);
    const placeholders = pids.map(() => '?').join(',');
    db.prepare(`DELETE FROM cart WHERE user_id = ? AND product_id IN (${placeholders})`).run(req.user.id, ...pids);

    return orderId;
  });

  try {
    const orderId = createOrder();
    res.json({ order_id: orderId, order_no: orderNo, total_amount: totalAmount });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 订单列表
router.get('/', (req, res) => {
  const db = getDB();
  const { status, page = 1, size = 10 } = req.query;
  let sql = 'SELECT * FROM orders WHERE user_id = ?';
  const params = [req.user.id];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(size), (Number(page) - 1) * Number(size));

  const orders = db.prepare(sql).all(...params);
  const ids = orders.map(o => o.id);
  const itemsMap = {};
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const items = db.prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`).all(...ids);
    for (const item of items) {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
      itemsMap[item.order_id].push(item);
    }
  }

  res.json(orders.map(o => ({
    ...o,
    address_info: JSON.parse(o.address_info || '{}'),
    items: itemsMap[o.id] || []
  })));
});

// 订单详情
router.get('/:id', (req, res) => {
  const db = getDB();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  order.address_info = JSON.parse(order.address_info || '{}');
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

  const logistics = db.prepare('SELECT * FROM logistics WHERE order_id = ?').get(order.id);
  if (logistics) {
    logistics.info = JSON.parse(logistics.info || '[]');
    order.logistics = logistics;
  }

  res.json(order);
});

// 模拟支付（开发测试用）
router.post('/mock', (req, res) => {
  const { order_id } = req.body;
  if (!order_id) return res.status(400).json({ error: '缺少订单ID' });

  const db = getDB();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, req.user.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.status !== 'pending') return res.status(400).json({ error: '订单状态异常' });

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('paid', order_id);
  res.json({ success: true, message: '支付成功' });
});

// 微信支付（正式）
const payConfig = require('../payment-config');
const wechatPay = require('../services/wechat-pay');
router.post('/wxpay', async (req, res) => {
  const { order_id } = req.body;
  if (!order_id) return res.status(400).json({ error: '缺少订单ID' });

  const db = getDB();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, req.user.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.status !== 'pending') return res.status(400).json({ error: '订单状态异常' });

  // 没配置微信支付 → 返回提示
  if (!payConfig.enabled || !payConfig.mchid) {
    return res.json({ mock: true, message: '微信支付未配置，是否使用模拟支付？' });
  }

  try {
    const { openid } = req.body;
    if (!openid) return res.status(400).json({ error: '缺少用户标识' });

    const prepayId = await wechatPay.createJsapiOrder(
      openid,
      order.order_no,
      order.total_amount,
      '乒乓器材店 - 订单'
    );
    const params = wechatPay.getPaymentParams(prepayId);
    res.json({ mock: false, params });
  } catch (e) {
    res.status(500).json({ error: '支付请求失败: ' + e.message });
  }
});

// 查询支付配置状态
router.get('/pay/config', (req, res) => {
  res.json({
    enabled: payConfig.enabled && !!payConfig.mchid,
    mockAvailable: true
  });
});

// 取消订单
router.post('/cancel', (req, res) => {
  const { order_id } = req.body;
  const db = getDB();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, req.user.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (!['pending', 'paid'].includes(order.status)) return res.status(400).json({ error: '当前状态不可取消' });

  // 恢复库存
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order_id);
  const restoreStock = db.prepare('UPDATE products SET stock = stock + ?, sales = sales - ? WHERE id = ?');
  for (const item of items) {
    restoreStock.run(item.quantity, item.quantity, item.product_id);
  }

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('canceled', order_id);
  res.json({ success: true });
});

// 确认收货
router.post('/confirm', (req, res) => {
  const { order_id } = req.body;
  const db = getDB();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, req.user.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.status !== 'shipped') return res.status(400).json({ error: '订单状态异常' });

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('done', order_id);
  res.json({ success: true });
});

// 物流信息
router.get('/:orderId/logistics', (req, res) => {
  const db = getDB();
  const logistics = db.prepare('SELECT * FROM logistics WHERE order_id = ?').get(req.params.orderId);
  if (!logistics) return res.json(null);
  logistics.info = JSON.parse(logistics.info || '[]');
  res.json(logistics);
});

module.exports = router;
