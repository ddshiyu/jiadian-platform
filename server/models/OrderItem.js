/**
 * 订单项模型
 *
 * 用于存储订单中的商品明细信息
 *
 * 字段说明：
 * - orderId: 订单ID
 * - productId: 商品ID
 * - productName: 下单时的商品名称（快照）
 * - productCover: 下单时的商品封面图（快照）
 * - price: 下单时的商品单价（快照）
 * - quantity: 购买数量
 * - specs: 规格信息
 * - comment: 评价内容
 * - commentTime: 评价时间
 * - rating: 评分（1-5星）
 *
 * 关联关系：
 * - 订单项属于一个订单(Order)
 * - 订单项关联一个商品(Product)
 *
 * 特点：
 * - 包含商品信息的快照，防止商品修改影响历史订单
 * - 支持用户对购买商品进行评价和评分
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Order = require("./Order");
const Product = require("./Product");

// 创建订单项模型
const OrderItem = sequelize.define("OrderItem", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '订单ID'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '商品ID',
    // 禁用自动创建的索引
    index: false
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '下单时的商品名称（快照）'
  },
  productCover: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '下单时的商品封面图（快照）'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '下单时的商品单价（快照）'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '购买数量'
  },
  specs: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '规格信息'
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '评价内容'
  },
  commentTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '评价时间'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '评分（1-5星）'
  }
}, {
  tableName: 'OrderItems',
  timestamps: true, // 启用 createdAt 和 updatedAt
  comment: '订单项表',
  indexes: [
    // 显式定义需要的索引，避免自动创建太多索引
    {
      name: 'order_id_index',
      fields: ['orderId']
    }
    // 不为productId创建索引，减少总索引数
  ]
});

// 定义关联关系
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

// 创建或更新表结构 - 增加重试机制
const syncOrderItemTable = async (retries = 5, delay = 2000) => {
  let attempt = 0;

  while (attempt < retries) {
    try {
      // 使用force: false和alter: true选项，确保不会删除现有数据
      await OrderItem.sync({ alter: true, force: false });
      console.log("订单项表结构已同步");
      return;
    } catch (error) {
      attempt++;
      console.error(`同步订单项表结构失败(尝试 ${attempt}/${retries}):`, error.message);

      // 检查是否为Too many keys错误
      if (error.message.includes('Too many keys specified') && attempt === 1) {
        console.log("检测到索引过多的错误，尝试直接执行SQL语句创建表...");
        try {
          // 使用原始SQL语句创建表，减少索引数量
          const sql = `
          CREATE TABLE IF NOT EXISTS \`OrderItems\` (
            \`id\` INTEGER NOT NULL auto_increment ,
            \`orderId\` INTEGER NOT NULL,
            \`productId\` INTEGER NOT NULL,
            \`productName\` VARCHAR(255) NOT NULL,
            \`productCover\` VARCHAR(255),
            \`price\` DECIMAL(10,2) NOT NULL,
            \`quantity\` INTEGER NOT NULL,
            \`specs\` VARCHAR(255),
            \`comment\` TEXT,
            \`commentTime\` DATETIME,
            \`rating\` INTEGER,
            \`createdAt\` DATETIME NOT NULL,
            \`updatedAt\` DATETIME NOT NULL,
            PRIMARY KEY (\`id\`),
            INDEX \`orderId\` (\`orderId\`)
          ) ENGINE=InnoDB;
          `;
          await sequelize.query(sql);
          console.log("使用原始SQL创建订单项表成功");
          return;
        } catch (sqlError) {
          console.error("使用原始SQL创建表失败:", sqlError.message);
        }
      }

      // 检查是否为死锁错误
      if ((error.message.includes('Deadlock') || error.message.includes('Lock wait timeout')) && attempt < retries) {
        console.log(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (attempt >= retries) {
        console.error("达到最大重试次数，同步失败:", error);
        break;
      } else {
        throw error; // 如果不是死锁错误，直接抛出
      }
    }
  }
};

// 设置较长的延迟再同步表结构，避免与其他模型同时同步
setTimeout(() => {
  syncOrderItemTable().catch(err => {
    console.error("订单项表同步最终失败:", err);
  });
}, 5000); // 延迟5秒

module.exports = OrderItem;
