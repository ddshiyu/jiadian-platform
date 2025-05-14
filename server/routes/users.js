const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User, Commission, Order } = require('../models');
const axios = require('axios');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const WxPay = require('wechatpay-node-v3');
const fs = require('fs');
const sequelize = require('../config/database');
require("dotenv").config();

// 微信支付实例，放在路由外部全局定义，避免重复创建
const pay = new WxPay({
  appid: 'wxdbf33242ae262c89',
  mchid: process.env.WECHAT_MCHID,
  publicKey: fs.readFileSync(__dirname + '/../wxpay_pem/apiclient_cert.pem'), // 公钥
  privateKey: fs.readFileSync(__dirname + '/../wxpay_pem/apiclient_key.pem'), // 秘钥
});

// 接受邀请码参数，处理邀请关系
router.post('/login', async (req, res) => {
  try {
    const { code, inviteCode } = req.body
    const response = await axios.get(
      "https://api.weixin.qq.com/sns/jscode2session",
      {
        params: {
          appid: process.env.WECHAT_APPID,
          secret: process.env.WECHAT_SECRET,
          js_code: code,
          grant_type: "authorization_code",
        },
      }
    );

    const { openid, session_key } = response.data;

    if (!openid) {
      return res.status(400).json({ message: '缺少openid参数' });
    }

    // 查找或创建用户
    let user = await User.findOne({ where: { openid } });
    let isNewUser = false;

    if (!user) {
      // 如果用户不存在，创建新用户
      user = await User.create({ openid });
      isNewUser = true;

      // 如果提供了邀请码且是新用户，建立邀请关系
      if (inviteCode) {
        const inviter = await User.findOne({ where: { inviteCode } });
        if (inviter && inviter.id !== user.id) {
          await user.update({ inviterId: inviter.id });
        }
      }
    }

    // 生成JWT token
    const token = jwt.sign(
      { id: user.id, openid: user.openid },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      isNewUser,
      userInfo: {
        id: user.id,
        nickname: user.nickname,
        gender: user.gender,
        avatar: user.avatar,
        age: user.age,
        phone: user.phone,
        openid: user.openid,
        inviteCode: user.inviteCode,
        commission: user.commission
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户的邀请码
router.get('/invite-code', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({
      inviteCode: user.inviteCode,
      commission: user.commission
    });
  } catch (error) {
    console.error('获取邀请码错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户的佣金记录
router.get('/commissions', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const commissions = await Commission.findAll({
      where: { userId },
      include: [
        {
          model: User,
          as: 'invitee',
          attributes: ['id', 'nickname', 'avatar']
        },
        {
          model: Order,
          attributes: ['id', 'orderNo', 'totalAmount']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(commissions);
  } catch (error) {
    console.error('获取佣金记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户邀请的好友列表
router.get('/invitees', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const invitees = await User.findAll({
      where: { inviterId: userId },
      attributes: ['id', 'nickname', 'avatar', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json(invitees);
  } catch (error) {
    console.error('获取邀请好友列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户详细信息
router.get('/user-info', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: {
        exclude: ['openid'] // 排除敏感信息
      },
      include: [
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'nickname', 'avatar']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 获取统计数据
    const inviteesCount = await User.count({
      where: { inviterId: userId }
    });

    const ordersCount = await Order.count({
      where: { userId }
    });

    // 构建响应数据
    const userInfo = {
      id: user.id,
      nickname: user.nickname,
      gender: user.gender,
      avatar: user.avatar,
      age: user.age,
      phone: user.phone,
      inviteCode: user.inviteCode,
      commission: user.commission,
      inviter: user.inviter,
      createdAt: user.createdAt,
      statistics: {
        inviteesCount,
        ordersCount
      }
    };

    res.json(userInfo);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @api {post} /user/phone-number 获取用户手机号
 * @apiName GetPhoneNumber
 * @apiGroup User
 * @apiParam {String} code 手机号获取凭证
 */
router.post('/phone-number', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ message: '缺少手机号获取凭证' });
    }

    // 获取小程序全局唯一后台接口调用凭据（access_token）
    const tokenResponse = await axios.get(
      'https://api.weixin.qq.com/cgi-bin/token',
      {
        params: {
          grant_type: 'client_credential',
          appid: process.env.WECHAT_APPID,
          secret: process.env.WECHAT_SECRET
        }
      }
    );

    if (!tokenResponse.data.access_token) {
      console.error('获取access_token失败:', tokenResponse.data);
      return res.status(500).json({ message: '获取微信凭证失败' });
    }

    const access_token = tokenResponse.data.access_token;

    // 调用微信接口获取手机号
    const phoneResponse = await axios.post(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${access_token}`,
      { code }
    );

    if (phoneResponse.data.errcode !== 0) {
      console.error('获取手机号失败:', phoneResponse.data);
      return res.status(400).json({
        message: '获取手机号失败',
        error: phoneResponse.data.errmsg
      });
    }

    const phoneInfo = phoneResponse.data.phone_info;
    const phoneNumber = phoneInfo.purePhoneNumber;

    // 更新用户手机号
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    await user.update({ phone: phoneNumber });

    res.status(200).json({
      message: '手机号获取成功',
      phoneNumber
    });

  } catch (error) {
    console.error('获取手机号错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @api {post} /user/redeem-invite-code 核销邀请码
 * @apiName RedeemInviteCode
 * @apiGroup User
 * @apiParam {String} inviteCode 被核销的邀请码
 */
router.post('/redeem-invite-code', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ message: '邀请码不能为空' });
    }

    // 获取当前用户信息
    const currentUser = await User.findByPk(userId);

    if (!currentUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 如果用户已经有邀请人，不能再次核销邀请码
    if (currentUser.inviterId) {
      return res.status(400).json({ message: '您已经绑定了邀请人，不能再次核销邀请码' });
    }

    // 查找邀请码对应的用户
    const inviter = await User.findOne({ where: { inviteCode } });

    if (!inviter) {
      return res.status(404).json({ message: '无效的邀请码' });
    }

    // 不能使用自己的邀请码
    if (inviter.id === userId) {
      return res.status(400).json({ message: '不能使用自己的邀请码' });
    }

    // 更新当前用户的邀请人ID
    await currentUser.update({ inviterId: inviter.id });

    // 获取更新后的用户信息
    const updatedUser = await User.findByPk(userId, {
      include: [
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'nickname', 'avatar']
        }
      ]
    });

    res.status(200).json({
      message: '邀请码核销成功',
      inviter: {
        id: inviter.id,
        nickname: inviter.nickname,
        avatar: inviter.avatar
      }
    });
  } catch (error) {
    console.error('核销邀请码错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @api {post} /user/join-vip 加入VIP
 * @apiName JoinVip
 * @apiGroup User
 * @apiParam {Number} amount VIP会员价格
 * @apiDescription 开通年度会员并生成支付参数
 */
router.post('/join-vip', auth, async (req, res) => {
  // 开启事务
  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount) {
      await t.rollback();
      return res.status(400).json({ message: '参数不完整，需要提供会员价格' });
    }

    // 查询用户
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: '用户不存在' });
    }

    // 生成订单号：时间戳 + 4位随机数
    const orderNo = `VIP${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // 创建会员订单
    const order = await Order.create({
      orderNo,
      userId,
      totalAmount: amount,
      status: 'pending_payment',
      paymentStatus: 'unpaid',
      orderType: 'vip', // 标记为VIP订单
      remark: '年度会员订阅'
    }, { transaction: t });

    // 提交事务
    await t.commit();

    // 构建微信支付参数
    const params = {
      description: `开通年度会员`,
      out_trade_no: orderNo,
      notify_url: `${process.env.WECHAT_SUCCESSCALLBACK || 'http://localhost:3000'}/user/vip-notify`,
      amount: {
        total: Math.floor(amount * 100), // 单位为分
      },
      payer: {
        openid: user.openid, // 从用户信息中获取
      }
    };

    // 调用微信支付JSAPI下单
    const payResult = await pay.transactions_jsapi(params);

    // 返回支付参数给客户端
    res.status(200).json({
      success: true,
      payParams: payResult,
      orderInfo: {
        orderId: order.id,
        orderNo: order.orderNo,
        totalAmount: order.totalAmount
      }
    });
  } catch (error) {
    // 如果事务还未提交，进行回滚
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error('会员支付下单失败:', error);
    res.status(500).json({ message: '会员支付下单失败', error: error.message });
  }
});

/**
 * @api {post} /user/vip-notify 会员支付回调接口
 * @apiName VipPayNotify
 * @apiGroup User
 * @apiDescription 微信支付成功后的回调接口
 */
router.post('/vip-notify', async (req, res) => {
  try {
    // 验证签名
    const signature = req.headers['wechatpay-signature'];
    const timestamp = req.headers['wechatpay-timestamp'];
    const nonce = req.headers['wechatpay-nonce'];
    const serial = req.headers['wechatpay-serial'];
    const body = req.body;

    // 解密回调数据
    if (body.resource && body.resource.ciphertext) {
      const { ciphertext, associated_data, nonce } = body.resource;
      const result = pay.decipher_gcm(ciphertext, associated_data, nonce, process.env.WECHAT_APIV3SECRET);

      console.log('VIP支付回调解密结果:', result);

      // 处理支付结果
      if (result && result.out_trade_no && result.trade_state === 'SUCCESS') {
        // 开启事务
        const t = await sequelize.transaction();

        try {
          // 查找订单
          const order = await Order.findOne({
            where: {
              orderNo: result.out_trade_no,
              orderType: 'vip'
            },
            transaction: t
          });

          if (order) {
            // 更新订单状态为已支付
            order.status = 'completed';
            order.paymentStatus = 'paid';
            order.paymentMethod = 'wechat';
            order.paymentTime = new Date();
            order.transactionId = result.transaction_id;

            await order.save({ transaction: t });

            // 查询用户
            const user = await User.findByPk(order.userId, { transaction: t });
            if (user) {
              // 计算VIP到期时间（固定为1年）
              let expireDate;
              const now = new Date();

              // 如果用户已经是VIP且未过期，则在现有到期时间基础上延长1年
              if (user.isVip && user.vipExpireDate && new Date(user.vipExpireDate) > now) {
                expireDate = new Date(user.vipExpireDate);
              } else {
                expireDate = now;
              }

              // 增加1年
              expireDate.setFullYear(expireDate.getFullYear() + 1);

              // 更新用户VIP状态
              await user.update({
                isVip: true,
                vipExpireDate: expireDate
              }, { transaction: t });
            }

            // 提交事务
            await t.commit();

            console.log(`VIP订单 ${result.out_trade_no} 支付成功已更新，用户会员已开通`);
          } else {
            console.error(`未找到VIP订单: ${result.out_trade_no}`);
            await t.rollback();
          }
        } catch (error) {
          // 回滚事务
          await t.rollback();
          console.error('更新VIP订单状态失败:', error);
        }

        // 返回成功处理的响应
        return res.status(200).json({ code: 'SUCCESS', message: '成功' });
      }
    }

    res.status(200).json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('处理VIP支付回调失败:', error);
    res.status(500).json({ code: 'FAIL', message: '处理失败' });
  }
});

/**
 * @api {get} /user/vip-status 获取VIP状态
 * @apiName GetVipStatus
 * @apiGroup User
 */
router.get('/vip-status', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 查询用户
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const now = new Date();
    const isExpired = !user.vipExpireDate || new Date(user.vipExpireDate) <= now;

    // 如果VIP已过期但状态未更新，则更新状态
    if (user.isVip && isExpired) {
      await user.update({ isVip: false });
      user.isVip = false;
    }

    res.status(200).json({
      isVip: user.isVip,
      vipExpireDate: user.vipExpireDate,
      isExpired: isExpired
    });
  } catch (error) {
    console.error('获取VIP状态错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
