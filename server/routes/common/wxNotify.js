const express = require('express');
const router = express.Router();
const { pay } = require('../../utils');
const { Order, OrderItem, Product } = require('../../models');
const sequelize = require('../../config/database');

// 退款结果通知
router.post('/refundNotify', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const body = req.body;
    console.log('退款通知原始数据:', body);

    if (body.resource && body.resource.ciphertext) {
      const { ciphertext, associated_data, nonce } = body.resource;
      const result = pay.decipher_gcm(ciphertext, associated_data, nonce, process.env.WECHAT_APIV3SECRET);
      console.log('解密后的退款通知数据:', result);

      if (result && result.out_refund_no && result.refund_status === 'SUCCESS') {
        // 从商户退款单号中提取订单号
        const orderNo = result.out_refund_no.split('_')[1];

        // 查找订单
        const order = await Order.findOne({
          where: { orderNo },
          include: [OrderItem],
          transaction: t
        });

        if (!order) {
          await t.rollback();
          return res.status(400).json({ message: '订单不存在' });
        }

        // 更新订单状态
        order.status = 'refund_approved';
        order.paymentStatus = 'refunded';
        order.refundApprovalTime = new Date();
        order.refundTransactionId = result.refund_id;
        order.refundRemark = '退款成功';
        await order.save({ transaction: t });

        // 恢复库存和销量
        for (const item of order.OrderItems) {
          const product = await Product.findByPk(item.productId, { transaction: t });
          if (product) {
            product.stock += item.quantity;
            product.sales -= item.quantity;
            await product.save({ transaction: t });
          }
        }

        await t.commit();
        res.status(200).json({ message: '退款处理成功' });
      } else {
        await t.rollback();
        res.status(400).json({ message: '退款状态不正确' });
      }
    } else {
      await t.rollback();
      res.status(400).json({ message: '通知数据格式不正确' });
    }
  } catch (error) {
    await t.rollback();
    console.error('处理退款通知失败:', error);
    res.status(500).json({ message: '处理退款通知失败', error: error.message });
  }
});

module.exports = router;
