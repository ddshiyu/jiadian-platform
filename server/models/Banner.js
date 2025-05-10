/**
 * 轮播图模型
 *
 * 用于管理首页轮播图展示
 *
 * 字段说明：
 * - image: 轮播图片URL
 * - content: 轮播图内容描述
 * - link: 点击跳转链接
 * - sort: 排序顺序（数字越小越靠前）
 * - status: 状态（激活、未激活）
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Banner = sequelize.define("Banner", {
  image: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '轮播图片URL'
  },
  content: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '轮播图内容描述'
  },
  link: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '点击跳转链接'
  },
  sort: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '排序顺序（数字越小越靠前）'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
    comment: '状态（激活、未激活）'
  }
});

// 添加同步方法，用于更新数据库表结构
const syncBannerTable = async () => {
  try {
    // 使用alter:true确保保留现有数据
    await Banner.sync({ alter: true });
    console.log("轮播图表结构已同步");
  } catch (error) {
    console.error('轮播图表同步失败:', error.message);
  }
};

// 延迟执行表同步
setTimeout(() => {
  syncBannerTable();
}, 3000);

module.exports = Banner;
