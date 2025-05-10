/**
 * 商品分类模型
 *
 * 用于管理商城商品的分类信息（仅支持一级分类）
 *
 * 字段说明：
 * - name: 分类名称
 * - description: 分类描述
 * - icon: 分类图标
 * - sort: 排序顺序（数字越小越靠前）
 * - status: 分类状态（激活、未激活）
 *
 * 关联关系：
 * - 一个分类可以包含多个商品(Product)
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Category = sequelize.define("Category", {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sort: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active'
  }
});

// 添加同步方法，用于更新数据库表结构
const syncCategoryTable = async () => {
  try {
    // 使用alter:true确保保留现有数据
    await Category.sync({ alter: true });
    console.log("分类表结构已同步（移除多级分类支持）");
  } catch (error) {
    console.error('分类表同步失败:', error.message);
  }
};

// 延迟执行表同步
setTimeout(() => {
  syncCategoryTable();
}, 2000);

module.exports = Category;
