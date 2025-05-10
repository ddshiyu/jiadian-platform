/**
 * 管理员认证中间件
 * 验证管理员身份并将管理员信息添加到request对象
 */
const jwt = require('jsonwebtoken');
const { AdminUser } = require('../models/admin');
require('dotenv').config();

const adminAuth = async (req, res, next) => {
  try {
    // 从请求头中获取token
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: '请先登录' });
    }

    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 查找管理员用户
    const admin = await AdminUser.findByPk(decoded.id);

    if (!admin) {
      return res.status(404).json({ message: '管理员账号不存在' });
    }

    // 检查账号状态
    if (admin.status !== 'active') {
      return res.status(403).json({ message: '账号已被禁用，请联系系统管理员' });
    }

    // 检查角色权限
    if (!['admin', 'editor'].includes(admin.role) && req.method !== 'GET') {
      return res.status(403).json({ message: '没有操作权限' });
    }

    // 将管理员信息添加到request对象
    req.admin = admin;
    req.adminId = admin.id;

    next();
  } catch (error) {
    console.error('管理员认证失败:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '无效的token' });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'token已过期，请重新登录' });
    }

    res.status(500).json({ message: '认证失败' });
  }
};

module.exports = adminAuth;
