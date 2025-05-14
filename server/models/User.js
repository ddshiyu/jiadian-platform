/**
 * 用户模型
 *
 * 用于存储小程序用户信息，包括微信用户基本信息
 *
 * 字段说明：
 * - nickname: 用户昵称，默认生成随机用户名
 * - gender: 用户性别
 * - openid: 微信唯一标识符
 * - avatar: 用户头像URL
 * - age: 用户年龄
 * - phone: 用户电话号码
 * - inviterId: 邀请人的用户ID
 * - commission: 累计获得的佣金
 * - inviteCode: 用户唯一邀请码
 * - isVip: 是否是VIP用户
 * - vipExpireDate: VIP过期时间
 * - userType: 用户身份类型（consumer-消费者、supplier-供应商）
 *
 * 关联关系：
 * - 一个用户可以有多个地址(Address)
 * - 一个用户可以有多个订单(Order)
 * - 一个用户可以有多个购物车项(Cart)
 * - 一个用户可以邀请多个用户(User)
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// 生成随机用户名的函数
function generateRandomUsername() {
  // 生成6位随机字母数字组合
  const randomString = Math.random().toString(36).substring(2, 8);
  return `微信用户_${randomString}`;
}

// 生成唯一邀请码的函数
function generateInviteCode() {
  // 生成8位随机字母数字组合
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const User = sequelize.define("User", {
  nickname: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: generateRandomUsername
  },
  gender: {
    type: DataTypes.ENUM("男", "女", "其他"),
    allowNull: true,
  },
  openid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  inviterId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '邀请人的用户ID'
  },
  commission: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: '累计获得的佣金'
  },
  inviteCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    defaultValue: generateInviteCode,
    comment: '用户唯一邀请码'
  },
  isVip: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否是VIP用户'
  },
  vipExpireDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'VIP过期时间'
  },
  userType: {
    type: DataTypes.ENUM('consumer', 'supplier'),
    allowNull: false,
    defaultValue: 'consumer',
    comment: '用户身份类型：消费者或供应商'
  }
});

// (async () => {
//   try {
//     User.sync();
//     console.log("用户模型表刚刚(重新)创建！");
//   } catch (error) {
//     console.error('Database sync failed:', error);
//   }
// })();

module.exports = User;
