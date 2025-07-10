<template>
  <view class="container">
    <!-- 公司信息 -->
    <view class="logo-box">
      <image src="/static/images/logo.png" class="logo-image" mode="widthFix"></image>
      <text class="app-name">家电商城</text>
      <text class="version">版本 1.0.0</text>
    </view>
    
    <!-- 公司介绍 -->
    <view class="about-box">
      <view class="about-title">公司介绍</view>
      <view class="about-content">
        <text class="about-text">家电商城是国内领先的家电零售商和服务提供商，致力于为消费者提供高品质的家电产品和便捷的购物体验。我们与众多国内外知名家电品牌建立了密切的合作关系，为消费者提供丰富的商品选择。</text>
        <text class="about-text">我们的使命是通过科技创新和优质服务，让家庭生活更智能、更便捷、更舒适。我们始终坚持"客户第一"的原则，不断完善我们的产品和服务，为消费者创造价值。</text>
      </view>
    </view>
    
    <!-- 联系方式 -->
    <view class="contact-box">
      <view class="contact-title">联系我们</view>
      <view class="contact-item">
        <nut-icon name="service" size="18"></nut-icon>
        <text class="contact-text">客服电话：19352187583</text>
      </view>
      <view class="contact-item">
        <nut-icon name="mail" size="18"></nut-icon>
        <text class="contact-text">业务邮箱：service@jiadian.com</text>
      </view>
      <view class="contact-item">
        <nut-icon name="location" size="18"></nut-icon>
        <text class="contact-text">公司地址：广东省深圳市南山区科技园南路高新科技园3号楼</text>
      </view>
    </view>
    
    <!-- 版权信息 -->
    <view class="copyright">
      <text>Copyright © 2024 家电商城 All Rights Reserved</text>
    </view>
  </view>
</template>

<script setup>
// 无需特殊逻辑
</script>

<style lang="scss">
.container {
  background-color: #f7f7f7;
  min-height: 100vh;
  padding: 30rpx;
}

.logo-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50rpx 0;
}

.logo-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
}

.app-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.version {
  font-size: 24rpx;
  color: #999;
}

.about-box, .contact-box {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.about-title, .contact-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  position: relative;
  padding-left: 20rpx;
}

.about-title::before, .contact-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 30rpx;
  background-color: #E31D1A;
  border-radius: 3rpx;
}

.about-content {
  padding: 10rpx 0;
}

.about-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 20rpx;
  display: block;
}

.contact-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.contact-item .nut-icon {
  margin-right: 15rpx;
  flex-shrink: 0;
  margin-top: 6rpx;
}

.contact-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.5;
  flex: 1;
}

.copyright {
  text-align: center;
  font-size: 24rpx;
  color: #999;
  margin-top: 50rpx;
  padding: 30rpx 0;
}
</style> 