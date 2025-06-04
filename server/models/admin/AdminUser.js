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
 * - paymentMethods: 收款方式配置（JSON格式，包含收款码和银行卡信息）
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
  },
  paymentMethods: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: "收款方式配置，包含收款码和银行卡信息",
    validate: {
      isValidPaymentMethods(value) {
        if (value === null || value === undefined) return;

        // 验证JSON结构
        if (typeof value !== 'object') {
          throw new Error('收款方式必须是对象格式');
        }

        // 验证收款码
        if (value.qrCodes && !Array.isArray(value.qrCodes)) {
          throw new Error('收款码必须是数组格式');
        }

        if (value.qrCodes) {
          for (const qr of value.qrCodes) {
            if (!qr.type || !qr.imageUrl) {
              throw new Error('收款码必须包含type和imageUrl字段');
            }
            if (!['wechat', 'alipay', 'other'].includes(qr.type)) {
              throw new Error('收款码类型必须是wechat、alipay或other');
            }
          }
        }

        // 验证银行卡
        if (value.bankCards && !Array.isArray(value.bankCards)) {
          throw new Error('银行卡必须是数组格式');
        }

        if (value.bankCards) {
          for (const card of value.bankCards) {
            if (!card.bankName || !card.cardNumber || !card.accountName) {
              throw new Error('银行卡必须包含bankName、cardNumber和accountName字段');
            }
            // 验证银行卡号格式（简单验证）
            if (!/^\d{16,19}$/.test(card.cardNumber.replace(/\s/g, ''))) {
              throw new Error('银行卡号格式不正确');
            }
          }
        }
      }
    }
  }
}, {
  tableName: 'AdminUsers', // 明确指定表名
  timestamps: true
});

// 添加实例方法用于密码验证
AdminUser.prototype.comparePassword = async function(password) {
  return bcrypt.compareSync(password, this.password);
};

// 添加收款方式管理的实例方法
AdminUser.prototype.addPaymentMethod = function(type, data) {
  const currentMethods = this.paymentMethods || { qrCodes: [], bankCards: [] };

  if (type === 'qrCode') {
    if (!currentMethods.qrCodes) currentMethods.qrCodes = [];
    currentMethods.qrCodes.push(data);
  } else if (type === 'bankCard') {
    if (!currentMethods.bankCards) currentMethods.bankCards = [];
    currentMethods.bankCards.push(data);
  }

  this.paymentMethods = currentMethods;
  return this;
};

AdminUser.prototype.removePaymentMethod = function(type, index) {
  const currentMethods = this.paymentMethods || { qrCodes: [], bankCards: [] };

  if (type === 'qrCode' && currentMethods.qrCodes && currentMethods.qrCodes[index]) {
    currentMethods.qrCodes.splice(index, 1);
  } else if (type === 'bankCard' && currentMethods.bankCards && currentMethods.bankCards[index]) {
    currentMethods.bankCards.splice(index, 1);
  }

  this.paymentMethods = currentMethods;
  return this;
};

AdminUser.prototype.getPaymentMethods = function() {
  return this.paymentMethods || { qrCodes: [], bankCards: [] };
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
