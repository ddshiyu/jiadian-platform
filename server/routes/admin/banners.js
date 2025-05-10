const express = require('express');
const router = express.Router();
const { Banner } = require('../../models');
const { Op } = require('sequelize');

/**
 * @api {get} /admin/banners 获取所有轮播图
 * @apiDescription 获取轮播图列表(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 * @apiParam {Number} [pageNum=1] 当前页码
 * @apiParam {Number} [pageSize=10] 每页数量
 * @apiParam {String} [keyword] 搜索关键词
 * @apiParam {String} [status] 状态
 */
router.get('/', async (req, res) => {
  try {
    // 使用中间件提供的分页参数获取方法，并指定参数名
    const { page, size, offset } = req.getPaginationParams({
      pageName: 'pageNum',
      sizeName: 'pageSize'
    });

    const {
      keyword,
      status
    } = req.query;

    // 构建查询条件
    const where = {};

    // 关键词搜索
    if (keyword) {
      where.content = { [Op.like]: `%${keyword}%` };
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 查询轮播图总数
    const total = await Banner.count({ where });

    // 分页查询轮播图
    const banners = await Banner.findAll({
      where,
      order: [['sort', 'ASC']],
      limit: size,
      offset: offset
    });

    // 使用分页中间件的paginate方法返回分页结果
    res.paginate(banners, {
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
    console.error('获取轮播图列表失败:', error);
    res.status(500).json({
      message: '获取轮播图列表失败',
      error: error.message
    });
  }
});

/**
 * @api {get} /admin/banners/:id 获取轮播图详情
 * @apiDescription 获取轮播图详情(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/:id', async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: '轮播图不存在' });
    }
    res.status(200).json(banner);
  } catch (error) {
    console.error('获取轮播图详情失败:', error);
    res.status(500).json({
      message: '获取轮播图详情失败',
      error: error.message
    });
  }
});

/**
 * @api {post} /admin/banners 创建轮播图
 * @apiDescription 创建轮播图(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/', async (req, res) => {
  try {
    const { image, content, link, sort, status } = req.body;

    if (!image) {
      return res.status(400).json({ message: '轮播图图片不能为空' });
    }

    const banner = await Banner.create({
      image,
      content,
      link,
      sort: sort || 0,
      status: status || 'active'
    });

    res.status(201).json({
      message: '轮播图创建成功',
      banner
    });
  } catch (error) {
    console.error('创建轮播图失败:', error);
    res.status(500).json({
      message: '创建轮播图失败',
      error: error.message
    });
  }
});

/**
 * @api {put} /admin/banners/:id 更新轮播图
 * @apiDescription 更新轮播图(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id', async (req, res) => {
  try {
    const { image, content, link, sort, status } = req.body;
    const banner = await Banner.findByPk(req.params.id);

    if (!banner) {
      return res.status(404).json({ message: '轮播图不存在' });
    }

    if (image) banner.image = image;
    if (content !== undefined) banner.content = content;
    if (link !== undefined) banner.link = link;
    if (sort !== undefined) banner.sort = sort;
    if (status !== undefined) banner.status = status;

    await banner.save();

    res.status(200).json({
      message: '轮播图更新成功',
      banner
    });
  } catch (error) {
    console.error('更新轮播图失败:', error);
    res.status(500).json({
      message: '更新轮播图失败',
      error: error.message
    });
  }
});

/**
 * @api {delete} /admin/banners/:id 删除轮播图
 * @apiDescription 删除轮播图(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.delete('/:id', async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);

    if (!banner) {
      return res.status(404).json({ message: '轮播图不存在' });
    }

    await banner.destroy();
    res.status(200).json({ message: '轮播图删除成功' });
  } catch (error) {
    console.error('删除轮播图失败:', error);
    res.status(500).json({
      message: '删除轮播图失败',
      error: error.message
    });
  }
});

module.exports = router;
