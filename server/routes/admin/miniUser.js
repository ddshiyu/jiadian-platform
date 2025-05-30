const express = require('express');
const router = express.Router();
const { User, Address, Order } = require('../../models');
const { Op } = require('sequelize');
const adminAuth = require('../../middleware/adminAuth');
const sequelize = require('../../config/database');

/**
 * @api {get} /admin/mini-users/page 获取小程序用户列表
 * @apiName GetMiniUsers
 * @apiGroup AdminMiniUser
 * @apiParam {Number} [pageNum=1] 当前页码
 * @apiParam {Number} [pageSize=10] 每页数量
 * @apiParam {String} [keyword] 搜索关键词（可搜索昵称、手机号）
 * @apiParam {String} [gender] 性别过滤（男/女/其他）
 * @apiParam {String} [userType] 用户类型过滤（consumer/supplier）
 */
router.get('/page', async (req, res) => {
  try {
    // 使用中间件提供的分页参数获取方法，并指定参数名
    const { page, size, offset } = req.getPaginationParams({
      pageName: 'pageNum',
      sizeName: 'pageSize'
    });
    const keyword = req.query.keyword || '';
    const gender = req.query.gender;
    const userType = req.query.userType;

    // 构建查询条件
    const where = {};

    // 关键词搜索
    if (keyword) {
      where[Op.or] = [
        { nickname: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } }
      ];
    }

    // 性别过滤
    if (gender) {
      where.gender = gender;
    }

    // 用户类型过滤
    if (userType) {
      where.userType = userType;
    }

    // 查询用户总数
    const total = await User.count({ where });

    // 查询用户列表
    const users = await User.findAll({
      where,
      attributes: [
        'id', 'nickname', 'gender', 'avatar',
        'phone', 'age', 'openid',
        'createdAt', 'updatedAt', 'userType',
        'isVip', 'vipExpireDate'
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: size
    });

    // 处理VIP状态，检查是否过期
    const processedUsers = users.map(user => {
      const userData = user.toJSON();

      // 检查VIP是否过期
      if (userData.isVip && userData.vipExpireDate) {
        const isExpired = new Date(userData.vipExpireDate) <= new Date();
        userData.vipStatus = isExpired ? 'expired' : 'active';
        userData.isVipActive = !isExpired;

        // 如果VIP已过期但数据库中仍标记为VIP，可以选择更新数据库
        if (isExpired && userData.isVip) {
          // 这里可以选择是否自动更新数据库中的VIP状态
          // await user.update({ isVip: false });
          userData.vipStatusNote = 'VIP已过期，建议更新状态';
        }
      } else {
        userData.vipStatus = 'none';
        userData.isVipActive = false;
      }

      return userData;
    });

    // 使用分页中间件的paginate方法返回分页结果，只返回pageNum和pageSize
    res.paginate(processedUsers, {
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
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      message: '获取用户列表失败',
      error: error.message
    });
  }
});

/**
 * @api {get} /admin/mini-users/:id 获取小程序用户详情
 * @apiName GetMiniUserDetail
 * @apiGroup AdminMiniUser
 * @apiParam {Number} id 用户ID
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // 查询用户详情
    const user = await User.findByPk(userId, {
      attributes: [
        'id', 'nickname', 'gender', 'avatar',
        'phone', 'age', 'openid',
        'createdAt', 'updatedAt', 'userType',
        'isVip', 'vipExpireDate'
      ],
      include: [
        {
          model: Address,
          attributes: ['id', 'name', 'phone', 'province', 'city', 'district', 'detail', 'isDefault']
        },
        {
          model: Order,
          attributes: ['id', 'orderNo', 'totalAmount', 'status', 'createdAt']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        message: '用户不存在'
      });
    }

    // 处理VIP状态，检查是否过期
    const userData = user.toJSON();
    const now = new Date();

    if (userData.isVip && userData.vipExpireDate) {
      const isExpired = new Date(userData.vipExpireDate) <= now;
      userData.vipStatus = isExpired ? 'expired' : 'active';
      userData.isVipActive = !isExpired;

      // 如果VIP已过期但数据库中仍标记为VIP，可以选择更新数据库
      if (isExpired && userData.isVip) {
        // 这里可以选择是否自动更新数据库中的VIP状态
        // await user.update({ isVip: false });
        userData.vipStatusNote = 'VIP已过期，建议更新状态';
      }
    } else {
      userData.vipStatus = 'none';
      userData.isVipActive = false;
    }

    res.status(200).json(userData);
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({
      message: '获取用户详情失败',
      error: error.message
    });
  }
});

/**
 * @api {put} /admin/mini-users/:id/user-type 设置用户身份类型
 * @apiName UpdateUserType
 * @apiGroup AdminMiniUser
 * @apiParam {Number} id 用户ID
 * @apiDescription 一键切换用户身份类型：如果用户是消费者则设置为供应商，反之亦然
 */
router.put('/:id/user-type', adminAuth, async (req, res) => {
  // 开启事务
  const t = await sequelize.transaction();

  try {
    const userId = req.params.id;

    // 查询用户是否存在
    const user = await User.findByPk(userId, { transaction: t });

    if (!user) {
      await t.rollback();
      return res.status(404).json({
        message: '用户不存在'
      });
    }

    // 确定新的用户类型（如果当前是消费者则切换为供应商，反之亦然）
    const newUserType = user.userType === 'consumer' ? 'supplier' : 'consumer';

    // 更新用户身份类型
    await user.update({ userType: newUserType }, { transaction: t });

    // 提交事务
    await t.commit();

    res.status(200).json({
      message: `用户身份已从${user.userType === 'consumer' ? '消费者' : '供应商'}切换为${newUserType === 'consumer' ? '消费者' : '供应商'}`,
      user: {
        id: user.id,
        nickname: user.nickname,
        userType: newUserType
      }
    });
  } catch (error) {
    // 回滚事务
    await t.rollback();
    console.error('更新用户身份类型失败:', error);
    res.status(500).json({
      message: '更新用户身份类型失败',
      error: error.message
    });
  }
});

/**
 * @api {put} /admin/mini-users/:id/vip 设置用户VIP状态
 * @apiName SetUserVip
 * @apiGroup AdminMiniUser
 * @apiParam {Number} id 用户ID
 * @apiParam {Number} [duration=12] VIP时长（月数，默认12个月）
 * @apiParam {String} [remark] 备注信息
 * @apiDescription 管理员为用户开通或延长VIP会员
 */
router.put('/:id/vip', adminAuth, async (req, res) => {
  // 开启事务
  const t = await sequelize.transaction();

  try {
    const userId = req.params.id;
    const { duration = 12, remark } = req.body;

    // 验证时长参数
    if (!Number.isInteger(duration) || duration <= 0) {
      await t.rollback();
      return res.status(400).json({
        message: 'VIP时长必须是正整数（月数）'
      });
    }

    // 查询用户是否存在
    const user = await User.findByPk(userId, { transaction: t });

    if (!user) {
      await t.rollback();
      return res.status(404).json({
        message: '用户不存在'
      });
    }

    // 计算VIP到期时间
    let expireDate;
    const now = new Date();

    // 如果用户已经是VIP且未过期，则在现有到期时间基础上延长
    if (user.isVip && user.vipExpireDate && new Date(user.vipExpireDate) > now) {
      expireDate = new Date(user.vipExpireDate);
    } else {
      expireDate = new Date(now);
    }

    // 增加指定月数
    expireDate.setMonth(expireDate.getMonth() + duration);

    // 更新用户VIP状态
    await user.update({
      isVip: true,
      vipExpireDate: expireDate
    }, { transaction: t });

    // 提交事务
    await t.commit();

    res.status(200).json({
      message: `用户VIP已设置成功，有效期至 ${expireDate.toLocaleDateString('zh-CN')}`,
      user: {
        id: user.id,
        nickname: user.nickname,
        isVip: true,
        vipExpireDate: expireDate
      },
      operation: {
        duration: duration,
        remark: remark || '管理员手动设置',
        operatedAt: new Date()
      }
    });
  } catch (error) {
    // 回滚事务
    await t.rollback();
    console.error('设置用户VIP失败:', error);
    res.status(500).json({
      message: '设置用户VIP失败',
      error: error.message
    });
  }
});

module.exports = router;
