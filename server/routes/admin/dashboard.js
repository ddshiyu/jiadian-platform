const express = require('express');
const router = express.Router();
const { User, Order, Product, Category } = require('../../models');
const adminAuth = require('../../middleware/adminAuth');
const { Op, Sequelize } = require('sequelize');

/**
 * @api {get} /admin/dashboard/stats 获取仪表盘统计数据
 * @apiDescription 获取仪表盘统计数据(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/stats', adminAuth, async (req, res) => {
  try {
    // 获取用户总数
    const userCount = await User.count();

    // 获取商品总数
    const productCount = await Product.count({
      where: { status: { [Op.ne]: 'deleted' } }
    });

    // 获取分类总数
    const categoryCount = await Category.count();

    // 获取订单总数
    const orderCount = await Order.count();

    // 获取今日新增用户数
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayNewUsers = await User.count({
      where: {
        createdAt: { [Op.gte]: today }
      }
    });

    // 获取今日订单数和销售额
    const todayOrders = await Order.findAll({
      where: {
        createdAt: { [Op.gte]: today },
        status: { [Op.ne]: 'cancelled' }
      }
    });

    const todayOrderCount = todayOrders.length;
    const todaySales = todayOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

    // 获取近7天销售数据
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 6);
    last7Days.setHours(0, 0, 0, 0);

    const last7DaysOrders = await Order.findAll({
      where: {
        createdAt: { [Op.gte]: last7Days },
        status: { [Op.ne]: 'cancelled' }
      },
      attributes: [
        [Sequelize.fn('date', Sequelize.col('createdAt')), 'date'],
        [Sequelize.fn('count', Sequelize.col('id')), 'count'],
        [Sequelize.fn('sum', Sequelize.col('totalAmount')), 'amount']
      ],
      group: [Sequelize.fn('date', Sequelize.col('createdAt'))]
    });

    // 处理7天销售数据，如果某天没有数据则补0
    const salesTrend = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(last7Days);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = last7DaysOrders.find(item => item.getDataValue('date') === dateStr);

      salesTrend.push({
        date: dateStr,
        count: dayData ? parseInt(dayData.getDataValue('count')) : 0,
        amount: dayData ? parseFloat(dayData.getDataValue('amount') || 0) : 0
      });
    }

    // 获取各状态订单数
    const pendingOrderCount = await Order.count({ where: { status: 'pending' } });
    const paidOrderCount = await Order.count({ where: { status: 'paid' } });
    const shippedOrderCount = await Order.count({ where: { status: 'shipped' } });
    const completedOrderCount = await Order.count({ where: { status: 'completed' } });
    const cancelledOrderCount = await Order.count({ where: { status: 'cancelled' } });

    // 获取热销商品
    const hotProducts = await Product.findAll({
      attributes: [
        'id', 'name', 'cover', 'price', 'sales'
      ],
      where: { status: 'on_sale' },
      order: [['sales', 'DESC']],
      limit: 5
    });

    res.status(200).json({
      counts: {
        user: userCount,
        product: productCount,
        category: categoryCount,
        order: orderCount
      },
      today: {
        newUsers: todayNewUsers,
        orderCount: todayOrderCount,
        sales: todaySales.toFixed(2)
      },
      orderStatus: {
        pending: pendingOrderCount,
        paid: paidOrderCount,
        shipped: shippedOrderCount,
        completed: completedOrderCount,
        cancelled: cancelledOrderCount
      },
      salesTrend,
      hotProducts
    });
  } catch (error) {
    console.error('获取仪表盘统计数据失败:', error);
    res.status(400).json({ message: '获取仪表盘统计数据失败' });
  }
});

/**
 * @api {get} /admin/dashboard/recent-orders 获取最近订单
 * @apiDescription 获取最近订单(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/recent-orders', adminAuth, async (req, res) => {
  try {
    const recentOrders = await Order.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'name', 'phone']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.status(200).json(recentOrders);
  } catch (error) {
    console.error('获取最近订单失败:', error);
    res.status(400).json({ message: '获取最近订单失败' });
  }
});

/**
 * @api {get} /admin/dashboard/recent-users 获取最近用户
 * @apiDescription 获取最近注册的用户(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/recent-users', adminAuth, async (req, res) => {
  try {
    const recentUsers = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.status(200).json(recentUsers);
  } catch (error) {
    console.error('获取最近用户失败:', error);
    res.status(400).json({ message: '获取最近用户失败' });
  }
});

/**
 * @api {get} /admin/dashboard/product-categories 获取商品分类统计
 * @apiDescription 获取商品分类统计(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/product-categories', adminAuth, async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name'],
      include: [
        {
          model: Product,
          attributes: []
        }
      ],
      group: ['Category.id'],
      order: [['sort', 'ASC']],
      attributes: {
        include: [
          [Sequelize.fn('COUNT', Sequelize.col('Products.id')), 'productCount']
        ]
      }
    });

    const result = categories.map(category => ({
      id: category.id,
      name: category.name,
      productCount: parseInt(category.getDataValue('productCount') || 0)
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('获取商品分类统计失败:', error);
    res.status(400).json({ message: '获取商品分类统计失败' });
  }
});

module.exports = router;
