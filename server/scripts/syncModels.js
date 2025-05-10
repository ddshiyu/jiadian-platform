/**
 * 数据库模型同步脚本
 *
 * 用法: node scripts/syncModels.js
 *
 * 功能：按照正确的依赖顺序同步所有数据库模型
 */

const sequelize = require('../config/database');
const models = require('../models');

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

// 获取模型对象
const getModel = (modelName) => {
  return models[modelName] || null;
};

// 同步单个模型
const syncModel = async (modelName) => {
  const model = getModel(modelName);

  if (!model) {
    console.warn(`模型 ${modelName} 不存在，跳过同步`);
    return false;
  }

  try {
    await model.sync({ alter: true });
    console.log(`✓ 模型 ${modelName} 同步成功`);
    return true;
  } catch (error) {
    console.error(`✗ 模型 ${modelName} 同步失败:`, error.message);
    return false;
  }
};

// 按顺序同步所有模型
const syncAllModels = async () => {
  console.log('开始同步数据库模型...');

  for (const modelName of syncOrder) {
    await syncModel(modelName);
  }

  console.log('模型同步完成');
};

// 运行同步
(async () => {
  try {
    await syncAllModels();
  } catch (error) {
    console.error('模型同步过程中出错:', error);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
    process.exit();
  }
})();
