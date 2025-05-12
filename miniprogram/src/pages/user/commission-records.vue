<template>
  <view class="container">
    <nut-navbar title="佣金记录" back-text="返回" @on-click-back="goBack"></nut-navbar>
    
    <!-- 佣金统计 -->
    <view class="stats-card">
      <view class="stats-item">
        <text class="stats-label">累计佣金(元)</text>
        <text class="stats-num">{{ totalCommission.toFixed(2) }}</text>
      </view>
    </view>
    
    <!-- 佣金列表 -->
    <view class="commission-list">
      <view v-if="commissions.length === 0" class="empty-tip">
        <nut-empty description="暂无佣金记录"></nut-empty>
      </view>
      
      <view v-else class="list-container">
        <view v-for="(item, index) in commissions" :key="index" class="commission-item">
          <view class="user-avatar">
            <nut-avatar size="large" :url="item.invitee?.avatar || '/static/image/avatar.jpeg'"></nut-avatar>
          </view>
          <view class="commission-info">
            <view class="top-row">
              <text class="nickname">{{ item.invitee?.nickname || '匿名用户' }}</text>
              <text class="amount">+{{ item.amount.toFixed(2) }}</text>
            </view>
            <view class="bottom-row">
              <text class="order-no">订单: {{ item.order?.orderNo || '未知订单' }}</text>
              <text class="time">{{ formatDate(item.createdAt) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { userApi } from '../../api/user';

// 数据
const commissions = ref([]);
const loading = ref(false);

// 计算总佣金
const totalCommission = computed(() => {
  return commissions.value.reduce((sum, item) => sum + (item.amount || 0), 0);
});

// 页面加载
onMounted(() => {
  loadCommissions();
});

// 加载佣金记录
const loadCommissions = async () => {
  loading.value = true;
  try {
    const res = await userApi.getCommissions();
    if (res && res.code === 0) {
      commissions.value = res.data || [];
    } else {
      uni.showToast({
        title: res?.message || '获取佣金记录失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('获取佣金记录失败:', error);
    uni.showToast({
      title: '获取佣金记录失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 30rpx;
}

.stats-card {
  background-color: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 30rpx;
  display: flex;
  justify-content: center;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-num {
  font-size: 40rpx;
  font-weight: bold;
  color: #E31D1A;
}

.stats-label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.commission-list {
  background-color: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.empty-tip {
  padding: 40rpx 0;
}

.commission-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #f5f5f5;
}

.commission-item:last-child {
  border-bottom: none;
}

.user-avatar {
  margin-right: 20rpx;
}

.commission-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.top-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.bottom-row {
  display: flex;
  justify-content: space-between;
}

.nickname {
  font-size: 28rpx;
  color: #333;
}

.amount {
  font-size: 28rpx;
  color: #E31D1A;
  font-weight: bold;
}

.order-no {
  font-size: 24rpx;
  color: #666;
}

.time {
  font-size: 24rpx;
  color: #999;
}
</style> 