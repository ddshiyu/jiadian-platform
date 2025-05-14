const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 获取用户信息接口
router.get('/info', async (req, res, next) => {
  try {
    // 从 auth 中间件获取用户 id
    const { id } = req.user;

    // 查询用户信息
    const user = await User.findOne({
      where: { id },
      attributes: [
        'id',
        'nickname',
        'gender',
        'avatar',
        'age',
        'openid',
        'userType',
        'createdAt',
        'updatedAt'
      ]
    });

    if (!user) {
      res.status(404).json({ message: '缺少openid参数' });
    }

    res.json(user);

  } catch (error) {
    next(error);
  }
});

module.exports = router;
