<template>
  <view class="container">
    <!-- 订单状态导航栏 -->
    <view class="status-tabs">
      <view 
        v-for="(tab, index) in tabs" 
        :key="index" 
        class="status-tab"
        :class="{ active: activeTab === index }"
        @click="changeTab(index)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- 订单列表 -->
    <scroll-view 
      scroll-y 
      class="order-list" 
      :refresher-triggered="refreshing" 
      refresher-enabled 
      @refresherrefresh="onRefresh"
    >
      <view v-if="loading" class="loading-box">
        <nut-icon name="loading" size="20"></nut-icon>
        <text class="loading-text">加载中...</text>
      </view>
      
      <block v-else-if="orderList.length > 0">
        <view v-for="(order, index) in orderList" :key="index" class="order-item">
          <view class="order-header">
            <text class="shop-name">家电商城</text>
            <text class="order-status">{{ getStatusText(order.status) }}</text>
          </view>
          
          <view 
            class="product-list"
            @click="navigateToOrderDetail(order.id)"
          >
            <view v-for="(product, pIndex) in order.products" :key="pIndex" class="product-item">
              <image :src="product.cover" class="product-image"></image>
              <view class="product-info">
                <text class="product-name">{{ product.name }}</text>
                <text class="product-specs">{{ product.specs }}</text>
              </view>
              <view class="product-price-box">
                <text class="product-price">¥{{ product.price }}</text>
                <text class="product-count">x{{ product.count }}</text>
              </view>
            </view>
          </view>
          
          <view class="order-footer">
            <view class="order-total">
              <text>共{{ getTotalCount(order.products) }}件商品</text>
              <text>合计：¥{{ getTotalPrice(order.products) }}</text>
            </view>
            
            <view class="order-actions">
              <nut-button 
                v-if="order.status === 'pending_payment'" 
                type="primary" 
                size="small"
                @click="payOrder(order.id)"
              >
                去支付
              </nut-button>
              
              <nut-button 
                v-if="order.status === 'delivered'" 
                type="primary" 
                size="small"
                @click="confirmReceive(order.id)"
              >
                确认收货
              </nut-button>
              
              <nut-button 
                v-if="['pending_delivery', 'delivered'].includes(order.status)" 
                plain 
                size="small"
                @click="applyRefund(order.id)"
              >
                申请退款
              </nut-button>
              
              <nut-button 
                v-if="['completed', 'cancelled'].includes(order.status)" 
                plain 
                size="small"
                @click="deleteOrder(order.id)"
              >
                删除订单
              </nut-button>
              
              <nut-button 
                v-if="order.status === 'pending_payment'" 
                plain 
                size="small"
                @click="cancelOrder(order.id)"
              >
                取消订单
              </nut-button>
            </view>
          </view>
        </view>
      </block>
      
      <view v-else class="empty-box">
        <nut-icon name="order" size="40"></nut-icon>
        <text class="empty-text">暂无订单</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { orderApi } from '../../api/order';

// 定义订单状态标签
const tabs = [
  { label: '全部', status: '' },
  { label: '待付款', status: 'pending_payment' },
  { label: '待发货', status: 'pending_delivery' },
  { label: '待收货', status: 'delivered' },
  { label: '已完成', status: 'completed' }
];

// 当前活动标签
const activeTab = ref(0);

// 订单列表
const orderList = ref([]);

// 加载状态
const loading = ref(false);

// 刷新状态
const refreshing = ref(false);

// 分页信息
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
});

// 初始数据
onLoad((options) => {
  // 如果有状态参数，切换到对应的标签
  if (options.status) {
    const tabIndex = tabs.findIndex(tab => tab.status === options.status);
    if (tabIndex !== -1) {
      activeTab.value = tabIndex;
    }
  }
  
  fetchOrderList();
});

// 每次显示页面时刷新数据
onShow(() => {
  fetchOrderList();
});

// 切换选项卡
const changeTab = (index) => {
  activeTab.value = index;
  pagination.value.current = 1; // 切换标签时重置页码
  orderList.value = []; // 清空列表
  fetchOrderList();
};

// 获取订单列表
const fetchOrderList = async () => {
  loading.value = true;
  try {
    // 构建查询参数
    const params = {
      page: pagination.value.current,
      pageSize: pagination.value.pageSize
    };
    
    // 添加状态过滤
    const currentStatus = tabs[activeTab.value].status;
    if (currentStatus) {
      params.status = currentStatus;
    }
    
    // 调用API获取订单列表
    const res = await orderApi.getList(params);
    
    if (res && res.code === 0 && res.data) {
      // 处理后端返回的订单数据
      const formattedOrders = formatOrderData(res.data.list || []);
      
      // 如果是第一页，直接替换列表；否则追加
      if (pagination.value.current === 1) {
        orderList.value = formattedOrders;
      } else {
        orderList.value = [...orderList.value, ...formattedOrders];
      }
      
      // 更新分页信息
      pagination.value = res.data.pagination || pagination.value;
    } else {
      uni.showToast({
        title: '获取订单列表失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('获取订单列表失败', error);
    uni.showToast({
      title: '获取订单列表失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
};

// 格式化后端返回的订单数据
const formatOrderData = (orders) => {
  return orders.map(order => {
    // 转换OrderItems为前端需要的products格式
    const products = (order.OrderItems || []).map(item => {
      return {
        id: item.productId,
        name: item.productName,
        cover: item?.Product?.cover,
        price: item.price,
        count: item.quantity,
        specs: item.specs || ''
      };
    });
    
    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      totalAmount: order.totalAmount,
      createTime: formatDate(order.createdAt),
      products: products
    };
  });
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

// 下拉刷新
const onRefresh = () => {
  refreshing.value = true;
  pagination.value.current = 1;
  fetchOrderList();
};

// 订单状态文本
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

// 计算总件数
const getTotalCount = (products) => {
  return products.reduce((total, product) => total + product.count, 0);
};

// 计算总价
const getTotalPrice = (products) => {
  return products.reduce((total, product) => total + product.price * product.count, 0);
};

// 跳转到订单详情
const navigateToOrderDetail = (orderId) => {
  uni.navigateTo({
    url: `/pages/order/detail?id=${orderId}`
  });
};

// 支付订单
const payOrder = async (orderId) => {
  try {
    uni.showLoading({
      title: '正在处理'
    });
    
    // 获取订单详情，确保获取最新状态
    const detailRes = await orderApi.getDetail(orderId);
    
    if (!detailRes || detailRes.code !== 0 || !detailRes.data) {
      throw new Error('获取订单信息失败');
    }
    
    // 检查订单状态，避免重复支付
    if (detailRes.data.status !== 'pending_payment') {
      throw new Error('该订单状态不允许支付');
    }
    
    // 调用支付接口
    const res = await orderApi.pay(orderId);
    
    if (res && res.code === 0) {
      uni.hideLoading();
      
      // 如果后端返回了支付参数，调用微信支付
      if (res.data && res.data.payParams) {
        uni.requestPayment({
          ...res.data.payParams,
          success: () => {
            uni.showToast({
              title: '支付成功',
              icon: 'success'
            });
            // 刷新订单列表
            fetchOrderList();
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
        // 如果没有支付参数（模拟支付情况），直接显示成功
        uni.showToast({
          title: '支付成功',
          icon: 'success'
        });
        
        // 刷新订单列表
        setTimeout(() => {
          fetchOrderList();
        }, 1000);
      }
    } else {
      throw new Error(res?.message || '支付失败');
    }
  } catch (error) {
    console.error('支付订单失败', error);
    uni.hideLoading();
    uni.showToast({
      title: error.message || '支付失败',
      icon: 'none'
    });
  }
};

// 确认收货
const confirmReceive = async (orderId) => {
  uni.showModal({
    title: '确认收货',
    content: '请确认您已收到商品',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({
            title: '处理中'
          });
          
          const result = await orderApi.complete(orderId);
          
          if (result && result.code === 0) {
            uni.hideLoading();
            uni.showToast({
              title: '确认收货成功',
              icon: 'success'
            });
            
            // 刷新订单列表
            fetchOrderList();
          } else {
            throw new Error(result?.message || '确认收货失败');
          }
        } catch (error) {
          console.error('确认收货失败', error);
          uni.hideLoading();
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
const cancelOrder = async (orderId) => {
  uni.showModal({
    title: '取消订单',
    content: '确定要取消该订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({
            title: '处理中'
          });
          
          const result = await orderApi.cancel(orderId);
          
          if (result && result.code === 0) {
            uni.hideLoading();
            uni.showToast({
              title: '订单已取消',
              icon: 'success'
            });
            
            // 刷新订单列表
            fetchOrderList();
          } else {
            throw new Error(result?.message || '取消订单失败');
          }
        } catch (error) {
          console.error('取消订单失败', error);
          uni.hideLoading();
          uni.showToast({
            title: error.message || '取消订单失败',
            icon: 'none'
          });
        }
      }
    }
  });
};

// 删除订单
const deleteOrder = (orderId) => {
  uni.showModal({
    title: '删除订单',
    content: '删除后不可恢复，确定要删除吗？',
    success: (res) => {
      if (res.confirm) {
        uni.showLoading({
          title: '处理中'
        });
        
        setTimeout(() => {
          uni.hideLoading();
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          });
          
          // 从列表中移除已删除的订单
          orderList.value = orderList.value.filter(order => order.id !== orderId);
        }, 500);
      }
    }
  });
};

// 申请退款
const applyRefund = (orderId) => {
  uni.showModal({
    title: '申请退款',
    content: '确定要申请退款吗？',
    success: (res) => {
      if (res.confirm) {
        // 弹出输入框，让用户输入退款原因
        uni.showModal({
          title: '退款原因',
          editable: true,
          placeholderText: '请输入退款原因',
          success: async (reasonRes) => {
            if (reasonRes.confirm) {
              const reason = reasonRes.content || '用户未填写退款原因';
              
              try {
                uni.showLoading({
                  title: '提交中'
                });
                
                const result = await orderApi.applyRefund(orderId, { reason });
                
                if (result && result.code === 0) {
                  uni.hideLoading();
                  uni.showToast({
                    title: '退款申请已提交',
                    icon: 'success'
                  });
                  
                  // 刷新订单列表
                  fetchOrderList();
                } else {
                  throw new Error(result?.message || '申请退款失败');
                }
              } catch (error) {
                console.error('申请退款失败', error);
                uni.hideLoading();
                uni.showToast({
                  title: error.message || '申请退款失败',
                  icon: 'none'
                });
              }
            }
          }
        });
      }
    }
  });
};
</script>

<style lang="scss">
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box; /* 确保padding不会增加容器宽度 */
  overflow: hidden; /* 防止内容溢出 */
}

.status-tabs {
  display: flex;
  background-color: #fff;
  padding: 0 10rpx;
  position: sticky;
  top: 0;
  z-index: 10;
}

.status-tab {
  flex: 1;
  height: 80rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 28rpx;
  color: #333;
  position: relative;
}

.status-tab.active {
  color: #E31D1A;
  font-weight: bold;
}

.status-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background-color: #E31D1A;
  border-radius: 2rpx;
}

.order-list {
  flex: 1;
  padding: 20rpx;
  box-sizing: border-box; /* 确保padding不会增加容器宽度 */
  height: calc(100vh - 80rpx); /* 减去顶部tab栏的高度 */
  overflow-y: auto; /* 允许纵向滚动 */
}

.order-item {
  background-color: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  overflow: hidden;
  width: 100%; /* 确保宽度为100% */
  box-sizing: border-box; /* 确保padding不会增加容器宽度 */
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.shop-name {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

.order-status {
  font-size: 28rpx;
  color: #E31D1A;
}

.product-list {
  padding: 20rpx;
  overflow: hidden;
}

.product-item {
  display: flex;
  margin-bottom: 20rpx;
  width: 100%;
  box-sizing: border-box;
}

.product-item:last-child {
  margin-bottom: 0;
}

.product-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  background-color: #f7f7f7;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  padding: 0 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  overflow: hidden;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-specs {
  font-size: 24rpx;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-price-box {
  width: 160rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  flex-shrink: 0;
}

.product-price {
  font-size: 28rpx;
  color: #333;
  white-space: nowrap;
}

.product-count {
  font-size: 26rpx;
  color: #999;
  margin-top: 10rpx;
  white-space: nowrap;
}

.order-footer {
  padding: 20rpx;
  border-top: 1rpx solid #f5f5f5;
}

.order-total {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20rpx;
}

.order-total text {
  font-size: 26rpx;
  color: #333;
  margin-left: 20rpx;
}

.order-actions {
  display: flex;
  justify-content: flex-end;
}

.order-actions :deep(.nut-button) {
  margin-left: 20rpx;
}

.order-actions :deep(.nut-button--small) {
  font-size: 24rpx;
  padding: 0 20rpx;
  height: 60rpx;
  line-height: 60rpx;
}

.loading-box {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30rpx 0;
}

.loading-text {
  font-size: 26rpx;
  color: #999;
  margin-left: 10rpx;
}

.empty-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-top: 20rpx;
}
</style> 