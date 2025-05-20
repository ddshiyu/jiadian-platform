const express = require('express');
const router = express.Router();
const { AdminUser } = require('../../models');
const adminAuth = require('../../middleware/adminAuth');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

/**
 * @api {get} /admin/users 获取管理员列表
 * @apiDescription 获取管理员列表(超级管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/', adminAuth, async (req, res) => {
  try {
    const {
      keyword,
      role,
      status,
      startDate,
      endDate,
      sort = 'createdAt',
      order = 'DESC'
    } = req.query;

    // 使用中间件提供的分页参数获取方法
    const { page, size, offset } = req.getPaginationParams({
      pageName: 'pageNum',
      sizeName: 'pageSize'
    });

    // 构建查询条件
    const where = {};

    // 关键词搜索
    if (keyword) {
      where[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { name: { [Op.like]: `%${keyword}%` } },
        { email: { [Op.like]: `%${keyword}%` } }
      ];
    }

    // 角色筛选
    if (role && ['admin', 'user'].includes(role)) {
      where.role = role;
    }

    // 状态筛选
    if (status && ['active', 'inactive'].includes(status)) {
      where.status = status;
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

    // 获取管理员列表
    const users = await AdminUser.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [[sort, order]],
      limit: size,
      offset: offset
    });

    // 获取总数
    const total = await AdminUser.count({ where });

    // 使用分页中间件的paginate方法返回分页结果
    res.paginate(users, {
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
    console.error('获取管理员列表失败:', error);
    res.status(400).json({ message: '获取管理员列表失败' });
  }
});

/**
 * @api {get} /admin/users/:id 获取管理员详情
 * @apiDescription 获取管理员详情(超级管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const user = await AdminUser.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(400).json({ message: '管理员不存在' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('获取管理员详情失败:', error);
    res.status(400).json({ message: '获取管理员详情失败' });
  }
});

/**
 * @api {post} /admin/users 创建管理员
 * @apiDescription 创建管理员(超级管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/', adminAuth, async (req, res) => {
  try {
    const { username, password, name, email, phone, role, status } = req.body;

    // 验证必填字段
    if (!username || !password || !name) {
      return res.status(400).json({ message: '用户名、密码和姓名不能为空' });
    }

    // 检查用户名是否已存在
    const existingUser = await AdminUser.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 验证角色
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: '无效的角色类型' });
    }

    // 验证状态
    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: '无效的状态类型' });
    }

    // 创建管理员
    const user = await AdminUser.create({
      username,
      password, // 密码会在模型的钩子中自动加密
      name,
      email,
      phone,
      role: role || 'user',
      status: status || 'active'
    });

    // 不返回密码字段
    const { password: _, ...userWithoutPassword } = user.toJSON();

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('创建管理员失败:', error);
    res.status(400).json({ message: '创建管理员失败' });
  }
});

/**
 * @api {put} /admin/users/:id 更新管理员
 * @apiDescription 更新管理员信息(超级管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, phone, role, status } = req.body;
    const user = await AdminUser.findByPk(req.params.id);

    if (!user) {
      return res.status(400).json({ message: '管理员不存在' });
    }

    // 获取当前登录的管理员信息
    const currentAdmin = req.admin;
    if (!currentAdmin) {
      return res.status(401).json({ message: '未找到当前登录的管理员信息' });
    }

    // 不能修改自己的角色
    if (user.id === currentAdmin.id && role) {
      return res.status(400).json({ message: '不能修改自己的角色' });
    }

    // 只有超级管理员可以修改其他管理员的角色
    if (role && currentAdmin.role !== 'admin') {
      return res.status(403).json({ message: '只有超级管理员可以修改角色' });
    }

    // 验证角色
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: '无效的角色类型' });
    }

    // 验证状态
    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: '无效的状态类型' });
    }

    // 更新管理员信息
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;

    await user.save();

    // 不返回密码字段
    const { password: _, ...userWithoutPassword } = user.toJSON();

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('更新管理员失败:', error);
    res.status(400).json({ message: '更新管理员失败' });
  }
});

/**
 * @api {put} /admin/users/:id/reset-password 重置管理员密码
 * @apiDescription 重置管理员密码(超级管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id/reset-password', adminAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: '密码不能为空' });
    }

    const user = await AdminUser.findByPk(req.params.id);

    if (!user) {
      return res.status(400).json({ message: '管理员不存在' });
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
 * @api {put} /admin/users/:id/status 更新管理员状态
 * @apiDescription 更新管理员状态(启用/禁用)(超级管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: '无效的管理员状态' });
    }

    const user = await AdminUser.findByPk(req.params.id);

    if (!user) {
      return res.status(400).json({ message: '管理员不存在' });
    }

    // 不能修改自己的状态
    if (user.id === req.user.id) {
      return res.status(400).json({ message: '不能修改自己的状态' });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      message: status === 'active' ? '管理员已启用' : '管理员已禁用',
      status
    });
  } catch (error) {
    console.error('更新管理员状态失败:', error);
    res.status(400).json({ message: '更新管理员状态失败' });
  }
});

/**
 * @api {get} /admin/users/statistics/summary 获取管理员统计摘要
 * @apiDescription 获取管理员统计摘要(超级管理员)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/statistics/summary', adminAuth, async (req, res) => {
  try {
    // 获取管理员总数
    const totalCount = await AdminUser.count();

    // 获取今日新增管理员数
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayNewUsers = await AdminUser.count({
      where: {
        createdAt: { [Op.gte]: today }
      }
    });

    // 获取本月新增管理员数
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthNewUsers = await AdminUser.count({
      where: {
        createdAt: { [Op.gte]: startOfMonth }
      }
    });

    // 获取各角色管理员数量
    const roleStats = await AdminUser.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role']
    });

    res.status(200).json({
      totalCount,
      todayNewUsers,
      monthNewUsers,
      roleStats: roleStats.reduce((acc, curr) => {
        acc[curr.role] = curr.get('count');
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('获取管理员统计摘要失败:', error);
    res.status(400).json({ message: '获取管理员统计摘要失败' });
  }
});

module.exports = router;
