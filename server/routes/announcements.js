const express = require('express');
const router = express.Router();
const { Announcement } = require('../models');
const { Op } = require('sequelize');

// 获取公告列表（带分页和搜索）
router.get('/', async (req, res) => {
  try {
    // 使用中间件提供的分页参数获取方法
    const { page, size, offset } = req.getPaginationParams({
      pageName: 'page',
      sizeName: 'pageSize',
      defaultSize: 10
    });

    const { keyword, status } = req.query;
    const currentTime = new Date();

    // 构建查询条件
    const where = {
      status: 'active',
      [Op.or]: [
        { startTime: null },
        { startTime: { [Op.lte]: currentTime } }
      ],
      [Op.or]: [
        { endTime: null },
        { endTime: { [Op.gte]: currentTime } }
      ]
    };

    // 关键词搜索 - 支持多字段模糊搜索
    if (keyword) {
      const searchKeyword = `%${keyword}%`;
      where[Op.or] = [
        { title: { [Op.like]: searchKeyword } },
        { content: { [Op.like]: searchKeyword } }
      ];
    }

    // 状态筛选（管理员可以查看所有状态）
    if (status) {
      where.status = status;
    }

    // 查询公告总数
    const total = await Announcement.count({ where });

    // 获取公告列表
    const announcements = await Announcement.findAll({
      where,
      attributes: [
        'id', 'title', 'content', 'status', 'startTime', 'endTime',
        'viewCount', 'createdAt', 'updatedAt'
      ],
      order: [['createdAt', 'DESC']],
      limit: size,
      offset: offset
    });

    // 使用分页中间件的paginate方法返回分页结果
    res.paginate(announcements, {
      total,
      page,
      size,
      removeDefaults: true,  // 移除默认的page和size字段
      custom: {
        current: page,
        pageSize: size,
        totalPages: Math.ceil(total / size)  // 总页数
      }
    });
  } catch (error) {
    console.error('获取公告列表失败:', error);
    res.status(400).json({ message: '获取公告列表失败' });
  }
});



// 获取最新公告
router.get('/latest', async (req, res) => {
  try {
    const currentTime = new Date();

    const announcement = await Announcement.findOne({
      where: {
        status: 'active',
        [Op.or]: [
          { startTime: null },
          { startTime: { [Op.lte]: currentTime } }
        ],
        [Op.or]: [
          { endTime: null },
          { endTime: { [Op.gte]: currentTime } }
        ]
      },
      attributes: [
        'id', 'title', 'content', 'status', 'startTime', 'endTime',
        'viewCount', 'createdAt', 'updatedAt'
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(announcement);
  } catch (error) {
    console.error('获取最新公告失败:', error);
    res.status(400).json({ message: '获取最新公告失败' });
  }
});

// 增加公告浏览次数
router.post('/:id/view', async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id, {
      attributes: [
        'id', 'title', 'content', 'status', 'startTime', 'endTime',
        'viewCount', 'createdAt', 'updatedAt'
      ]
    });

    if (!announcement) {
      return res.status(400).json({ message: '公告不存在' });
    }

    // 检查公告是否在有效期内且状态为激活
    const currentTime = new Date();
    const isActive = announcement.status === 'active' &&
      (!announcement.startTime || announcement.startTime <= currentTime) &&
      (!announcement.endTime || announcement.endTime >= currentTime);

    if (!isActive) {
      return res.status(400).json({ message: '公告不存在或已下线' });
    }

    // 增加浏览次数
    await announcement.increment('viewCount');

    res.status(200).json({
      success: true,
      message: '浏览次数已更新',
      viewCount: announcement.viewCount + 1
    });
  } catch (error) {
    console.error('更新浏览次数失败:', error);
    res.status(400).json({ message: '更新浏览次数失败' });
  }
});


// 获取公告详情
router.get('/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id, {
      attributes: [
        'id', 'title', 'content', 'status', 'startTime', 'endTime',
        'viewCount', 'createdAt', 'updatedAt'
      ]
    });

    if (!announcement) {
      return res.status(400).json({ message: '公告不存在' });
    }

    // 检查公告是否在有效期内且状态为激活
    const currentTime = new Date();
    const isActive = announcement.status === 'active' &&
      (!announcement.startTime || announcement.startTime <= currentTime) &&
      (!announcement.endTime || announcement.endTime >= currentTime);

    if (!isActive) {
      return res.status(400).json({ message: '公告不存在或已下线' });
    }

    // 增加浏览次数
    await announcement.increment('viewCount');

    res.status(200).json(announcement);
  } catch (error) {
    console.error('获取公告详情失败:', error);
    res.status(400).json({ message: '获取公告详情失败' });
  }
});

module.exports = router;
