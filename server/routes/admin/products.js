const express = require('express');
const router = express.Router();
const { Product, Category } = require('../../models');
const { Op } = require('sequelize');

/**
 * @api {get} /admin/products 获取商品列表
 * @apiDescription 获取商品列表(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 * @apiParam {Number} [pageNum=1] 当前页码
 * @apiParam {Number} [pageSize=10] 每页数量
 * @apiParam {String} [keyword] 搜索关键词
 * @apiParam {Number} [categoryId] 分类ID
 * @apiParam {String} [status] 商品状态
 * @apiParam {Boolean} [isRecommended] 是否为推荐商品
 * @apiParam {String} [sort=createdAt] 排序字段
 * @apiParam {String} [order=DESC] 排序方式
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
      categoryId,
      status,
      isRecommended,
      sort = 'createdAt',
      order = 'DESC'
    } = req.query;

    // 构建查询条件
    const where = {};

    // 关键词搜索
    if (keyword) {
      where.name = { [Op.like]: `%${keyword}%` };
    }

    // 分类筛选
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 推荐状态筛选
    if (isRecommended !== undefined) {
      where.isRecommended = isRecommended === 'true';
    }

    // 查询商品总数
    const total = await Product.count({ where });

    // 查询商品列表
    const products = await Product.findAll({
      where,
      include: [
        {
          model: Category,
          attributes: ['id', 'name']
        }
      ],
      order: [[sort, order]],
      limit: size,
      offset: offset
    });

    // 使用分页中间件的paginate方法返回分页结果
    res.paginate(products, {
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
    console.error('获取商品列表失败:', error);
    res.status(500).json({
      message: '获取商品列表失败',
      error: error.message
    });
  }
});

/**
 * @api {get} /admin/products/:id 获取商品详情
 * @apiDescription 获取商品详情(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          attributes: ['id', 'name']
        }
      ]
    });

    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('获取商品详情失败:', error);
    res.status(500).json({
      message: '获取商品详情失败',
      error: error.message
    });
  }
});

/**
 * @api {post} /admin/products 创建商品
 * @apiDescription 创建新商品(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/', async (req, res) => {
  try {
    const {
      name, description, price, originalPrice, wholesalePrice, wholesaleThreshold,
      stock, cover, images, status, categoryId, isRecommended
    } = req.body;

    // 验证必填字段
    if (!name || !price) {
      return res.status(400).json({ message: '商品名称和价格不能为空' });
    }

    // 创建商品
    const product = await Product.create({
      name,
      description,
      price,
      originalPrice,
      wholesalePrice,
      wholesaleThreshold,
      stock: stock || 0,
      cover,
      images,
      status: status || 'off_sale',
      categoryId,
      isRecommended: isRecommended || false
    });

    res.status(201).json({
      message: '商品创建成功',
      product
    });
  } catch (error) {
    console.error('创建商品失败:', error);
    res.status(500).json({
      message: '创建商品失败',
      error: error.message
    });
  }
});

/**
 * @api {put} /admin/products/:id 更新商品
 * @apiDescription 更新商品信息(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id', async (req, res) => {
  try {
    const {
      name, description, price, originalPrice, wholesalePrice, wholesaleThreshold,
      stock, cover, images, status, categoryId, isRecommended
    } = req.body;

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 更新商品信息
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (originalPrice !== undefined) product.originalPrice = originalPrice;
    if (wholesalePrice !== undefined) product.wholesalePrice = wholesalePrice;
    if (wholesaleThreshold !== undefined) product.wholesaleThreshold = wholesaleThreshold;
    if (stock !== undefined) product.stock = stock;
    if (cover !== undefined) product.cover = cover;
    if (images !== undefined) product.images = images;
    if (status !== undefined) product.status = status;
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (isRecommended !== undefined) product.isRecommended = isRecommended;

    await product.save();

    res.status(200).json({
      message: '商品更新成功',
      product
    });
  } catch (error) {
    console.error('更新商品失败:', error);
    res.status(500).json({
      message: '更新商品失败',
      error: error.message
    });
  }
});

/**
 * @api {delete} /admin/products/:id 删除商品
 * @apiDescription 删除商品(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 软删除：将状态设置为deleted
    product.status = 'deleted';
    // 删除的商品自动取消推荐状态
    product.isRecommended = false;
    await product.save();

    res.status(200).json({ message: '商品删除成功' });
  } catch (error) {
    console.error('删除商品失败:', error);
    res.status(500).json({
      message: '删除商品失败',
      error: error.message
    });
  }
});

/**
 * @api {put} /admin/products/:id/status 更新商品状态
 * @apiDescription 更新商品上下架状态(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['on_sale', 'off_sale'].includes(status)) {
      return res.status(400).json({ message: '无效的商品状态' });
    }

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    if (product.status === 'deleted') {
      return res.status(400).json({ message: '已删除的商品不能修改状态' });
    }

    product.status = status;

    // 如果下架商品，同时取消推荐状态
    if (status === 'off_sale' && product.isRecommended) {
      product.isRecommended = false;
    }

    await product.save();

    res.status(200).json({
      message: status === 'on_sale' ? '商品已上架' : '商品已下架',
      status
    });
  } catch (error) {
    console.error('更新商品状态失败:', error);
    res.status(500).json({
      message: '更新商品状态失败',
      error: error.message
    });
  }
});

/**
 * @api {post} /admin/products/batch 批量操作商品
 * @apiDescription 批量操作商品(上下架、删除)(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/batch', async (req, res) => {
  try {
    const { ids, action } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请选择要操作的商品' });
    }

    if (!['on_sale', 'off_sale', 'delete'].includes(action)) {
      return res.status(400).json({ message: '无效的操作类型' });
    }

    const status = action === 'delete' ? 'deleted' : action;

    // 更新对象
    const updateObj = { status };

    // 如果是删除操作或下架操作，同时取消推荐状态
    if (action === 'delete' || action === 'off_sale') {
      updateObj.isRecommended = false;
    }

    // 批量更新商品状态
    const result = await Product.update(
      updateObj,
      { where: { id: { [Op.in]: ids } } }
    );

    let message = '';
    switch (action) {
      case 'on_sale':
        message = '商品已批量上架';
        break;
      case 'off_sale':
        message = '商品已批量下架';
        break;
      case 'delete':
        message = '商品已批量删除';
        break;
    }

    res.status(200).json({
      message,
      affected: result[0]
    });
  } catch (error) {
    console.error('批量操作商品失败:', error);
    res.status(500).json({
      message: '批量操作商品失败',
      error: error.message
    });
  }
});

module.exports = router;
