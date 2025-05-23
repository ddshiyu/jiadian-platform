const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const OrderItem = require('../../models/OrderItem');
const User = require('../../models/User');
const Product = require('../../models/Product');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const fs = require('fs');
const WxPay = require('wechatpay-node-v3');
const adminAuth = require('../../middleware/adminAuth');
// 微信支付实例，放在路由外部全局定义，避免重复创建
const pay = new WxPay({
  appid: process.env.WECHAT_APPID,
  mchid: process.env.WECHAT_MCHID,
  publicKey: fs.readFileSync(__dirname + '/../../wxpay_pem/apiclient_cert.pem'), // 公钥
  privateKey: fs.readFileSync(__dirname + '/../../wxpay_pem/apiclient_key.pem'), // 秘钥
});


// 获取订单列表
router.get('/', adminAuth, async (req, res) => {
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

    // 商家用户只能查看自己的订单
    if (req.adminRole === 'user') {
      where.merchantId = req.adminId;
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
        merchantId: orderData.merchantId,
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

// 获取退款订单列表
router.get('/refunds', adminAuth, async (req, res) => {
  try {
    // 使用中间件提供的分页参数获取方法
    const { page, size, offset } = req.getPaginationParams({
      pageName: 'pageNum',
      sizeName: 'pageSize'
    });

    // 构建基础查询条件 - 只查询退款相关的订单
    const where = {
      status: {
        [Op.in]: ['refund_pending', 'refund_approved', 'refund_rejected']
      }
    };

    // 商家用户只能查看自己的退款订单
    if (req.adminRole === 'user') {
      where.merchantId = req.adminId;
    }

    // 根据查询参数添加过滤条件
    const { orderNo, userName, status } = req.query;

    // 订单号查询
    if (orderNo && orderNo.trim()) {
      where.orderNo = { [Op.like]: `%${orderNo.trim()}%` };
    }

    // 用户名查询
    let userInclude = {
      model: User,
      attributes: ['id', 'nickname', 'phone'],
      required: false
    };

    if (userName && userName.trim()) {
      userInclude.required = true;
      userInclude.where = {
        nickname: { [Op.like]: `%${userName.trim()}%` }
      };
    }

    // 退款状态查询
    if (status && ['refund_pending', 'refund_approved', 'refund_rejected'].includes(status)) {
      where.status = status;
    }

    // 获取订单列表
    const orders = await Order.findAll({
      where,
      include: [
        userInclude,
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
      order: [['refundRequestTime', 'DESC']],
      limit: size,
      offset: offset
    });

    // 获取总数
    const total = await Order.count({
      where,
      include: [userInclude]
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
        refundReason: orderData.refundReason,
        refundRequestTime: orderData.refundRequestTime,
        refundApprovalTime: orderData.refundApprovalTime,
        refundRemark: orderData.refundRemark,
        consignee: orderData.consignee,
        phone: orderData.phone,
        createdAt: orderData.createdAt,
        user: orderData.User ? {
          id: orderData.User.id,
          nickname: orderData.User.nickname,
          phone: orderData.User.phone
        } : null,
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
      removeDefaults: true,
      custom: {
        pageNum: page,
        pageSize: size,
        totalPages: Math.ceil(total / size)
      }
    });
  } catch (error) {
    console.error('获取退款订单列表失败:', error.message, error.stack);
    res.status(500).json({
      message: '获取退款订单列表失败',
      error: error.message
    });
  }
});

// 获取订单详情
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
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
              attributes: ['id', 'name', 'cover', 'price']
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    // 商家只能查看自己的订单
    if (req.adminRole === 'user' && order.merchantId !== req.adminId) {
      return res.status(403).json({ message: '无权查看该订单' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({
      message: '获取订单详情失败',
      error: error.message
    });
  }
});

// 更新订单状态
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, remark } = req.body;

    if (!['pending_payment', 'pending_delivery', 'delivered', 'completed', 'cancelled', 'refund_pending', 'refund_approved', 'refund_rejected'].includes(status)) {
      return res.status(400).json({ message: '无效的订单状态' });
    }

    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    // 商家只能更新自己的订单
    if (req.adminRole === 'user' && order.merchantId !== req.adminId) {
      return res.status(403).json({ message: '无权更新该订单' });
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
      case 'refund_pending':
        message = '订单已标记为退款处理中';
        break;
      case 'refund_approved':
        message = '订单退款已通过';
        break;
      case 'refund_rejected':
        message = '订单退款已拒绝';
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
router.put('/:id/remark', adminAuth, async (req, res) => {
  try {
    const { remark } = req.body;

    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    // 商家只能更新自己的订单
    if (req.adminRole === 'user' && order.merchantId !== req.adminId) {
      return res.status(403).json({ message: '无权更新该订单' });
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

// 发货
router.put('/:id/ship', adminAuth, async (req, res) => {
  try {
    const { trackingNumber, trackingCompany, deliveryImages } = req.body;
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    // 商家只能为自己的订单发货
    if (req.adminRole === 'user' && order.merchantId !== req.adminId) {
      return res.status(403).json({ message: '无权为该订单发货' });
    }

    // 检查订单状态
    if (order.status !== 'pending_delivery') {
      return res.status(400).json({ message: '只有待发货状态的订单可以执行发货操作' });
    }

    // 更新订单状态为已发货
    order.status = 'delivered';
    order.deliveryTime = new Date();

    // 设置物流信息和发货图片
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (trackingCompany) order.trackingCompany = trackingCompany;
    if (deliveryImages) {
      // 确保是数组格式
      const imageArray = Array.isArray(deliveryImages) ? deliveryImages : [deliveryImages];
      order.deliveryImages = imageArray;
    }

    await order.save();

    res.status(200).json({
      message: '订单已发货',
      status: 'delivered',
      order: {
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        deliveryTime: order.deliveryTime,
        trackingNumber: order.trackingNumber,
        trackingCompany: order.trackingCompany,
        deliveryImages: order.deliveryImages
      }
    });
  } catch (error) {
    console.error('订单发货失败:', error.message, error.stack);
    res.status(400).json({ message: '订单发货失败', error: error.message });
  }
});

// 删除订单（软删除或仅供测试环境使用）
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
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

// 处理退款申请
router.put('/:id/refund', adminAuth, async (req, res) => {
  try {
    const { action, remark } = req.body;
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    // 商家只能处理自己的订单退款申请
    if (req.adminRole === 'user' && order.merchantId !== req.adminId) {
      return res.status(403).json({ message: '无权处理该订单退款' });
    }

    if (!action || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ message: '请提供有效的处理结果' });
    }

    if (action === 'approved') {
      try {
        // 调用微信支付退款接口
        const refundResult = await pay.refunds({
          transaction_id: order.transactionId, // 微信支付订单号
          out_refund_no: `refund_${order.orderNo}_${Date.now()}`, // 商户退款单号
          reason: order.refundReason || '用户申请退款', // 退款原因
          notify_url: `${process.env.WECHAT_SUCCESSCALLBACK || 'http://localhost:3000'}/wxNotify/refundNotify`, // 退款结果通知的回调地址
          amount: {
            refund: Math.floor(order.totalAmount * 100), // 退款金额，单位：分
            total: Math.floor(order.totalAmount * 100), // 原订单金额，单位：分
            currency: 'CNY'
          }
        });

        // 更新订单状态为退款处理中
        order.status = 'refund_processing';
        order.refundRemark = remark || '退款申请已通过，等待退款结果';
        await order.save();

        res.status(200).json({
          message: '退款申请已提交，等待退款结果',
          order: {
            id: order.id,
            orderNo: order.orderNo,
            status: order.status,
            refundRemark: order.refundRemark
          }
        });
      } catch (refundError) {
        console.error('微信退款失败:', refundError);
        res.status(500).json({
          message: '退款申请提交失败',
          error: refundError.message
        });
      }
    } else {
      // 退款拒绝
      order.status = 'refund_rejected';
      order.refundApprovalTime = new Date();
      order.refundRemark = remark || '退款申请已拒绝';

      await order.save();

      res.status(200).json({
        message: '退款已拒绝',
        order: {
          id: order.id,
          orderNo: order.orderNo,
          status: order.status,
          refundApprovalTime: order.refundApprovalTime,
          refundRemark: order.refundRemark
        }
      });
    }
  } catch (error) {
    console.error('处理退款失败:', error.message, error.stack);
    res.status(400).json({ message: '处理退款失败', error: error.message });
  }
});

module.exports = router;
