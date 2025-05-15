const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const OrderItem = require('../../models/OrderItem');
const User = require('../../models/User');
const Product = require('../../models/Product');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');

// 获取订单列表
router.get('/', async (req, res) => {
  try {
    // 使用中间件提供的分页参数获取方法，并指定参数名
    const { page, size, offset } = req.getPaginationParams({
      pageName: 'pageNum',
      sizeName: 'pageSize'
    });

    const {
      orderNo,
      status,
      paymentStatus,
      userId,
      startDate,
      endDate,
      orderType,
      sort = 'createdAt',
      order = 'DESC'
    } = req.query;

    // 构建查询条件
    const where = {};

    // 订单号查询
    if (orderNo) {
      where.orderNo = { [Op.like]: `%${orderNo}%` };
    }

    // 订单状态查询
    if (status) {
      where.status = status;
    }

    // 支付状态查询
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    // 用户ID查询
    if (userId) {
      where.userId = userId;
    }

    // 订单类型查询
    if (orderType) {
      where.orderType = orderType;
    }

    // 日期范围查询
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.createdAt = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      where.createdAt = {
        [Op.lte]: new Date(endDate)
      };
    }

    // 查询订单总数
    const total = await Order.count({ where });

    // 查询订单列表
    const orders = await Order.findAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'phone']
        },
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              attributes: ['id', 'name', 'cover', 'price']
            }
          ]
        }
      ],
      order: [[sort, order]],
      limit: size,
      offset: offset
    });

    // 构造前端需要的数据格式
    const formattedList = orders.map(order => {
      const orderData = order.toJSON();

      return {
        id: orderData.id,
        orderNo: orderData.orderNo,
        userId: orderData.userId,
        totalAmount: orderData.totalAmount,
        status: orderData.status,
        paymentStatus: orderData.paymentStatus,
        paymentMethod: orderData.paymentMethod,
        paymentTime: orderData.paymentTime,
        deliveryTime: orderData.deliveryTime,
        completionTime: orderData.completionTime,
        cancelTime: orderData.cancelTime,
        remark: orderData.remark,
        address: orderData.address,
        consignee: orderData.consignee,
        phone: orderData.phone,
        orderType: orderData.orderType,
        createdAt: orderData.createdAt,
        updatedAt: orderData.updatedAt,
        items: orderData.OrderItems ? orderData.OrderItems.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.Product ? item.Product.name : (item.productName || '未知商品'),
          price: item.price,
          quantity: item.quantity,
          totalAmount: item.price * item.quantity,
          productCover: item.Product ? item.Product.cover : item.productCover
        })) : []
      };
    });

    // 使用分页中间件的paginate方法返回分页结果
    res.paginate(formattedList, {
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
    console.error('获取订单列表失败:', error.message, error.stack);
    res.status(500).json({
      message: '获取订单列表失败',
      error: error.message
    });
  }
});

// 获取订单详情
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'name', 'phone']
        },
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

    // 构造前端需要的数据格式
    const orderData = order.toJSON();

    const formattedOrder = {
      id: orderData.id,
      orderNo: orderData.orderNo,
      userId: orderData.userId,
      totalAmount: orderData.totalAmount,
      status: orderData.status,
      paymentStatus: orderData.paymentStatus,
      paymentMethod: orderData.paymentMethod,
      paymentTime: orderData.paymentTime,
      deliveryTime: orderData.deliveryTime,
      completionTime: orderData.completionTime,
      cancelTime: orderData.cancelTime,
      remark: orderData.remark,
      address: orderData.address,
      consignee: orderData.consignee,
      phone: orderData.phone,
      orderType: orderData.orderType,
      createdAt: orderData.createdAt,
      updatedAt: orderData.updatedAt,
      items: orderData.OrderItems ? orderData.OrderItems.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.Product ? item.Product.name : (item.productName || '未知商品'),
        price: item.price,
        quantity: item.quantity,
        totalAmount: item.price * item.quantity,
        productCover: item.Product ? item.Product.cover : item.productCover
      })) : []
    };

    res.status(200).json(formattedOrder);
  } catch (error) {
    console.error('获取订单详情失败:', error.message, error.stack);
    res.status(400).json({ message: '获取订单详情失败', error: error.message });
  }
});

// 更新订单状态
router.put('/:id/status', async (req, res) => {
  try {
    const { status, remark } = req.body;

    if (!['pending_payment', 'pending_delivery', 'delivered', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: '无效的订单状态' });
    }

    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(400).json({ message: '订单不存在' });
    }

    // 检查订单状态变更的合法性
    if (order.status === 'cancelled') {
      return res.status(400).json({ message: '已取消的订单不能更改状态' });
    }

    if (order.status === 'completed' && status !== 'cancelled') {
      return res.status(400).json({ message: '已完成的订单不能更改状态' });
    }

    // 如果订单被取消，恢复库存
    if (status === 'cancelled' && order.status !== 'cancelled') {
      await order.cancel();
    } else {
      // 当状态变更为已付款，设置支付状态
      if (status === 'pending_delivery' && order.status === 'pending_payment') {
        order.paymentStatus = 'paid';

        // 设置支付时间
        if (!order.paymentTime) {
          order.paymentTime = new Date();
        }
      }

      // 当状态变更为已发货，设置发货时间
      if (status === 'delivered' && order.status !== 'delivered') {
        order.deliveryTime = new Date();
      }

      // 当状态变更为已完成，设置完成时间
      if (status === 'completed' && order.status !== 'completed') {
        order.completionTime = new Date();
      }

      // 更新订单状态
      order.status = status;
      if (remark !== undefined) {
        order.remark = remark;
      }

      await order.save();
    }

    let message = '';
    switch (status) {
      case 'pending_payment':
        message = '订单已标记为待付款';
        break;
      case 'pending_delivery':
        message = '订单已标记为待发货';
        break;
      case 'delivered':
        message = '订单已标记为已发货';
        break;
      case 'completed':
        message = '订单已标记为已完成';
        break;
      case 'cancelled':
        message = '订单已取消';
        break;
      default:
        message = '订单状态已更新';
    }

    res.status(200).json({
      message,
      status,
      paymentStatus: order.paymentStatus
    });
  } catch (error) {
    console.error('更新订单状态失败:', error.message, error.stack);
    res.status(400).json({ message: '更新订单状态失败', error: error.message });
  }
});

// 更新订单备注
router.put('/:id/remark', async (req, res) => {
  try {
    const { remark } = req.body;

    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(400).json({ message: '订单不存在' });
    }

    order.remark = remark;
    await order.save();

    res.status(200).json({
      message: '订单备注已更新',
      remark
    });
  } catch (error) {
    console.error('更新订单备注失败:', error.message, error.stack);
    res.status(400).json({ message: '更新订单备注失败', error: error.message });
  }
});

// 订单发货
router.put('/:id/ship', async (req, res) => {
  try {
    const { trackingNo, trackingCompany } = req.body;

    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(400).json({ message: '订单不存在' });
    }

    if (order.status !== 'pending_delivery') {
      return res.status(400).json({ message: '只有待发货的订单可以执行发货操作' });
    }

    // 更新订单状态为已发货
    order.status = 'delivered';
    order.deliveryTime = new Date();

    // 如果系统支持物流追踪，可以添加相关字段
    // 可以在Order模型中添加trackingNo和trackingCompany字段

    await order.save();

    res.status(200).json({
      message: '订单已发货',
      status: 'delivered'
    });
  } catch (error) {
    console.error('订单发货失败:', error.message, error.stack);
    res.status(400).json({ message: '订单发货失败', error: error.message });
  }
});

// 删除订单（软删除或仅供测试环境使用）
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(400).json({ message: '订单不存在' });
    }

    // 考虑实现软删除，而不是直接从数据库删除
    // 如果需要实现软删除，可以在Order模型中添加deletedAt字段
    await order.destroy();

    res.status(200).json({
      message: '订单已删除'
    });
  } catch (error) {
    console.error('删除订单失败:', error.message, error.stack);
    res.status(400).json({ message: '删除订单失败', error: error.message });
  }
});

module.exports = router;
