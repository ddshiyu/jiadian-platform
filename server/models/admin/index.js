/**
 * 管理系统模型索引文件
 *
 * 该文件负责：
 * 1. 导入所有管理系统相关模型
 * 2. 导出这些模型，以便在主模型索引文件中合并
 *
 * 当前包含的管理系统模型：
 * - AdminUser: 管理员用户模型
 */

const AdminUser = require('./AdminUser');

// 导出所有管理系统相关模型
module.exports = {
  AdminUser,
};
