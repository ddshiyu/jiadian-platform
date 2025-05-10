<template>
  <view class="container">
    <!-- 地址列表 -->
    <view v-if="loading" class="loading-box">
      <nut-icon name="loading" size="20"></nut-icon>
      <text class="loading-text">加载中...</text>
    </view>
    
    <block v-else-if="addressList.length > 0">
      <view 
        v-for="(address, index) in addressList" 
        :key="index" 
        class="address-item"
        :class="{ 'is-default': address.isDefault }"
      >
        <!-- 地址信息 -->
        <view class="address-content" @click="selectAddress(address)">
          <view class="address-info">
            <view class="user-info">
              <text class="name">{{ address.name }}</text>
              <text class="phone">{{ address.phone }}</text>
              <text v-if="address.isDefault" class="default-tag">默认</text>
            </view>
            <view class="address-detail">{{ getFullAddress(address) }}</view>
          </view>
        </view>
        
        <!-- 编辑操作 -->
        <view class="address-actions">
          <view class="action-btn" @click="editAddress(address)">
            <nut-icon name="edit" size="16"></nut-icon>
            <text class="action-text">编辑</text>
          </view>
          <view class="action-btn" @click="deleteAddress(address.id)">
            <nut-icon name="del" size="16"></nut-icon>
            <text class="action-text">删除</text>
          </view>
        </view>
      </view>
    </block>
    
    <view v-else class="empty-box">
      <nut-icon name="location" size="40"></nut-icon>
      <text class="empty-text">暂无收货地址</text>
    </view>
    
    <!-- 底部添加按钮 -->
    <view class="footer">
      <nut-button 
        type="primary" 
        block 
        @click="navigateToAddAddress"
      >
        新增收货地址
      </nut-button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { addressApi } from '@/api/address';

// 注入全局用户信息
const userInfo = inject('userInfo');

// 地址列表
const addressList = ref([]);

// 加载状态
const loading = ref(false);

// 页面加载
onMounted(() => {
  if (userInfo.isLoggedIn) {
    fetchAddressList();
  }
});

// 每次显示页面重新获取地址列表
onShow(() => {
  if (userInfo.isLoggedIn) {
    fetchAddressList();
  }
});

// 获取地址列表
const fetchAddressList = async () => {
  loading.value = true;
  try {
    // 调用API获取地址列表
    const res = await addressApi.getAddressList();
    
    if (res && res.data && Array.isArray(res.data)) {
      addressList.value = res.data;
    } else {
      addressList.value = [];
      console.error('获取地址列表返回格式错误', res);
    }
  } catch (error) {
    console.error('获取地址列表失败', error);
    uni.showToast({
      title: '获取地址列表失败',
      icon: 'none'
    });
    // 网络请求失败时显示空列表
    addressList.value = [];
  } finally {
    loading.value = false;
  }
};

// 获取完整地址文本
const getFullAddress = (address) => {
  return `${address.province}${address.city}${address.district}${address.detail}`;
};

// 选择地址
const selectAddress = (address) => {
  // 检查是否是从订单页面进入
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const query = currentPage.options || {};
  
  // 如果带有select=true参数，说明是用于选择地址的场景
  if (query.select === 'true') {
    // 获取事件通道
    const eventChannel = currentPage.getOpenerEventChannel();
    
    // 将地址信息传回上一页
    uni.navigateBack({
      delta: 1,
      success: () => {
        // 触发selectAddress事件并传递地址数据
        if (eventChannel && eventChannel.emit) {
          eventChannel.emit('selectAddress', address);
        }
      }
    });
    return;
  }
  
  // 如果是从订单页面进入，则选择地址并返回
  const prevPage = pages[pages.length - 2];
  
  if (prevPage && prevPage.route && prevPage.route.includes('order/checkout')) {
    // 将地址信息传回上一页
    uni.navigateBack({
      success: () => {
        // 触发上一页的事件，传递选中的地址
        if (prevPage.$vm && typeof prevPage.$vm.setSelectedAddress === 'function') {
          prevPage.$vm.setSelectedAddress(address);
        }
      }
    });
  }
};

// 编辑地址
const editAddress = (address) => {
  uni.navigateTo({
    url: `/pages/address/edit?id=${address.id}`
  });
};

// 新增地址
const navigateToAddAddress = () => {
  uni.navigateTo({
    url: '/pages/address/edit'
  });
};

// 删除地址
const deleteAddress = async (addressId) => {
  uni.showModal({
    title: '删除地址',
    content: '确定要删除该收货地址吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          // 调用API删除地址
          await addressApi.deleteAddress(addressId);
          
          // 重新获取地址列表
          fetchAddressList();
          
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          });
        } catch (error) {
          console.error('删除地址失败', error);
          uni.showToast({
            title: '删除失败，请重试',
            icon: 'none'
          });
        }
      }
    }
  });
};
</script>

<style lang="scss">
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 180rpx;
}

.address-item {
  background-color: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.address-item.is-default {
  border-left: 8rpx solid #E31D1A;
}

.address-content {
  padding: 30rpx;
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-right: 20rpx;
}

.phone {
  font-size: 28rpx;
  color: #666;
}

.default-tag {
  font-size: 22rpx;
  color: #E31D1A;
  border: 1rpx solid #E31D1A;
  border-radius: 20rpx;
  padding: 2rpx 12rpx;
  margin-left: 20rpx;
}

.address-detail {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
}

.address-actions {
  display: flex;
  border-top: 1rpx solid #f5f5f5;
}

.action-btn {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20rpx 0;
}

.action-text {
  font-size: 26rpx;
  color: #666;
  margin-left: 8rpx;
}

.loading-box {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx 0;
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

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 30rpx;
  background-color: #fff;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}
</style> 