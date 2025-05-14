<template>
  <view v-if="isVip || showNonVip" class="vip-tag">
    <view class="vip-price" :class="{ 'non-vip': !isVip }">
      <text class="vip-icon">VIP</text>
      <text class="vip-price-text">¥{{ vipPrice }}</text>
    </view>
    <view v-if="!isVip && showButton" class="vip-button" @click="goToVip">
      <text>开通享优惠</text>
    </view>
  </view>
</template>

<script setup>
import { computed, inject } from 'vue';

const props = defineProps({
  price: {
    type: Number,
    required: true
  },
  vipPrice: {
    type: Number,
    required: true // 直接传入VIP价格，必填
  },
  showNonVip: {
    type: Boolean,
    default: true // 默认非VIP也显示VIP价格
  },
  showButton: {
    type: Boolean,
    default: true // 默认显示开通按钮
  }
});

// 从App.vue注入用户信息
const userInfo = inject('userInfo');

// 判断是否为VIP
const isVip = computed(() => {
  return userInfo.isVip || false;
});

// 跳转到VIP页面
const goToVip = () => {
  uni.navigateTo({
    url: '/pages/mine/vip'
  });
};
</script>

<style lang="scss" scoped>
.vip-tag {
  display: flex;
  align-items: center;
  margin-top: 10rpx;
}

.vip-price {
  display: flex;
  align-items: center;
  background: linear-gradient(to right, #FFD700, #FFA500);
  border-radius: 8rpx;
  padding: 4rpx 10rpx;
}

.non-vip {
  background: #f5f5f5;
}

.vip-icon {
  font-size: 20rpx;
  color: #fff;
  background-color: #E31D1A;
  padding: 2rpx 6rpx;
  border-radius: 4rpx;
  margin-right: 6rpx;
}

.non-vip .vip-icon {
  background-color: #999;
}

.vip-price-text {
  font-size: 24rpx;
  color: #E31D1A;
  font-weight: bold;
}

.non-vip .vip-price-text {
  color: #999;
}

.vip-button {
  margin-left: 10rpx;
  font-size: 20rpx;
  color: #E31D1A;
  border: 1rpx solid #E31D1A;
  border-radius: 20rpx;
  padding: 2rpx 10rpx;
}
</style>