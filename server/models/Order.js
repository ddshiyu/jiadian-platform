/**
 * 订单模型
 *
 * 用于存储用户下单的订单主信息
 *
 * 字段说明：
 * - orderNo: 订单编号
 * - userId: 用户ID
 * - totalAmount: 订单总金额
 * - status: 订单状态（待付款、待发货、已发货、已完成、已取消、退款中、退款通过、退款拒绝）
 * - paymentStatus: 支付状态（未支付、已支付、已退款）
 * - paymentMethod: 支付方式
 * - paymentTime: 支付时间
 * - deliveryTime: 发货时间
 * - completionTime: 完成时间
 * - cancelTime: 取消时间
 * - consignee: 收货人姓名
 * - phone: 收货人电话
 * - address: 收货地址
 * - remark: 订单备注
 * - transactionId: 交易流水号
 * - orderType: 订单类型（普通商品订单、VIP订单等）
 * - refundReason: 退款原因
 * - refundRequestTime: 退款申请时间
 * - refundApprovalTime: 退款处理时间
 * - refundRemark: 退款备注信息
 *
 * 关联关系：
 * - 订单属于一个用户(User)
 * - 一个订单包含多个订单项(OrderItem)
 *
 * 核心方法：
 * - createOrder: 创建订单（静态方法）
 * - cancel: 取消订单（实例方法）
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// 创建订单模型
const Order = sequelize.define("Order", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '订单编号'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID',
    // 显式禁用索引，减少索引总数
    index: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '订单总金额'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending_payment',
    comment: '订单状态: 待付款、待发货、已发货、已完成、已取消、退款中、退款通过、退款拒绝',
    validate: {
      isIn: [['pending_payment', 'pending_delivery', 'delivered', 'completed', 'cancelled', 'refund_pending', 'refund_approved', 'refund_rejected']]
    }
  },
  paymentStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'unpaid',
    comment: '支付状态: 未支付、已支付、已退款',
    validate: {
      isIn: [['unpaid', 'paid', 'refunded']]
    }
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '支付方式'
  },
  paymentTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '支付时间'
  },
  deliveryTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '发货时间'
  },
  completionTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '完成时间'
  },
  cancelTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '取消时间'
  },
  consignee: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '收货人姓名'
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '收货人电话'
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '收货地址'
  },
  remark: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '订单备注'
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '交易流水号'
  },
  orderType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'normal',
    comment: '订单类型：normal-普通商品订单，vip-VIP订单'
  },
  refundReason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '退款原因'
  },
  refundRequestTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '退款申请时间'
  },
  refundApprovalTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '退款处理时间'
  },
  refundRemark: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '退款备注信息'
  }
}, {
  tableName: 'Orders',
  timestamps: true, // 启用 createdAt 和 updatedAt
  comment: '订单表',
  indexes: [
    // 显式定义需要的索引，避免自动创建太多索引
    {
      name: 'order_no_index',
      unique: true,
      fields: ['orderNo']
    },
    {
      name: 'user_id_index',
      fields: ['userId']
    },
    {
      name: 'status_index',
      fields: ['status']
    }
  ]
});

// 建立模型关联
const setupAssociations = () => {
  const User = require("./User");
  const OrderItem = require("./OrderItem");
  const Product = require("./Product");

  // 与用户的关联关系
  Order.belongsTo(User, {
    foreignKey: 'userId',
    onDelete: 'NO ACTION'
  });
  User.hasMany(Order, {
    foreignKey: 'userId'
  });

  // 与订单项的关联关系
  Order.hasMany(OrderItem, {
    foreignKey: 'orderId',
    onDelete: 'CASCADE'
  });
  OrderItem.belongsTo(Order, {
    foreignKey: 'orderId'
  });

  // 商品与订单项关联（通过OrderItem间接关联订单）
  OrderItem.belongsTo(Product, {
    foreignKey: 'productId',
    onDelete: 'NO ACTION'
  });
  Product.hasMany(OrderItem, {
    foreignKey: 'productId'
  });
};

// 添加模型方法
Order.createOrder = async function(orderData, orderItems) {
  const transaction = await sequelize.transaction();

  try {
    // 创建订单
    const order = await Order.create(orderData, { transaction });

    // 创建订单项
    if (orderItems && orderItems.length > 0) {
      const OrderItem = require('./OrderItem');
      const Product = require('./Product');

      for (const item of orderItems) {
        // 添加订单ID到订单项
        item.orderId = order.id;

        // 创建订单项
        await OrderItem.create(item, { transaction });

        // 减少商品库存
        const product = await Product.findByPk(item.productId, { transaction });
        if (product) {
          product.stock -= item.quantity;
          await product.save({ transaction });
        }
      }
    }

    // 提交事务
    await transaction.commit();

    // 返回创建的订单
    return await Order.findByPk(order.id, {
      include: [{ model: require('./OrderItem') }]
    });
  } catch (error) {
    // 回滚事务
    await transaction.rollback();
    throw error;
  }
};

// 添加实例方法
Order.prototype.cancel = async function() {
  const transaction = await sequelize.transaction();

  try {
    // 只有未发货的订单才能取消
    if (['pending_payment', 'pending_delivery'].includes(this.status)) {
      this.status = 'cancelled';
      this.cancelTime = new Date();

      if (this.paymentStatus === 'paid') {
        this.paymentStatus = 'refunded';
      }

      await this.save({ transaction });

      // 恢复库存
      const OrderItem = require('./OrderItem');
      const Product = require('./Product');

      const orderItems = await OrderItem.findAll({
        where: { orderId: this.id },
        transaction
      });

      for (const item of orderItems) {
        const product = await Product.findByPk(item.productId, { transaction });
        if (product) {
          product.stock += item.quantity;
          await product.save({ transaction });
        }
      }

      await transaction.commit();
      return true;
    } else {
      await transaction.rollback();
      return false;
    }
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// 设置关联关系（在导出模块后执行，避免循环依赖）
setTimeout(setupAssociations, 0);

// 创建或更新表结构
const syncOrderTable = async (retries = 5, delay = 2000) => {
  let attempt = 0;

  while (attempt < retries) {
    try {
      // 使用force: false和alter: true选项，确保不会删除现有数据
      await Order.sync({ alter: true, force: false });
      console.log("订单表结构已同步");
      return;
    } catch (error) {
      attempt++;
      console.error(`同步订单表结构失败(尝试 ${attempt}/${retries}):`, error.message);

      // 检查是否为特定错误
      if (error.message.includes('Too many keys specified') && attempt === 1) {
        console.log("检测到索引过多的错误，尝试直接执行SQL语句创建表...");
        try {
          // 使用原始SQL语句创建表，减少索引数量
          const sql = `
          CREATE TABLE IF NOT EXISTS \`Orders\` (
            \`id\` INTEGER NOT NULL auto_increment ,
            \`orderNo\` VARCHAR(255) NOT NULL,
            \`userId\` INTEGER NOT NULL,
            \`totalAmount\` DECIMAL(10,2) NOT NULL,
            \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending_payment',
            \`paymentStatus\` VARCHAR(10) NOT NULL DEFAULT 'unpaid',
            \`paymentMethod\` VARCHAR(255),
            \`paymentTime\` DATETIME,
            \`deliveryTime\` DATETIME,
            \`completionTime\` DATETIME,
            \`cancelTime\` DATETIME,
            \`consignee\` VARCHAR(255),
            \`phone\` VARCHAR(255),
            \`address\` VARCHAR(255),
            \`remark\` VARCHAR(255),
            \`transactionId\` VARCHAR(255),
            \`orderType\` VARCHAR(20) DEFAULT 'normal',
            \`refundReason\` VARCHAR(255),
            \`refundRequestTime\` DATETIME,
            \`refundApprovalTime\` DATETIME,
            \`refundRemark\` VARCHAR(255),
            \`createdAt\` DATETIME NOT NULL,
            \`updatedAt\` DATETIME NOT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`orderNo\` (\`orderNo\`),
            INDEX \`userId\` (\`userId\`),
            INDEX \`status\` (\`status\`)
          ) ENGINE=InnoDB;
          `;
          await sequelize.query(sql);
          console.log("使用原始SQL创建订单表成功");
          return;
        } catch (sqlError) {
          console.error("使用原始SQL创建表失败:", sqlError.message);
        }
      }

      // 检查是否为死锁错误，继续使用重试机制
      if ((error.message.includes('Deadlock') || error.message.includes('Lock wait timeout')) && attempt < retries) {
        console.log(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (attempt >= retries) {
        console.error("达到最大重试次数，同步失败:", error);
        break;
      } else {
        throw error; // 如果不是死锁错误，直接抛出
      }
    }
  }
};

// 先导出模块，然后延迟同步表结构，避免与其他模型同时同步
module.exports = Order;

// 设置延迟同步
setTimeout(() => {
  syncOrderTable().catch(err => {
    console.error("订单表同步最终失败:", err);
  });
}, 3000); // 延迟3秒
