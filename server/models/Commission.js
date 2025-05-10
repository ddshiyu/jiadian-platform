/**
 * 佣金记录模型
 *
 * 用于存储用户获得佣金的记录
 *
 * 字段说明：
 * - userId: 获得佣金的用户ID
 * - amount: 佣金金额
 * - orderId: 关联的订单ID
 * - inviteeId: 被邀请人ID
 * - status: 佣金状态(待结算、已结算、已取消)
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Commission = sequelize.define("Commission", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '获得佣金的用户ID',
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '佣金金额'
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的订单ID',
    references: {
      model: 'Orders',
      key: 'id'
    }
  },
  inviteeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '被邀请人ID',
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
    comment: '佣金状态: 待结算、已结算、已取消',
    validate: {
      isIn: [['pending', 'settled', 'cancelled']]
    }
  }
}, {
  tableName: 'Commission',
  timestamps: true, // 启用 createdAt 和 updatedAt
  comment: '佣金记录表',
  indexes: [
    {
      name: 'user_id_index',
      fields: ['userId']
    },
    {
      name: 'order_id_index',
      fields: ['orderId']
    },
    {
      name: 'invitee_id_index',
      fields: ['inviteeId']
    }
  ]
});

module.exports = Commission;
