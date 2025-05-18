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

    // 查询用户信息，检查是否为VIP
    const User = require('../models/User');
    const user = await User.findByPk(userId);
    const isVip = user && user.isVip && user.vipExpireDate && new Date(user.vipExpireDate) > new Date();

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
          attributes: ['id', 'name', 'price', 'originalPrice', 'cover', 'stock', 'status', 'vipPrice', 'wholesalePrice', 'wholesaleThreshold'],
          where: { status: 'on_sale' },
          required: true
        }
      ],
      limit: size,
      offset: offset
    });

    // 处理购物车数据，为每个商品计算实际价格
    const cartsWithActualPrice = carts.map(cart => {
      const cartData = cart.toJSON();
      const product = cartData.Product;

      // 默认使用普通价格
      let actualPrice = product.price;
      let priceType = 'normal';

      // VIP用户且商品设置了VIP价格，则使用VIP价格
      if (isVip && product.vipPrice) {
        actualPrice = product.vipPrice;
        priceType = 'vip';
      }
      // 批发购买（数量达到阈值）且设置了批发价，则使用批发价
      else if (cart.quantity >= product.wholesaleThreshold && product.wholesalePrice) {
        actualPrice = product.wholesalePrice;
        priceType = 'wholesale';
      }

      return {
        ...cartData,
        actualPrice,
        priceType,
        isVip
      };
    });

    // 计算总价
    const totalPrice = cartsWithActualPrice.reduce((sum, cart) => {
      return sum + (cart.actualPrice * cart.quantity);
    }, 0);

    // 使用分页中间件返回分页结果
    res.paginate(cartsWithActualPrice, {
      total,
      page,
      size,
      removeDefaults: true,
      custom: {
        totalPrice: parseFloat(totalPrice.toFixed(2)),
        current: page,
        pageSize: size,
        totalPages: Math.ceil(total / size),
        isVip
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
      return res.status(400).json({
        message: '商品ID不能为空',
        code: 'MISSING_PRODUCT_ID'
      });
    }

    // 验证商品ID是否为有效数字
    if (isNaN(parseInt(productId))) {
      return res.status(400).json({
        message: '商品ID无效',
        code: 'INVALID_PRODUCT_ID'
      });
    }

    // 验证数量是否为有效数字
    if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      return res.status(400).json({
        message: '商品数量必须大于0',
        code: 'INVALID_QUANTITY'
      });
    }

    // 查询用户信息，检查是否为VIP
    const User = require('../models/User');
    const user = await User.findByPk(userId);
    const isVip = user && user.isVip && user.vipExpireDate && new Date(user.vipExpireDate) > new Date();

    // 检查商品是否存在且在售
    const product = await Product.findOne({
      where: {
        id: productId,
        status: 'on_sale'
      }
    });

    if (!product) {
      return res.status(404).json({
        message: '商品不存在或已下架',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // 检查库存
    if (product.stock < quantity) {
      return res.status(400).json({
        message: `商品库存不足，当前库存:${product.stock}`,
        code: 'INSUFFICIENT_STOCK',
        availableStock: product.stock
      });
    }

    // 检查购物车中是否已存在该商品
    let cart = await Cart.findOne({
      where: {
        userId,
        productId
      }
    });

    let isNewItem = false;
    let previousQuantity = 0;

    if (cart) {
      // 记录之前的数量
      previousQuantity = cart.quantity;

      // 更新数量
      cart.quantity += parseInt(quantity);
      if (cart.quantity > product.stock) {
        return res.status(400).json({
          message: `添加后数量超过库存，当前库存:${product.stock}，购物车已有:${previousQuantity}`,
          code: 'EXCEED_STOCK',
          availableStock: product.stock,
          cartQuantity: previousQuantity
        });
      }
      await cart.save();
    } else {
      // 创建新购物车项
      isNewItem = true;
      cart = await Cart.create({
        userId,
        productId,
        quantity: parseInt(quantity),
        selected: true
      });
    }

    // 计算实际价格
    let actualPrice = product.price;
    let priceType = 'normal';

    // VIP用户且商品设置了VIP价格，则使用VIP价格
    if (isVip && product.vipPrice) {
      actualPrice = product.vipPrice;
      priceType = 'vip';
    }
    // 批发购买（数量达到阈值）且设置了批发价，则使用批发价
    else if (cart.quantity >= product.wholesaleThreshold && product.wholesalePrice) {
      actualPrice = product.wholesalePrice;
      priceType = 'wholesale';
    }

    // 返回购物车项信息和价格信息
    const cartWithProduct = {
      ...cart.toJSON(),
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        vipPrice: product.vipPrice,
        wholesalePrice: product.wholesalePrice,
        wholesaleThreshold: product.wholesaleThreshold,
        cover: product.cover,
        stock: product.stock
      },
      priceInfo: {
        actualPrice,
        priceType,
        isVip,
        discount: parseFloat((product.price - actualPrice).toFixed(2)),
        discountPercentage: parseFloat(((product.price - actualPrice) / product.price * 100).toFixed(2))
      },
      isNewItem,
      addedQuantity: parseInt(quantity),
      previousQuantity
    };

    res.status(isNewItem ? 201 : 200).json(cartWithProduct);
  } catch (error) {
    console.error('添加购物车失败:', error);
    res.status(500).json({
      message: '添加购物车失败，请稍后重试',
      code: 'ADD_CART_FAILED'
    });
  }
});

// 全选/取消全选 - 必须在/:id路由之前定义
router.put('/selectAll', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { selected = true } = req.body;

    // 检查用户购物车是否有商品
    const cartCount = await Cart.count({ where: { userId } });

    if (cartCount === 0) {
      return res.status(200).json({
        message: '购物车为空，无需操作',
        code: 'CART_EMPTY',
        affected: 0
      });
    }

    // 更新所有属于该用户的购物车项
    const result = await Cart.update(
      { selected },
      { where: { userId } }
    );

    // 返回更新结果
    res.status(200).json({
      message: selected ? '全选成功' : '取消全选成功',
      code: selected ? 'SELECT_ALL_SUCCESS' : 'DESELECT_ALL_SUCCESS',
      affected: result[0] // 返回受影响的行数
    });
  } catch (error) {
    console.error('全选/取消全选操作失败:', error);
    res.status(500).json({
      message: '操作购物车失败，请稍后重试',
      code: 'SELECT_ALL_FAILED'
    });
  }
});

// 更新购物车商品数量
router.put('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cartId = req.params.id;
    const { quantity, selected } = req.body;

    // 查询用户信息，检查是否为VIP
    const User = require('../models/User');
    const user = await User.findByPk(userId);
    const isVip = user && user.isVip && user.vipExpireDate && new Date(user.vipExpireDate) > new Date();

    // 验证购物车ID是否为有效数字
    if (isNaN(parseInt(cartId))) {
      return res.status(400).json({
        message: '购物车ID无效',
        code: 'INVALID_CART_ID'
      });
    }

    // 查询购物车项
    const cart = await Cart.findOne({
      where: {
        id: cartId,
        userId
      },
      include: [Product]
    });

    // 如果找不到购物车项，返回具体错误信息
    if (!cart) {
      console.error(`购物车项不存在: userId=${userId}, cartId=${cartId}`);
      return res.status(404).json({
        message: '购物车商品不存在或已被删除',
        code: 'CART_ITEM_NOT_FOUND'
      });
    }

    // 检查商品是否存在
    if (!cart.Product) {
      await cart.destroy(); // 如果对应商品不存在，删除该购物车项
      return res.status(404).json({
        message: '商品不存在或已下架，已从购物车移除',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // 更新数量
    if (quantity !== undefined) {
      if (quantity <= 0) {
        // 数量为0，删除购物车项
        await cart.destroy();
        return res.status(200).json({
          message: '商品已从购物车移除',
          code: 'CART_ITEM_REMOVED'
        });
      }

      // 检查库存
      if (cart.Product && quantity > cart.Product.stock) {
        return res.status(400).json({
          message: `商品库存不足，当前库存:${cart.Product.stock}`,
          code: 'INSUFFICIENT_STOCK',
          availableStock: cart.Product.stock
        });
      }

      cart.quantity = parseInt(quantity);
    }

    // 更新选中状态
    if (selected !== undefined) {
      cart.selected = selected;
    }

    await cart.save();

    const product = cart.Product;

    // 计算实际价格
    let actualPrice = product.price;
    let priceType = 'normal';

    // VIP用户且商品设置了VIP价格，则使用VIP价格
    if (isVip && product.vipPrice) {
      actualPrice = product.vipPrice;
      priceType = 'vip';
    }
    // 批发购买（数量达到阈值）且设置了批发价，则使用批发价
    else if (cart.quantity >= product.wholesaleThreshold && product.wholesalePrice) {
      actualPrice = product.wholesalePrice;
      priceType = 'wholesale';
    }

    // 返回购物车项信息和价格信息
    const cartWithProduct = {
      ...cart.toJSON(),
      actualPrice,
      priceType,
      priceInfo: {
        isVip,
        actualPrice,
        priceType,
        originalPrice: product.price,
        discount: parseFloat((product.price - actualPrice).toFixed(2)),
        discountPercentage: parseFloat(((product.price - actualPrice) / product.price * 100).toFixed(2))
      }
    };

    res.status(200).json(cartWithProduct);
  } catch (error) {
    console.error('更新购物车失败:', error);
    res.status(500).json({
      message: '更新购物车失败，请稍后重试',
      code: 'UPDATE_CART_FAILED'
    });
  }
});

// 删除购物车商品
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cartId = req.params.id;

    // 验证购物车ID是否为有效数字
    if (isNaN(parseInt(cartId))) {
      return res.status(400).json({
        message: '购物车ID无效',
        code: 'INVALID_CART_ID'
      });
    }

    // 查询购物车项
    const cart = await Cart.findOne({
      where: {
        id: cartId,
        userId
      }
    });

    // 如果找不到购物车项，返回具体错误信息
    if (!cart) {
      console.error(`删除操作 - 购物车项不存在: userId=${userId}, cartId=${cartId}`);
      return res.status(404).json({
        message: '购物车商品不存在或已被删除',
        code: 'CART_ITEM_NOT_FOUND'
      });
    }

    await cart.destroy();
    res.status(200).json({
      message: '删除成功',
      code: 'CART_ITEM_DELETED',
      cartId
    });
  } catch (error) {
    console.error('删除购物车失败:', error);
    res.status(500).json({
      message: '删除购物车失败，请稍后重试',
      code: 'DELETE_CART_FAILED'
    });
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

// 购买购物车中选中的商品
router.post('/checkout', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.body;

    if (!addressId) {
      return res.status(400).json({ message: '收货地址不能为空' });
    }

    // 查询用户信息，检查是否为VIP
    const User = require('../models/User');
    const user = await User.findByPk(userId);
    const isVip = user && user.isVip && user.vipExpireDate && new Date(user.vipExpireDate) > new Date();

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
      const orderItemsData = [];

      // 为每个购物车项计算价格并准备订单项数据
      for (const item of cartItems) {
        const product = item.Product;
        let unitPrice = product.price; // 默认使用普通价格

        // VIP用户且商品设置了VIP价格，则使用VIP价格
        if (isVip && product.vipPrice) {
          unitPrice = product.vipPrice;
        }
        // 批发购买（数量达到阈值）且设置了批发价，则使用批发价
        else if (item.quantity >= product.wholesaleThreshold && product.wholesalePrice) {
          unitPrice = product.wholesalePrice;
        }

        // 累加到总金额
        totalAmount += unitPrice * item.quantity;

        // 准备订单项数据
        orderItemsData.push({
          productId: product.id,
          productName: product.name,
          productImage: product.cover,
          quantity: item.quantity,
          price: unitPrice
        });
      }

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
      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i];
        const itemData = orderItemsData[i];

        // 创建订单项
        const orderItem = await OrderItem.create({
          orderId: order.id,
          productId: itemData.productId,
          productName: itemData.productName,
          productImage: itemData.productImage,
          quantity: itemData.quantity,
          price: itemData.price
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
        })),
        priceInfo: {
          isVip,
          usedVipPrice: isVip
        }
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

    // 查询用户信息，检查是否为VIP
    const User = require('../models/User');
    const user = await User.findByPk(userId);
    const isVip = user && user.isVip && user.vipExpireDate && new Date(user.vipExpireDate) > new Date();

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
        items: [],
        isVip
      });
    }

    // 计算总数量和总价
    let totalCount = 0;
    let totalPrice = 0;
    const items = [];

    cartItems.forEach(item => {
      const product = item.Product;

      // 默认使用普通价格
      let actualPrice = product.price;
      let priceType = 'normal';

      // VIP用户且商品设置了VIP价格，则使用VIP价格
      if (isVip && product.vipPrice) {
        actualPrice = product.vipPrice;
        priceType = 'vip';
      }
      // 批发购买（数量达到阈值）且设置了批发价，则使用批发价
      else if (item.quantity >= product.wholesaleThreshold && product.wholesalePrice) {
        actualPrice = product.wholesalePrice;
        priceType = 'wholesale';
      }

      totalCount += item.quantity;
      totalPrice += actualPrice * item.quantity;

      items.push({
        id: item.id,
        productId: item.productId,
        productName: product.name,
        productImage: product.cover,
        price: product.price,
        actualPrice,
        priceType,
        originalPrice: product.originalPrice,
        vipPrice: product.vipPrice,
        wholesalePrice: product.wholesalePrice,
        quantity: item.quantity,
        stock: product.stock
      });
    });

    res.status(200).json({
      totalCount,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      items,
      isVip
    });
  } catch (error) {
    console.error('获取购物车统计信息失败:', error);
    res.status(400).json({ message: '获取购物车统计信息失败' });
  }
});

module.exports = router;
