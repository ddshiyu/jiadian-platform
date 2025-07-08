/**
 * 佣金管理路由
 *
 * 提供管理员查看和管理用户佣金的API接口
 */

const express = require('express');
const router = express.Router();
const { Commission, User, Order, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * @api {get} /admin/commissions/page 获取佣金记录列表（分页）
 * @apiName GetCommissionsPage
 * @apiGroup AdminCommission
 * @apiParam {Number} [pageNum=1] 当前页码
 * @apiParam {Number} [pageSize=10] 每页数量
 * @apiParam {String} [status] 佣金状态(pending/settled/cancelled)
 * @apiParam {String} [userId] 获得佣金的用户ID
 * @apiParam {String} [phone] 用户电话号码（模糊查询）
 */
router.get('/page', async (req, res) => {
  try {
    // 使用中间件提供的分页参数获取方法
    const { page, size, offset } = req.getPaginationParams({
      pageName: 'pageNum',
      sizeName: 'pageSize'
    });

    // 获取筛选参数
    const status = req.query.status;
    const userId = req.query.userId;
    const phone = req.query.phone;

    // 构建查询条件
    const where = {};
    const includeOptions = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'nickname', 'phone', 'avatar']
      },
      {
        model: User,
        as: 'invitee',
        attributes: ['id', 'nickname', 'phone', 'avatar']
      },
      {
        model: Order,
        attributes: ['id', 'orderNo', 'totalAmount', 'status']
      }
    ];

    if (status) {
      where.status = status;
    }
    if (userId) {
      where.userId = userId;
    }

    // 如果有电话查询，需要使用关联查询
    if (phone) {
      includeOptions[0].where = {
        phone: { [Op.like]: `%${phone}%` }
      };
      includeOptions[0].required = true; // 内连接，确保必须匹配到用户
    }

    // 查询总数（需要考虑关联查询条件）
    const total = await Commission.count({
      where,
      include: phone ? [includeOptions[0]] : undefined,
      distinct: true
    });

    // 查询佣金记录
    const commissions = await Commission.findAll({
      where,
      include: includeOptions,
      order: [['createdAt', 'DESC']],
      limit: size,
      offset
    });

    // 使用分页中间件返回结果
    res.paginate(commissions, {
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
    console.error('获取佣金记录失败:', error);
    res.status(500).json({
      message: '获取佣金记录失败',
      error: error.message
    });
  }
});

/**
 * @api {get} /admin/commissions/statistics 获取佣金统计数据
 * @apiName GetCommissionStatistics
 * @apiGroup AdminCommission
 */
router.get('/statistics', async (req, res) => {
  try {
    // 计算总佣金金额
    const totalCommission = await Commission.sum('amount', {
      where: { status: 'settled' }
    }) || 0;

    // 计算今日佣金
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCommission = await Commission.sum('amount', {
      where: {
        status: 'settled',
        createdAt: { [Op.gte]: today }
      }
    }) || 0;

    // 计算本月佣金
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthCommission = await Commission.sum('amount', {
      where: {
        status: 'settled',
        createdAt: { [Op.gte]: startOfMonth }
      }
    }) || 0;

    // 获取佣金记录总数
    const totalRecords = await Commission.count();

    res.status(200).json({
      totalCommission,
      todayCommission,
      monthCommission,
      totalRecords
    });
  } catch (error) {
    console.error('获取佣金统计数据失败:', error);
    res.status(500).json({
      message: '获取佣金统计数据失败',
      error: error.message
    });
  }
});

/**
 * @api {get} /admin/commissions/:id 获取佣金记录详情
 * @apiName GetCommissionDetail
 * @apiGroup AdminCommission
 * @apiParam {Number} id 佣金记录ID
 */
router.get('/:id', async (req, res) => {
  try {
    const commission = await Commission.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nickname', 'phone', 'avatar']
        },
        {
          model: User,
          as: 'invitee',
          attributes: ['id', 'nickname', 'phone', 'avatar']
        },
        {
          model: Order,
          attributes: ['id', 'orderNo', 'totalAmount', 'status', 'createdAt']
        }
      ]
    });

    if (!commission) {
      return res.status(404).json({ message: '佣金记录不存在' });
    }

    res.status(200).json(commission);
  } catch (error) {
    console.error('获取佣金记录详情失败:', error);
    res.status(500).json({
      message: '获取佣金记录详情失败',
      error: error.message
    });
  }
});

/**
 * @api {put} /admin/commissions/:id/status 更新佣金记录状态
 * @apiName UpdateCommissionStatus
 * @apiGroup AdminCommission
 * @apiParam {Number} id 佣金记录ID
 * @apiParam {String} status 佣金状态(pending/settled/cancelled)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'settled', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: '无效的佣金状态' });
    }

    const commission = await Commission.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!commission) {
      return res.status(404).json({ message: '佣金记录不存在' });
    }

    // 如果状态没有变化，直接返回成功
    if (commission.status === status) {
      return res.status(200).json({
        message: '佣金状态已更新',
        commission
      });
    }

    // 开启事务
    const t = await sequelize.transaction();

    try {
      const oldStatus = commission.status;

      // 更新佣金状态
      commission.status = status;
      await commission.save({ transaction: t });

      // 处理用户佣金金额变更
      const user = commission.user;

      // 如果原来是已结算，现在取消，需要减去佣金
      if (oldStatus === 'settled' && status === 'cancelled') {
        user.commission = parseFloat(user.commission) - parseFloat(commission.amount);
        await user.save({ transaction: t });
      }

      // 如果原来是待结算或已取消，现在变为已结算，需要加上佣金
      if ((oldStatus === 'pending' || oldStatus === 'cancelled') && status === 'settled') {
        user.commission = parseFloat(user.commission) + parseFloat(commission.amount);
        await user.save({ transaction: t });
      }

      await t.commit();

      res.status(200).json({
        message: '佣金状态已更新',
        commission
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('更新佣金状态失败:', error);
    res.status(500).json({
      message: '更新佣金状态失败',
      error: error.message
    });
  }
});

module.exports = router;
