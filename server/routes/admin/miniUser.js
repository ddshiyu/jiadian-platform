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
        'phone', 'age', 'openid', 'warningNum',
        'createdAt', 'updatedAt', 'userType'
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: size
    });

    // 使用分页中间件的paginate方法返回分页结果，只返回pageNum和pageSize
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
        'phone', 'age', 'openid', 'warningNum',
        'createdAt', 'updatedAt', 'userType'
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

    res.status(200).json(user);
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({
      message: '获取用户详情失败',
      error: error.message
    });
  }
});

/**
 * @api {put} /admin/mini-users/:id/warning-num 修改用户剩余提醒次数
 * @apiName UpdateWarningNum
 * @apiGroup AdminMiniUser
 * @apiParam {Number} id 用户ID
 * @apiParam {Number} warningNum 提醒次数
 */
router.put('/:id/warning-num', async (req, res) => {
  try {
    const userId = req.params.id;
    const { warningNum } = req.body;

    if (!Number.isInteger(parseInt(warningNum)) || parseInt(warningNum) < 0) {
      return res.status(400).json({
        message: '提醒次数必须是大于等于0的整数'
      });
    }

    // 查询用户是否存在
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        message: '用户不存在'
      });
    }

    // 更新用户提醒次数
    await user.update({ warningNum: parseInt(warningNum) });

    res.status(200).json({
      message: '用户提醒次数更新成功'
    });
  } catch (error) {
    console.error('更新用户提醒次数失败:', error);
    res.status(500).json({
      message: '更新用户提醒次数失败',
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

module.exports = router;
