<template>
  <view class="container">
    <!-- 商品轮播图 -->
    <nut-swiper 
      :height="375" 
      :pagination-visible="true"
      :auto-play="3000" 
      :indicator-type="'dot'"
    >
      <nut-swiper-item v-for="(item, index) in productImages" :key="index">
        <image
          :src="item"
          class="product-image"
          mode="widthFix"
          style="width:100%"
        ></image>
      </nut-swiper-item>
    </nut-swiper>

    <!-- 商品基本信息 -->
    <view class="product-info-box">
      <view class="price-box">
        <nut-price
          :price="product.price"
          size="large"
          :thousands="true"
          class="price"
        ></nut-price>
        <text v-if="product.originalPrice" class="original-price">¥{{ product.originalPrice }}</text>
      </view>
      <nut-ellipsis
        :content="product.name"
        direction="end"
        rows="2"
        class="product-name"
      ></nut-ellipsis>
      <view class="product-desc">{{ product.description }}</view>
    </view>

    <!-- 数量选择 -->
    <nut-cell-group class="quantity-box">
      <nut-cell title="数量">
        <nut-input-number v-model="quantity" :min="1" :max="product.stock"></nut-input-number>
      </nut-cell>
    </nut-cell-group>

    <!-- 商品详情 -->
    <view class="detail-box">
      <nut-divider>商品详情</nut-divider>
      <view v-if="product.images && product.images.length > 0" class="detail-images">
        <view v-for="(img, index) in product.images" :key="index" class="detail-image-item">
          <image :src="img" mode="widthFix" style="width:100%"></image>
        </view>
      </view>
      <rich-text v-if="product.detailHtml" :nodes="product.detailHtml"></rich-text>
      <view v-if="!product.detailHtml && (!product.images || product.images.length === 0)" class="no-detail">
        暂无详情
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="action-buttons">
        <view class="action-item" @click="navigateToHome">
          <nut-icon name="home" size="20"></nut-icon>
          <text class="action-text">首页</text>
        </view>
        <view class="action-item" @click="navigateToCart">
          <nut-badge :value="cartCount > 0 ? cartCount : ''" :max="99">
            <nut-icon name="cart" size="20"></nut-icon>
          </nut-badge>
          <text class="action-text">购物车</text>
        </view>
      </view>
      <view class="buy-buttons">
        <view class="add-cart-btn" @click="addToCart">加入购物车</view>
        <view class="buy-now-btn" @click="buyNow">立即购买</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { productApi } from '../../api/product';
import { cartApi } from '../../api/cart';
import { onLoad } from '@dcloudio/uni-app';

// 获取页面参数
const productId = ref(null);

// 商品信息
const product = reactive({
  id: 0,
  name: '',
  description: '',
  price: 0,
  originalPrice: 0,
  stock: 0,
  cover: '',
  images: [],
  detailHtml: '',
  Category: null
});

// 商品图片
const productImages = ref([]);

// 购买数量
const quantity = ref(1);

// 购物车数量
const cartCount = ref(0);

// 加载状态
const loading = ref(false);

// 错误状态
const hasError = ref(false);

// 页面加载
onLoad((options) => {
  console.log('页面参数options:', options);
  
  if (options && options.id) {
    productId.value = Number(options.id);
    console.log('商品ID已设置:', productId.value);
    loadProductDetail();
    loadCartCount();
  } else {
    console.error('页面参数中缺少商品ID');
    uni.showToast({
      title: '商品ID不存在',
      icon: 'none'
    });
    // 延迟返回上一页
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  }
});

// 加载商品详情
const loadProductDetail = async () => {
  if (!productId.value) return;
  
  try {
    loading.value = true;
    hasError.value = false;
    console.log('商品ID:', productId.value);
    // 调用API获取商品详情
    const res = await productApi.getDetail(productId.value);
    console.log('商品详情接口响应:', res);
    
    if (res && res.code === 0 && res.data) {
      // 更新商品信息
      Object.assign(product, res.data);
      
      // 设置商品轮播图，仅使用cover
      if (product.cover) {
        productImages.value = [product.cover];
      } else {
        // 默认图片
        productImages.value = ['/static/images/product-placeholder.png'];
      }
    } else {
      hasError.value = true;
      uni.showToast({
        title: '获取商品详情失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('获取商品详情失败:', error);
    hasError.value = true;
    uni.showToast({
      title: '获取商品详情失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 加载购物车数量
const loadCartCount = async () => {
  try {
    // 调用API获取购物车数量
    const res = await cartApi.getList();
    if (res && res.code === 0 && res.data) {
      // 如果返回的是数组
      if (Array.isArray(res.data)) {
        cartCount.value = res.data.length;
      } 
      // 如果返回的是对象，包含list字段
      else if (res.data.list && Array.isArray(res.data.list)) {
        cartCount.value = res.data.list.length;
      }
      // 其他情况，设置为0
      else {
        cartCount.value = 0;
      }
    } else {
      cartCount.value = 0;
    }
  } catch (error) {
    console.error('获取购物车数量失败:', error);
    cartCount.value = 0;
  }
};

// 加入购物车
const addToCart = async () => {
  try {
    // 调用API添加商品到购物车
    const data = {
      productId: product.id,
      quantity: quantity.value,
    };
    console.log('添加购物车参数:', data);
    
    const res = await cartApi.add(data);
    console.log('添加购物车响应:', res);
    
    if (res && res.code === 0) {
      uni.showToast({
        title: '已加入购物车',
        icon: 'success'
      });
      
      // 更新购物车数量
      cartCount.value++;
      
      // 可选: 重新加载购物车数量
      loadCartCount();
    } else {
      uni.showToast({
        title: res?.message || '添加失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('添加购物车失败:', error);
    uni.showToast({
      title: '添加购物车失败',
      icon: 'none'
    });
  }
};

// 立即购买
const buyNow = async () => {
  // 检查是否登录
  if (!uni.getStorageSync('token')) {
    uni.showToast({
      title: '请先登录',
      icon: 'none'
    });
    setTimeout(() => {
      uni.navigateTo({
        url: '/pages/user/login'
      });
    }, 1500);
    return;
  }
  
  // 检查库存
  if (product.stock <= 0) {
    uni.showToast({
      title: '商品库存不足',
      icon: 'none'
    });
    return;
  }
  
  try {
    uni.showLoading({
      title: '正在创建订单...'
    });
    
    // 跳转到订单确认页面，由订单确认页面处理后续逻辑
    uni.navigateTo({
      url: `/pages/order/checkout?productId=${product.id}&quantity=${quantity.value}`
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    uni.showToast({
      title: '创建订单失败',
      icon: 'none'
    });
  } finally {
    uni.hideLoading();
  }
};

// 跳转到首页
const navigateToHome = () => {
  uni.switchTab({
    url: '/pages/index/index'
  });
};

// 跳转到购物车
const navigateToCart = () => {
  uni.switchTab({
    url: '/pages/cart/index'
  });
};
</script>

<style lang="scss">
.container {
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom));
  background-color: #f5f5f5;
}

.product-image {
  width: 100%;
  height: auto;
  background-color: #f8f8f8;
}

.product-info-box {
  padding: 30rpx;
  background-color: #fff;
  margin-bottom: 20rpx;
}

.price-box {
  display: flex;
  align-items: baseline;
  margin-bottom: 20rpx;
}

.price {
  color: var(--nut-primary-color, #fa2c19);
  margin-right: 10rpx;
}

.original-price {
  font-size: 28rpx;
  color: #999;
  text-decoration: line-through;
  margin-left: 20rpx;
}

.product-name {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 20rpx;
  line-height: 1.5;
}

.product-desc {
  font-size: 28rpx;
  color: #666;
  line-height: 1.5;
  margin-top: 20rpx;
}

.quantity-box {
  margin-bottom: 20rpx;
}

.detail-box {
  padding: 30rpx;
  background-color: #fff;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100rpx;
  background-color: #fff;
  display: flex;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.action-buttons {
  display: flex;
  width: 200rpx;
  border-right: 2rpx solid #f7f7f7;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100rpx;
  position: relative;
}

.action-text {
  font-size: 20rpx;
  color: #666;
  margin-top: 5rpx;
}

.buy-buttons {
  flex: 1;
  display: flex;
  height: 100%;
}

.buy-btn-item {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-cart-btn, .buy-now-btn {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #fff;
  text-align: center;
}

.add-cart-btn {
  background-color: #ff9500;
}

.buy-now-btn {
  background-color: #E31D1A;
}

.detail-images {
  margin-bottom: 30rpx;
}

.detail-image-item {
  margin-bottom: 20rpx;
}

.no-detail {
  text-align: center;
  padding: 40rpx 0;
  color: #999;
  font-size: 28rpx;
}

.bottom-icon {
  width: 40rpx;
  height: 40rpx;
}
</style> 