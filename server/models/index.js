/**
 * 模型索引文件
 *
 * 该文件负责：
 * 1. 导入所有模型文件
 * 2. 定义模型之间的关联关系
 * 3. 导出所有模型，方便在应用中使用
 *
 * 模型关系概览：
 * - User(用户): 与Address、Order、Cart建立一对多关系，与自身建立邀请关系，与Commission建立一对多关系
 * - Product(商品): 与Category建立多对一关系，与Cart、OrderItem建立一对多关系
 * - Category(分类): 与Product建立一对多关系
 * - Order(订单): 与OrderItem建立一对多关系，与Commission建立一对多关系
 * - OrderItem(订单项): 与Order建立多对一关系
 * - Banner(轮播图): 独立模型，用于首页展示
 * - Commission(佣金): 与User建立多对一关系，与Order建立多对一关系
 */

// 导入小程序模型
const User = require('./User');
const Product = require('./Product');
const Category = require('./Category');
const Cart = require('./Cart');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Address = require('./Address');
const Banner = require('./Banner');
const Commission = require('./Commission');

// 导入管理系统模型
const adminModels = require('./admin');

// 设置模型之间的关联关系
User.hasMany(Address, { foreignKey: 'userId' });
User.hasMany(Order, { foreignKey: 'userId' });
User.hasMany(Cart, { foreignKey: 'userId' });

Product.belongsTo(Category, { foreignKey: 'categoryId' });
Category.hasMany(Product, { foreignKey: 'categoryId' });

Product.hasMany(Cart, { foreignKey: 'productId' });
Product.hasMany(OrderItem, { foreignKey: 'productId' });

Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

// 添加用户邀请关系
User.belongsTo(User, { as: 'inviter', foreignKey: 'inviterId' });
User.hasMany(User, { as: 'invitees', foreignKey: 'inviterId' });

// 添加佣金关系
User.hasMany(Commission, { as: 'commissions', foreignKey: 'userId' });
Commission.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Commission.belongsTo(User, { as: 'invitee', foreignKey: 'inviteeId' });
Order.hasMany(Commission, { foreignKey: 'orderId' });
Commission.belongsTo(Order, { foreignKey: 'orderId' });

// 合并所有模型并导出
module.exports = {
  ...adminModels,
  User,
  Product,
  Category,
  Cart,
  Order,
  OrderItem,
  Address,
  Banner,
  Commission
};
