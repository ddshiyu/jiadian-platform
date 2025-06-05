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
    if (user.id === req.admin.id) {
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

/**
 * @api {get} /admin/users/profile 获取当前管理员个人信息
 * @apiDescription 获取当前登录管理员的个人信息
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/profile', adminAuth, async (req, res) => {
  try {
    const adminId = req.admin.id;

    const admin = await AdminUser.findByPk(adminId, {
      attributes: { exclude: ['password'] }
    });

    if (!admin) {
      return res.status(404).json({ message: '管理员不存在' });
    }

    res.status(200).json(admin);
  } catch (error) {
    console.error('获取个人信息失败:', error);
    res.status(400).json({ message: '获取个人信息失败' });
  }
});

/**
 * @api {put} /admin/users/profile 更新当前管理员个人信息
 * @apiDescription 更新当前登录管理员的个人信息
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/profile', adminAuth, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const adminId = req.admin.id;

    const admin = await AdminUser.findByPk(adminId);
    if (!admin) {
      return res.status(404).json({ message: '管理员不存在' });
    }

    // 更新管理员信息
    if (name !== undefined) admin.name = name;
    if (email !== undefined) admin.email = email;
    if (phone !== undefined) admin.phone = phone;

    await admin.save();

    // 不返回密码字段
    const { password: _, ...adminWithoutPassword } = admin.toJSON();

    res.status(200).json(adminWithoutPassword);
  } catch (error) {
    console.error('更新个人信息失败:', error);
    res.status(400).json({ message: '更新个人信息失败' });
  }
});

/**
 * @api {get} /admin/users/profile/payment-methods 获取当前管理员付款方式
 * @apiDescription 获取当前登录管理员的付款方式配置
 * @apiHeader {String} Authorization Bearer JWT
 */
router.get('/profile/payment-methods', adminAuth, async (req, res) => {
  try {
    const adminId = req.admin.id;

    const admin = await AdminUser.findByPk(adminId, {
      attributes: ['id', 'name', 'paymentMethods']
    });

    if (!admin) {
      return res.status(404).json({ message: '管理员不存在' });
    }

    res.status(200).json({
      paymentMethods: admin.getPaymentMethods()
    });
  } catch (error) {
    console.error('获取个人付款方式失败:', error);
    res.status(400).json({ message: '获取个人付款方式失败' });
  }
});

/**
 * @api {put} /admin/users/profile/payment-methods 更新当前管理员付款方式
 * @apiDescription 更新当前登录管理员的付款方式配置
 * @apiHeader {String} Authorization Bearer JWT
 */
router.put('/profile/payment-methods', adminAuth, async (req, res) => {
  try {
    const { paymentMethods } = req.body;
    const adminId = req.admin.id;

    const admin = await AdminUser.findByPk(adminId);
    if (!admin) {
      return res.status(404).json({ message: '管理员不存在' });
    }

    // 验证付款方式数据格式
    if (paymentMethods && typeof paymentMethods !== 'object') {
      return res.status(400).json({ message: '付款方式数据格式不正确' });
    }

    admin.paymentMethods = paymentMethods;
    // 明确标记字段已更改，确保 Sequelize 检测到变化
    admin.changed('paymentMethods', true);
    await admin.save();

    res.status(200).json({
      message: '付款方式更新成功',
      paymentMethods: admin.getPaymentMethods()
    });
  } catch (error) {
    console.error('更新个人付款方式失败:', error);
    res.status(400).json({ message: '更新个人付款方式失败', error: error.message });
  }
});

/**
 * @api {post} /admin/users/:id/payment-methods/:type 添加单个付款方式
 * @apiDescription 为指定管理员添加单个付款方式（收款码或银行卡）
 * @apiHeader {String} Authorization Bearer JWT
 * @apiParam {String} type 付款方式类型 (qrCode 或 bankCard)
 */
router.post('/:id/payment-methods/:type', adminAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const data = req.body;
    const user = await AdminUser.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: '管理员不存在' });
    }

    // 获取当前登录的管理员信息
    const currentAdmin = req.admin;

    // 只有超级管理员或本人可以添加付款方式
    if (currentAdmin.role !== 'admin' && currentAdmin.id !== user.id) {
      return res.status(403).json({ message: '无权限为此管理员添加付款方式' });
    }

    // 验证类型
    if (!['qrCode', 'bankCard'].includes(type)) {
      return res.status(400).json({ message: '无效的付款方式类型' });
    }

    // 验证数据
    if (type === 'qrCode') {
      if (!data.type || !data.imageUrl || !data.name) {
        return res.status(400).json({ message: '收款码必须包含type、imageUrl和name字段' });
      }
      if (!['wechat', 'alipay', 'other'].includes(data.type)) {
        return res.status(400).json({ message: '收款码类型必须是wechat、alipay或other' });
      }
    } else if (type === 'bankCard') {
      if (!data.bankName || !data.cardNumber || !data.accountName) {
        return res.status(400).json({ message: '银行卡必须包含bankName、cardNumber和accountName字段' });
      }
      // 验证银行卡号格式
      if (!/^\d{16,19}$/.test(data.cardNumber.replace(/\s/g, ''))) {
        return res.status(400).json({ message: '银行卡号格式不正确' });
      }
    }

    // 添加付款方式
    user.addPaymentMethod(type, data);
    await user.save();

    res.status(200).json({
      message: '付款方式添加成功',
      paymentMethods: user.getPaymentMethods()
    });
  } catch (error) {
    console.error('添加付款方式失败:', error);
    res.status(400).json({ message: '添加付款方式失败', error: error.message });
  }
});

/**
 * @api {delete} /admin/users/:id/payment-methods/:type/:index 删除单个付款方式
 * @apiDescription 删除指定管理员的单个付款方式
 * @apiHeader {String} Authorization Bearer JWT
 * @apiParam {String} type 付款方式类型 (qrCode 或 bankCard)
 * @apiParam {Number} index 要删除的付款方式索引
 */
router.delete('/:id/payment-methods/:type/:index', adminAuth, async (req, res) => {
  try {
    const { type, index } = req.params;
    const user = await AdminUser.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: '管理员不存在' });
    }

    // 获取当前登录的管理员信息
    const currentAdmin = req.admin;

    // 只有超级管理员或本人可以删除付款方式
    if (currentAdmin.role !== 'admin' && currentAdmin.id !== user.id) {
      return res.status(403).json({ message: '无权限删除此管理员的付款方式' });
    }

    // 验证类型
    if (!['qrCode', 'bankCard'].includes(type)) {
      return res.status(400).json({ message: '无效的付款方式类型' });
    }

    // 验证索引
    const indexNum = parseInt(index);
    if (isNaN(indexNum) || indexNum < 0) {
      return res.status(400).json({ message: '无效的索引值' });
    }

    // 检查索引是否存在
    const currentMethods = user.getPaymentMethods();
    const targetArray = type === 'qrCode' ? currentMethods.qrCodes : currentMethods.bankCards;

    if (!targetArray || indexNum >= targetArray.length) {
      return res.status(400).json({ message: '指定的付款方式不存在' });
    }

    // 删除付款方式
    user.removePaymentMethod(type, indexNum);
    await user.save();

    res.status(200).json({
      message: '付款方式删除成功',
      paymentMethods: user.getPaymentMethods()
    });
  } catch (error) {
    console.error('删除付款方式失败:', error);
    res.status(400).json({ message: '删除付款方式失败', error: error.message });
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

module.exports = router;
