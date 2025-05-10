/**
 * 地址模型
 *
 * 用于存储用户的收货地址信息
 *
 * 字段说明：
 * - userId: 用户ID
 * - name: 收货人姓名
 * - phone: 收货人电话
 * - province: 省份
 * - city: 城市
 * - district: 区/县
 * - detail: 详细地址
 * - isDefault: 是否为默认地址
 *
 * 关联关系：
 * - 地址属于一个用户(User)
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const Address = sequelize.define("Address", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  province: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  district: {
    type: DataTypes.STRING,
    allowNull: false
  },
  detail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
});

// 定义关联关系
Address.belongsTo(User, { foreignKey: 'userId' });

// (async () => {
//   try {
//     Address.sync();
//     console.log("地址模型表刚刚(重新)创建！");
//   } catch (error) {
//     console.error('Database sync failed:', error);
//   }
// })();

module.exports = Address;
