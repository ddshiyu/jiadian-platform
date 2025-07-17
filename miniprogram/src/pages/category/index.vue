<template>
  <view class="container">
    <view class="category-layout">
      <!-- 左侧分类导航 -->
      <scroll-view class="category-menu" scroll-y>
        <view v-if="loading.categories" class="category-loading">
          <text class="loading-text">加载中...</text>
        </view>
        <view v-else>
          <view 
            v-for="(item, index) in categoryList" 
            :key="index"
            class="menu-item"
            :class="{ active: currentCategory === item.id }"
            @click="changeCategory(item.id)"
          >
            {{ item.name }}
          </view>
        </view>
      </scroll-view>
      
      <!-- 右侧商品列表 -->
      <scroll-view
        class="product-scroll"
        scroll-y
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
        @scrolltolower="onLoadMore"
        :lower-threshold="100"
      >
        <view class="product-container">
          <!-- 首次加载状态 -->
          <view v-if="loading.products && productList.length === 0" class="loading-state">
            <text class="loading-text">正在加载商品...</text>
          </view>
          
          <!-- 商品列表 -->
          <view v-else-if="productList.length > 0" class="product-list">
            <view 
              v-for="(item, index) in productList" 
              :key="`${item.id}-${index}`"
              class="product-item"
              @click="navigateToProduct(item.id)"
            >
              <image 
                class="product-image" 
                :src="item.cover" 
                mode="aspectFill"
                lazy-load
                @error="onImageError"
              ></image>
              <view class="product-info">
                <view class="product-name-section">
                  <SelfOperatedTag :product="item" />
                  <text class="product-name">{{ item.name }}</text>
                </view>
                <view class="product-price-box">
                  <text class="product-price">¥{{ Number(item.price).toFixed(2) }}</text>
                  <text v-if="item.originalPrice" class="product-original-price">¥{{ Number(item.originalPrice).toFixed(2) }}</text>
                </view>
                <!-- VIP价格 -->
                <view v-if="item.vipPrice" class="vip-price-box">
                  <text class="vip-label">VIP</text>
                  <text class="vip-price">¥{{ Number(item.vipPrice).toFixed(2) }}</text>
                </view>
                <!-- 佣金显示 -->
                <view v-if="item.commissionAmount" class="product-commission-box">
                  <text class="commission-label">佣金</text>
                  <text class="commission-amount">{{ formatCommission(item.commissionAmount) }}</text>
                </view>
              </view>
            </view>
          </view>
          
          <!-- 加载更多状态 -->
          <view v-if="productList.length > 0" class="load-more-container">
            <view v-if="loadingMore" class="loading-more">
              <text class="loading-text">正在加载更多...</text>
            </view>
            <view v-else-if="noMoreData" class="no-more-data">
              <text class="no-more-text">已加载全部商品</text>
            </view>
          </view>
          
          <!-- 空状态 -->
          <view v-else-if="!loading.products" class="empty-state">
            <image class="empty-image" src="/static/icons/empty.png" mode="aspectFit"></image>
            <text class="empty-text">该分类暂无商品</text>
            <view class="empty-actions">
              <button class="refresh-btn" @click="onRefresh" :disabled="refreshing">
                {{ refreshing ? '刷新中...' : '刷新重试' }}
              </button>
            </view>
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
import { filterProductsByUserType } from '@/utils/productFilter';
import SelfOperatedTag from '@/components/SelfOperatedTag.vue';

// 分类列表
const categoryList = ref([]);

// 商品列表
const productList = ref([]);

// 当前选中的分类
const currentCategory = ref(1);

// 下拉刷新状态
const refreshing = ref(false);

// 分页相关状态
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
  hasNextPage: true
});

// 加载状态
const loading = ref({
  categories: false,
  products: false
});

// 加载更多状态
const loadingMore = ref(false);

// 没有更多数据
const noMoreData = ref(false);

onMounted(() => {
  // 获取URL参数中的分类ID
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const options = currentPage.options || {};
    
    console.log('页面参数:', options);
    
    if (options.id) {
      const categoryId = Number(options.id);
      if (!isNaN(categoryId) && categoryId > 0) {
        currentCategory.value = categoryId;
        console.log('设置分类ID为:', categoryId);
      }
    }
  } catch (error) {
    console.warn('获取页面参数失败:', error);
  }
  
  // 先加载分类，再加载商品
  loadInitialData();
});

// 监听分类变化
watch(currentCategory, () => {
  // 重置分页状态
  resetPagination();
  loadProducts(true); // 重新加载
});

// 切换分类
const changeCategory = (id) => {
  currentCategory.value = id;
};

// 重置分页状态
const resetPagination = () => {
  pagination.value = {
    page: 1,
    pageSize: 10,
    total: 0,
    hasNextPage: true
  };
  noMoreData.value = false;
  productList.value = [];
};

// 加载分类数据
const loadCategories = async () => {
  try {
    loading.value.categories = true;
    const res = await homeApi.getCategories();
    console.log('分类数据接口响应:', res);
    
    if (res && res.code === 0 && res.data) {
      // 处理后端返回的分类数据
      let categories = [];
      
      // 适配不同的返回格式
      if (res.data.data && Array.isArray(res.data.data)) {
        // 分页中间件格式
        categories = res.data.data;
      } else if (Array.isArray(res.data)) {
        // 直接数组格式
        categories = res.data;
      } else if (res.data.list && Array.isArray(res.data.list)) {
        // 旧格式兼容
        categories = res.data.list;
      }
      
      if (categories.length > 0) {
        categoryList.value = categories;
        console.log('分类数据加载成功，数量:', categories.length);
      } else {
        console.warn('分类数据为空，使用默认数据');
        useDefaultCategories();
      }
    } else {
      console.warn('分类接口返回格式异常:', res);
      useDefaultCategories();
    }
  } catch (error) {
    console.error('获取分类失败', error);
    useDefaultCategories();
    
    // 显示错误提示
    uni.showToast({
      title: '分类加载失败',
      icon: 'none',
      duration: 2000
    });
  } finally {
    loading.value.categories = false;
  }
};

// 使用默认分类数据
const useDefaultCategories = () => {
  categoryList.value = [
    { id: 1, name: '全部商品' }
  ];
  // 如果当前选中的分类不存在，重置为第一个分类
  if (!categoryList.value.find(cat => cat.id === currentCategory.value)) {
    currentCategory.value = categoryList.value[0]?.id || 1;
  }
};

// 加载初始数据
const loadInitialData = async () => {
  try {
    // 先加载分类数据
    await loadCategories();
    
    // 验证当前选中的分类是否存在
    if (categoryList.value.length > 0) {
      const validCategory = categoryList.value.find(cat => cat.id === currentCategory.value);
      if (!validCategory) {
        console.warn('当前分类不存在，使用第一个分类');
        currentCategory.value = categoryList.value[0].id;
      }
    }
    
    // 加载商品数据
    await loadProducts(true);
  } catch (error) {
    console.error('加载初始数据失败:', error);
    uni.showToast({
      title: '页面加载失败',
      icon: 'none',
      duration: 2000
    });
  }
};

// 加载商品数据
const loadProducts = async (isRefresh = false) => {
  try {
    // 如果是刷新，重置状态
    if (isRefresh) {
      loading.value.products = true;
      refreshing.value = true;
      resetPagination();
    } else {
      // 如果正在加载或没有更多数据，不继续加载
      if (loadingMore.value || noMoreData.value) {
        return;
      }
      loadingMore.value = true;
    }
    
    // 构建请求参数 - 使用后端期望的参数格式
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      categoryId: currentCategory.value,
      sort: 'createdAt',
      order: 'DESC'
    };
    
    console.log('请求商品数据，参数:', params);
    
    // 使用productApi.getProducts接口获取分类商品
    const res = await productApi.getProducts(params);
    console.log('商品列表接口响应:', res);
    
    if (res && res.code === 0 && res.data) {
      // 处理后端返回的商品数据
      let products = [];
      let total = 0;
      let currentPage = 1;
      let totalPages = 1;
      // 适配分页中间件返回的数据格式
      if (res.data.data && Array.isArray(res.data.data)) {
        // 分页中间件格式: { data: [], total, current, pageSize, totalPages }
        products = res.data.data;
        total = res.data.total || 0;
        currentPage = res.data.current || res.data.page || 1;
        totalPages = res.data.totalPages || 1;
      } else if (Array.isArray(res.data)) {
        // 直接数组格式
        products = res.data;
        total = res.data.length;
      } else if (res.data.list && Array.isArray(res.data.list)) {
        // 旧格式兼容: { list: [], total }
        products = res.data.list;
        total = res.data.total || 0;
        currentPage = res.data.current || res.data.page || 1;
        totalPages = res.data.totalPages || 1;
      }
      
      console.log('解析商品数据:', {
        productsCount: products.length,
        total,
        currentPage,
        totalPages
      });
      
      // 根据用户身份过滤商品
      const filteredProducts = await filterProductsByUserType(products);
      
      if (isRefresh) {
        // 刷新时替换数据
        productList.value = filteredProducts;
      } else {
        // 加载更多时追加数据
        productList.value = [...productList.value, ...filteredProducts];
      }
      
      // 更新分页信息
      pagination.value.total = total;
      
      // 判断是否还有更多数据
      if (isRefresh) {
        pagination.value.page = currentPage + 1;
      } else {
        pagination.value.page += 1;
      }
      
      // 判断是否还有下一页
      const currentTotal = productList.value.length;
      if (filteredProducts.length < pagination.value.pageSize || 
          currentTotal >= total || 
          (totalPages > 0 && currentPage >= totalPages)) {
        noMoreData.value = true;
        pagination.value.hasNextPage = false;
      } else {
        pagination.value.hasNextPage = true;
      }
      
      console.log('分页状态更新:', {
        currentTotal,
        nextPage: pagination.value.page,
        hasNextPage: pagination.value.hasNextPage,
        noMoreData: noMoreData.value
      });
      
    } else {
      console.warn('接口返回数据格式异常:', res);
      if (isRefresh) {
        useDefaultProducts();
      }
    }
  } catch (error) {
    console.error('获取商品列表失败', error);
    if (isRefresh) {
      useDefaultProducts();
    }
    
    // 显示错误提示
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none',
      duration: 2000
    });
  } finally {
    loading.value.products = false;
    refreshing.value = false;
    loadingMore.value = false;
  }
};

// 使用默认商品数据
const useDefaultProducts = () => {
  productList.value = [];
  noMoreData.value = true;
  // 重置分页状态
  pagination.value = {
    page: 1,
    pageSize: 10,
    total: 0,
    hasNextPage: false
  };
};

// 下拉刷新
const onRefresh = async () => {
  console.log('下拉刷新触发');
  refreshing.value = true;
  try {
    // 刷新时重新加载分类和商品数据
    await loadCategories();
    await loadProducts(true);
  } catch (error) {
    console.error('刷新失败:', error);
    uni.showToast({
      title: '刷新失败',
      icon: 'none',
      duration: 2000
    });
  } finally {
    refreshing.value = false;
  }
};

// 触底加载更多
const onLoadMore = () => {
  console.log('触底加载更多触发', {
    loadingMore: loadingMore.value,
    noMoreData: noMoreData.value,
    hasNextPage: pagination.value.hasNextPage,
    currentPage: pagination.value.page
  });
  
  if (!loadingMore.value && !noMoreData.value && pagination.value.hasNextPage) {
    console.log('开始加载更多，当前页:', pagination.value.page);
    loadProducts(false);
  } else {
    console.log('跳过加载更多:', {
      reason: loadingMore.value ? '正在加载' : 
              noMoreData.value ? '没有更多数据' : 
              !pagination.value.hasNextPage ? '没有下一页' : '未知原因'
    });
  }
};

// 格式化佣金显示
const formatCommission = (commissionAmount) => {
  if (!commissionAmount) return '';
  
  const commissionStr = commissionAmount.toString().trim();
  
  // 检查是否为百分比
  if (commissionStr.includes('%')) {
    return commissionStr;
  } else {
    // 固定金额，显示为货币格式
    const amount = parseFloat(commissionStr);
    if (isNaN(amount)) return '';
    return `¥${amount.toFixed(2)}`;
  }
};

// 跳转到商品详情
const navigateToProduct = (id) => {
  if (!id) {
    console.warn('商品ID无效');
    return;
  }
  
  console.log('跳转到商品详情:', id);
  uni.navigateTo({
    url: `/pages/product/detail?id=${id}`,
    fail: (error) => {
      console.error('跳转商品详情失败:', error);
      uni.showToast({
        title: '页面跳转失败',
        icon: 'none',
        duration: 2000
      });
    }
  });
};

// 图片加载错误处理
const onImageError = (event) => {
  console.warn('图片加载失败:', event);
  // 可以设置默认图片
  // event.target.src = '/static/images/default-product.png';
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
  padding-bottom: 40rpx; /* 为加载更多区域留出空间 */
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

.vip-price-box {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.vip-label {
  font-size: 20rpx;
  background: linear-gradient(135deg, #FFD700 0%, #FF8C00 100%);
  color: white;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  margin-right: 8rpx;
  font-weight: 500;
}

.vip-price {
  font-size: 26rpx;
  color: #FF8C00;
  font-weight: 600;
}

.product-commission-box {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.commission-label {
  font-size: 22rpx;
  background: linear-gradient(135deg, #ff9068 0%, #ff6b35 100%);
  color: white;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  margin-right: 8rpx;
}

.commission-amount {
  font-size: 24rpx;
  color: #ff6b35;
  font-weight: 500;
}

/* 加载更多样式 */
.load-more-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx 0;
  margin-top: 20rpx;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  font-size: 28rpx;
  color: #666;
  margin-left: 10rpx;
}

.no-more-data {
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-more-text {
  font-size: 28rpx;
  color: #999;
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

.empty-actions {
  margin-top: 30rpx;
}

.refresh-btn {
  width: 200rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  background-color: #E31D1A;
  color: white;
  border-radius: 40rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
  box-shadow: 0 4rpx 10rpx rgba(227, 29, 26, 0.3);
}

.refresh-btn:active {
  background-color: #C01A17;
  box-shadow: 0 2rpx 5rpx rgba(227, 29, 26, 0.5);
}

.refresh-btn:disabled {
  background-color: #ccc;
  color: #666;
  box-shadow: none;
}

.category-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100rpx;
  font-size: 28rpx;
  color: #666;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100rpx;
  font-size: 28rpx;
  color: #666;
}
</style> 