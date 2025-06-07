<template>
  <view class="container">
    <!-- 搜索框 -->
    <view class="search-header">
      <view class="search-input-box">
        <nut-icon name="search" size="16"></nut-icon>
        <input 
          v-model="keyword" 
          class="search-input" 
          type="text" 
          placeholder="搜索商品" 
          confirm-type="search"
          focus
          @confirm="searchProducts"
        />
        <nut-icon
          v-if="keyword"
          name="circle-close"
          size="16"
          @click="clearKeyword"
        ></nut-icon>
      </view>
      <text class="cancel-btn" @click="goBack">取消</text>
    </view>

    <!-- 搜索历史 -->
    <view v-if="!searching && !searchResults.length" class="search-history">
      <view class="history-header">
        <text class="history-title">搜索历史</text>
        <nut-icon name="del" size="16" @click="clearHistory"></nut-icon>
      </view>
      <view class="history-tags">
        <text 
          v-for="(item, index) in historyList" 
          :key="index" 
          class="history-tag"
          @click="useHistoryKeyword(item)"
        >
          {{ item }}
        </text>
      </view>

      <!-- 热门搜索 -->
      <view class="hot-search">
        <text class="hot-title">热门搜索</text>
        <view class="hot-tags">
          <text 
            v-for="(item, index) in hotKeywords" 
            :key="index" 
            class="hot-tag"
            @click="useHistoryKeyword(item)"
          >
            {{ item }}
          </text>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-else>
      <!-- 加载中 -->
      <nut-empty v-if="loading" description="搜索中..."></nut-empty>
      
      <!-- 搜索结果 -->
      <view v-else-if="searchResults.length > 0" class="search-results">
        <view 
          v-for="(item, index) in searchResults" 
          :key="index"
          class="product-item"
          @click="navigateToProduct(item.id)"
        >
          <image class="product-image" :src="item.cover" mode="aspectFill"></image>
          <view class="product-info">
            <view class="product-name-section">
              <SelfOperatedTag :product="item" />
              <nut-ellipsis
                :content="item.name"
                direction="end"
                rows="2"
                class="product-name"
              ></nut-ellipsis>
            </view>
            <view class="product-price-box">
              <nut-price :price="item.price" size="normal" :thousands="true"></nut-price>
              <text v-if="item.originalPrice" class="product-original-price">¥{{ item.originalPrice }}</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 无搜索结果 -->
      <nut-empty 
        v-else-if="searching && !loading" 
        description="暂无相关商品" 
        image="/static/icons/empty.png"
      ></nut-empty>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { productApi } from '../../api/product';
import SelfOperatedTag from '@/components/SelfOperatedTag.vue';

// 搜索关键词
const keyword = ref('');
// 搜索历史
const historyList = ref([]);
// 热门搜索
const hotKeywords = ref(['冰箱', '洗衣机', '电视', '空调', '手机', '电脑']);
// 搜索结果
const searchResults = ref([]);
// 加载状态
const loading = ref(false);
// 是否在搜索中
const searching = ref(false);

// 页面加载时获取历史记录
onMounted(() => {
  loadSearchHistory();
});

// 加载搜索历史
const loadSearchHistory = () => {
  try {
    const history = uni.getStorageSync('searchHistory');
    if (history) {
      historyList.value = JSON.parse(history);
    }
  } catch (e) {
    console.error('获取搜索历史失败', e);
  }
};

// 保存搜索历史
const saveSearchHistory = (kw) => {
  if (!kw) return;
  
  // 去除重复并放到最前面
  const filtered = historyList.value.filter(item => item !== kw);
  historyList.value = [kw, ...filtered].slice(0, 10); // 最多保存10条
  
  try {
    uni.setStorageSync('searchHistory', JSON.stringify(historyList.value));
  } catch (e) {
    console.error('保存搜索历史失败', e);
  }
};

// 清空搜索历史
const clearHistory = () => {
  uni.showModal({
    title: '提示',
    content: '确定要清空搜索历史吗？',
    success: (res) => {
      if (res.confirm) {
        historyList.value = [];
        uni.removeStorageSync('searchHistory');
      }
    }
  });
};

// 使用历史关键词搜索
const useHistoryKeyword = (kw) => {
  keyword.value = kw;
  searchProducts();
};

// 清空关键词
const clearKeyword = () => {
  keyword.value = '';
  searching.value = false;
  searchResults.value = [];
};

// 搜索商品
const searchProducts = async () => {
  if (!keyword.value.trim()) {
    uni.showToast({
      title: '请输入搜索关键词',
      icon: 'none'
    });
    return;
  }
  
  try {
    searching.value = true;
    loading.value = true;
    saveSearchHistory(keyword.value);
    
    const res = await productApi.search(keyword.value);
    console.log('搜索结果:', res);
    console.log('搜索结果详细数据:', JSON.stringify(res, null, 2));
    
    if (res && res.code === 0 && res.data) {
      // 处理搜索结果
      if (Array.isArray(res.data)) {
        searchResults.value = res.data;
      } else if (res.data.list && Array.isArray(res.data.list)) {
        searchResults.value = res.data.list;
        console.log('搜索到的商品数据:', JSON.stringify(res.data.list.map(item => ({
          id: item.id,
          name: item.name,
          merchant: item.merchant
        })), null, 2));
      } else {
        searchResults.value = [];
      }
    } else {
      searchResults.value = [];
    }
  } catch (error) {
    console.error('搜索失败', error);
    searchResults.value = [];
    uni.showToast({
      title: '搜索失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 返回
const goBack = () => {
  uni.navigateBack();
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
  padding-bottom: 20rpx;
  background-color: #f7f7f7;
  min-height: 100vh;
}

.search-header {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: #fff;
}

.search-input-box {
  flex: 1;
  height: 70rpx;
  background-color: #f5f5f5;
  border-radius: 35rpx;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
}

.search-input-box .nut-icon {
  color: #999;
  margin-right: 10rpx;
}

.search-input {
  flex: 1;
  height: 100%;
  font-size: 28rpx;
}

.cancel-btn {
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333;
}

.search-history {
  padding: 30rpx;
  background-color: #fff;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.history-title {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
}

.history-tag {
  padding: 10rpx 20rpx;
  background-color: #f5f5f5;
  border-radius: 30rpx;
  font-size: 24rpx;
  color: #666;
  margin-right: 20rpx;
  margin-bottom: 20rpx;
}

.hot-search {
  margin-top: 30rpx;
}

.hot-title {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

.hot-tags {
  margin-top: 20rpx;
  display: flex;
  flex-wrap: wrap;
}

.hot-tag {
  padding: 10rpx 20rpx;
  background-color: #fff5f5;
  border-radius: 30rpx;
  font-size: 24rpx;
  color: #E31D1A;
  margin-right: 20rpx;
  margin-bottom: 20rpx;
}

.search-results {
  padding: 20rpx;
}

.product-item {
  display: flex;
  padding: 20rpx;
  background-color: #fff;
  margin-bottom: 20rpx;
  border-radius: 10rpx;
}

.product-image {
  width: 180rpx;
  height: 180rpx;
  border-radius: 10rpx;
  background-color: #f5f5f5;
  margin-right: 20rpx;
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
  line-height: 1.4;
}

.product-price-box {
  display: flex;
  align-items: center;
}

.product-original-price {
  font-size: 24rpx;
  color: #999;
  text-decoration: line-through;
  margin-left: 10rpx;
}
</style> 