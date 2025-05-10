/**
 * 购物车模型
 *
 * 用于存储用户添加到购物车的商品信息
 *
 * 字段说明：
 * - userId: 用户ID
 * - productId: 商品ID
 * - quantity: 商品数量
 * - selected: 是否选中（结算时使用）
 *
 * 关联关系：
 * - 购物车项属于一个用户(User)
 * - 购物车项关联一个商品(Product)
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Product = require("./Product");

const Cart = sequelize.define("Cart", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  selected: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
});

// 定义关联关系
Cart.belongsTo(User, { foreignKey: 'userId' });
Cart.belongsTo(Product, { foreignKey: 'productId' });

// (async () => {
//   try {
//     Cart.sync();
//     console.log("购物车模型表刚刚(重新)创建！");
//   } catch (error) {
//     console.error('Database sync failed:', error);
//   }
// })();

module.exports = Cart;
