const express = require('express');
const router = express.Router();
const { User, Order } = require('../../models');
const adminAuth = require('../../middleware/adminAuth');
const { Op } = require('sequelize');

/**
 * @api {get} /admin/users 获取用户列表
 * @apiDescription 获取用户列表(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/', adminAuth, async (req, res) => {
  try {
    const {
      keyword,
      role,
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
      sort = 'createdAt',
      order = 'DESC'
    } = req.query;

    // 构建查询条件
    const where = {};

    // 关键词搜索
    if (keyword) {
      where[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { name: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } }
      ];
    }

    // 角色筛选
    if (role) {
      where.role = role;
    }

    // 日期范围查询
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.createdAt = { [Op.lte]: new Date(endDate) };
    }

    // 计算分页信息
    const offset = (page - 1) * pageSize;

    // 获取用户列表
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [[sort, order]],
      limit: parseInt(pageSize),
      offset: parseInt(offset)
    });

    // 构建分页信息
    const pagination = {
      total: count,
      pageSize: parseInt(pageSize),
      current: parseInt(page),
      totalPages: Math.ceil(count / pageSize)
    };

    res.status(200).json({
      list: rows,
      pagination
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(400).json({ message: '获取用户列表失败' });
  }
});

/**
 * @api {get} /admin/users/:id 获取用户详情
 * @apiDescription 获取用户详情(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(400).json({ message: '用户不存在' });
    }

    // 获取用户订单数量
    const orderCount = await Order.count({
      where: { userId: user.id }
    });

    // 获取用户最近订单
    const recentOrders = await Order.findAll({
      where: { userId: user.id },
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      ...user.toJSON(),
      stats: {
        orderCount,
        recentOrders
      }
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(400).json({ message: '获取用户详情失败' });
  }
});

/**
 * @api {post} /admin/users 创建用户
 * @apiDescription 创建用户(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/', adminAuth, async (req, res) => {
  try {
    const { username, password, name, phone, role } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 创建用户
    const user = await User.create({
      username,
      password, // 密码会在模型的钩子中加密
      name,
      phone,
      role: role || 'user'
    });

    // 不返回密码字段
    const { password: _, ...userWithoutPassword } = user.toJSON();

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(400).json({ message: '创建用户失败' });
  }
});

/**
 * @api {put} /admin/users/:id 更新用户
 * @apiDescription 更新用户信息(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, phone, role, status } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(400).json({ message: '用户不存在' });
    }

    // 更新用户信息
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;

    await user.save();

    // 不返回密码字段
    const { password: _, ...userWithoutPassword } = user.toJSON();

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(400).json({ message: '更新用户失败' });
  }
});

/**
 * @api {put} /admin/users/:id/reset-password 重置用户密码
 * @apiDescription 重置用户密码(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id/reset-password', adminAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: '密码不能为空' });
    }

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(400).json({ message: '用户不存在' });
    }

    // 更新密码
    user.password = password;
    await user.save();

    res.status(200).json({
      message: '密码重置成功'
    });
  } catch (error) {
    console.error('重置密码失败:', error);
    res.status(400).json({ message: '重置密码失败' });
  }
});

/**
 * @api {put} /admin/users/:id/status 更新用户状态
 * @apiDescription 更新用户状态(启用/禁用)(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: '无效的用户状态' });
    }

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(400).json({ message: '用户不存在' });
    }

    // 不能修改自己的状态
    if (user.id === req.user.id) {
      return res.status(400).json({ message: '不能修改自己的状态' });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      message: status === 'active' ? '用户已启用' : '用户已禁用',
      status
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(400).json({ message: '更新用户状态失败' });
  }
});

/**
 * @api {get} /admin/users/statistics/summary 获取用户统计摘要
 * @apiDescription 获取用户统计摘要(管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/statistics/summary', adminAuth, async (req, res) => {
  try {
    // 获取用户总数
    const totalCount = await User.count();

    // 获取今日新增用户数
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayNewUsers = await User.count({
      where: {
        createdAt: { [Op.gte]: today }
      }
    });

    // 获取本月新增用户数
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthNewUsers = await User.count({
      where: {
        createdAt: { [Op.gte]: startOfMonth }
      }
    });

    // 获取活跃用户数（有订单的用户）
    const activeUserCount = await User.count({
      include: [
        {
          model: Order,
          required: true
        }
      ]
    });

    res.status(200).json({
      totalCount,
      todayNewUsers,
      monthNewUsers,
      activeUserCount
    });
  } catch (error) {
    console.error('获取用户统计摘要失败:', error);
    res.status(400).json({ message: '获取用户统计摘要失败' });
  }
});

module.exports = router;
