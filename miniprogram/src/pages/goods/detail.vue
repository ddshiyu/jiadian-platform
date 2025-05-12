<template>
  <view class="container">
    <!-- 商品轮播图 -->
    <nut-swiper class="goods-swiper" :init-page="0" :pagination-visible="true">
      <nut-swiper-item v-for="(image, index) in goodsDetail.images" :key="index">
        <image :src="image" mode="aspectFill" class="swiper-image" />
      </nut-swiper-item>
    </nut-swiper>
    
    <!-- 商品信息 -->
    <view class="goods-info">
      <view class="price-box">
        <text class="price">¥{{ goodsDetail.price }}</text>
        <text class="original-price">¥{{ goodsDetail.originalPrice }}</text>
      </view>
      <!-- VIP价格 -->
      <VipTag :price="goodsDetail.price" />
      <view class="title">{{ goodsDetail.name }}</view>
      <view class="sales">销量: {{ goodsDetail.sales || 0 }}</view>
    </view>
    
    <!-- ... existing code ... -->
  </view>
</template>

<script setup>
import { ref, reactive, onMounted, computed, inject } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { goodsApi } from '../../api/goods';
import { cartApi } from '../../api/cart';
import VipTag from '@/components/VipTag.vue';

// ... existing code ...
</script>

// ... existing code ... 