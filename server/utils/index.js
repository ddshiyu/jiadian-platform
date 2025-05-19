const fs = require('fs');
const WxPay = require('wechatpay-node-v3');
// 微信支付实例，放在路由外部全局定义，避免重复创建
const pay = new WxPay({
  appid: process.env.WECHAT_APPID,
  mchid: process.env.WECHAT_MCHID,
  publicKey: fs.readFileSync(__dirname + '/../wxpay_pem/apiclient_cert.pem'), // 公钥
  privateKey: fs.readFileSync(__dirname + '/../wxpay_pem/apiclient_key.pem'), // 秘钥
});

module.exports = {
  pay
};