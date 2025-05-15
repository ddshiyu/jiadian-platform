const express = require('express');
const router = express.Router();
const { Product, Category, Order, OrderItem, Address } = require('../models');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const WxPay = require('wechatpay-node-v3');
const fs = require('fs');
const sequelize = require('../config/database');

// 获取商品列表（带分页和搜索）
router.get('/', async (req, res) => {
  try {
    // 使用中间件提供的分页参数获取方法
    const { page, size, offset } = req.getPaginationParams({
      pageName: 'page',
      sizeName: 'pageSize',
      defaultSize: 10
    });

    const {
      keyword,
      categoryId,
      isRecommended,
      minPrice,
      maxPrice,
      sort = 'createdAt',
      order = 'DESC'
    } = req.query;

    // 构建查询条件
    const where = {};

    // 关键词搜索 - 支持多字段模糊搜索
    if (keyword) {
      const searchKeyword = `%${keyword}%`;
      where[Op.or] = [
        { name: { [Op.like]: searchKeyword } },
        { description: { [Op.like]: searchKeyword } }
      ];
    }

    // 分类筛选
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // 推荐商品筛选
    if (isRecommended === 'true') {
      where.isRecommended = true;
    }

    // 价格区间筛选
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    // 默认只显示在售商品
    where.status = 'on_sale';

    // 查询商品总数
    const total = await Product.count({ where });

    // 获取商品列表
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
        current: page,
        pageSize: size,
        totalPages: Math.ceil(total / size)  // 总页数
      }
    });
  } catch (error) {
    console.error('获取商品列表失败:', error);
    res.status(400).json({ message: '获取商品列表失败' });
  }
});

// 添加专门的商品搜索路由 - 适配小程序调用方式
// 注意：必须放在 /:id 路由之前，避免路由冲突
router.get('/search', async (req, res) => {
  try {
    // 使用中间件提供的分页参数获取方法
    const { page, size, offset } = req.getPaginationParams({
      pageName: 'page',
      sizeName: 'pageSize',
      defaultSize: 10
    });

    const {
      keyword,
      categoryId,
      isRecommended,
      minPrice,
      maxPrice,
      sort = 'createdAt',
      order = 'DESC'
    } = req.query;

    console.log('搜索关键词:', keyword); // 调试日志

    // 构建查询条件
    const where = {};

    // 关键词搜索 - 支持多字段模糊搜索
    if (keyword) {
      const searchKeyword = `%${decodeURIComponent(keyword)}%`;
      where[Op.or] = [
        { name: { [Op.like]: searchKeyword } },
        { description: { [Op.like]: searchKeyword } }
      ];
    }

    // 分类筛选
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // 推荐商品筛选
    if (isRecommended === 'true') {
      where.isRecommended = true;
    }

    // 价格区间筛选
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    // 默认只显示在售商品
    where.status = 'on_sale';

    console.log('查询条件:', JSON.stringify(where)); // 调试日志

    // 查询商品总数
    const total = await Product.count({ where });

    // 获取商品列表
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

    console.log(`搜索到 ${products.length} 个结果`); // 调试日志

    // 使用分页中间件的paginate方法返回分页结果
    res.paginate(products, {
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
    console.error('搜索商品失败:', error);
    res.status(500).json({ message: '搜索商品失败' });
  }
});

// 获取商品详情
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
      return res.status(400).json({ message: '商品不存在' });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('获取商品详情失败:', error);
    res.status(400).json({ message: '获取商品详情失败' });
  }
});

// 创建商品（需要管理员权限）
router.post('/', auth, async (req, res) => {
  try {
    // 判断用户是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '没有权限' });
    }

    const {
      name, description, price, originalPrice,
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
      stock: stock || 0,
      cover,
      images,
      status: status || 'off_sale',
      categoryId,
      isRecommended: isRecommended || false
    });

    res.status(200).json(product);
  } catch (error) {
    console.error('创建商品失败:', error);
    res.status(400).json({ message: '创建商品失败' });
  }
});

// 更新商品（需要管理员权限）
router.put('/:id', auth, async (req, res) => {
  try {
    // 判断用户是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '没有权限' });
    }

    const {
      name, description, price, originalPrice,
      stock, cover, images, status, categoryId, isRecommended
    } = req.body;

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(400).json({ message: '商品不存在' });
    }

    // 更新商品信息
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (originalPrice !== undefined) product.originalPrice = originalPrice;
    if (stock !== undefined) product.stock = stock;
    if (cover !== undefined) product.cover = cover;
    if (images !== undefined) product.images = images;
    if (status !== undefined) product.status = status;
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (isRecommended !== undefined) product.isRecommended = isRecommended;

    await product.save();
    res.status(200).json(product);
  } catch (error) {
    console.error('更新商品失败:', error);
    res.status(400).json({ message: '更新商品失败' });
  }
});

// 设置/取消热门推荐状态（需要管理员权限）
router.put('/:id/recommend', auth, async (req, res) => {
  try {
    // 判断用户是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '没有权限' });
    }

    const { isRecommended } = req.body;

    if (isRecommended === undefined) {
      return res.status(400).json({ message: '请指定推荐状态' });
    }

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(400).json({ message: '商品不存在' });
    }

    // 只有在售商品可以设为推荐
    if (isRecommended && product.status !== 'on_sale') {
      return res.status(400).json({ message: '只有在售商品可以设为推荐' });
    }

    product.isRecommended = isRecommended;
    await product.save();

    res.status(200).json({
      message: isRecommended ? '商品已设为热门推荐' : '商品已取消热门推荐',
      product
    });
  } catch (error) {
    console.error('更新推荐状态失败:', error);
    res.status(400).json({ message: '更新推荐状态失败' });
  }
});

// 删除商品（需要管理员权限）
router.delete('/:id', auth, async (req, res) => {
  try {
    // 判断用户是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '没有权限' });
    }

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(400).json({ message: '商品不存在' });
    }

    // 软删除：将状态设置为deleted
    product.status = 'deleted';
    product.isRecommended = false; // 删除的商品取消推荐状态
    await product.save();

    res.status(200).json({ message: '删除成功' });
  } catch (error) {
    console.error('删除商品失败:', error);
    res.status(400).json({ message: '删除商品失败' });
  }
});

// 微信支付实例，放在路由外部全局定义，避免重复创建
const pay = new WxPay({
  appid: process.env.WECHAT_APPID,
  mchid: process.env.WECHAT_MCHID,
  publicKey: fs.readFileSync(__dirname + '/../wxpay_pem/apiclient_cert.pem'), // 公钥
  privateKey: fs.readFileSync(__dirname + '/../wxpay_pem/apiclient_key.pem'), // 秘钥
});

// 创建预订单
router.post('/pre-order', auth, async (req, res) => {
  // 开启事务
  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { productId, quantity = 1, addressId } = req.body;

    if (!productId) {
      await t.rollback();
      return res.status(400).json({ message: '商品ID不能为空' });
    }

    if (!addressId) {
      await t.rollback();
      return res.status(400).json({ message: '地址ID不能为空' });
    }

    // 查询地址信息
    const address = await Address.findOne({
      where: {
        id: addressId,
        userId: userId
      },
      transaction: t
    });

    if (!address) {
      await t.rollback();
      return res.status(404).json({ message: '收货地址不存在' });
    }

    // 检查商品是否存在
    const product = await Product.findByPk(productId, { transaction: t });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ message: '商品不存在' });
    }

    // 检查商品是否在售
    if (product.status !== 'on_sale') {
      await t.rollback();
      return res.status(400).json({ message: '商品已下架' });
    }

    // 检查库存是否足够
    if (product.stock < quantity) {
      await t.rollback();
      return res.status(400).json({ message: '库存不足' });
    }

    // 生成订单号：时间戳 + 4位随机数
    const orderNo = `${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // 计算订单金额
    const totalAmount = product.price * quantity;

    // 创建订单
    const order = await Order.create({
      orderNo,
      userId,
      totalAmount,
      status: 'pending_payment',
      paymentStatus: 'unpaid',
      consignee: address.name,
      phone: address.phone,
      address: `${address.province}${address.city}${address.district}${address.detail}`,
      remark: req.body.remark || ''
    }, { transaction: t });

    // 创建订单项
    await OrderItem.create({
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      productImage: product.cover,
      quantity,
      price: product.price
    }, { transaction: t });

    // 减库存
    product.stock -= quantity;
    await product.save({ transaction: t });

    // 提交事务
    await t.commit();

    // 返回预订单信息
    res.status(200).json({
      success: true,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
      },
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        cover: product.cover
      }
    });
  } catch (error) {
    // 回滚事务
    await t.rollback();
    console.error('创建预订单失败:', error);
    res.status(400).json({ message: '创建预订单失败', error: error.message });
  }
});

// 购买商品 - 调用微信支付
router.post('/buy', auth, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: '订单ID不能为空' });
    }

    // 查找订单
    const order = await Order.findOne({
      where: {
        id: orderId,
        userId: req.user.id,
        status: 'pending_payment'
      },
      include: [{
        model: OrderItem,
        include: [{
          model: Product,
          attributes: ['id', 'name']
        }]
      }]
    });

    if (!order) {
      return res.status(404).json({ message: '订单不存在或状态不正确' });
    }

    // 构建微信支付参数
    const params = {
      description: `购买商品: ${order.OrderItems[0]?.productName || '未知商品'}`,
      out_trade_no: order.orderNo,
      notify_url: `${process.env.DOMAIN || process.env.WECHAT_SUCCESSCALLBACK || 'http://localhost:3000'}/products/notify`,
      amount: {
        total: Math.floor(order.totalAmount * 100), // 单位为分
      },
      payer: {
        openid: req.user.openid, // 从用户认证信息中获取
      }
    };

    // 调用微信支付JSAPI下单
    const payResult = await pay.transactions_jsapi(params);
    console.log(payResult);
    // 返回支付参数给客户端
    res.status(200).json({
      success: true,
      payParams: payResult?.data ? payResult.data : payResult,
      orderInfo: {
        orderId: order.id,
        orderNo: order.orderNo,
        totalAmount: order.totalAmount
      }
    });
  } catch (error) {
    console.error('微信支付下单失败:', error);
    res.status(400).json({ message: '微信支付下单失败', error: error.message });
  }
});

// 微信支付回调接口
router.post('/notify', async (req, res) => {
  try {
    // 验证签名
    const signature = req.headers['wechatpay-signature'];
    const timestamp = req.headers['wechatpay-timestamp'];
    const nonce = req.headers['wechatpay-nonce'];
    const serial = req.headers['wechatpay-serial'];
    const body = req.body;

    // 验证签名 - 根据微信支付文档实现
    // const isValid = pay.verifySign(timestamp, nonce, body, signature, serial);
    // if (!isValid) {
    //   return res.status(401).json({ code: 'FAIL', message: '签名验证失败' });
    // }

    // 解密回调数据
    if (body.resource && body.resource.ciphertext) {
      const { ciphertext, associated_data, nonce } = body.resource;
      const result = pay.decipher_gcm(ciphertext, associated_data, nonce, process.env.WECHAT_APIV3SECRET);

      console.log('支付回调解密结果:', result);
      console.log(result)
      // 处理支付结果
      if (result && result.out_trade_no && result.trade_state === 'SUCCESS') {
        // 开启事务
        const t = await sequelize.transaction();

        try {
          // 查找订单
          const order = await Order.findOne({
            where: { orderNo: result.out_trade_no },
            transaction: t
          });
          console.log(order)
          if (order) {
            // 更新订单状态为已支付
            order.status = 'pending_delivery';
            order.paymentStatus = 'paid';
            order.paymentMethod = 'wechat';
            order.paymentTime = new Date();
            order.transactionId = result.transaction_id;

            await order.save({ transaction: t });

            // 提交事务
            await t.commit();

            console.log(`订单 ${result.out_trade_no} 支付成功已更新`);
          } else {
            console.error(`未找到订单: ${result.out_trade_no}`);
            await t.rollback();
          }
        } catch (error) {
          // 回滚事务
          await t.rollback();
          console.error('更新订单状态失败:', error);
        }

        // 返回成功处理的响应
        return res.status(200).json({ code: 'SUCCESS', message: '成功' });
      }
    }

    res.status(200).json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('处理支付回调失败:', error);
    res.status(500).json({ code: 'FAIL', message: '处理失败' });
  }
})

module.exports = router;
