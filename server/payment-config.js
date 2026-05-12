// 微信支付配置
// 申请地址: https://pay.weixin.qq.com
// 需要: 营业执照 + 小程序AppID + 商户号
module.exports = {
  // 是否启用真实微信支付 (false = 使用模拟支付)
  enabled: false,

  // 小程序 AppID (已认证)
  appid: 'wx07ab2c12a0748daf',

  // 商户号 (MCH ID)
  mchid: '',

  // API v3 密钥 (在微信支付商户平台设置)
  apiV3Key: '',

  // 商户证书序列号 (查看证书信息获取)
  serialNo: '',

  // 商户API私钥文件路径 (pem格式)
  privateKeyPath: '',

  // 支付回调地址 (需要公网可访问)
  notifyUrl: 'https://your-domain.com/api/pay/notify'
};
