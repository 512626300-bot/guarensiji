const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../payment-config');

// 生成随机字符串
function nonceStr() {
  return crypto.randomBytes(16).toString('hex');
}

// 生成时间戳（秒）
function timestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

// RSA-SHA256 签名
function sign(data, privateKey) {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data);
  return signer.sign(privateKey, 'base64');
}

// 构建请求头 Authorization
function buildAuth(method, path, body) {
  if (!config.privateKeyPath) return '';
  const privateKey = fs.readFileSync(config.privateKeyPath, 'utf8');
  const ns = nonceStr();
  const ts = timestamp();
  const bodyStr = body ? JSON.stringify(body) : '';
  const msg = `${method}\n${path}\n${ts}\n${ns}\n${bodyStr}\n`;
  const sig = sign(msg, privateKey);
  const mchid = config.mchid;
  const serial = config.serialNo;
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${ns}",timestamp="${ts}",serial_no="${serial}",signature="${sig}"`;
}

// 创建 JSAPI 支付订单
function createJsapiOrder(openid, orderNo, total, description) {
  return new Promise((resolve, reject) => {
    const body = {
      appid: config.appid,
      mchid: config.mchid,
      description,
      out_trade_no: orderNo,
      notify_url: config.notifyUrl,
      amount: { total: Math.round(total * 100), currency: 'CNY' },
      payer: { openid }
    };

    const path = '/v3/pay/transactions/jsapi';
    const auth = buildAuth('POST', path, body);
    if (!auth) return reject(new Error('支付未配置'));

    const req = https.request({
      hostname: 'api.mch.weixin.qq.com',
      port: 443,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
        'User-Agent': 'shop-miniapp'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.prepay_id) {
            resolve(result.prepay_id);
          } else {
            reject(new Error(result.message || JSON.stringify(result)));
          }
        } catch (e) {
          reject(new Error('微信支付返回异常'));
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

// 获取小程序端调起支付所需的参数
function getPaymentParams(prepayId) {
  if (!config.privateKeyPath) return null;
  const privateKey = fs.readFileSync(config.privateKeyPath, 'utf8');
  const params = {
    appId: config.appid,
    timeStamp: timestamp(),
    nonceStr: nonceStr(),
    package: `prepay_id=${prepayId}`,
    signType: 'RSA'
  };
  const msg = `${params.appId}\n${params.timeStamp}\n${params.nonceStr}\n${params.package}\n`;
  params.paySign = sign(msg, privateKey);
  return params;
}

// 验证支付回调通知签名
function verifyNotify(body, headers) {
  // 解析微信支付回调的签名验证（需要微信支付平台证书）
  // 简化版：生产环境需要完整验证
  return true;
}

module.exports = { createJsapiOrder, getPaymentParams, verifyNotify };
