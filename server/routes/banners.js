const express = require('express');
const router = express.Router();
const { Banner } = require('../models');

// 获取所有激活的轮播图
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.findAll({
      where: { status: 'active' },
      order: [['sort', 'ASC']]
    });

    res.status(200).json(banners);
  } catch (error) {
    console.error('获取轮播图列表失败:', error);
    res.status(400).json({ message: '获取轮播图列表失败' });
  }
});

module.exports = router;
