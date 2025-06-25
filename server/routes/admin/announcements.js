const express = require('express');
const router = express.Router();
const { Announcement } = require('../../models');
const { Op } = require('sequelize');
const adminAuth = require('../../middleware/adminAuth');

/**
 * @api {get} /admin/announcements 获取公告列表
 * @apiDescription 获取公告列表
 * @apiHeader {String} Authorization Bearer JWT
 * @apiParam {Number} [pageNum=1] 当前页码
 * @apiParam {Number} [pageSize=10] 每页数量
 * @apiParam {String} [keyword] 搜索关键词
 * @apiParam {String} [type] 公告类型
 * @apiParam {String} [status] 公告状态
 */
router.get('/', adminAuth, async (req, res) => {
  try {
    // 使用中间件提供的分页参数获取方法，并指定参数名
    const { page, size, offset } = req.getPaginationParams({
      pageName: 'pageNum',
      sizeName: 'pageSize'
    });

    const { status, keyword } = req.query;

    // 构建查询条件
    const where = {};

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { content: { [Op.like]: `%${keyword}%` } }
      ];
    }

    // 查询公告总数
    const total = await Announcement.count({ where });

    // 查询公告列表
    const announcements = await Announcement.findAll({
      where,
      order: [
        ['createdAt', 'DESC']
      ],
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
        pageNum: page,
        pageSize: size,
        totalPages: Math.ceil(total / size)  // 总页数需要保留
      }
    });
  } catch (error) {
    console.error('获取公告列表失败:', error);
    res.status(500).json({
      message: '获取公告列表失败',
      error: error.message
    });
  }
});

/**
 * @api {get} /admin/announcements/:id 获取公告详情
 * @apiDescription 获取公告详情
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: '公告不存在' });
    }

    res.status(200).json(announcement);
  } catch (error) {
    console.error('获取公告详情失败:', error);
    res.status(500).json({
      message: '获取公告详情失败',
      error: error.message
    });
  }
});

/**
 * @api {post} /admin/announcements 创建公告
 * @apiDescription 创建新公告
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      title,
      content,
      status = 'active',
      startTime,
      endTime
    } = req.body;

    // 验证必填字段
    if (!title || !content) {
      return res.status(400).json({ message: '标题和内容不能为空' });
    }

    // 验证时间逻辑
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ message: '开始时间必须早于结束时间' });
    }

    const announcement = await Announcement.create({
      title,
      content,
      status,
      startTime: startTime || null,
      endTime: endTime || null
    });

    res.status(201).json({
      message: '公告创建成功',
      announcement
    });
  } catch (error) {
    console.error('创建公告失败:', error);
    res.status(500).json({
      message: '创建公告失败',
      error: error.message
    });
  }
});

/**
 * @api {put} /admin/announcements/:id 更新公告
 * @apiDescription 更新公告信息
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const {
      title,
      content,
      status,
      startTime,
      endTime
    } = req.body;

    const announcement = await Announcement.findByPk(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: '公告不存在' });
    }

    // 验证必填字段
    if (!title || !content) {
      return res.status(400).json({ message: '标题和内容不能为空' });
    }

    // 验证时间逻辑
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ message: '开始时间必须早于结束时间' });
    }

    // 更新公告信息
    if (title !== undefined) announcement.title = title;
    if (content !== undefined) announcement.content = content;
    if (status !== undefined) announcement.status = status;
    if (startTime !== undefined) announcement.startTime = startTime || null;
    if (endTime !== undefined) announcement.endTime = endTime || null;

    await announcement.save();

    res.status(200).json({
      message: '公告更新成功',
      announcement
    });
  } catch (error) {
    console.error('更新公告失败:', error);
    res.status(500).json({
      message: '更新公告失败',
      error: error.message
    });
  }
});

/**
 * @api {delete} /admin/announcements/:id 删除公告
 * @apiDescription 删除公告
 * @apiHeader {String} Authorization Bearer JWT
 */
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: '公告不存在' });
    }

    await announcement.destroy();

    res.status(200).json({ message: '公告删除成功' });
  } catch (error) {
    console.error('删除公告失败:', error);
    res.status(500).json({
      message: '删除公告失败',
      error: error.message
    });
  }
});

/**
 * @api {post} /admin/announcements/batch 批量操作公告
 * @apiDescription 批量操作公告（删除）
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/batch', adminAuth, async (req, res) => {
  try {
    const { ids, action } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请选择要操作的公告' });
    }

    if (!['delete'].includes(action)) {
      return res.status(400).json({ message: '无效的操作类型' });
    }

    // 批量删除公告
    const result = await Announcement.destroy({
      where: { id: { [Op.in]: ids } }
    });

    res.status(200).json({
      message: '公告已批量删除',
      affected: result
    });
  } catch (error) {
    console.error('批量操作公告失败:', error);
    res.status(500).json({
      message: '批量操作公告失败',
      error: error.message
    });
  }
});

/**
 * @api {put} /admin/announcements/:id/status 更新公告状态
 * @apiDescription 更新公告状态
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: '无效的公告状态' });
    }

    const announcement = await Announcement.findByPk(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: '公告不存在' });
    }

    announcement.status = status;
    await announcement.save();

    res.status(200).json({
      message: status === 'active' ? '公告已激活' : '公告已停用',
      status
    });
  } catch (error) {
    console.error('更新公告状态失败:', error);
    res.status(500).json({
      message: '更新公告状态失败',
      error: error.message
    });
  }
});

module.exports = router;
