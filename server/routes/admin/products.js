const express = require('express');
const router = express.Router();
const { Product, Category, AdminUser } = require('../../models');
const { Op } = require('sequelize');
const adminAuth = require('../../middleware/adminAuth');
const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');

// 配置multer用于文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持Excel文件格式(.xlsx, .xls)'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/**
 * @api {get} /admin/products 获取商品列表
 * @apiDescription 获取商品列表(管理员查看所有商品，商家只能查看自己的商品)
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
router.get('/', adminAuth, async (req, res) => {
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

    // 商家用户只能查看自己的商品
    if (req.adminRole === 'user') {
      where.merchantId = req.adminId;
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
        },
        {
          model: AdminUser,
          as: 'merchant',
          attributes: ['id', 'username', 'name']
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
 * @apiDescription 获取商品详情(管理员和商品所属商家)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          attributes: ['id', 'name']
        },
        {
          model: AdminUser,
          as: 'merchant',
          attributes: ['id', 'username', 'name']
        }
      ]
    });

    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 商家只能查看自己的商品
    if (req.adminRole === 'user' && product.merchantId !== req.adminId) {
      return res.status(403).json({ message: '无权查看该商品' });
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
 * @apiDescription 创建新商品(管理员创建任意商品，商家创建自己的商品)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      name, description, price, originalPrice, wholesalePrice, wholesaleThreshold, vipPrice,
      stock, cover, images, status, categoryId, isRecommended, merchantId
    } = req.body;

    // 验证必填字段
    if (!name || !price) {
      return res.status(400).json({ message: '商品名称和价格不能为空' });
    }

    // 确定商品所属的商家ID
    let finalMerchantId;
    if (req.adminRole === 'admin') {
      // 管理员可以指定商品所属商家
      finalMerchantId = merchantId || req.adminId;
    } else {
      // 商家只能创建属于自己的商品
      finalMerchantId = req.adminId;
    }

    // 创建商品
    const product = await Product.create({
      name,
      description,
      price,
      originalPrice,
      wholesalePrice,
      wholesaleThreshold,
      vipPrice,
      stock: stock || 0,
      cover,
      images,
      status: status || 'off_sale',
      categoryId,
      merchantId: finalMerchantId,
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
 * @apiDescription 更新商品信息(管理员可更新任意商品，商家只能更新自己的商品)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const {
      name, description, price, originalPrice, wholesalePrice, wholesaleThreshold, vipPrice,
      stock, cover, images, status, categoryId, isRecommended, merchantId
    } = req.body;

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 商家只能更新自己的商品
    if (req.adminRole === 'user' && product.merchantId !== req.adminId) {
      return res.status(403).json({ message: '无权更新该商品' });
    }

    // 更新商品信息
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (originalPrice !== undefined) product.originalPrice = originalPrice;
    if (wholesalePrice !== undefined) product.wholesalePrice = wholesalePrice;
    if (wholesaleThreshold !== undefined) product.wholesaleThreshold = wholesaleThreshold;
    if (vipPrice !== undefined) product.vipPrice = vipPrice;
    if (stock !== undefined) product.stock = stock;
    if (cover !== undefined) product.cover = cover;
    if (images !== undefined) product.images = images;
    if (status !== undefined) product.status = status;
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (isRecommended !== undefined) product.isRecommended = isRecommended;

    // 只有管理员可以修改商品所属商家
    if (req.adminRole === 'admin' && merchantId !== undefined) {
      product.merchantId = merchantId;
    }

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
 * @apiDescription 删除商品(管理员可删除任意商品，商家只能删除自己的商品)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 商家只能删除自己的商品
    if (req.adminRole === 'user' && product.merchantId !== req.adminId) {
      return res.status(403).json({ message: '无权删除该商品' });
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
 * @apiDescription 更新商品上下架状态(管理员可更新任意商品，商家只能更新自己的商品)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['on_sale', 'off_sale'].includes(status)) {
      return res.status(400).json({ message: '无效的商品状态' });
    }

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 商家只能更新自己的商品
    if (req.adminRole === 'user' && product.merchantId !== req.adminId) {
      return res.status(403).json({ message: '无权更新该商品' });
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
 * @apiDescription 批量操作商品(上下架、删除)(管理员可操作任意商品，商家只能操作自己的商品)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/batch', adminAuth, async (req, res) => {
  try {
    const { ids, action } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请选择要操作的商品' });
    }

    if (!['on_sale', 'off_sale', 'delete'].includes(action)) {
      return res.status(400).json({ message: '无效的操作类型' });
    }

    // 如果是商家用户，需要验证所有商品都属于该商家
    if (req.adminRole === 'user') {
      const products = await Product.findAll({
        where: { id: { [Op.in]: ids } }
      });

      const hasUnauthorizedProduct = products.some(product => product.merchantId !== req.adminId);
      if (hasUnauthorizedProduct) {
        return res.status(403).json({ message: '您选择的商品中包含无权操作的商品' });
      }
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

/**
 * @api {get} /admin/products/template/download 下载商品导入模板
 * @apiDescription 下载Excel格式的商品导入模板
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/template/download', adminAuth, async (req, res) => {
  try {
    // 获取分类列表用于填充分类选项
    const categories = await Category.findAll({
      attributes: ['id', 'name'],
      where: { status: 'active' }
    });

    // 创建模板数据
    const templateData = [
      {
        '商品名称*': '示例商品名称',
        '商品描述': '这是一个示例商品的详细描述',
        '商品价格*': 99.99,
        '原价': 120.00,
        '批发价格*': 85.00,
        '批发阈值*': 10,
        'VIP价格*': 89.99,
        '库存数量*': 100,
        '分类ID*': categories.length > 0 ? categories[0].id : 1,
        '商品状态*': 'off_sale',
        '是否推荐': 'false',
        '封面图URL': 'https://example.com/cover.jpg',
        '商品图片URLs': 'https://example.com/1.jpg,https://example.com/2.jpg'
      },
      {
        '商品名称*': '请在此行开始填写实际数据',
        '商品描述': '商品的详细介绍，可选填',
        '商品价格*': '',
        '原价': '',
        '批发价格*': '',
        '批发阈值*': '',
        'VIP价格*': '',
        '库存数量*': '',
        '分类ID*': '',
        '商品状态*': '',
        '是否推荐': '',
        '封面图URL': '',
        '商品图片URLs': ''
      }
    ];

    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 创建商品数据工作表
    const ws = XLSX.utils.json_to_sheet(templateData);

    // 设置列宽
    const colWidths = [
      { wch: 20 }, // 商品名称
      { wch: 30 }, // 商品描述
      { wch: 12 }, // 商品价格
      { wch: 10 }, // 原价
      { wch: 12 }, // 批发价格
      { wch: 12 }, // 批发阈值
      { wch: 12 }, // VIP价格
      { wch: 12 }, // 库存数量
      { wch: 10 }, // 分类ID
      { wch: 12 }, // 商品状态
      { wch: 10 }, // 是否推荐
      { wch: 25 }, // 封面图URL
      { wch: 40 }  // 商品图片URLs
    ];
    ws['!cols'] = colWidths;

    // 添加商品数据工作表
    XLSX.utils.book_append_sheet(wb, ws, '商品数据');

    // 创建分类参考工作表
    if (categories.length > 0) {
      const categoryData = categories.map(cat => ({
        '分类ID': cat.id,
        '分类名称': cat.name
      }));
      const categoryWs = XLSX.utils.json_to_sheet(categoryData);
      categoryWs['!cols'] = [{ wch: 10 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, categoryWs, '分类参考');
    }

    // 创建填写说明工作表
    const instructionData = [
      { '字段名': '商品名称*', '说明': '必填，商品的名称', '示例': '苹果手机' },
      { '字段名': '商品描述', '说明': '可选，商品的详细描述', '示例': '最新款苹果手机，性能强劲' },
      { '字段名': '商品价格*', '说明': '必填，商品的销售价格，数字格式', '示例': '5999.00' },
      { '字段名': '原价', '说明': '可选，商品的原价，数字格式', '示例': '6999.00' },
      { '字段名': '批发价格*', '说明': '必填，批发价格，数字格式', '示例': '5500.00' },
      { '字段名': '批发阈值*', '说明': '必填，达到此数量可享批发价，整数', '示例': '10' },
      { '字段名': 'VIP价格*', '说明': '必填，VIP会员价格，数字格式', '示例': '5799.00' },
      { '字段名': '库存数量*', '说明': '必填，商品库存数量，整数', '示例': '100' },
      { '字段名': '分类ID*', '说明': '必填，商品分类ID，参考分类参考表', '示例': '1' },
      { '字段名': '商品状态*', '说明': '必填，on_sale(上架)或off_sale(下架)', '示例': 'off_sale' },
      { '字段名': '是否推荐', '说明': '可选，true或false', '示例': 'false' },
      { '字段名': '封面图URL', '说明': '可选，商品封面图链接', '示例': 'https://example.com/cover.jpg' },
      { '字段名': '商品图片URLs', '说明': '可选，多张图片用英文逗号分隔', '示例': 'url1.jpg,url2.jpg' }
    ];

    const instructionWs = XLSX.utils.json_to_sheet(instructionData);
    instructionWs['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, instructionWs, '填写说明');

    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="product_template.xlsx"; filename*=UTF-8\'\'%E5%95%86%E5%93%81%E5%AF%BC%E5%85%A5%E6%A8%A1%E6%9D%BF.xlsx');

    res.send(excelBuffer);
  } catch (error) {
    console.error('下载模板失败:', error);
    res.status(500).json({
      message: '下载模板失败',
      error: error.message
    });
  }
});

/**
 * @api {post} /admin/products/import/excel Excel批量导入商品
 * @apiDescription 通过Excel文件批量导入商品
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/import/excel', adminAuth, upload.single('file'), async (req, res) => {
  try {
    console.log('开始Excel导入，用户ID:', req.adminId, '用户角色:', req.adminRole);

    if (!req.file) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '请选择要上传的Excel文件'
      });
    }

    console.log('接收到文件:', req.file.originalname, '大小:', req.file.size);

    // 读取Excel文件
    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0]; // 使用第一个工作表
    const worksheet = workbook.Sheets[sheetName];

    // 将Excel数据转换为JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log('解析到的数据行数:', rawData.length);

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: 'Excel文件中没有数据'
      });
    }

    // 验证和转换数据
    const products = [];
    const errors = [];

    // 确定商品所属的商家ID
    let merchantId;
    if (req.adminRole === 'admin') {
      merchantId = req.adminId; // 管理员默认设为自己，也可以支持指定
    } else {
      merchantId = req.adminId; // 商家只能创建属于自己的商品
    }

    console.log('商品将分配给商家ID:', merchantId);

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowIndex = i + 2; // Excel行号（从第2行开始，第1行是标题）

      try {
        // 跳过示例行和空行
        if (!row['商品名称*'] ||
            row['商品名称*'] === '示例商品名称' ||
            row['商品名称*'] === '请在此行开始填写实际数据') {
          console.log(`跳过第${rowIndex}行: 示例或空行`);
          continue;
        }

        // 验证必填字段
        const requiredFields = [
          { field: '商品名称*', value: row['商品名称*'] },
          { field: '商品价格*', value: row['商品价格*'] },
          { field: '批发价格*', value: row['批发价格*'] },
          { field: '批发阈值*', value: row['批发阈值*'] },
          { field: 'VIP价格*', value: row['VIP价格*'] },
          { field: '库存数量*', value: row['库存数量*'] },
          { field: '分类ID*', value: row['分类ID*'] },
          { field: '商品状态*', value: row['商品状态*'] }
        ];

        let hasRequiredFieldError = false;
        for (const { field, value } of requiredFields) {
          if (!value && value !== 0) {
            errors.push(`第${rowIndex}行：${field}为必填项`);
            hasRequiredFieldError = true;
          }
        }

        if (hasRequiredFieldError) {
          continue;
        }

        // 验证数字字段
        const price = parseFloat(row['商品价格*']);
        const wholesalePrice = parseFloat(row['批发价格*']);
        const vipPrice = parseFloat(row['VIP价格*']);
        const stock = parseInt(row['库存数量*']);
        const wholesaleThreshold = parseInt(row['批发阈值*']);
        const categoryId = parseInt(row['分类ID*']);

        // 数字验证
        const numberValidations = [
          { value: price, name: '商品价格', condition: isNaN(price) || price <= 0 },
          { value: wholesalePrice, name: '批发价格', condition: isNaN(wholesalePrice) || wholesalePrice <= 0 },
          { value: vipPrice, name: 'VIP价格', condition: isNaN(vipPrice) || vipPrice <= 0 },
          { value: stock, name: '库存数量', condition: isNaN(stock) || stock < 0 },
          { value: wholesaleThreshold, name: '批发阈值', condition: isNaN(wholesaleThreshold) || wholesaleThreshold <= 0 },
          { value: categoryId, name: '分类ID', condition: isNaN(categoryId) }
        ];

        let hasNumberError = false;
        for (const { name, condition } of numberValidations) {
          if (condition) {
            errors.push(`第${rowIndex}行：${name}格式不正确`);
            hasNumberError = true;
          }
        }

        if (hasNumberError) {
          continue;
        }

        // 验证商品状态
        const status = row['商品状态*'];
        if (!['on_sale', 'off_sale'].includes(status)) {
          errors.push(`第${rowIndex}行：商品状态只能是on_sale或off_sale`);
          continue;
        }

        // 验证是否推荐
        let isRecommended = false;
        if (row['是否推荐']) {
          const recommendedStr = String(row['是否推荐']).toLowerCase();
          if (recommendedStr === 'true') {
            isRecommended = true;
          } else if (recommendedStr === 'false') {
            isRecommended = false;
          } else {
            errors.push(`第${rowIndex}行：是否推荐只能是true或false`);
            continue;
          }
        }

        // 处理图片URLs
        let images = [];
        if (row['商品图片URLs']) {
          images = row['商品图片URLs'].split(',').map(url => url.trim()).filter(url => url);
        }

        // 处理原价
        let originalPrice = null;
        if (row['原价']) {
          originalPrice = parseFloat(row['原价']);
          if (isNaN(originalPrice)) {
            errors.push(`第${rowIndex}行：原价格式不正确`);
            continue;
          }
        }

        // 构建商品对象
        const productData = {
          name: row['商品名称*'],
          description: row['商品描述'] || '',
          price: price,
          originalPrice: originalPrice,
          wholesalePrice: wholesalePrice,
          wholesaleThreshold: wholesaleThreshold,
          vipPrice: vipPrice,
          stock: stock,
          categoryId: categoryId,
          status: status,
          isRecommended: isRecommended,
          cover: row['封面图URL'] || '',
          images: images,
          merchantId: merchantId
        };

        products.push(productData);
        console.log(`第${rowIndex}行数据验证通过:`, productData.name);

      } catch (error) {
        console.error(`第${rowIndex}行处理错误:`, error);
        errors.push(`第${rowIndex}行：数据处理错误 - ${error.message}`);
      }
    }

    console.log('验证完成，有效商品数量:', products.length, '错误数量:', errors.length);

    // 如果有错误，返回错误信息
    if (errors.length > 0) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: '数据验证失败',
        errors: errors.slice(0, 20), // 最多返回20个错误
        totalErrors: errors.length
      });
    }

    if (products.length === 0) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: 'Excel中没有有效的商品数据'
      });
    }

    // 批量创建商品
    console.log('开始批量创建商品...');
    const createdProducts = await Product.bulkCreate(products, {
      validate: true,
      returning: true
    });

    console.log('商品创建成功，数量:', createdProducts.length);

    res.status(200).json({
      code: 0,
      success: true,
      message: '批量导入成功',
      data: {
        successCount: createdProducts.length,
        totalCount: rawData.length,
        products: createdProducts
      }
    });

  } catch (error) {
    console.error('Excel导入失败:', error);
    res.status(500).json({
      code: 500,
      success: false,
      message: 'Excel导入失败',
      error: error.message
    });
  }
});

module.exports = router;
