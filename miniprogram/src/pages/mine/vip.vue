<template>
  <view class="container">
    <!-- 会员卡片 -->
    <view class="vip-card" :class="{ 'active-vip': vipInfo.isVip }">
      <view class="vip-card-header">
        <view class="vip-title">
          <nut-icon name="star-fill-n" size="24" color="#FFD700"></nut-icon>
          <text class="vip-title-text">家电商城VIP年度会员</text>
        </view>
        <view v-if="vipInfo.isVip" class="vip-status">
          <text class="vip-tag">VIP</text>
          <text class="vip-expire">{{ formatDate(vipInfo.vipExpireDate) }}到期</text>
        </view>
        <view v-else class="vip-status">
          <text class="vip-tag non-vip">普通用户</text>
        </view>
      </view>
      <view class="vip-card-content">
        <view class="vip-desc">
          <text>开通年度VIP会员，全年享受专属优惠</text>
        </view>
      </view>
    </view>
    
    <!-- 会员权益 -->
    <view class="benefits-box">
      <view class="section-title">年度会员专享权益</view>
      <view class="benefits-list">
        <view class="benefit-item">
          <view class="benefit-info">
            <view class="benefit-title">全场9.5折优惠</view>
            <view class="benefit-desc">365天无限次享受折扣</view>
          </view>
        </view>
        
        <view class="benefit-item">
          <view class="benefit-info">
            <view class="benefit-title">专属客服</view>
            <view class="benefit-desc">全年VIP专线客服服务</view>
          </view>
        </view>
        
        <view class="benefit-item">
          <view class="benefit-info">
            <view class="benefit-title">生日礼包</view>
            <view class="benefit-desc">年度会员专属豪华礼品</view>
          </view>
        </view>
        
        <view class="benefit-item">
          <view class="benefit-info">
            <view class="benefit-title">专享活动</view>
            <view class="benefit-desc">年度会员专属特价活动</view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 会员套餐 -->
    <view class="packages-box">
      <view class="section-title">会员套餐</view>
      <view class="package-item active">
        <view class="package-title">年度会员</view>
        <view class="package-price">¥298</view>
        <view class="package-tag">超值优惠</view>
      </view>
    </view>
    
    <!-- 开通按钮 -->
    <view class="action-box">
      <nut-button 
        type="primary" 
        block 
        @click="payForVip"
      >{{ vipInfo.isVip ? '立即续费' : '立即开通' }}</nut-button>
      <view class="agreement">
        <text>开通即表示同意</text>
        <text class="link" @click="showAgreement">《会员服务协议》</text>
      </view>
    </view>
  </view>
  
  <!-- 协议弹窗 -->
  <nut-popup v-model:visible="showAgreementPopup" position="bottom" round>
    <view class="agreement-popup">
      <view class="popup-title">年度会员服务协议</view>
      <view class="agreement-content">
        <text>
          1. 年度会员服务说明
          
          本协议是您与家电商城之间关于年度会员服务的协议。您在申请开通家电商城年度会员服务之前，应当认真阅读本协议。
          
          2. 年度会员权益
          
          (1) 商品折扣：年度会员可享受全场商品9.5折优惠，无使用次数限制；
          (2) 专属客服：提供全年VIP专线客服服务，优先响应；
          (3) 生日礼包：会员生日当月可领取专属豪华礼品；
          (4) 专享活动：年度会员可参与专属特价活动，享受限量优惠。
          
          3. 年度会员费用与有效期
          
          年度会员服务为付费服务，开通会员需一次性支付年费298元。会员有效期自开通之日起计算，有效期为1年（365天），到期后自动失效。
          
          4. 续费规则
          
          年度会员到期前可选择续费，续费后的有效期将在原有效期基础上顺延一年。
          
          5. 退款规则
          
          年度会员服务一经开通，除法律法规明确规定外，不支持退款。
          
          6. 协议修改
          
          家电商城有权根据业务发展需要修改本协议，修改后的协议将在平台公示。
        </text>
      </view>
      <view class="popup-buttons">
        <nut-button type="primary" @click="closeAgreement">我已阅读</nut-button>
      </view>
    </view>
  </nut-popup>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { userApi } from '../../api/user';

// 从App.vue注入用户信息
const userInfo = inject('userInfo');

// VIP相关数据
const vipInfo = reactive({
  isVip: false,
  vipExpireDate: null,
  isExpired: true
});

// VIP选项
const selectedMonths = ref(12); // 默认选择年费
const vipOptions = [
  { label: '年度会员', value: 12, price: 298 }
];

// 协议弹窗
const showAgreementPopup = ref(false);

// 页面加载
onMounted(() => {
  if (userInfo.isLoggedIn) {
    loadVipStatus();
  }
});

// 页面显示
onShow(() => {
  if (userInfo.isLoggedIn) {
    loadVipStatus();
  }
});

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

// 支付开通VIP
const payForVip = async () => {
  try {
    uni.showLoading({
      title: '支付处理中...',
      mask: true
    });
    
    // 调用加入VIP接口，获取支付参数
    const res = await userApi.joinVip(vipOptions[0].price);
    
    uni.hideLoading();
    
    if (res && res.code === 0 && res.data && res.data.payParams) {
      // 调用微信支付
      uni.requestPayment({
        ...res.data.payParams,
        success: () => {
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

// 显示协议
const showAgreement = () => {
  showAgreementPopup.value = true;
};

// 关闭协议
const closeAgreement = () => {
  showAgreementPopup.value = false;
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return '未知';
  const d = new Date(date);
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
};
</script>

<style lang="scss">
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding: 30rpx;
}

.vip-card {
  background: linear-gradient(to right, #333, #666);
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
  color: #fff;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.active-vip {
  background: linear-gradient(to right, #FFD700, #FFA500);
}

.vip-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.vip-title {
  display: flex;
  align-items: center;
}

.vip-title-text {
  font-size: 36rpx;
  font-weight: bold;
  margin-left: 10rpx;
}

.vip-status {
  display: flex;
  align-items: center;
}

.vip-tag {
  font-size: 24rpx;
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  margin-right: 10rpx;
}

.non-vip {
  background: rgba(255, 255, 255, 0.2);
}

.vip-expire {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.vip-card-content {
  margin-top: 20rpx;
}

.vip-desc {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
  color: #333;
}

.benefits-box {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.benefits-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30rpx;
}

.benefit-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
}

.benefit-icon {
  margin-right: 20rpx;
}

.benefit-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 6rpx;
}

.benefit-desc {
  font-size: 24rpx;
  color: #999;
}

.packages-box {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.package-item {
  flex: 1;
  max-width: 300rpx;
  margin: 0 auto;
  padding: 30rpx 20rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  text-align: center;
  position: relative;
  border: 2rpx solid #FFD700;
  background-color: #fffdf0;
}

.package-item.active {
  border-color: #FFD700;
  background-color: #fffdf0;
}

.package-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.package-price {
  font-size: 32rpx;
  color: #E31D1A;
  font-weight: bold;
}

.package-tag {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  background-color: #E31D1A;
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 10rpx;
  border-radius: 10rpx;
}

.action-box {
  margin-top: 50rpx;
}

.agreement {
  text-align: center;
  margin-top: 20rpx;
  font-size: 24rpx;
  color: #999;
}

.link {
  color: #E31D1A;
}

.agreement-popup {
  padding: 30rpx;
  max-height: 70vh;
}

.popup-title {
  font-size: 32rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 30rpx;
}

.agreement-content {
  font-size: 28rpx;
  line-height: 1.6;
  color: #666;
  max-height: 50vh;
  overflow-y: auto;
  margin-bottom: 30rpx;
}

.popup-buttons {
  text-align: center;
}
</style> 