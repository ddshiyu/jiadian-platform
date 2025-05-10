/**
 * 初始化管理员账号脚本
 *
 * 用法: node scripts/initAdmin.js
 *
 * 功能：检查数据库是否存在管理员账号，如不存在则创建默认管理员账号
 */

const { AdminUser } = require('../models/admin');
const sequelize = require('../config/database');

// 初始管理员信息
const adminData = {
  username: 'admin',
  password: 'admin123',  // 会自动哈希
  name: '超级管理员',
  email: 'admin@example.com',
  role: 'admin',
  status: 'active'
};

async function initAdmin() {
  try {
    console.log('开始初始化管理员账号...');

    // 首先确保表存在
    try {
      console.log('确保管理员表已创建...');
      await AdminUser.sync({ alter: true });
      console.log('管理员表结构已同步');
    } catch (syncError) {
      console.error('表同步失败:', syncError);
      throw syncError;
    }

    // 检查是否已存在管理员账号
    const adminCount = await AdminUser.count();

    if (adminCount > 0) {
      console.log('管理员账号已存在，跳过初始化');
      return;
    }

    // 创建管理员账号
    const admin = await AdminUser.create(adminData);

    console.log('管理员账号创建成功:');
    console.log(`- 用户名: ${adminData.username}`);
    console.log(`- 密码: ${adminData.password}`);
    console.log(`- 角色: ${adminData.role}`);

    console.log('初始化完成！');
  } catch (error) {
    console.error('初始化管理员账号失败:', error);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
    process.exit();
  }
}

// 运行初始化
initAdmin();
