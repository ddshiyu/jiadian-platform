<template>
  <view class="container">
    <!-- 收货地址 -->
    <view class="address-box" @click="navigateToAddressList">
      <view v-if="selectedAddress.id" class="address-info">
        <view class="address-header">
          <text class="name">{{ selectedAddress.name }}</text>
          <text class="phone">{{ selectedAddress.phone }}</text>
        </view>
        <view class="address-detail">
          {{ selectedAddress.province }} {{ selectedAddress.city }} {{ selectedAddress.district }} {{ selectedAddress.detail }}
        </view>
      </view>
      <view v-else class="no-address">
        <text>请选择收货地址</text>
        <nut-icon name="right" size="14"></nut-icon>
      </view>
    </view>
    
    <!-- 商品列表 -->
    <view class="goods-list">
      <view class="goods-item" v-for="(item, index) in orderItems" :key="index">
        <image :src="item.image" mode="aspectFill" class="goods-image"></image>
        <view class="goods-info">
          <view class="goods-name">{{ item.name }}</view>
          <view class="goods-price-box">
            <text class="goods-price">¥{{ item.price.toFixed(2) }}</text>
            <text class="goods-quantity">x{{ item.quantity }}</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 订单信息 -->
    <view class="order-info">
      <view class="info-item">
        <text class="info-label">商品金额</text>
        <text class="info-value">¥{{ originalTotal.toFixed(2) }}</text>
      </view>
      
      <!-- VIP折扣 -->
      <view v-if="userInfo.isVip && vipDiscount > 0" class="info-item vip-discount">
        <text class="info-label">
          <text class="vip-tag">VIP</text>
          会员折扣
        </text>
        <text class="info-value discount">-¥{{ vipDiscount.toFixed(2) }}</text>
      </view>
      
      <view class="info-item">
        <text class="info-label">运费</text>
        <text class="info-value">¥{{ shippingFee.toFixed(2) }}</text>
      </view>
      
      <view class="info-item total">
        <text class="info-label">合计</text>
        <text class="info-value total-price">¥{{ (totalAmount + shippingFee).toFixed(2) }}</text>
      </view>
    </view>
    
    <!-- 备注 -->
    <view class="remark-box">
      <text class="remark-label">订单备注:</text>
      <input 
        class="remark-input" 
        type="text" 
        placeholder="选填，请先和商家协商一致" 
        v-model="remark"
      />
    </view>
    
    <!-- 底部支付栏 -->
    <view class="footer">
      <view class="total-box">
        <text class="total-label">实付款:</text>
        <text class="total-amount">¥{{ (totalAmount + shippingFee).toFixed(2) }}</text>
      </view>
      <button class="submit-btn" @click="submitOrder">提交订单</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { orderApi } from '../../api/order';
import { addressApi } from '../../api/address';

// 注入用户信息
const userInfo = inject('userInfo');

// 订单商品
const orderItems = ref([]);

// 收货地址
const selectedAddress = reactive({
  id: '',
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: ''
});

// 订单备注
const remark = ref('');

// 运费（可以根据实际情况计算）
const shippingFee = ref(0);

// 原始总金额
const originalTotal = computed(() => {
  return orderItems.value.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
});

// 计算订单总金额（含VIP折扣）
const totalAmount = computed(() => {
  return orderItems.value.reduce((total, item) => {
    // 如果用户是VIP，使用VIP价格
    const price = userInfo.isVip ? item.price * 0.95 : item.price;
    return total + price * item.quantity;
  }, 0);
});

// 显示VIP折扣
const vipDiscount = computed(() => {
  if (!userInfo.isVip) return 0;
  
  const originalTotal = orderItems.value.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
  
  return originalTotal - totalAmount.value;
});

// 页面加载
onLoad((options) => {
  // 从缓存获取订单商品
  const orderCache = uni.getStorageSync('confirmOrder');
  if (orderCache) {
    orderItems.value = JSON.parse(orderCache);
  }
  
  // 获取默认地址
  loadDefaultAddress();
});

// 页面显示
onShow(() => {
  // 检查是否有新选择的地址
  const tempAddress = uni.getStorageSync('selectedAddress');
  if (tempAddress) {
    Object.assign(selectedAddress, JSON.parse(tempAddress));
    uni.removeStorageSync('selectedAddress');
  }
});

// 加载默认地址
const loadDefaultAddress = async () => {
  try {
    const res = await addressApi.getDefaultAddress();
    
    if (res && res.code === 0 && res.data) {
      Object.assign(selectedAddress, res.data);
    }
  } catch (error) {
    console.error('获取默认地址失败:', error);
  }
};

// 跳转到地址列表
const navigateToAddressList = () => {
  uni.navigateTo({
    url: '/pages/address/list?from=order'
  });
};

// 提交订单
const submitOrder = async () => {
  // 验证地址
  if (!selectedAddress.id) {
    uni.showToast({
      title: '请选择收货地址',
      icon: 'none'
    });
    return;
  }
  
  // 验证商品
  if (orderItems.value.length === 0) {
    uni.showToast({
      title: '订单商品不能为空',
      icon: 'none'
    });
    return;
  }
  
  try {
    uni.showLoading({
      title: '提交订单中...',
      mask: true
    });
    
    // 构建订单数据
    const orderData = {
      addressId: selectedAddress.id,
      items: orderItems.value.map(item => ({
        goodsId: item.id,
        quantity: item.quantity,
        price: userInfo.isVip ? item.price * 0.95 : item.price
      })),
      totalAmount: totalAmount.value + shippingFee.value,
      shippingFee: shippingFee.value,
      remark: remark.value
    };
    
    // 调用创建订单接口
    const res = await orderApi.createOrder(orderData);
    
    uni.hideLoading();
    
    if (res && res.code === 0 && res.data) {
      // 清除订单缓存
      uni.removeStorageSync('confirmOrder');
      
      // 跳转到支付页面
      uni.navigateTo({
        url: `/pages/order/payment?orderId=${res.data.id}&orderNo=${res.data.orderNo}&amount=${res.data.totalAmount}`
      });
    } else {
      uni.showToast({
        title: res?.message || '创建订单失败',
        icon: 'none'
      });
    }
  } catch (error) {
    uni.hideLoading();
    console.error('提交订单失败:', error);
    uni.showToast({
      title: '提交订单失败',
      icon: 'none'
    });
  }
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

.address-box {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.address-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.name {
  font-size: 30rpx;
  font-weight: bold;
}

.phone {
  font-size: 28rpx;
  color: #666;
}

.address-detail {
  font-size: 28rpx;
  color: #333;
  line-height: 1.4;
}

.no-address {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #999;
  font-size: 28rpx;
}

.goods-list {
  background-color: #fff;
  margin-bottom: 20rpx;
}

.goods-item {
  display: flex;
  padding: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.goods-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
}

.goods-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.goods-name {
  font-size: 28rpx;
  color: #333;
  line-height: 1.4;
  margin-bottom: 10rpx;
}

.goods-price-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goods-price {
  font-size: 30rpx;
  color: #E31D1A;
  font-weight: bold;
}

.goods-quantity {
  font-size: 26rpx;
  color: #999;
}

.order-info {
  background-color: #fff;
  padding: 20rpx 30rpx;
  margin-bottom: 20rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 15rpx 0;
  font-size: 28rpx;
  color: #333;
}

.vip-discount {
  color: #E31D1A;
}

.vip-tag {
  background-color: #E31D1A;
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  margin-right: 6rpx;
}

.discount {
  color: #E31D1A;
}

.total {
  border-top: 1rpx solid #f5f5f5;
  padding-top: 20rpx;
  margin-top: 10rpx;
}

.total-price {
  font-size: 32rpx;
  color: #E31D1A;
  font-weight: bold;
}

.remark-box {
  background-color: #fff;
  padding: 20rpx 30rpx;
  display: flex;
  align-items: center;
}

.remark-label {
  font-size: 28rpx;
  color: #333;
  margin-right: 20rpx;
}

.remark-input {
  flex: 1;
  font-size: 28rpx;
  height: 60rpx;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.total-box {
  display: flex;
  align-items: center;
}

.total-label {
  font-size: 28rpx;
  color: #333;
  margin-right: 10rpx;
}

.total-amount {
  font-size: 36rpx;
  color: #E31D1A;
  font-weight: bold;
}

.submit-btn {
  background-color: #E31D1A;
  color: #fff;
  font-size: 30rpx;
  height: 70rpx;
  line-height: 70rpx;
  padding: 0 40rpx;
  border-radius: 35rpx;
}
</style> 