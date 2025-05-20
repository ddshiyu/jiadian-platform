/**
 * 管理员用户模型
 *
 * 用于存储后台管理系统的管理员账户信息
 *
 * 字段说明：
 * - username: 管理员用户名
 * - password: 管理员密码（自动哈希加密处理）
 * - name: 管理员姓名
 * - email: 管理员电子邮箱
 * - phone: 管理员手机号码
 * - role: 管理员角色（admin-超级管理员，拥有所有权限；user-商家用户，可以发布产品和管理自己的订单）
 * - status: 账号状态（active-激活、inactive-未激活）
 *
 * 核心方法：
 * - comparePassword: 验证密码是否匹配（实例方法）
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const bcrypt = require("bcryptjs");

const AdminUser = sequelize.define("AdminUser", {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      // 自动哈希密码
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(value, salt);
      this.setDataValue('password', hash);
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      is: /^1[3-9]\d{9}$/  // 验证中国大陆手机号格式
    }
  },
  role: {
    type: DataTypes.ENUM("admin", "user"),
    allowNull: false,
    defaultValue: "user",
    comment: "admin-超级管理员，拥有所有权限；user-商家用户，可以发布产品和管理自己的订单"
  },
  status: {
    type: DataTypes.ENUM("active", "inactive"),
    allowNull: false,
    defaultValue: "active"
  }
}, {
  tableName: 'AdminUsers', // 明确指定表名
  timestamps: true
});

// 添加实例方法用于密码验证
AdminUser.prototype.comparePassword = async function(password) {
  return bcrypt.compareSync(password, this.password);
};

// 创建或更新表结构 - 添加同步功能
const syncAdminUserTable = async (retries = 5, delay = 2000) => {
  let attempt = 0;

  while (attempt < retries) {
    try {
      // 先执行数据迁移
      await migrateRoleData();

      // 使用force: false和alter: true选项，确保不会删除现有数据
      await AdminUser.sync({ alter: true });
      console.log("管理员用户表结构已同步");
      return;
    } catch (error) {
      attempt++;
      console.error(`同步管理员用户表结构失败(尝试 ${attempt}/${retries}):`, error.message);

      if (attempt < retries) {
        console.log(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error("达到最大重试次数，同步失败:", error);
        throw error;
      }
    }
  }
};

// 数据迁移函数：将editor和viewer角色转换为user
const migrateRoleData = async () => {
  try {
    // 使用原始SQL查询来更新角色
    await sequelize.query(`
      UPDATE AdminUsers
      SET role = 'user'
      WHERE role IN ('editor', 'viewer')
    `);
    console.log("角色数据迁移完成");
  } catch (error) {
    console.error("角色数据迁移失败:", error);
    throw error;
  }
};

// 导出模型
module.exports = AdminUser;

// 设置延迟同步，避免与其他模型同时同步引起冲突
setTimeout(() => {
  // syncAdminUserTable().catch(err => {
  //   console.error("管理员用户表同步最终失败:", err);
  // });
}, 1500);
