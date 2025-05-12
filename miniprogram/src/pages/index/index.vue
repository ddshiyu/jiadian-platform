<template>
  <view class="container">
    <!-- 搜索栏 -->
    <view class="search-bar" @click="navigateToSearch">
      <view class="search-input-box">
        <nut-icon name="search" size="16"></nut-icon>
        <text class="search-placeholder">搜索商品</text>
      </view>
    </view>
    
    <!-- 轮播图 -->
    <nut-swiper 
      :height="200" 
      :pagination-visible="true"
      :auto-play="3000" 
      :indicator-type="'dot'"
    >
      <nut-swiper-item v-for="(item, index) in bannerList" :key="index" @click="navigateToProduct(item.productId)">
        <image :src="item.image" class="banner-image" mode="widthFix"></image>
      </nut-swiper-item>
    </nut-swiper>

    <!-- 分类导航 -->
    <view class="category-nav">
      <view
        v-for="(item, index) in categoryList"
        :key="index"
        class="category-item"
        @click="navigateToCategory(item.id)"
      >
        <image :src="item.icon" class="category-icon"></image>
        <text class="category-name">{{ item.name }}</text>
      </view>
    </view>

    <!-- 为您推荐 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">为您推荐</text>
      </view>
      <view class="product-list">
        <view
          v-for="(item, index) in recommendProductList"
          :key="index"
          class="product-item"
          @click="navigateToProduct(item.id)"
        >
          <image
            :src="item.cover"
            class="product-image"
            width="345"
            height="345"
          ></image>
          <view class="product-info">
            <nut-ellipsis
              :content="item.name"
              direction="end"
              rows="2"
              class="product-name"
            ></nut-ellipsis>
            <view class="product-price-box">
              <nut-price :price="item.price" size="normal" :thousands="true"></nut-price>
              <text v-if="item.originalPrice" class="product-original-price">¥{{ item.originalPrice }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 邀请码核销弹窗 -->
    <nut-popup v-model:visible="showInviteCodePopup" position="bottom" round>
      <view class="invite-code-popup">
        <view class="popup-title">输入邀请码</view>
        <view class="popup-content">
          <nut-input 
            v-model="inputInviteCode" 
            placeholder="请输入邀请码" 
            type="text"
            class="invite-code-input"
          />
          <view class="popup-tip">输入好友的邀请码，建立邀请关系</view>
        </view>
        <view class="popup-buttons">
          <nut-button type="default" @click="showInviteCodePopup = false">取消</nut-button>
          <nut-button type="primary" @click="submitInviteCode">确认</nut-button>
        </view>
      </view>
    </nut-popup>
  </view>
</template>

<script setup lang="js">
import { ref, onMounted } from 'vue';
import { homeApi } from '../../api/index';
import { productApi } from '../../api/product';
import { userApi } from '../../api/user';
import { onLoad } from '@dcloudio/uni-app';

// 轮播图数据
const bannerList = ref([]);

// 分类数据
const categoryList = ref([]);

// 推荐商品数据
const recommendProductList = ref([]);

// 邀请码相关状态
const showInviteCodePopup = ref(false);
const inputInviteCode = ref('');

// 加载状态
const loading = ref({
  banners: false,
  categories: false,
  hotProducts: false,
  recommendProducts: false,
  newProducts: false
});

// 页面加载
onLoad((options) => {
  console.log('首页加载', options);
  fetchBanners();
  fetchCategories();
  fetchRecommendProducts();
  
  // 检查是否有邀请码参数
  if (options && options.inviteCode) {
    inputInviteCode.value = options.inviteCode;
    showInviteCodePopup.value = true;
  }
});

// 获取轮播图数据
const fetchBanners = async () => {
  try {
    loading.value.banners = true;
    const res = await homeApi.getBanners();
    if (res && res.code === 0 && res.data) {
      bannerList.value = res.data;
    } else {
      // 使用默认数据
      bannerList.value = [
        { id: 1, image: '/static/images/banner1.png', productId: 1 },
        { id: 2, image: '/static/images/banner2.png', productId: 2 },
        { id: 3, image: '/static/images/banner3.png', productId: 3 }
      ];
    }
  } catch (error) {
    console.error('获取轮播图失败', error);
    // 使用默认数据
    bannerList.value = [
      { id: 1, image: '/static/images/banner1.png', productId: 1 },
      { id: 2, image: '/static/images/banner2.png', productId: 2 },
      { id: 3, image: '/static/images/banner3.png', productId: 3 }
    ];
  } finally {
    loading.value.banners = false;
  }
};

// 获取分类数据
const fetchCategories = async () => {
  try {
    loading.value.categories = true;
    const res = await homeApi.getCategories();
    if (res && res.code === 0 && res.data) {
      // 只显示前5个分类
      categoryList.value = res.data.slice(0, 5);
    } else {
      // 使用默认数据
      categoryList.value = [
        { id: 1, name: '冰箱', icon: '/static/icons/category-fridge.png' },
        { id: 2, name: '洗衣机', icon: '/static/icons/category-washer.png' },
        { id: 3, name: '电视', icon: '/static/icons/category-tv.png' },
        { id: 4, name: '空调', icon: '/static/icons/category-ac.png' },
        { id: 5, name: '更多', icon: '/static/icons/category-more.png' }
      ];
    }
  } catch (error) {
    console.error('获取分类失败', error);
    // 使用默认数据
    categoryList.value = [
      { id: 1, name: '冰箱', icon: '/static/icons/category-fridge.png' },
      { id: 2, name: '洗衣机', icon: '/static/icons/category-washer.png' },
      { id: 3, name: '电视', icon: '/static/icons/category-tv.png' },
      { id: 4, name: '空调', icon: '/static/icons/category-ac.png' },
      { id: 5, name: '更多', icon: '/static/icons/category-more.png' }
    ];
  } finally {
    loading.value.categories = false;
  }
};

// 获取推荐商品
const fetchRecommendProducts = async () => {
  try {
    loading.value.recommendProducts = true;
    // 使用 productApi.getProducts 接口并添加 isRecommended=true 参数
    const res = await productApi.getProducts({ isRecommended: true, limit: 4 });
    if (res && res.code === 0 && res.data) {
      recommendProductList.value = res.data.list;
    } else {
      // 使用默认数据
      recommendProductList.value = [
        { id: 9, name: '海信超薄智能电视', cover: '/static/images/product9.png', price: 2999, originalPrice: 3599 },
        { id: 10, name: '小米全自动洗碗机', cover: '/static/images/product10.png', price: 1899, originalPrice: 2199 },
        { id: 11, name: 'LG变频风冷冰箱', cover: '/static/images/product11.png', price: 4299, originalPrice: 4999 },
        { id: 12, name: '三星智能家庭影院', cover: '/static/images/product12.png', price: 3699, originalPrice: 4299 }
      ];
    }
  } catch (error) {
    console.error('获取推荐商品失败', error);
    // 使用默认数据
    recommendProductList.value = [
      { id: 9, name: '海信超薄智能电视', cover: '/static/images/product9.png', price: 2999, originalPrice: 3599 },
      { id: 10, name: '小米全自动洗碗机', cover: '/static/images/product10.png', price: 1899, originalPrice: 2199 },
      { id: 11, name: 'LG变频风冷冰箱', cover: '/static/images/product11.png', price: 4299, originalPrice: 4999 },
      { id: 12, name: '三星智能家庭影院', cover: '/static/images/product12.png', price: 3699, originalPrice: 4299 }
    ];
  } finally {
    loading.value.recommendProducts = false;
  }
};

// 跳转到商品详情
const navigateToProduct = (id) => {
  console.log('跳转商品详情，商品ID:', id);
  if (!id) {
    uni.showToast({
      title: '商品ID不存在',
      icon: 'none'
    });
    return;
  }
  
  // 确保ID是字符串类型
  const productId = String(id);
  uni.navigateTo({
    url: `/pages/product/detail?id=${productId}`,
    success: (res) => {
      console.log('跳转成功');
    },
    fail: (err) => {
      console.error('跳转失败:', err);
      uni.showToast({
        title: '页面跳转失败',
        icon: 'none'
      });
    }
  });
};

// 跳转到分类页面
const navigateToCategory = (id) => {
  if (id) {
    uni.switchTab({
      url: `/pages/category/index?id=${id}`
    });
  } else {
    uni.switchTab({
      url: '/pages/category/index'
    });
  }
};

// 跳转到搜索页面
const navigateToSearch = () => {
  uni.navigateTo({
    url: '/pages/search/index'
  });
};

// 提交邀请码
const submitInviteCode = async () => {
  if (!inputInviteCode.value) {
    uni.showToast({
      title: '请输入邀请码',
      icon: 'none'
    });
    return;
  }
  
  try {
    const res = await userApi.redeemInviteCode(inputInviteCode.value);
    if (res && res.code === 0) {
      uni.showToast({
        title: '邀请码核销成功',
        icon: 'success'
      });
      showInviteCodePopup.value = false;
    } else {
      uni.showToast({
        title: res?.message || '核销失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('核销邀请码失败:', error);
    uni.showToast({
      title: '核销邀请码失败',
      icon: 'none'
    });
  }
};
</script>

<style lang="scss">
.container {
  padding-bottom: 20rpx;
  background-color: #f7f7f7;
}

.search-bar {
  padding: 20rpx 30rpx;
  background-color: #fff;
  margin-bottom: 10rpx;
}

.search-input-box {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 40rpx;
  padding: 15rpx 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.search-bar .nut-icon {
  color: #999;
  margin-right: 10rpx;
}

.search-placeholder {
  color: #999;
  font-size: 28rpx;
}

.banner-image {
  width: 100%;
  height: 100%;
}

.category-nav {
  display: flex;
  justify-content: space-around;
  padding: 30rpx 0;
  background-color: #fff;
  margin-bottom: 20rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.category-icon {
  width: 80rpx;
  height: 80rpx;
  margin-bottom: 10rpx;
  border-radius: 50%;
  overflow: hidden;
}

.category-name {
  font-size: 24rpx;
  color: #333;
}

.section {
  background-color: #fff;
  margin-bottom: 20rpx;
  padding: 20rpx;
  border-radius: 10rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.section-more {
  font-size: 24rpx;
  color: #999;
  display: flex;
  align-items: center;
}

.product-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.product-item {
  width: 345rpx;
  margin-bottom: 20rpx;
  background-color: #fff;
  border-radius: 10rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.product-info {
  padding: 15rpx;
}

.product-name {
  color: #333;
  height: 80rpx;
}

.product-price-box {
  display: flex;
  align-items: center;
  margin-top: 10rpx;
}

.product-original-price {
  font-size: 24rpx;
  color: #999;
  text-decoration: line-through;
  margin-left: 10rpx;
}

// 邀请码弹窗样式
.invite-code-popup {
  padding: 30rpx;
}

.popup-title {
  font-size: 32rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 30rpx;
}

.popup-content {
  margin-bottom: 30rpx;
}

.invite-code-input {
  margin-bottom: 20rpx;
}

.popup-tip {
  font-size: 24rpx;
  color: #999;
  text-align: center;
}

.popup-buttons {
  display: flex;
  gap: 20rpx;
}

.popup-buttons .nut-button {
  flex: 1;
}
</style>
