const express = require('express');
const router = express.Router();
const { Category, Product } = require('../../models');
const { Op } = require('sequelize');

/**
 * @api {get} /admin/categories 获取所有分类
 * @apiDescription 获取分类列表(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 * @apiParam {Number} [pageNum=1] 当前页码
 * @apiParam {Number} [pageSize=10] 每页数量
 * @apiParam {String} [keyword] 搜索关键词
 * @apiParam {String} [status] 分类状态
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
      where.name = { [Op.like]: `%${keyword}%` };
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 查询分类总数
    const total = await Category.count({ where });

    // 分页查询分类
    const categories = await Category.findAll({
      where,
      order: [['sort', 'ASC']],
      limit: size,
      offset: offset
    });

    // 使用分页中间件的paginate方法返回分页结果
    res.paginate(categories, {
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
    console.error('获取分类列表失败:', error);
    res.status(500).json({
      message: '获取分类列表失败',
      error: error.message
    });
  }
});

/**
 * @api {get} /admin/categories/:id 获取分类详情
 * @apiDescription 获取分类详情(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: '分类不存在' });
    }
    res.status(200).json(category);
  } catch (error) {
    console.error('获取分类详情失败:', error);
    res.status(500).json({
      message: '获取分类详情失败',
      error: error.message
    });
  }
});

/**
 * @api {post} /admin/categories 创建分类
 * @apiDescription 创建分类(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, icon, sort, status } = req.body;

    if (!name) {
      return res.status(400).json({ message: '分类名称不能为空' });
    }

    const category = await Category.create({
      name,
      description,
      icon,
      sort: sort || 0,
      status: status || 'active'
    });

    res.status(201).json({
      message: '分类创建成功',
      category
    });
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(500).json({
      message: '创建分类失败',
      error: error.message
    });
  }
});

/**
 * @api {put} /admin/categories/:id 更新分类
 * @apiDescription 更新分类(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, description, icon, sort, status } = req.body;
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ message: '分类不存在' });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (sort !== undefined) category.sort = sort;
    if (status !== undefined) category.status = status;

    await category.save();

    res.status(200).json({
      message: '分类更新成功',
      category
    });
  } catch (error) {
    console.error('更新分类失败:', error);
    res.status(500).json({
      message: '更新分类失败',
      error: error.message
    });
  }
});

/**
 * @api {delete} /admin/categories/:id 删除分类
 * @apiDescription 删除分类(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ message: '分类不存在' });
    }

    // 检查分类下是否有商品
    const products = await Product.findAll({
      where: { categoryId: req.params.id }
    });

    if (products.length > 0) {
      return res.status(400).json({
        message: '该分类下有商品，无法删除',
        count: products.length
      });
    }

    await category.destroy();
    res.status(200).json({ message: '分类删除成功' });
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(500).json({
      message: '删除分类失败',
      error: error.message
    });
  }
});

module.exports = router;
