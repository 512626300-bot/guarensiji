const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'shop.db');

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDB() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER DEFAULT 0,
      name TEXT NOT NULL,
      desc TEXT DEFAULT '',
      price REAL NOT NULL,
      images TEXT DEFAULT '[]',
      stock INTEGER DEFAULT 0,
      sales INTEGER DEFAULT 0,
      status TEXT DEFAULT 'on',
      created_at DATETIME DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      province TEXT DEFAULT '',
      city TEXT DEFAULT '',
      district TEXT DEFAULT '',
      detail TEXT DEFAULT '',
      is_default INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      address_info TEXT DEFAULT '{}',
      remark TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT DEFAULT '',
      product_image TEXT DEFAULT '',
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS logistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      company TEXT DEFAULT '',
      tracking_no TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      info TEXT DEFAULT '[]',
      updated_at DATETIME DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
  `);

  // Seed default admin user
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (userCount.c === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)').run('admin', hash, '管理员', 'admin');
    db.prepare('INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)').run('user', bcrypt.hashSync('user123', 10), '测试用户', 'user');
  }

  // Seed categories
  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get();
  if (catCount.c === 0) {
    const insert = db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)');
    insert.run('底板', '🏓', 1);
    insert.run('胶皮', '🔴', 2);
    insert.run('胶水', '🧴', 3);
    insert.run('拍套', '🎒', 4);
    insert.run('乒乓服饰', '👕', 5);
    insert.run('球鞋', '👟', 6);
  }

  // Seed products
  const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get();
  if (prodCount.c === 0) {
    const insert = db.prepare('INSERT INTO products (category_id, name, desc, price, images, stock, sales) VALUES (?, ?, ?, ?, ?, ?, ?)');
    // 底板 1
    insert.run(1, 'Butterfly Viscaria 蝴蝶王底板', '经典芳碳混编，进攻型首选，日本原产', 1280, '["https://picsum.photos/seed/viscaria/400/400"]', 20, 0);
    insert.run(1, '红双喜 狂飙龙5 底板', '马龙同款，内置芳碳，适合弧圈快攻打法', 850, '["https://picsum.photos/seed/k5/400/400"]', 15, 0);
    insert.run(1, 'Stiga 北极星7 底板', '7层纯木，控制出色，入门进阶皆宜', 399, '["https://picsum.photos/seed/star7/400/400"]', 30, 0);
    // 胶皮 2
    insert.run(2, '红双喜 狂飙3 省狂', '专业粘性胶面，旋转强烈，国手标配', 169, '["https://picsum.photos/seed/h3/400/400"]', 100, 0);
    insert.run(2, 'Butterfly Tenergy 05', '涩性胶皮，弹性极佳，速度型利器', 428, '["https://picsum.photos/seed/t05/400/400"]', 50, 0);
    insert.run(2, '友谊 729-08ES', '粘涩结合，性价比之选，业余爱好者口碑款', 79, '["https://picsum.photos/seed/729/400/400"]', 200, 0);
    // 胶水 3
    insert.run(3, 'Butterfly Free Chack 有机胶水', '日本进口，粘性持久，250ml装', 68, '["https://picsum.photos/seed/glue1/400/400"]', 60, 0);
    insert.run(3, '红双喜 无机胶水 15号', '无机环保，刷胶均匀，250ml', 35, '["https://picsum.photos/seed/glue2/400/400"]', 80, 0);
    insert.run(3, 'Nittaku Finezip 胶水', '日本尼塔库，专业级胶水，120ml', 55, '["https://picsum.photos/seed/glue3/400/400"]', 40, 0);
    // 拍套 4
    insert.run(4, 'Butterfly 方型球拍包', '蝴蝶经典款，可放2-3支球拍，加厚保护', 168, '["https://picsum.photos/seed/case1/400/400"]', 30, 0);
    insert.run(4, '红双喜 单拍拉链拍套', '简约便携，EVA防压，适合单拍', 29, '["https://picsum.photos/seed/case2/400/400"]', 150, 0);
    insert.run(4, '李宁 乒乓球拍包 6支装', '大容量双肩包，可放6支球拍+配件', 188, '["https://picsum.photos/seed/case3/400/400"]', 20, 0);
    // 乒乓服饰 5
    insert.run(5, '红双喜 专业乒乓短袖T恤', '速干面料，透气排汗，多色可选', 89, '["https://picsum.photos/seed/ttshirt/400/400"]', 200, 0);
    insert.run(5, 'Butterfly 乒乓短裤', '弹力面料，宽松舒适，两侧口袋', 128, '["https://picsum.photos/seed/shorts/400/400"]', 80, 0);
    insert.run(5, '李宁 国家队长袖比赛服', '国乒同款设计，CoolMax速干科技', 229, '["https://picsum.photos/seed/jersey/400/400"]', 40, 0);
    // 球鞋 6
    insert.run(6, 'Butterfly Lezoline 乒乓鞋', '防滑牛筋底，透气网面，舒适耐磨', 460, '["https://picsum.photos/seed/lezoline/400/400"]', 30, 0);
    insert.run(6, '李宁 乒乓球鞋', '橡胶大底防滑，减震EVA中底，轻量设计', 280, '["https://picsum.photos/seed/shoe2/400/400"]', 50, 0);
    insert.run(6, '红双喜 乒乓球鞋', '入门级高性价比，防滑耐磨', 138, '["https://picsum.photos/seed/shoe3/400/400"]', 100, 0);
  }
}

module.exports = { getDB, initDB };
