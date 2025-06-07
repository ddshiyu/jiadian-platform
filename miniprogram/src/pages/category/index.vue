<template>
  <view class="container">
    <view class="category-layout">
      <!-- 左侧分类导航 -->
      <scroll-view class="category-menu" scroll-y>
        <view 
          v-for="(item, index) in categoryList" 
          :key="index"
          class="menu-item"
          :class="{ active: currentCategory === item.id }"
          @click="changeCategory(item.id)"
        >
          {{ item.name }}
        </view>
      </scroll-view>
      
      <!-- 右侧商品列表 -->
      <scroll-view
        class="product-scroll"
        scroll-y
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
      >
        <view class="product-container">
          <!-- 商品列表 -->
          <view v-if="productList.length > 0" class="product-list">
            <view 
              v-for="(item, index) in productList" 
              :key="index"
              class="product-item"
              @click="navigateToProduct(item.id)"
            >
              <image class="product-image" :src="item.cover" mode="aspectFill"></image>
              <view class="product-info">
                <view class="product-name-section">
                  <SelfOperatedTag :product="item" />
                  <text class="product-name">{{ item.name }}</text>
                </view>
                <view class="product-price-box">
                  <text class="product-price">¥{{ item.price }}</text>
                  <text v-if="item.originalPrice" class="product-original-price">¥{{ item.originalPrice }}</text>
                </view>
              </view>
            </view>
          </view>
          
          <!-- 空状态 -->
          <view v-else class="empty-state">
            <image class="empty-image" src="/static/icons/empty.png"></image>
            <text class="empty-text">暂无商品</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="js">
import { ref, onMounted, watch } from 'vue';
import { productApi } from '../../api/product';
import { homeApi } from '../../api/index';
import SelfOperatedTag from '@/components/SelfOperatedTag.vue';

// 分类列表
const categoryList = ref([]);

// 商品列表
const productList = ref([]);

// 当前选中的分类
const currentCategory = ref(1);

// 下拉刷新状态
const refreshing = ref(false);

// 加载状态
const loading = ref({
  categories: false,
  products: false
});

onMounted(() => {
  // 获取URL参数中的分类ID
  const query = uni.getLaunchOptionsSync().query;
  if (query && query.id) {
    currentCategory.value = Number(query.id);
  }
  
  // 加载数据
  loadCategories();
  loadProducts();
});

// 监听分类变化
watch(currentCategory, () => {
  loadProducts();
});

// 切换分类
const changeCategory = (id) => {
  currentCategory.value = id;
};

// 加载分类数据
const loadCategories = async () => {
  try {
    loading.value.categories = true;
    const res = await homeApi.getCategories();
    console.log('分类数据接口响应:', res);
    
    if (res && res.code === 0 && res.data) {
      // 处理后端返回的分类数据
      if (Array.isArray(res.data)) {
        categoryList.value = res.data;
      } else if (res.data.list && Array.isArray(res.data.list)) {
        categoryList.value = res.data.list;
      } else {
        // 使用默认数据
        useDefaultCategories();
      }
    } else {
      useDefaultCategories();
    }
  } catch (error) {
    console.error('获取分类失败', error);
    useDefaultCategories();
  } finally {
    loading.value.categories = false;
  }
};

// 使用默认分类数据
const useDefaultCategories = () => {
  categoryList.value = [
    { id: 1, name: '冰箱' },
    { id: 2, name: '洗衣机' },
    { id: 3, name: '电视' },
    { id: 4, name: '空调' },
    { id: 5, name: '厨卫电器' },
    { id: 6, name: '生活电器' },
    { id: 7, name: '手机' },
    { id: 8, name: '电脑' }
  ];
};

// 加载商品数据
const loadProducts = async () => {
  try {
    loading.value.products = true;
    refreshing.value = true;
    
    // 构建请求参数
    const params = {
      limit: 20,  // 显示数量
      offset: 0,
      categoryId: currentCategory.value
    };
    
    console.log('请求商品数据，参数:', params);
    
    // 使用productApi.getProducts接口获取分类商品
    const res = await productApi.getProducts(params);
    console.log('商品列表接口响应:', res);
    
    if (res && res.code === 0 && res.data) {
      // 处理后端返回的商品数据
      if (Array.isArray(res.data)) {
        productList.value = res.data;
      } else if (res.data.list && Array.isArray(res.data.list)) {
        productList.value = res.data.list;
        console.log('分类商品数据:', JSON.stringify(res.data.list.map(item => ({
          id: item.id,
          name: item.name,
          merchant: item.merchant
        })), null, 2));
      } else {
        // 使用默认数据
        useDefaultProducts();
      }
    } else {
      useDefaultProducts();
    }
  } catch (error) {
    console.error('获取商品列表失败', error);
    useDefaultProducts();
  } finally {
    loading.value.products = false;
    refreshing.value = false;
  }
};

// 使用默认商品数据
const useDefaultProducts = () => {
  const productData = {
    1: [
      { id: 101, name: '海尔双门冰箱215升', cover: '/static/images/product1.png', price: 1999, originalPrice: 2399 },
      { id: 102, name: '美的三门冰箱253升', cover: '/static/images/product5.png', price: 2699, originalPrice: 3099 },
      { id: 103, name: '容声对开门冰箱598升', cover: '/static/images/product1.png', price: 3999, originalPrice: 4599 },
      { id: 104, name: '西门子双开门冰箱502升', cover: '/static/images/product5.png', price: 5299, originalPrice: 5999 }
    ],
    2: [
      { id: 201, name: '美的滚筒洗衣机8kg', cover: '/static/images/product2.png', price: 2599, originalPrice: 2999 },
      { id: 202, name: '海尔波轮洗衣机7kg', cover: '/static/images/product6.png', price: 1299, originalPrice: 1599 },
      { id: 203, name: '西门子洗烘一体机10kg', cover: '/static/images/product2.png', price: 5999, originalPrice: 6599 },
      { id: 204, name: 'LG滚筒洗衣机12kg', cover: '/static/images/product6.png', price: 4899, originalPrice: 5499 }
    ],
    3: [
      { id: 301, name: '创维智能电视55英寸4K', cover: '/static/images/product3.png', price: 3999, originalPrice: 4799 },
      { id: 302, name: '小米智能电视65英寸', cover: '/static/images/product7.png', price: 4599, originalPrice: 5299 },
      { id: 303, name: '索尼OLED电视65英寸', cover: '/static/images/product3.png', price: 13999, originalPrice: 15999 },
      { id: 304, name: '三星Q70T 75英寸', cover: '/static/images/product7.png', price: 9999, originalPrice: 11999 }
    ],
    4: [
      { id: 401, name: '格力空调挂机1.5匹变频', cover: '/static/images/product4.png', price: 2899, originalPrice: 3299 },
      { id: 402, name: '美的空调柜机3匹', cover: '/static/images/product8.png', price: 5299, originalPrice: 5999 },
      { id: 403, name: '海尔空调挂机1匹', cover: '/static/images/product4.png', price: 1999, originalPrice: 2399 },
      { id: 404, name: '大金空调柜机2匹', cover: '/static/images/product8.png', price: 12999, originalPrice: 14999 }
    ]
  };
  
  productList.value = productData[currentCategory.value] || [];
};

// 下拉刷新
const onRefresh = () => {
  refreshing.value = true;
  loadProducts();
};

// 跳转到商品详情
const navigateToProduct = (id) => {
  uni.navigateTo({
    url: `/pages/product/detail?id=${id}`
  });
};
</script>

<style lang="scss">
.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.category-layout {
  display: flex;
  height: 100%;
}

.category-menu {
  width: 180rpx;
  height: 100vh;
  background-color: #f8f8f8;
}

.menu-item {
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #333;
  position: relative;
  
  &.active {
    background-color: #fff;
    color: #E31D1A;
    font-weight: bold;
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 30rpx;
      height: 40rpx;
      width: 6rpx;
      background-color: #E31D1A;
    }
  }
}

.product-scroll {
  flex: 1;
  height: 100vh;
  background-color: #fff;
}

.product-container {
  padding: 20rpx;
}

.product-list {
  display: flex;
  flex-direction: column;
}

.product-item {
  display: flex;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #eee;
}

.product-image {
  width: 200rpx;
  height: 200rpx;
  margin-right: 20rpx;
  background-color: #f5f5f5;
  border-radius: 10rpx;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name-section {
  margin-bottom: 10rpx;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 20rpx;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.product-price-box {
  display: flex;
  align-items: baseline;
}

.product-price {
  font-size: 32rpx;
  color: #E31D1A;
  font-weight: bold;
}

.product-original-price {
  font-size: 24rpx;
  color: #999;
  text-decoration: line-through;
  margin-left: 10rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-image {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}
</style> 