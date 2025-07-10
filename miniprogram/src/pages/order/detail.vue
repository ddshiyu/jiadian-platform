<template>
  <view class="container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-box">
      <nut-icon name="loading" size="20"></nut-icon>
      <text class="loading-text">加载中...</text>
    </view>
    
    <!-- 订单详情 -->
    <view v-else-if="orderDetail" class="order-detail">
      <!-- 订单状态 -->
      <view class="order-status-box">
        <nut-icon :name="getStatusIcon(orderDetail.status)" size="30" :color="getStatusColor(orderDetail.status)"></nut-icon>
        <text class="status-text">{{ getStatusText(orderDetail.status) }}</text>
        <text v-if="orderDetail.statusDesc" class="status-desc">{{ orderDetail.statusDesc }}</text>
      </view>
      
      <!-- 收货地址 -->
      <view v-if="orderDetail.address" class="address-box">
        <view class="address-header">
          <nut-icon name="location" size="16" color="#333"></nut-icon>
          <text class="address-title">收货地址</text>
        </view>
        <view class="address-info">
          <view class="receiver-info">
            <text class="receiver-name">{{ orderDetail.address.receiverName }}</text>
            <text class="receiver-phone">{{ orderDetail.address.receiverPhone }}</text>
          </view>
          <text class="address-detail">{{ orderDetail.address.detail }}</text>
        </view>
      </view>
      
      <!-- 商品信息 -->
      <view class="products-box">
        <view class="products-header">
          <text class="shop-name">家电商城</text>
        </view>
        <view v-for="(product, index) in orderDetail.products" :key="index" class="product-item">
          <image :src="product.cover" class="product-image" @error="handleImageError"></image>
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text v-if="product.specs" class="product-specs">{{ product.specs }}</text>
          </view>
          <view class="product-price-box">
            <text class="product-price">¥{{ product.price }}</text>
            <text class="product-count">x{{ product.count }}</text>
          </view>
        </view>
        
        <!-- 商品总计 -->
        <view class="product-total">
          <text>共{{ getTotalCount(orderDetail.products) }}件商品</text>
          <text class="total-amount">小计：¥{{ getTotalPrice(orderDetail.products) }}</text>
        </view>
      </view>
      
      <!-- 发货信息 -->
      <view v-if="orderDetail.deliveryInfo && orderDetail.deliveryInfo.hasDeliveryInfo" class="delivery-box">
        <view class="delivery-header">
          <nut-icon name="logistics" size="16" color="#333"></nut-icon>
          <text class="delivery-title">发货信息</text>
        </view>
        <view class="delivery-content">
          <view v-if="orderDetail.deliveryInfo.trackingCompany" class="delivery-item">
            <text class="delivery-label">物流公司：</text>
            <text class="delivery-value">{{ orderDetail.deliveryInfo.trackingCompany }}</text>
          </view>
          <view v-if="orderDetail.deliveryInfo.trackingNumber" class="delivery-item">
            <text class="delivery-label">运单编号：</text>
            <text class="delivery-value">{{ orderDetail.deliveryInfo.trackingNumber }}</text>
            <text class="copy-btn" @click="copyTrackingNumber">复制</text>
          </view>
          <view v-if="orderDetail.deliveryInfo.deliveryTime" class="delivery-item">
            <text class="delivery-label">发货时间：</text>
            <text class="delivery-value">{{ orderDetail.deliveryInfo.deliveryTime }}</text>
          </view>
        </view>
      </view>
      
      <!-- 订单信息 -->
      <view class="order-info-box">
        <view class="order-info-header">
          <text class="order-info-title">订单信息</text>
        </view>
        <view class="order-info-content">
          <view class="order-info-item">
            <text class="info-label">订单编号：</text>
            <text class="info-value">{{ orderDetail.orderNo }}</text>
            <text class="copy-btn" @click="copyOrderNo">复制</text>
          </view>
          <view class="order-info-item">
            <text class="info-label">下单时间：</text>
            <text class="info-value">{{ orderDetail.createTime }}</text>
          </view>
          <view v-if="orderDetail.payTime" class="order-info-item">
            <text class="info-label">支付时间：</text>
            <text class="info-value">{{ orderDetail.payTime }}</text>
          </view>
          <view v-if="orderDetail.deliveryTime" class="order-info-item">
            <text class="info-label">发货时间：</text>
            <text class="info-value">{{ orderDetail.deliveryTime }}</text>
          </view>
          <view v-if="orderDetail.completeTime" class="order-info-item">
            <text class="info-label">完成时间：</text>
            <text class="info-value">{{ orderDetail.completeTime }}</text>
          </view>
        </view>
      </view>
      
      <!-- 费用明细 -->
      <view class="cost-box">
        <view class="cost-header">
          <text class="cost-title">费用明细</text>
        </view>
        <view class="cost-content">
          <view class="cost-item">
            <text class="cost-label">商品金额：</text>
            <text class="cost-value">¥{{ getTotalPrice(orderDetail.products) }}</text>
          </view>
          <view class="cost-item">
            <text class="cost-label">运费：</text>
            <text class="cost-value">¥0.00</text>
          </view>
          <view class="cost-item total">
            <text class="cost-label">实付款：</text>
            <text class="cost-value total-value">¥{{ orderDetail.totalAmount }}</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 错误状态 -->
    <view v-else class="error-box">
      <nut-icon name="circle-close" size="40" color="#ccc"></nut-icon>
      <text class="error-text">订单信息加载失败</text>
      <nut-button type="primary" size="small" @click="fetchOrderDetail">重新加载</nut-button>
    </view>
    
    <!-- 底部操作按钮 -->
    <view v-if="orderDetail" class="bottom-actions">
      <!-- 单个主要按钮 -->
      <nut-button 
        v-if="orderDetail.status === 'pending_payment' && !showCancelButton" 
        type="primary" 
        size="large"
        @click="payOrder"
      >
        立即支付
      </nut-button>
      
      <nut-button 
        v-if="orderDetail.status === 'delivered' && !showRefundOrLogistics" 
        type="primary" 
        size="large"
        @click="confirmReceive"
      >
        确认收货
      </nut-button>
      
      <!-- 两个按钮的组合 -->
      <view v-if="orderDetail.status === 'pending_payment' && showCancelButton" class="button-group">
        <nut-button 
          type="primary" 
          size="large"
          @click="payOrder"
        >
          立即支付
        </nut-button>
        <nut-button 
          plain 
          size="large"
          @click="cancelOrder"
        >
          取消订单
        </nut-button>
      </view>
      
      <view v-if="orderDetail.status === 'delivered' && showRefundOrLogistics" class="button-group">
        <nut-button 
          type="primary" 
          size="large"
          @click="confirmReceive"
        >
          确认收货
        </nut-button>
        <nut-button 
          plain 
          size="large"
          @click="applyRefund"
        >
          申请退款
        </nut-button>
      </view>
      
      <view v-if="orderDetail.status === 'pending_delivery' && orderDetail.deliveryInfo?.hasDeliveryInfo" class="button-group">
        <nut-button 
          plain 
          size="large"
          @click="applyRefund"
        >
          申请退款
        </nut-button>
        <nut-button 
          plain 
          size="large"
          @click="checkLogistics"
        >
          查看物流
        </nut-button>
      </view>
      
      <!-- 单个申请退款按钮（待发货且无物流信息） -->
      <nut-button 
        v-if="orderDetail.status === 'pending_delivery' && !orderDetail.deliveryInfo?.hasDeliveryInfo" 
        plain 
        size="large"
        @click="applyRefund"
      >
        申请退款
      </nut-button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { orderApi } from '../../api/order';

// 订单ID
const orderId = ref('');

// 订单详情
const orderDetail = ref(null);

// 加载状态
const loading = ref(false);

// 是否显示取消按钮（与支付按钮组合）
const showCancelButton = computed(() => {
  return orderDetail.value?.status === 'pending_payment';
});

// 是否显示退款或物流按钮（与确认收货按钮组合）
const showRefundOrLogistics = computed(() => {
  return orderDetail.value?.status === 'delivered';
});

// 页面加载
onLoad((options) => {
  if (options.id) {
    orderId.value = options.id;
    fetchOrderDetail();
  } else {
    uni.showToast({
      title: '订单ID不能为空',
      icon: 'none'
    });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  }
});

// 获取订单详情
const fetchOrderDetail = async () => {
  loading.value = true;
  try {
    const res = await orderApi.getDetail(orderId.value);
    
    if (res && res.code === 0 && res.data) {
      orderDetail.value = formatOrderDetail(res.data);
    } else {
      throw new Error(res?.message || '获取订单详情失败');
    }
  } catch (error) {
    console.error('获取订单详情失败:', error);
    uni.showToast({
      title: error.message || '获取订单详情失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 格式化订单详情数据
const formatOrderDetail = (order) => {
  // 转换OrderItems为前端需要的products格式
  const products = (order.OrderItems || []).map(item => {
    return {
      id: item.productId,
      name: item.productName,
      cover: item?.Product?.cover || '/static/image/default-product.png',
      price: item.price,
      count: item.quantity,
      specs: item.specs || ''
    };
  });
  
  // 处理发货信息
  const deliveryInfo = {
    trackingNumber: order.trackingNumber || '',
    trackingCompany: order.trackingCompany || '',
    deliveryTime: order.deliveryTime ? formatDate(order.deliveryTime) : '',
    hasDeliveryInfo: !!(order.trackingNumber || order.trackingCompany)
  };
  
  // 处理收货地址
  const address = order.Address ? {
    receiverName: order.Address.receiverName,
    receiverPhone: order.Address.receiverPhone,
    detail: `${order.Address.province}${order.Address.city}${order.Address.district}${order.Address.detail}`
  } : null;
  
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    statusDesc: getStatusDesc(order.status),
    totalAmount: order.totalAmount,
    createTime: formatDate(order.createdAt),
    payTime: order.paymentTime ? formatDate(order.paymentTime) : '',
    deliveryTime: order.deliveryTime ? formatDate(order.deliveryTime) : '',
    completeTime: order.completionTime ? formatDate(order.completionTime) : '',
    products: products,
    deliveryInfo: deliveryInfo,
    address: address
  };
};

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
};

// 补零
const padZero = (num) => {
  return num < 10 ? `0${num}` : num;
};

// 获取订单状态文本
const getStatusText = (status) => {
  const statusMap = {
    'pending_payment': '待付款',
    'pending_delivery': '待发货',
    'delivered': '待收货',
    'completed': '已完成',
    'cancelled': '已取消',
    'refund_pending': '退款审核中',
    'refund_approved': '退款成功',
    'refund_rejected': '退款被拒'
  };
  return statusMap[status] || '未知状态';
};

// 获取状态描述
const getStatusDesc = (status) => {
  const descMap = {
    'pending_payment': '请尽快完成支付',
    'pending_delivery': '商家正在备货中',
    'delivered': '商品已发货，请注意查收',
    'completed': '交易已完成',
    'cancelled': '订单已取消',
    'refund_pending': '退款申请审核中',
    'refund_approved': '退款已到账',
    'refund_rejected': '退款申请被拒绝'
  };
  return descMap[status] || '';
};

// 获取状态图标
const getStatusIcon = (status) => {
  const iconMap = {
    'pending_payment': 'clock',
    'pending_delivery': 'logistics',
    'delivered': 'logistics',
    'completed': 'success',
    'cancelled': 'close',
    'refund_pending': 'clock',
    'refund_approved': 'success',
    'refund_rejected': 'close'
  };
  return iconMap[status] || 'clock';
};

// 获取状态颜色
const getStatusColor = (status) => {
  const colorMap = {
    'pending_payment': '#fa8c16',
    'pending_delivery': '#1890ff',
    'delivered': '#1890ff',
    'completed': '#52c41a',
    'cancelled': '#f5222d',
    'refund_pending': '#fa8c16',
    'refund_approved': '#52c41a',
    'refund_rejected': '#f5222d'
  };
  return colorMap[status] || '#fa8c16';
};

// 计算总件数
const getTotalCount = (products) => {
  return products.reduce((total, product) => total + product.count, 0);
};

// 计算总价
const getTotalPrice = (products) => {
  return products.reduce((total, product) => total + product.price * product.count, 0);
};

// 复制订单号
const copyOrderNo = () => {
  uni.setClipboardData({
    data: orderDetail.value.orderNo,
    success: () => {
      uni.showToast({
        title: '订单号已复制',
        icon: 'success'
      });
    }
  });
};

// 复制快递单号
const copyTrackingNumber = () => {
  if (!orderDetail.value.deliveryInfo.trackingNumber) {
    uni.showToast({
      title: '暂无快递单号',
      icon: 'none'
    });
    return;
  }
  
  uni.setClipboardData({
    data: orderDetail.value.deliveryInfo.trackingNumber,
    success: () => {
      uni.showToast({
        title: '快递单号已复制',
        icon: 'success'
      });
    }
  });
};

// 支付订单
const payOrder = async () => {
  try {
    uni.showLoading({
      title: '正在处理'
    });
    
    const res = await orderApi.pay(orderId.value);
    
    if (res && res.code === 0) {
      uni.hideLoading();
      
      if (res.data && res.data.payParams) {
        uni.requestPayment({
          ...res.data.payParams,
          success: () => {
            uni.showToast({
              title: '支付成功',
              icon: 'success'
            });
            fetchOrderDetail();
          },
          fail: (err) => {
            console.error('支付失败:', err);
            if (err.errMsg === 'requestPayment:fail cancel') {
              uni.showToast({
                title: '支付已取消',
                icon: 'none'
              });
            } else {
              uni.showToast({
                title: '支付失败',
                icon: 'none'
              });
            }
          }
        });
      } else {
        uni.showToast({
          title: '支付参数获取失败',
          icon: 'none'
        });
      }
    } else {
      throw new Error(res?.message || '支付失败');
    }
  } catch (error) {
    uni.hideLoading();
    console.error('支付失败:', error);
    uni.showToast({
      title: error.message || '支付失败',
      icon: 'none'
    });
  }
};

// 确认收货
const confirmReceive = async () => {
  uni.showModal({
    title: '确认收货',
    content: '请确认已收到商品，确认后订单将完成',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({
            title: '处理中'
          });
          
          const result = await orderApi.complete(orderId.value);
          
          uni.hideLoading();
          
          if (result && result.code === 0) {
            uni.showToast({
              title: '确认收货成功',
              icon: 'success'
            });
            fetchOrderDetail();
          } else {
            throw new Error(result?.message || '确认收货失败');
          }
        } catch (error) {
          uni.hideLoading();
          console.error('确认收货失败:', error);
          uni.showToast({
            title: error.message || '确认收货失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 取消订单
const cancelOrder = async () => {
  uni.showModal({
    title: '取消订单',
    content: '确定要取消这个订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({
            title: '处理中'
          });
          
          const result = await orderApi.cancel(orderId.value);
          
          uni.hideLoading();
          
          if (result && result.code === 0) {
            uni.showToast({
              title: '订单已取消',
              icon: 'success'
            });
            fetchOrderDetail();
          } else {
            throw new Error(result?.message || '取消订单失败');
          }
        } catch (error) {
          uni.hideLoading();
          console.error('取消订单失败:', error);
          uni.showToast({
            title: error.message || '取消订单失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 申请退款
const applyRefund = () => {
  uni.showModal({
    title: '申请退款',
    content: '请联系客服处理退款事宜',
    showCancel: false,
    confirmText: '联系客服',
    success: () => {
      // 可以跳转到客服页面或拨打客服电话
      uni.showModal({
        title: '联系客服',
        content: '请添加客服微信：19352187583',
        confirmText: '复制',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            uni.setClipboardData({
              data: '19352187583',
              success: () => {
                uni.showToast({
                  title: '微信号已复制',
                  icon: 'success'
                });
              }
            });
          }
        }
      });
    }
  });
};

// 查看物流
const checkLogistics = () => {
  if (!orderDetail.value.deliveryInfo.trackingNumber) {
    uni.showToast({
      title: '暂无物流信息',
      icon: 'none'
    });
    return;
  }
  
  // 这里可以跳转到物流查询页面或调用第三方物流查询
  uni.showToast({
    title: '物流查询功能开发中',
    icon: 'none'
  });
};

// 处理图片加载错误
const handleImageError = (e) => {
  e.target.src = '/static/image/default-product.png';
};
</script>

<style lang="scss">
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #999;
}

.error-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.error-text {
  margin: 20rpx 0;
  font-size: 28rpx;
  color: #999;
}

.order-status-box {
  background: #fff;
  padding: 40rpx 30rpx;
  margin-bottom: 20rpx;
  text-align: center;
}

.status-text {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin: 20rpx 0 10rpx 0;
}

.status-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.address-box,
.products-box,
.delivery-box,
.order-info-box,
.cost-box {
  background: #fff;
  margin-bottom: 20rpx;
}

.address-header,
.products-header,
.delivery-header,
.order-info-header,
.cost-header {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.address-title,
.delivery-title,
.order-info-title,
.cost-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-left: 10rpx;
}

.shop-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.address-info {
  padding: 24rpx 30rpx;
}

.receiver-info {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.receiver-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-right: 20rpx;
}

.receiver-phone {
  font-size: 28rpx;
  color: #666;
}

.address-detail {
  font-size: 26rpx;
  color: #666;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.product-item:last-child {
  border-bottom: none;
}

.product-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-specs {
  font-size: 24rpx;
  color: #999;
}

.product-price-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.product-price {
  font-size: 28rpx;
  font-weight: bold;
  color: #e31d1a;
  margin-bottom: 8rpx;
}

.product-count {
  font-size: 24rpx;
  color: #999;
}

.product-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 30rpx;
  font-size: 26rpx;
  color: #666;
}

.total-amount {
  color: #e31d1a;
  font-weight: bold;
}

.delivery-content,
.order-info-content,
.cost-content {
  padding: 20rpx 30rpx;
}

.delivery-item,
.order-info-item,
.cost-item {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.delivery-item:last-child,
.order-info-item:last-child,
.cost-item:last-child {
  margin-bottom: 0;
}

.delivery-label,
.info-label,
.cost-label {
  font-size: 26rpx;
  color: #666;
  width: 160rpx;
}

.delivery-value,
.info-value,
.cost-value {
  flex: 1;
  font-size: 26rpx;
  color: #333;
}

.copy-btn {
  font-size: 24rpx;
  color: #1890ff;
  margin-left: 20rpx;
  padding: 4rpx 12rpx;
  border: 1rpx solid #1890ff;
  border-radius: 4rpx;
}

.cost-item.total {
  border-top: 1rpx solid #f5f5f5;
  padding-top: 20rpx;
  margin-top: 20rpx;
  margin-bottom: 0;
}

.total-value {
  color: #e31d1a !important;
  font-weight: bold;
  font-size: 30rpx;
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 30rpx calc(20rpx + env(safe-area-inset-bottom)) 30rpx;
  border-top: 1rpx solid #f5f5f5;
}

.button-group {
  display: flex;
  gap: 24rpx;
  align-items: center;
}

.button-group .nut-button {
  flex: 1;
  min-height: 88rpx;
}

/* 单个按钮时占满宽度 */
:deep(.nut-button--large) {
  width: 100%;
  min-height: 88rpx;
}

/* 按钮组中的按钮样式调整 */
.button-group :deep(.nut-button--large) {
  width: auto;
  flex: 1;
}
</style> 