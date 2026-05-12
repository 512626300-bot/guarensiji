# 乒乓器材店 — 微信小程序

一个乒乓球器材商城微信小程序，包含前端小程序、后端 API 服务和管理后台。

## 项目结构

```
shop-miniapp/
├── miniapp/          # 小程序前端（微信开发者工具打开）
│   ├── pages/        # 页面
│   ├── components/   # 组件
│   └── utils/        # 工具函数
├── server/           # 后端服务
│   ├── routes/       # API 路由
│   ├── admin/        # 管理后台网页
│   ├── db.js         # 数据库
│   └── app.js        # 服务入口
└── README.md
```

## 快速启动

### 1. 启动后端

```bash
cd server
npm install
npm start
```

服务运行在 http://localhost:3000

- API 接口: http://localhost:3000/api
- 管理后台: http://localhost:3000/admin

### 2. 打开小程序

1. 下载安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开工具，选择「导入项目」
3. 目录选择 `shop-miniapp/miniapp`
4. AppID 选择「测试号」（或输入你自己的 AppID）
5. 点击「编译」

### 3. 设置 API 地址

如果后端不是运行在 `localhost:3000`（比如用手机预览或部署到远程服务器），需要修改 `miniapp/app.js` 中的 `apiBase` 地址。

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 普通用户 | user | user123 |
| 管理员 | admin | admin123 |

## 功能

### 用户端（小程序）
- 首页商品展示（分类筛选、搜索）
- 商品详情页
- 购物车管理
- 下单流程（地址选择 → 提交 → 模拟支付）
- 订单管理（查看、取消、确认收货）
- 地址管理
- 物流追踪

### 管理后台（Web 页面）
- 数据概览
- 商品管理（增删改查）
- 订单管理（查看、发货、取消）
- 分类管理

## 技术栈

- **前端**: 微信小程序原生（WXML + WXSS + JS）
- **后端**: Node.js + Express
- **数据库**: SQLite（无需额外安装）
- **管理后台**: 纯静态 HTML/CSS/JS

## 部署上线

### 后端部署（免费方案）

推荐使用 Railway 一键部署：

1. 将项目推送到 GitHub
2. 登录 [Railway](https://railway.app/)
3. 选择 `server/` 目录部署
4. 设置环境变量 `PORT=3000`（Railway 默认处理）
5. 部署完成后获得公网 URL

### 小程序上线

1. 在微信公众平台注册小程序（需要企业资质）
2. 在开发者工具中上传代码
3. 修改 `app.js` 中的 `apiBase` 为后端公网地址
4. 提交审核

## 注意事项

- 当前使用**模拟登录**（账号密码），无需微信 OAuth 认证
- 当前使用**模拟支付**，一键成功，无需微信支付商户号
- 数据库文件 `shop.db` 在首次启动时自动创建并填充示例数据
- 删除 `shop.db` 文件可重置数据
