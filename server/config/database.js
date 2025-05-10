const { Sequelize } = require("sequelize");
require("dotenv").config();

// 创建Sequelize实例
const sequelize = new Sequelize({
  dialect: "mysql",
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    // 添加时间戳 (updatedAt, createdAt)
    timestamps: true
  },
  // 添加连接池配置
  pool: {
    max: 10,              // 连接池最大连接数
    min: 0,               // 连接池最小连接数
    acquire: 30000,       // 获取连接的最大等待时间（毫秒）
    idle: 10000,          // 连接在释放前可以空闲的最长时间（毫秒）
    evict: 1000           // 多久检查一次空闲连接（毫秒）
  },
  // 添加重试策略
  retry: {
    max: 3,               // 最大重试次数
    match: [
      /Deadlock/,         // 检测死锁错误
      /Lock wait timeout exceeded/  // 锁等待超时错误
    ]
  },
  // 设置MySQL连接选项 - 使用正确的MySQL2支持的选项
  dialectOptions: {
    connectTimeout: 10000,  // 连接超时（毫秒）
    // MySQL2不支持statement_timeout和idle_in_transaction_session_timeout
    // 可以使用以下选项替代
    timezone: '+08:00',     // 时区设置
    charset: 'utf8mb4',     // 字符集
    multipleStatements: true, // 允许多语句查询
    dateStrings: true       // 日期作为字符串返回
  }
});

// 测试数据库连接
(async () => {
  try {
//     await sequelize.sync({ force: true });
// console.log("所有模型均已成功同步.");
    await sequelize.authenticate();
    console.log('数据库连接成功！');

    // 开发环境下使用alter模式，生产环境不自动同步
    // 注意：全局同步可能导致死锁，改为不在此处同步所有表
    if (process.env.NODE_ENV === 'development') {
      console.log('开发模式：模型将在各自的文件中单独同步');
    }
  } catch (error) {
    console.error('数据库连接失败:', error);
  }
})();

module.exports = sequelize;
