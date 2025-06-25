/**
 * 公告模型
 *
 * 用于管理系统公告信息
 *
 * 字段说明：
 * - title: 公告标题
 * - content: 公告内容
 * - status: 状态（active-激活、inactive-未激活）
 * - startTime: 开始时间
 * - endTime: 结束时间
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Announcement = sequelize.define("Announcement", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '公告标题'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '公告内容'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
    comment: '状态（active-激活、inactive-未激活）'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '开始时间'
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '结束时间'
  },
  viewCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '浏览次数'
  }
});

// 添加同步方法，用于更新数据库表结构
const syncAnnouncementTable = async () => {
  try {
    // 使用alter:true确保保留现有数据
    await Announcement.sync({ alter: true });
    console.log("公告表结构已同步");
  } catch (error) {
    console.error('公告表同步失败:', error.message);
  }
};

// 延迟执行表同步
setTimeout(() => {
  syncAnnouncementTable();
}, 3000);

module.exports = Announcement;
