const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User, Commission, Order } = require('../models');
const axios = require('axios');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
require("dotenv").config();

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
        warningNum: user.warningNum,
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
      warningNum: user.warningNum,
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

module.exports = router;
