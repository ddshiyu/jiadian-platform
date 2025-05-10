/**
 * 初始化管理员账号脚本
 * 用于确保系统中存在默认的管理员账号
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const path = require('path');

// 显示脚本当前路径和.env文件路径
console.log('脚本路径:', __dirname);
console.log('.env文件路径:', path.resolve(__dirname, '../.env'));

// 硬编码数据库连接信息
const DB_CONFIG = {
  dialect: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'fjd775852',
  database: 'homeMachine',
  logging: console.log,
};

console.log('=== 数据库连接信息 ===');
console.log('主机:', DB_CONFIG.host);
console.log('端口:', DB_CONFIG.port);
console.log('数据库:', DB_CONFIG.database);
console.log('用户名:', DB_CONFIG.username || '(未设置)');
console.log('密码:', DB_CONFIG.password ? '(已设置)' : '(未设置)');
console.log('====================');

// 创建数据库连接
const sequelize = new Sequelize(
  DB_CONFIG.database,
  DB_CONFIG.username,
  DB_CONFIG.password,
  {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    dialect: DB_CONFIG.dialect,
    logging: DB_CONFIG.logging
  }
);

// 定义AdminUser模型
const AdminUser = sequelize.define('AdminUser', {
  username: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
    set(value) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(value, salt);
      this.setDataValue('password', hash);
    }
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  email: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  role: {
    type: Sequelize.ENUM('admin', 'editor', 'viewer'),
    allowNull: false,
    defaultValue: 'admin'
  },
  status: {
    type: Sequelize.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active'
  }
}, {
  timestamps: true
});

async function initAdminUser() {
  try {
    console.log('开始初始化管理员账号...');

    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功!');

    // 确保AdminUser表存在
    await AdminUser.sync({ alter: true });
    console.log('AdminUser表已同步!');

    // 检查是否已有管理员账号
    const adminCount = await AdminUser.count();
    console.log(`当前系统中有 ${adminCount} 个管理员账号`);

    if (adminCount === 0) {
      console.log('没有找到管理员账号，正在创建默认账号...');

      // 创建默认管理员账号
      const admin = await AdminUser.create({
        username: 'admin',
        password: 'admin123', // 密码会自动哈希
        name: '系统管理员',
        role: 'admin',
        email: 'admin@example.com'
      });

      console.log(`默认管理员账号创建成功! ID: ${admin.id}`);
      console.log('账号信息:');
      console.log('- 用户名: admin');
      console.log('- 密码: admin123');
      console.log('- 角色: admin');
    } else {
      console.log('系统中已存在管理员账号，跳过创建默认账号步骤');
    }

    console.log('初始化管理员账号完成!');
  } catch (error) {
    console.error('初始化管理员账号时出错:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// 执行初始化
initAdminUser();
