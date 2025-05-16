const express = require('express');
const router = express.Router();
const { Cart, Product } = require('../models');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');

// 获取购物车列表
router.get('/', auth, async (req, res) => {
  try {
    // 使用中间件提供的分页参数获取方法
    const { page, size, offset } = req.getPaginationParams({
      pageName: 'page',
      sizeName: 'pageSize',
      defaultSize: 20
    });

    const userId = req.user.id;

    // 查询购物车总数
    const total = await Cart.count({
      where: { userId },
      include: [
        {
          model: Product,
          where: { status: 'on_sale' },
          required: true
        }
      ]
    });

    // 分页查询购物车
    const carts = await Cart.findAll({
      where: { userId },
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'price', 'originalPrice', 'cover', 'stock', 'status'],
          where: { status: 'on_sale' },
          required: true
        }
      ],
      limit: size,
      offset: offset
    });

    // 计算总价
    const totalPrice = carts.reduce((sum, cart) => {
      return sum + (cart.Product ? cart.Product.price * cart.quantity : 0);
    }, 0);

    // 使用分页中间件返回分页结果
    res.paginate(carts, {
      total,
      page,
      size,
      removeDefaults: true,
      custom: {
        totalPrice: parseFloat(totalPrice.toFixed(2)),
        current: page,
        pageSize: size,
        totalPages: Math.ceil(total / size)
      }
    });
  } catch (error) {
    console.error('获取购物车失败:', error);
    res.status(400).json({ message: '获取购物车失败' });
  }
});

// 添加商品到购物车
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: '商品ID不能为空' });
    }

    // 检查商品是否存在且在售
    const product = await Product.findOne({
      where: {
        id: productId,
        status: 'on_sale'
      }
    });

    if (!product) {
      return res.status(400).json({ message: '商品不存在或已下架' });
    }

    // 检查库存
    if (product.stock < quantity) {
      return res.status(400).json({ message: '商品库存不足' });
    }

    // 检查购物车中是否已存在该商品
    let cart = await Cart.findOne({
      where: {
        userId,
        productId
      }
    });

    if (cart) {
      // 更新数量
      cart.quantity += parseInt(quantity);
      if (cart.quantity > product.stock) {
        cart.quantity = product.stock;
      }
      await cart.save();
    } else {
      // 创建新购物车项
      cart = await Cart.create({
        userId,
        productId,
        quantity: parseInt(quantity),
        selected: true
      });
    }

    res.status(200).json(cart);
  } catch (error) {
    console.error('添加购物车失败:', error);
    res.status(400).json({ message: '添加购物车失败' });
  }
});

// 更新购物车商品数量
router.put('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { quantity, selected } = req.body;

    const cart = await Cart.findOne({
      where: {
        id: req.params.id,
        userId
      },
      include: [Product]
    });

    if (!cart) {
      return res.status(400).json({ message: '购物车商品不存在' });
    }

    // 更新数量
    if (quantity !== undefined) {
      if (quantity <= 0) {
        // 数量为0，删除购物车项
        await cart.destroy();
        return res.status(200).json({ message: '商品已从购物车移除' });
      }

      // 检查库存
      if (cart.Product && quantity > cart.Product.stock) {
        return res.status(400).json({ message: '商品库存不足' });
      }

      cart.quantity = parseInt(quantity);
    }

    // 更新选中状态
    if (selected !== undefined) {
      cart.selected = selected;
    }

    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    console.error('更新购物车失败:', error);
    res.status(400).json({ message: '更新购物车失败' });
  }
});

// 删除购物车商品
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!cart) {
      return res.status(400).json({ message: '购物车商品不存在' });
    }

    await cart.destroy();
    res.status(200).json({ message: '删除成功' });
  } catch (error) {
    console.error('删除购物车失败:', error);
    res.status(400).json({ message: '删除购物车失败' });
  }
});

// 清空购物车
router.delete('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    await Cart.destroy({
      where: { userId }
    });

    res.status(200).json({ message: '清空购物车成功' });
  } catch (error) {
    console.error('清空购物车失败:', error);
    res.status(400).json({ message: '清空购物车失败' });
  }
});

// 全选/取消全选
router.put('/selectAll', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { selected = true } = req.body;

    await Cart.update(
      { selected },
      { where: { userId } }
    );

    res.status(200).json({ message: selected ? '全选成功' : '取消全选成功' });
  } catch (error) {
    console.error('操作购物车失败:', error);
    res.status(400).json({ message: '操作购物车失败' });
  }
});

// 购买购物车中选中的商品
router.post('/checkout', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.body;

    if (!addressId) {
      return res.status(400).json({ message: '收货地址不能为空' });
    }

    // 查询购物车中选中的商品
    const cartItems = await Cart.findAll({
      where: {
        userId,
        selected: true
      },
      include: [{
        model: Product,
        where: { status: 'on_sale' },
        required: true
      }]
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ message: '请先选择要购买的商品' });
    }

    // 查询收货地址
    const Address = require('../models/Address');
    const address = await Address.findOne({
      where: {
        id: addressId,
        userId
      }
    });

    if (!address) {
      return res.status(400).json({ message: '收货地址不存在' });
    }

    // 检查商品库存
    for (const item of cartItems) {
      if (item.quantity > item.Product.stock) {
        return res.status(400).json({
          message: `商品"${item.Product.name}"库存不足，仅剩${item.Product.stock}件`
        });
      }
    }

    // 开始创建预订单
    const { Order, OrderItem } = require('../models');
    const sequelize = require('../config/database');
    const t = await sequelize.transaction();

    try {
      // 生成订单号：时间戳 + 4位随机数
      const orderNo = `${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // 计算订单总金额
      let totalAmount = 0;
      cartItems.forEach(item => {
        totalAmount += item.Product.price * item.quantity;
      });

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
        remark: req.body.remark || '',
        orderType: 'normal'
      }, { transaction: t });

      // 创建订单项并减少商品库存
      const orderItems = [];
      for (const item of cartItems) {
        // 创建订单项
        const orderItem = await OrderItem.create({
          orderId: order.id,
          productId: item.productId,
          productName: item.Product.name,
          productImage: item.Product.cover,
          quantity: item.quantity,
          price: item.Product.price
        }, { transaction: t });

        orderItems.push(orderItem);

        // 减少商品库存
        const product = item.Product;
        product.stock -= item.quantity;
        await product.save({ transaction: t });

        // 从购物车中删除已购买的商品
        await item.destroy({ transaction: t });
      }

      // 提交事务
      await t.commit();

      // 返回创建的订单信息
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
        items: orderItems.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          quantity: item.quantity,
          price: item.price
        }))
      });
    } catch (error) {
      // 回滚事务
      await t.rollback();
      console.error('创建订单失败:', error);
      res.status(400).json({ message: '创建订单失败', error: error.message });
    }
  } catch (error) {
    console.error('购买购物车商品失败:', error);
    res.status(400).json({ message: '购买购物车商品失败' });
  }
});

// 从购物车直接支付（创建微信支付订单）
router.post('/pay', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: '订单ID不能为空' });
    }

    // 查询订单
    const { Order, OrderItem, Product } = require('../models');
    const order = await Order.findOne({
      where: {
        id: orderId,
        userId,
        status: 'pending_payment',
        paymentStatus: 'unpaid'
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

    // 引入微信支付实例
    const WxPay = require('wechatpay-node-v3');
    const fs = require('fs');

    // 创建微信支付实例（或者你可以导入已经创建好的实例）
    const pay = new WxPay({
      appid: process.env.WECHAT_APPID,
      mchid: process.env.WECHAT_MCHID,
      publicKey: fs.readFileSync(__dirname + '/../wxpay_pem/apiclient_cert.pem'), // 公钥
      privateKey: fs.readFileSync(__dirname + '/../wxpay_pem/apiclient_key.pem'), // 秘钥
    });

    // 构建微信支付参数
    const params = {
      description: `购买商品: ${order.OrderItems[0]?.productName || '购物车商品'}等${order.OrderItems.length}件`,
      out_trade_no: order.orderNo,
      notify_url: `${process.env.WECHAT_SUCCESSCALLBACK}/products/notify`,
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
    console.error('创建支付订单失败:', error);
    res.status(400).json({ message: '创建支付订单失败', error: error.message });
  }
});

// 删除选中的商品
router.delete('/selected', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 删除购物车中所有选中的商品
    const result = await Cart.destroy({
      where: {
        userId,
        selected: true
      }
    });

    res.status(200).json({
      message: '删除成功',
      count: result
    });
  } catch (error) {
    console.error('删除购物车商品失败:', error);
    res.status(400).json({ message: '删除购物车商品失败' });
  }
});

// 获取购物车选中商品的统计信息
router.get('/selected', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 查询购物车中选中的商品
    const cartItems = await Cart.findAll({
      where: {
        userId,
        selected: true
      },
      include: [{
        model: Product,
        where: { status: 'on_sale' },
        required: true
      }]
    });

    if (cartItems.length === 0) {
      return res.status(200).json({
        totalCount: 0,
        totalPrice: 0,
        items: []
      });
    }

    // 计算总数量和总价
    let totalCount = 0;
    let totalPrice = 0;
    const items = [];

    cartItems.forEach(item => {
      totalCount += item.quantity;
      totalPrice += item.Product.price * item.quantity;

      items.push({
        id: item.id,
        productId: item.productId,
        productName: item.Product.name,
        productImage: item.Product.cover,
        price: item.Product.price,
        originalPrice: item.Product.originalPrice,
        quantity: item.quantity,
        stock: item.Product.stock
      });
    });

    res.status(200).json({
      totalCount,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      items
    });
  } catch (error) {
    console.error('获取购物车统计信息失败:', error);
    res.status(400).json({ message: '获取购物车统计信息失败' });
  }
});

module.exports = router;
