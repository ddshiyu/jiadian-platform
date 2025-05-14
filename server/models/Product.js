/**
 * 商品模型
 *
 * 用于存储商城所有商品信息
 *
 * 字段说明：
 * - name: 商品名称
 * - description: 商品描述
 * - price: 商品价格
 * - originalPrice: 商品原价
 * - wholesalePrice: 商品批发价格
 * - stock: 库存数量
 * - sales: 销售数量
 * - cover: 商品封面图
 * - images: 商品图片集合（以JSON形式存储）
 * - status: 商品状态（在售、下架、已删除）
 * - categoryId: 商品分类ID
 * - isRecommended: 是否为热门推荐商品
 *
 * 关联关系：
 * - 商品属于一个分类(Category)
 * - 一个商品可以存在于多个购物车(Cart)
 * - 一个商品可以关联多个订单项(OrderItem)
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product = sequelize.define("Product", {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  wholesalePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: '商品批发价格'
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  sales: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  cover: {
    type: DataTypes.STRING,
    allowNull: true
  },
  images: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('images');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('images', JSON.stringify(value));
    }
  },
  status: {
    type: DataTypes.ENUM('on_sale', 'off_sale', 'deleted'),
    allowNull: false,
    defaultValue: 'off_sale'
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  isRecommended: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否为热门推荐商品'
  }
});

// 创建或更新表结构 - 增加重试机制
const syncProductTable = async (retries = 5, delay = 2000) => {
  let attempt = 0;

  while (attempt < retries) {
    try {
      // 使用force: false和alter: true选项，确保不会删除现有数据
      await Product.sync({ alter: true, force: false });
      console.log("商品表结构已同步");
      return;
    } catch (error) {
      attempt++;
      console.error(`同步商品表结构失败(尝试 ${attempt}/${retries}):`, error.message);

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

// 先导出模块，然后延迟同步表结构，避免与其他模型同时同步
module.exports = Product;

// 设置延迟同步，使其与其他模型错开
setTimeout(() => {
  syncProductTable().catch(err => {
    console.error("商品表同步最终失败:", err);
  });
}, 1000); // 延迟1秒，比Order先同步
