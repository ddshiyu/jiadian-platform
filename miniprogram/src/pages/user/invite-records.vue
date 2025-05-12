<template>
  <view class="container">
    <nut-navbar title="邀请记录" back-text="返回" @on-click-back="goBack"></nut-navbar>
    
    <!-- 邀请统计 -->
    <view class="stats-card">
      <view class="stats-item">
        <text class="stats-num">{{ inviteesCount }}</text>
        <text class="stats-label">已邀请好友</text>
      </view>
    </view>
    
    <!-- 邀请列表 -->
    <view class="invite-list">
      <view v-if="invitees.length === 0" class="empty-tip">
        <nut-empty description="暂无邀请记录"></nut-empty>
      </view>
      
      <view v-else class="list-container">
        <view v-for="(item, index) in invitees" :key="index" class="invite-item">
          <view class="user-avatar">
            <nut-avatar size="large" :url="item.avatar || '/static/image/avatar.jpeg'"></nut-avatar>
          </view>
          <view class="user-info">
            <text class="nickname">{{ item.nickname || '匿名用户' }}</text>
            <text class="time">{{ formatDate(item.createdAt) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { userApi } from '../../api/user';

// 数据
const invitees = ref([]);
const inviteesCount = ref(0);
const loading = ref(false);

// 页面加载
onMounted(() => {
  loadInvitees();
});

// 加载邀请记录
const loadInvitees = async () => {
  loading.value = true;
  try {
    const res = await userApi.getInvitees();
    if (res && res.code === 0) {
      invitees.value = res.data || [];
      inviteesCount.value = invitees.value.length;
    } else {
      uni.showToast({
        title: res?.message || '获取邀请记录失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('获取邀请记录失败:', error);
    uni.showToast({
      title: '获取邀请记录失败',
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
  margin-bottom: 10rpx;
}

.stats-label {
  font-size: 28rpx;
  color: #666;
}

.invite-list {
  background-color: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.empty-tip {
  padding: 40rpx 0;
}

.invite-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #f5f5f5;
}

.invite-item:last-child {
  border-bottom: none;
}

.user-avatar {
  margin-right: 20rpx;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.nickname {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
}

.time {
  font-size: 24rpx;
  color: #999;
}
</style> 