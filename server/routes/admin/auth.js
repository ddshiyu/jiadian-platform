const express = require('express');
const router = express.Router();
const { AdminUser } = require('../../models/admin');
const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * @api {post} /admin/auth/login 管理员登录
 * @apiDescription 管理员登录接口
 * @apiParam {String} username 用户名
 * @apiParam {String} password 密码
 * @apiSuccess {String} token JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    // 查找管理员用户
    const admin = await AdminUser.findOne({ where: { username } });

    if (!admin) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 检查账号状态
    if (admin.status !== 'active') {
      return res.status(403).json({ message: '账号已被禁用，请联系系统管理员' });
    }

    // 验证密码
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await admin.update({ lastLoginTime: new Date() });

    // 生成token
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
        avatar: admin.avatar
      }
    });
  } catch (error) {
    console.error('管理员登录失败:', error);
    res.status(500).json({ message: '登录失败，请稍后重试' });
  }
});

/**
 * @api {get} /admin/auth/info 获取管理员信息
 * @apiDescription 获取当前登录管理员信息
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/info', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: '请先登录' });
    }

    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 获取管理员信息
    const admin = await AdminUser.findByPk(decoded.id);

    if (!admin) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 检查账号状态
    if (admin.status !== 'active') {
      return res.status(403).json({ message: '账号已被禁用，请联系系统管理员' });
    }

    res.status(200).json({
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
      avatar: admin.avatar,
      email: admin.email
    });
  } catch (error) {
    console.error('获取管理员信息失败:', error);
    res.status(500).json({ message: '获取信息失败' });
  }
});

module.exports = router;
