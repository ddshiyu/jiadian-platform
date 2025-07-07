<template>
  <view class="container">
    <!-- 用户信息 -->
    <view class="user-info-box">
      <view class="user-info">
        <nut-avatar 
          size="large" 
          shape="round"
          bg-color="#f5f5f5"
        >
          <image 
            v-if="userInfo.avatar" 
            :src="userInfo.avatar" 
            mode="aspectFill"
          />
          <image 
            v-else 
            src="/static/image/avatar.jpeg" 
            mode="aspectFill"
          />
        </nut-avatar>
        <view class="user-details">
          <view v-if="userInfo.isLoggedIn" class="nickname">
            {{ userInfo.nickname || '微信用户' }}
            <image 
              v-if="userInfo.userType === 'supplier'" 
              src="@/static/icons/b.png" 
              mode="aspectFit" 
              class="user-type-icon"
            />
            <image 
              v-else 
              src="@/static/icons/c.png" 
              mode="aspectFit" 
              class="user-type-icon"
            />
          </view>
          <button 
            v-else 
            class="login-btn" 
            open-type="getPhoneNumber" 
            @getphonenumber="getPhoneNumber"
          >
            点击登录
          </button>
          <view v-if="userInfo.isLoggedIn && userInfo.phone" class="user-phone">
            {{ formatPhone(userInfo.phone) }}
          </view>
          <view v-if="userInfo.isLoggedIn && !userInfo.phone" class="user-phone">
            <text class="bind-phone" @click="showPhoneButton">点击绑定手机号</text>
            <!-- 临时授权按钮 -->
            <button 
              v-if="showAuthButton" 
              class="auth-phone-btn" 
              open-type="getPhoneNumber" 
              @getphonenumber="getPhoneNumber"
            >
              一键授权
            </button>
          </view>
          <view v-if="userInfo.isLoggedIn && inviteData.commission > 0" class="commission">
            累计佣金: ¥{{ inviteData.commission }}
          </view>
        </view>
      </view>
    </view>
    
    <!-- VIP会员 -->
    <view v-if="userInfo.isLoggedIn" class="vip-box">
      <view class="vip-header">
        <view class="vip-title-box">
          <nut-icon name="star-fill-n" size="20" color="#FFD700"></nut-icon>
          <text class="vip-title">年度会员中心</text>
        </view>
        <view v-if="vipInfo.isVip" class="vip-status">
          <text class="vip-tag">VIP</text>
          <text class="vip-expire">{{ formatDate(vipInfo.vipExpireDate) }}到期</text>
        </view>
        <view v-else class="vip-status">
          <text class="vip-tag non-vip">普通用户</text>
        </view>
      </view>
      <view class="vip-content">
        <view class="vip-desc">
          <text>开通年度VIP会员，全年享受专属优惠</text>
          <text class="vip-benefits">· 全场优惠价 · 专属客服 · 豪华礼包</text>
        </view>
        <nut-button 
          v-if="!vipInfo.isVip" 
          type="primary" 
          size="small" 
          @click="showVipOptions"
        >
          立即开通
        </nut-button>
        <nut-button 
          v-else 
          type="primary" 
          size="small" 
          @click="showVipOptions"
        >
          续费会员
        </nut-button>
      </view>
    </view>
    
    <!-- 邀请好友 -->
    <view v-if="userInfo.isLoggedIn" class="invite-box">
      <view class="invite-header">
        <text class="invite-title">我的邀请码</text>
        <nut-button type="primary" size="small" open-type="share">分享邀请</nut-button>
      </view>
      <view class="invite-code-box">
        <text class="invite-code">{{ inviteData.inviteCode || '加载中...' }}</text>
        <view class="invite-copy" @click="copyInviteCode">
          <text class="copy-text">复制</text>
        </view>
      </view>
      <view class="invite-tip">
        <text>分享邀请链接，好友下单立得佣金</text>
      </view>
      <view class="invite-data">
        <view class="invite-data-item">
          <text class="invite-data-num">{{ inviteData.inviteesCount || 0 }}</text>
          <text class="invite-data-label">已邀请好友</text>
        </view>
        <view class="invite-data-item">
          <text class="invite-data-num">{{ inviteData.commission || 0 }}</text>
          <text class="invite-data-label">累计佣金(元)</text>
        </view>
      </view>
    </view>
    
    <!-- 订单信息 -->
    <view class="order-box">
      <!-- 订单标题栏 -->
      <view class="order-header" @click="navigateToOrderList('')">
        <text class="order-title">我的订单</text>
        <view class="order-more">
          <text class="more-text">全部订单</text>
          <nut-icon name="right" size="14"></nut-icon>
        </view>
      </view>
      
      <!-- 订单图标区域 -->
      <nut-grid :column-num="4">
        <nut-grid-item @click="navigateToOrderList('pending_payment')">
          <nut-badge v-if="orderCount.pending_payment > 0" :value="orderCount.pending_payment" :max="99">
            <image src="/static/icons/fukuan.png" class="status-icon"></image>
          </nut-badge>
          <image v-else src="/static/icons/fukuan.png" class="status-icon"></image>
          <text class="status-text">待付款</text>
        </nut-grid-item>
        
        <nut-grid-item @click="navigateToOrderList('pending_delivery')">
          <nut-badge v-if="orderCount.pending_delivery > 0" :value="orderCount.pending_delivery" :max="99">
            <image src="/static/icons/fahuo.png" class="status-icon"></image>
          </nut-badge>
          <image v-else src="/static/icons/fahuo.png" class="status-icon"></image>
          <text class="status-text">待发货</text>
        </nut-grid-item>
        
        <nut-grid-item @click="navigateToOrderList('delivered')">
          <nut-badge v-if="orderCount.delivered > 0" :value="orderCount.delivered" :max="99">
            <image src="/static/icons/shouhuo.png" class="status-icon"></image>
          </nut-badge>
          <image v-else src="/static/icons/shouhuo.png" class="status-icon"></image>
          <text class="status-text">待收货</text>
        </nut-grid-item>
        
        <nut-grid-item @click="navigateToOrderList('completed')">
          <image src="/static/icons/shouhou.png" class="status-icon"></image>
          <text class="status-text">已完成</text>
        </nut-grid-item>
      </nut-grid>
    </view>
    
    <!-- 功能列表 -->
    <nut-cell-group title="我的服务" class="function-group">
      <nut-cell 
        title="收货地址" 
        is-link 
        @click="navigateToAddressList"
      >
        <template #icon>
          <nut-icon name="location" size="18"></nut-icon>
        </template>
      </nut-cell>
      <nut-cell 
        v-if="userInfo.isLoggedIn"
        title="邀请记录" 
        is-link 
        @click="navigateToInviteRecords"
      >
        <template #icon>
          <nut-icon name="people" size="18"></nut-icon>
        </template>
      </nut-cell>
      <nut-cell 
        v-if="userInfo.isLoggedIn"
        title="佣金记录" 
        is-link 
        @click="navigateToCommissionRecords"
      >
        <template #icon>
          <nut-icon name="star-fill-n" size="18"></nut-icon>
        </template>
      </nut-cell>
      <nut-cell 
        title="联系客服" 
        is-link 
        @click="contactCustomerService"
      >
        <template #icon>
          <nut-icon name="service" size="18"></nut-icon>
        </template>
      </nut-cell>
      <nut-cell 
        title="关于我们" 
        is-link 
        @click="navigateToAbout"
      >
        <template #icon>
          <nut-icon name="ask" size="18"></nut-icon>
        </template>
      </nut-cell>
    </nut-cell-group>
  </view>
  
  <!-- VIP选项弹窗 -->
  <nut-popup v-model:visible="showVipPopup" position="bottom" round>
    <view class="vip-popup">
      <view class="popup-title">选择会员时长</view>
      <view class="vip-options">
        <view 
          v-for="(option, index) in vipOptions" 
          :key="index" 
          class="vip-option-item"
          :class="{ active: selectedMonths === option.value }"
          @click="selectVipOption(option)"
        >
          <view class="option-label">{{ option.label }}</view>
          <view class="option-price">¥{{ option.price }}</view>
        </view>
      </view>
      <view class="popup-buttons">
        <nut-button type="default" @click="showVipPopup = false">取消</nut-button>
        <nut-button type="primary" @click="payForVip">立即支付</nut-button>
      </view>
    </view>
  </nut-popup>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue';
import { onShow } from '@dcloudio/uni-app'
import { onShareAppMessage } from '@dcloudio/uni-app'
import { userApi } from '../../api/user';
import { orderApi } from '../../api/order';

// 从App.vue注入用户信息
const userInfo = inject('userInfo');

// 是否显示临时授权按钮
const showAuthButton = ref(false);

// 订单数量
const orderCount = reactive({
  pending_payment: 0,
  pending_delivery: 0,
  delivered: 0,
  completed: 0
});

// 邀请相关数据
const inviteData = reactive({
  inviteCode: '',
  commission: 0,
  inviteesCount: 0
});

// VIP相关数据
const vipInfo = reactive({
  isVip: false,
  vipExpireDate: null,
  isExpired: true
});


// VIP选项弹窗
const showVipPopup = ref(false);
const selectedMonths = ref(1);
const vipOptions = [
  { label: '1个月', value: 1, price: 30 },
  { label: '3个月', value: 3, price: 80 },
  { label: '12个月', value: 12, price: 298 }
];


// 页面显示
onShow(() => {
  loadOrderCount();
  if (userInfo.isLoggedIn) {
    loadInviteData();
    loadVipStatus();
  }
});

// 加载邀请相关数据
const loadInviteData = async () => {
  try {
    // 获取邀请码和佣金
    const inviteCodeRes = await userApi.getInviteCode();
    if (inviteCodeRes && inviteCodeRes.code === 0 && inviteCodeRes.data) {
      inviteData.inviteCode = inviteCodeRes.data.inviteCode;
      inviteData.commission = inviteCodeRes.data.commission || 0;
    }
    // 获取邀请好友数量
    const userInfoRes = await userApi.getUserInfo();
    if (userInfoRes && userInfoRes.code === 0 && userInfoRes.data) {
      inviteData.inviteesCount = userInfoRes.data.statistics?.inviteesCount || 0;
    } else if (userInfoRes && userInfoRes.code === 404) {
      uni.removeStorageSync('userInfo')
    }
  } catch (error) {
    console.error('获取邀请数据失败:', error);
    uni.showToast({
      title: '获取邀请数据失败',
      icon: 'none'
    });
  }
};

// 复制邀请码
const copyInviteCode = () => {
  if (!inviteData.inviteCode) {
    uni.showToast({
      title: '邀请码获取失败',
      icon: 'none'
    });
    return;
  }
  
  uni.setClipboardData({
    data: inviteData.inviteCode,
    success: () => {
      uni.showToast({
        title: '邀请码已复制',
        icon: 'success'
      });
    }
  });
};

// 自定义分享内容（在页面中定义）
uni.onShareAppMessage = () => {
  return {
    title: '邀请您使用家电商城',
    path: `/pages/index/index?inviteCode=${inviteData.inviteCode}`,
    imageUrl: '/static/images/share-image.png'
  };
};

// 加载订单数量
const loadOrderCount = async () => {
  if (!userInfo.isLoggedIn) return;
  
  try {
    const res = await orderApi.getStats();
    
    if (res && res.code === 0 && res.data) {
      // 更新订单数量，适配后端返回字段格式
      Object.assign(orderCount, {
        pending_payment: res.data.pendingPayment || 0,
        pending_delivery: res.data.pendingDelivery || 0,
        delivered: res.data.delivered || 0,
        completed: res.data.completed || 0
      });
      console.log('订单统计数据:', orderCount);
    }
  } catch (error) {
    console.error('获取订单统计失败:', error);
  }
};

// 跳转到订单列表
const navigateToOrderList = (status) => {
  uni.navigateTo({
    url: `/pages/order/index?status=${status}`
  });
};

// 跳转到地址管理
const navigateToAddressList = () => {
  uni.navigateTo({
    url: '/pages/address/list'
  });
};

// 联系客服
const contactCustomerService = () => {
  uni.makePhoneCall({
    phoneNumber: '400-123-4567',
    fail: () => {
      uni.showToast({
        title: '拨打电话失败',
        icon: 'none'
      });
    }
  });
};

// 获取用户手机号
const getPhoneNumber = async (e) => {
  if (e.detail.errMsg !== 'getPhoneNumber:ok') {
    uni.showToast({
      title: '获取手机号失败',
      icon: 'none'
    });
    // 隐藏临时授权按钮
    showAuthButton.value = false;
    return;
  }

  try {
    // 显示加载中
    uni.showLoading({
      title: '登录中...',
      mask: true
    });
    
    // 先进行登录
    const loginRes = await userApi.login({
      code: await getWxCode()
    });
    
    if (!loginRes || loginRes.code !== 0) {
      uni.hideLoading();
      uni.showToast({
        title: '登录失败',
        icon: 'none'
      });
      // 隐藏临时授权按钮
      showAuthButton.value = false;
      return;
    }
    
    // 登录成功，保存token和用户信息
    if (loginRes.data && loginRes.data.token) {
      uni.setStorageSync('token', loginRes.data.token);
      
      // 更新用户信息
      Object.assign(userInfo, {
        isLoggedIn: true,
        ...loginRes.data.userInfo
      });
    }
    
    // 获取手机号
    const phoneRes = await userApi.getPhoneNumber(e.detail.code);
    uni.hideLoading();
    
    if (phoneRes && phoneRes.code === 0 && phoneRes.data) {
      // 更新用户手机号
      userInfo.phone = phoneRes.data.phoneNumber;
      
      uni.showToast({
        title: '登录成功',
        icon: 'success'
      });
      
      // 重新加载数据
      loadOrderCount();
      loadInviteData();
    } else {
      uni.showToast({
        title: phoneRes?.message || '获取手机号失败',
        icon: 'none'
      });
    }
    
    // 隐藏临时授权按钮
    showAuthButton.value = false;
  } catch (error) {
    uni.hideLoading();
    console.error('登录失败:', error);
    uni.showToast({
      title: '登录失败',
      icon: 'none'
    });
    // 隐藏临时授权按钮
    showAuthButton.value = false;
  }
};

// 获取微信登录code
const getWxCode = () => {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => {
        if (res.code) {
          resolve(res.code);
        } else {
          reject(new Error('获取code失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

// 格式化手机号(中间4位显示*)
const formatPhone = (phone) => {
  if (!phone || phone.length !== 11) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(7);
};

// 显示手机号授权按钮
const showPhoneButton = () => {
  uni.showModal({
    title: '绑定手机号',
    content: '是否授权获取您的手机号码？',
    success: (res) => {
      if (res.confirm) {
        // 用户点击确定，显示微信授权按钮
        showAuthButton.value = true;
        uni.showToast({
          title: '请点击"一键授权"按钮',
          icon: 'none'
        });
      }
    }
  });
};

// 关于我们
const navigateToAbout = () => {
  uni.navigateTo({
    url: '/pages/about/index'
  });
};

// 跳转到邀请记录页面
const navigateToInviteRecords = () => {
  uni.navigateTo({
    url: '/pages/user/invite-records'
  });
};

// 跳转到佣金记录页面
const navigateToCommissionRecords = () => {
  uni.navigateTo({
    url: '/pages/user/commission-records'
  });
};

onShareAppMessage(() => ({
  title: `我邀请你加入家电商城，共享财富`,
  path: `/pages/index/index?inviteCode=${inviteData.inviteCode}`,
  imageUrl: '/static/image/avatar.jpeg'
}))

// 加载VIP状态
const loadVipStatus = async () => {
  try {
    const res = await userApi.getVipStatus();
    if (res && res.code === 0 && res.data) {
      Object.assign(vipInfo, res.data);
    }
  } catch (error) {
    console.error('获取VIP状态失败:', error);
  }
};

// 显示VIP选项弹窗
const showVipOptions = () => {
  // 跳转到VIP会员页面
  uni.navigateTo({
    url: '/pages/mine/vip'
  });
};

// 选择VIP时长
const selectVipOption = (option) => {
  selectedMonths.value = option.value;
};

// 支付开通VIP
const payForVip = async () => {
  try {
    uni.showLoading({
      title: '支付处理中...',
      mask: true
    });
    
    // 获取当前选择的VIP选项
    const selectedOption = vipOptions.find(option => option.value === selectedMonths.value);
    if (!selectedOption) {
      uni.hideLoading();
      uni.showToast({
        title: '请选择会员时长',
        icon: 'none'
      });
      return;
    }
    
    // 调用加入VIP接口，获取支付参数
    const res = await userApi.joinVip(selectedOption.price);
    
    uni.hideLoading();
    
    if (res && res.code === 0 && res.data && res.data.payParams) {
      // 调用微信支付
      uni.requestPayment({
        ...res.data.payParams,
        success: () => {
          showVipPopup.value = false;
          // 支付成功后刷新VIP状态
          loadVipStatus();
          uni.showToast({
            title: 'VIP开通成功',
            icon: 'success'
          });
        },
        fail: (err) => {
          console.error('支付失败:', err);
          uni.showToast({
            title: '支付已取消',
            icon: 'none'
          });
        }
      });
    } else {
      showVipPopup.value = false;
      uni.showToast({
        title: res?.message || 'VIP开通失败',
        icon: 'none'
      });
    }
  } catch (error) {
    uni.hideLoading();
    console.error('VIP开通失败:', error);
    uni.showToast({
      title: 'VIP开通失败',
      icon: 'none'
    });
  }
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return '未知';
  const d = new Date(date);
  return d.toLocaleDateString();
};

</script>

<style lang="scss">
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 30rpx;
}

.user-info-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40rpx 30rpx;
  background: linear-gradient(to right, #E31D1A, #FF6E5D);
  color: #fff;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-details {
  margin-left: 20rpx;
}

.nickname {
  font-size: 32rpx;
  font-weight: bold;
}

.user-phone {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 8rpx;
}

.bind-phone {
  color: #FFD700;
  text-decoration: underline;
}

.auth-phone-btn {
  margin-top: 10rpx;
  background: #FFD700;
  color: #E31D1A;
  border-radius: 30rpx;
  padding: 4rpx 16rpx;
  font-size: 22rpx;
  border: none;
  line-height: 1.5;
}

.commission {
  font-size: 24rpx;
  color: #ffecec;
  margin-top: 8rpx;
}

.setting-btn {
  padding: 20rpx;
}

:deep(.nut-grid-item__content) {
  padding: 20rpx 0;
  position: relative;
}

.status-text {
  font-size: 26rpx;
  margin-top: 10rpx;
  color: #333;
}

.function-group {
  margin-top: 20rpx;
}

:deep(.nut-cell__value) {
  color: #666;
}

:deep(.nut-card) {
  margin: 20rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

:deep(.nut-icon) {
  vertical-align: middle;
}

:deep(.nut-badge) {
  --nut-badge-background-color: #E31D1A;
  --nut-badge-font-size: 20rpx;
  --nut-badge-padding: 0 6rpx;
}

.order-box {
  margin: 20rpx;
  border-radius: 12rpx;
  background-color: #fff;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.order-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.order-more {
  display: flex;
  align-items: center;
}

.more-text {
  font-size: 26rpx;
  color: #999;
  margin-right: 10rpx;
}

.status-icon {
  width: 60rpx;
  height: 60rpx;
  margin-right: 10rpx;
}

.invite-box {
  margin: 20rpx;
  border-radius: 12rpx;
  background-color: #fff;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.invite-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.invite-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.invite-code-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  background-color: #f9f9f9;
  border-bottom: 1rpx solid #f5f5f5;
}

.invite-code {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  letter-spacing: 2rpx;
}

.invite-copy {
  display: flex;
  align-items: center;
  background-color: #f1f1f1;
  padding: 8rpx 16rpx;
  border-radius: 30rpx;
}

.copy-text {
  font-size: 24rpx;
  color: #666;
  margin-left: 6rpx;
}

.invite-tip {
  padding: 24rpx 30rpx;
  font-size: 24rpx;
  color: #999;
  background-color: #fffdf0;
  border-bottom: 1rpx solid #f5f5f5;
}

.invite-data {
  display: flex;
  padding: 24rpx;
}

.invite-data-item {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.invite-data-num {
  font-size: 32rpx;
  font-weight: bold;
  color: #E31D1A;
  margin-bottom: 10rpx;
}

.invite-data-label {
  font-size: 24rpx;
  color: #999;
}

.phone-btn {
  background: linear-gradient(to right, #E31D1A, #FF6E5D);
  color: #fff;
  border-radius: 30rpx;
  padding: 6rpx 20rpx;
  font-size: 24rpx;
  border: none;
  line-height: 1.5;
}

.phone-btn-text {
  color: #fff;
}

.login-btn {
  background: none;
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  padding: 0;
  margin: 0;
  line-height: 1.2;
  text-align: left;
  border: none;
  outline: none;
}

.vip-box {
  margin: 20rpx;
  border-radius: 12rpx;
  background-color: #fff;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.vip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.vip-title-box {
  display: flex;
  align-items: center;
}

.vip-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-left: 10rpx;
}

.vip-status {
  display: flex;
  align-items: center;
}

.vip-tag {
  font-size: 24rpx;
  background: linear-gradient(to right, #FFD700, #FFA500);
  color: #fff;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  margin-right: 10rpx;
}

.non-vip {
  background: #f5f5f5;
  color: #999;
}

.vip-expire {
  font-size: 24rpx;
  color: #999;
}

.vip-content {
  padding: 24rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vip-desc {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 20rpx;
}

.vip-benefits {
  font-size: 24rpx;
  color: #999;
  margin-left: 10rpx;
}

.vip-popup {
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.popup-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  padding: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.vip-options {
  padding: 20rpx;
}

.vip-option-item {
  padding: 10rpx;
  border-bottom: 1rpx solid #f5f5f5;
  cursor: pointer;
}

.active {
  background-color: #f5f5f5;
}

.option-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.option-price {
  font-size: 24rpx;
  color: #999;
  margin-top: 5rpx;
}

.popup-buttons {
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
}

.user-type-icon {
  width: 34rpx;
  height: 34rpx;
  margin-left: 10rpx;
  vertical-align: middle;
}
</style> 