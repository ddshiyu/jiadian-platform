const jwt = require('jsonwebtoken');
require('dotenv').config();

const auth = async (req, res, next) => {
  try {
    // 从请求头获取token
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: '请先登录' });
    }

    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 将解码后的用户信息添加到请求对象中
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Token验证错误:', error);
    res.status(401).json({ message: 'token无效或已过期' });
  }
};

module.exports = auth;