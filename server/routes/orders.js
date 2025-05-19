const express = require('express');
const router = express.Router();
const { Order, OrderItem, Product, User, Commission } = require('../models');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// 获取用户订单列表
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, orderType } = req.query;

    // 使用中间件提供的分页参数获取方法
    const { page, size, offset } = req.getPaginationParams({
      pageName: 'page',
      sizeName: 'pageSize',
      defaultSize: 10
    });

    // 构建查询条件
    const where = { userId };
    if (status) {
      where.status = status;
    }
    if (orderType) {
      where.orderType = orderType;
    }

    // 获取订单总数
    const total = await Order.count({ where });

    // 获取订单列表
    const orders = await Order.findAll({
      where,
      attributes: [
        'id', 'orderNo', 'totalAmount', 'status',
        'paymentStatus', 'orderType', 'createdAt', 'updatedAt',
        'consignee', 'phone', 'address', 'remark'
      ],
      include: [
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              attributes: ['id', 'name', 'cover']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: size,
      offset: offset
    });

    // 使用分页中间件的paginate方法返回分页结果
    res.paginate(orders, {
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
    console.error('获取订单列表失败:', error);
    res.status(400).json({ message: '获取订单列表失败' });
  }
});



// 创建订单
router.post('/', async (req, res) => {
  // 开启事务
  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const {
      receiverName, receiverPhone, receiverAddress,
      products, remark, orderType = 'normal'
    } = req.body;

    // 验证必填字段
    if (!receiverName || !receiverPhone || !receiverAddress || !products || !products.length) {
      return res.status(400).json({ message: '订单信息不完整' });
    }

    // 生成订单号：时间戳 + 4位随机数
    const orderNo = `${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // 计算总金额并检查库存
    let totalAmount = 0;
    const productDetails = [];

    for (const item of products) {
      const product = await Product.findByPk(item.productId, { transaction: t });

      if (!product) {
        await t.rollback();
        return res.fail(`商品ID:${item.productId}不存在`);
      }

      if (product.status !== 'on_sale') {
        await t.rollback();
        return res.fail(`商品"${product.name}"已下架`);
      }

      if (product.stock < item.quantity) {
        await t.rollback();
        return res.fail(`商品"${product.name}"库存不足`);
      }

      totalAmount += product.price * item.quantity;

      productDetails.push({
        product,
        quantity: item.quantity
      });

      // 减库存
      product.stock -= item.quantity;
      // 增加销量
      product.sales += item.quantity;
      await product.save({ transaction: t });
    }

    // 创建订单
    const order = await Order.create(
      {
        orderNo,
        userId,
        totalAmount,
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        consignee: receiverName,
        phone: receiverPhone,
        address: receiverAddress,
        remark,
        orderType
      },
      { transaction: t }
    );

    // 创建订单项
    const orderItems = [];
    for (const detail of productDetails) {
      const item = await OrderItem.create(
        {
          orderId: order.id,
          productId: detail.product.id,
          productName: detail.product.name,
          productImage: detail.product.cover,
          quantity: detail.quantity,
          price: detail.product.price
        },
        { transaction: t }
      );
      orderItems.push(item);
    }

    // 提交事务
    await t.commit();

    res.status(200).json({
      ...order.toJSON(),
      orderItems
    });
  } catch (error) {
    // 回滚事务
    await t.rollback();
    console.error('创建订单失败:', error);
    res.status(400).json({ message: '创建订单失败' });
  }
});

// 取消订单
router.put('/:id/cancel', async (req, res) => {
  // 开启事务
  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;

    const order = await Order.findOne({
      where: {
        id: req.params.id,
        userId
      },
      include: [OrderItem],
      transaction: t
    });

    if (!order) {
      await t.rollback();
      return res.status(400).json({ message: '订单不存在' });
    }

    // 只有待支付状态的订单可以取消
    if (order.status !== 'pending_payment') {
      await t.rollback();
      return res.status(400).json({ message: '只有待支付的订单可以取消' });
    }

    // 更新订单状态
    order.status = 'cancelled';
    await order.save({ transaction: t });

    // 恢复库存和销量
    for (const item of order.OrderItems) {
      const product = await Product.findByPk(item.productId, { transaction: t });
      if (product) {
        product.stock += item.quantity;
        product.sales -= item.quantity;
        await product.save({ transaction: t });
      }
    }

    // 提交事务
    await t.commit();

    res.status(200).json({ message: '订单已取消' });
  } catch (error) {
    // 回滚事务
    await t.rollback();
    console.error('取消订单失败:', error);
    res.status(400).json({ message: '取消订单失败' });
  }
});

// 模拟支付完成
router.put('/:id/pay', async (req, res) => {
  // 开启事务
  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;

    const order = await Order.findOne({
      where: {
        id: req.params.id,
        userId,
        status: 'pending_payment'
      },
      transaction: t
    });

    if (!order) {
      await t.rollback();
      return res.status(400).json({ message: '订单不存在或状态不正确' });
    }

    // 更新订单状态
    order.status = 'pending_delivery';
    order.paymentStatus = 'paid';
    order.paymentMethod = 'wechat';
    order.paymentTime = new Date();
    order.transactionId = `wx_${uuidv4()}`;
    await order.save({ transaction: t });

    // 提交事务
    await t.commit();

    res.status(200).json({ message: '支付成功', order });
  } catch (error) {
    // 回滚事务
    await t.rollback();
    console.error('支付订单失败:', error);
    res.status(400).json({ message: '支付订单失败' });
  }
});

// 确认收货
router.put('/:id/complete', async (req, res) => {
  // 开启事务
  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;

    const order = await Order.findOne({
      where: {
        id: req.params.id,
        userId,
        status: 'delivered'
      },
      transaction: t
    });

    if (!order) {
      await t.rollback();
      return res.status(400).json({ message: '订单不存在或状态不正确' });
    }

    // 更新订单状态
    order.status = 'completed';
    order.completionTime = new Date();
    await order.save({ transaction: t });

    // 处理订单佣金
    // 1. 获取用户信息，查找邀请人
    const user = await User.findByPk(userId, { transaction: t });

    if (user && user.inviterId) {
      const inviterId = user.inviterId;

      // 2. 计算佣金金额（这里设置为订单总金额的5%）
      const commissionRate = 0.05;
      const commissionAmount = parseFloat(order.totalAmount) * commissionRate;

      // 3. 创建佣金记录
      await Commission.create({
        userId: inviterId,
        amount: commissionAmount,
        orderId: order.id,
        inviteeId: userId,
        status: 'settled'
      }, { transaction: t });

      // 4. 更新邀请人的佣金总额
      const inviter = await User.findByPk(inviterId, { transaction: t });
      inviter.commission = parseFloat(inviter.commission) + commissionAmount;
      await inviter.save({ transaction: t });
    }

    // 提交事务
    await t.commit();

    res.status(200).json({ message: '订单已完成', order });
  } catch (error) {
    // 回滚事务
    await t.rollback();
    console.error('确认收货失败:', error);
    res.status(400).json({ message: '确认收货失败' });
  }
});

// 管理员发货
router.put('/:id/ship', async (req, res) => {
  try {
    // 判断用户是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '没有权限' });
    }

    const order = await Order.findOne({
      where: {
        id: req.params.id,
        status: 'pending_delivery'
      }
    });

    if (!order) {
      return res.status(400).json({ message: '订单不存在或状态不正确' });
    }

    // 更新订单状态
    order.status = 'delivered';
    await order.save();

    res.status(200).json({ message: '订单已发货', order });
  } catch (error) {
    console.error('发货失败:', error);
    res.status(400).json({ message: '发货失败' });
  }
});

// 管理员获取所有订单（带筛选和分页）
router.get('/admin/list', async (req, res) => {
  try {
    // 判断用户是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '没有权限' });
    }

    const { status, userId, orderNo } = req.query;

    // 使用中间件提供的分页参数获取方法
    const { page, size, offset } = req.getPaginationParams({
      pageName: 'page',
      sizeName: 'pageSize',
      defaultSize: 10
    });

    // 构建查询条件
    const where = {};
    if (status) {
      where.status = status;
    }
    if (userId) {
      where.userId = userId;
    }
    if (orderNo) {
      where.orderNo = orderNo;
    }

    // 获取订单总数
    const total = await Order.count({ where });

    // 获取订单列表
    const orders = await Order.findAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'nickname', 'phone']
        },
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              attributes: ['id', 'name', 'cover']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: size,
      offset: offset
    });

    // 使用分页中间件的paginate方法返回分页结果
    res.paginate(orders, {
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
    console.error('获取订单列表失败:', error);
    res.status(400).json({ message: '获取订单列表失败' });
  }
});

// 获取订单统计信息
router.get('/stats', async (req, res) => {
  try {
    console.log(req.user)
    const userId = req.user.id;

    // 获取各状态订单数量
    const pendingPayment = await Order.count({
      where: { userId, status: 'pending_payment' }
    });

    const pendingDelivery = await Order.count({
      where: { userId, status: 'pending_delivery' }
    });

    const delivered = await Order.count({
      where: { userId, status: 'delivered' }
    });

    const completed = await Order.count({
      where: { userId, status: 'completed' }
    });

    res.status(200).json({
      pendingPayment,    // 待付款
      pendingDelivery,   // 待发货
      delivered,         // 待收货
      completed          // 已完成
    });
  } catch (error) {
    console.error('获取订单统计失败:', error);
    res.status(400).json({ message: '获取订单统计失败' });
  }
});



// 获取订单详情
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;

    const order = await Order.findOne({
      where: {
        id: req.params.id,
        userId
      },
      include: [
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              attributes: ['id', 'name', 'cover', 'price']
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(400).json({ message: '订单不存在' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(400).json({ message: '获取订单详情失败' });
  }
});

// 申请退款
router.post('/:id/refund', async (req, res) => {
  // 开启事务
  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { reason } = req.body;

    if (!reason) {
      await t.rollback();
      return res.status(400).json({ message: '请提供退款原因' });
    }

    const order = await Order.findOne({
      where: {
        id: req.params.id,
        userId
      },
      transaction: t
    });

    if (!order) {
      await t.rollback();
      return res.status(400).json({ message: '订单不存在' });
    }

    // 只有已支付且状态为待发货或已发货的订单可以申请退款
    if (order.paymentStatus !== 'paid') {
      await t.rollback();
      return res.status(400).json({ message: '订单未支付，无法申请退款' });
    }

    if (!['pending_delivery', 'delivered'].includes(order.status)) {
      await t.rollback();
      return res.status(400).json({ message: '当前订单状态不可申请退款' });
    }

    // 更新订单状态
    order.status = 'refund_pending';
    order.refundReason = reason;
    order.refundRequestTime = new Date();
    await order.save({ transaction: t });

    // 提交事务
    await t.commit();

    res.status(200).json({ message: '退款申请已提交', order });
  } catch (error) {
    // 回滚事务
    await t.rollback();
    console.error('申请退款失败:', error);
    res.status(400).json({ message: '申请退款失败' });
  }
});

// 管理员处理退款
router.put('/:id/refund', async (req, res) => {
  // 开启事务
  const t = await sequelize.transaction();

  try {
    // 判断用户是否为管理员
    if (req.user.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ message: '没有权限' });
    }

    const { status, remark } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      await t.rollback();
      return res.status(400).json({ message: '请提供有效的处理结果' });
    }

    const order = await Order.findOne({
      where: {
        id: req.params.id,
        status: 'refund_pending'
      },
      transaction: t
    });

    if (!order) {
      await t.rollback();
      return res.status(400).json({ message: '订单不存在或状态不正确' });
    }

    if (status === 'approved') {
      // 退款通过
      order.status = 'refund_approved';
      order.paymentStatus = 'refunded';
      order.refundApprovalTime = new Date();
      order.refundRemark = remark || '退款申请已通过';

      // 恢复库存和销量
      const orderItems = await OrderItem.findAll({
        where: { orderId: order.id },
        transaction: t
      });

      for (const item of orderItems) {
        const product = await Product.findByPk(item.productId, { transaction: t });
        if (product) {
          product.stock += item.quantity;
          product.sales -= item.quantity;
          await product.save({ transaction: t });
        }
      }
    } else {
      // 退款拒绝
      order.status = 'refund_rejected';
      order.refundApprovalTime = new Date();
      order.refundRemark = remark || '退款申请已拒绝';
    }

    await order.save({ transaction: t });

    // 提交事务
    await t.commit();

    res.status(200).json({ message: status === 'approved' ? '退款已通过' : '退款已拒绝', order });
  } catch (error) {
    // 回滚事务
    await t.rollback();
    console.error('处理退款失败:', error);
    res.status(400).json({ message: '处理退款失败' });
  }
});

module.exports = router;
