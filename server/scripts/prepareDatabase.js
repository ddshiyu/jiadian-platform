/**
 * 数据库准备脚本
 *
 * 用法: node scripts/prepareDatabase.js
 *
 * 功能：
 * 1. 检查数据库连接
 * 2. 按正确顺序同步所有表
 * 3. 初始化必要的系统数据（如管理员账号）
 */

const sequelize = require('../config/database');
const models = require('../models');
const { AdminUser } = require('../models/admin');

// 定义模型同步顺序（被依赖的模型先同步）
const syncOrder = [
  // 基础模型（不依赖其他模型）
  'User',
  'Category',
  'Product',
  'AdminUser',

  // 有一级依赖的模型
  'Address',
  'Banner',
  'Cart',
  'Order',

  // 有二级依赖的模型
  'OrderItem',
  'Commission',
  'ProductView'
];

// 检查数据库连接
async function checkDatabaseConnection() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    return true;
  } catch (error) {
    console.error('无法连接到数据库:', error.message);
    return false;
  }
}

// 同步单个模型
async function syncModel(modelName) {
  try {
    const model = models[modelName];
    if (!model) {
      console.warn(`模型 ${modelName} 不存在，跳过同步`);
      return false;
    }

    await model.sync({ alter: true });
    console.log(`✅ 模型 ${modelName} 同步成功`);
    return true;
  } catch (error) {
    console.error(`❌ 模型 ${modelName} 同步失败: ${error.message}`);
    return false;
  }
}

// 按顺序同步所有模型
async function syncAllModels() {
  console.log('\n===== 开始同步数据库模型 =====');

  for (const modelName of syncOrder) {
    await syncModel(modelName);
  }

  console.log('===== 数据库模型同步完成 =====\n');
}

// 初始化管理员账号
async function initAdminUser() {
  try {
    console.log('===== 初始化管理员账号 =====');

    // 检查是否已有管理员账号
    const adminCount = await AdminUser.count();
    console.log(`当前系统中有 ${adminCount} 个管理员账号`);

    if (adminCount === 0) {
      // 创建默认管理员账号
      const admin = await AdminUser.create({
        username: 'admin',
        password: 'admin123',  // 密码会自动哈希
        name: '系统管理员',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active'
      });

      console.log('✅ 默认管理员账号创建成功');
      console.log('账号信息: admin/admin123');
    } else {
      console.log('系统中已存在管理员账号，无需创建');
    }

    console.log('===== 管理员账号初始化完成 =====\n');
  } catch (error) {
    console.error('❌ 初始化管理员账号失败:', error.message);
  }
}

// 检查和处理外键约束
async function checkForeignKeys() {
  try {
    console.log('===== 检查外键约束 =====');

    // 检查Order表与User表的外键关系
    const [results] = await sequelize.query(
      `SELECT COUNT(*) as count FROM information_schema.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_TYPE='FOREIGN KEY'
       AND TABLE_NAME='Orders'
       AND CONSTRAINT_NAME='Orders_userId_fkey'`
    );

    console.log(`外键检查结果:`, results);

    console.log('===== 外键约束检查完成 =====\n');
  } catch (error) {
    console.error('❌ 检查外键约束失败:', error.message);
  }
}

// 主函数
async function main() {
  console.log('===== 开始准备数据库 =====');

  // 步骤1：检查数据库连接
  const connectionOk = await checkDatabaseConnection();
  if (!connectionOk) {
    console.error('数据库连接失败，退出程序');
    process.exit(1);
  }

  // 步骤2：按顺序同步所有表
  await syncAllModels();

  // 步骤3：检查外键约束
  await checkForeignKeys();

  // 步骤4：初始化管理员账号
  await initAdminUser();

  console.log('===== 数据库准备完成 =====');

  // 关闭数据库连接
  await sequelize.close();
  console.log('数据库连接已关闭');
  process.exit(0);
}

// 执行主函数
main().catch(error => {
  console.error('准备数据库时发生错误:', error);
  process.exit(1);
});
