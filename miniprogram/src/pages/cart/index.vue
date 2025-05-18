<template>
  <view class="container">
    <!-- 购物车列表 -->
    <view v-if="cartList.length > 0" class="cart-list">
      <nut-cell-group>
        <nut-swipe 
          v-for="(item, index) in cartList" 
          :key="index"
          ref="swipeRef" 
          :custom-threshold="100"
        >
          <view class="cart-item">
            <nut-checkbox 
              v-model="item.selected" 
              @change="(value) => updateItemSelected(item, value)"
            ></nut-checkbox>
            <image
              class="product-image"
              :src="item.Product.cover"
              mode="aspectFill"
              @click="navigateToProduct(item.Product.id)"
            ></image>
            <view class="product-info">
              <nut-ellipsis
                :content="item.Product.name"
                direction="end"
                rows="2"
                class="product-name"
                @click="navigateToProduct(item.Product.id)"
              ></nut-ellipsis>
              <view class="product-spec">{{ item.spec || '默认' }}</view>
              <view class="product-price-box">
                <!-- 价格显示区域 -->
                <view class="price-area">
                  <view class="current-price">
                    <nut-price :price="item.actualPrice || item.Product.price" size="normal" :thousands="true"></nut-price>
                    <!-- 会员价标识 -->
                    <view v-if="item.priceType === 'vip'" class="price-tag vip-tag">会员价</view>
                    <!-- 批发价标识 -->
                    <view v-if="item.priceType === 'wholesale'" class="price-tag wholesale-tag">批发价</view>
                  </view>
                  <!-- 原价显示（如果有折扣） -->
                  <view v-if="(item.actualPrice || item.Product.price) < item.Product.price" class="original-price">
                    <nut-price
                      :price="item.Product.price"
                      size="small"
                      :thousands="true"
                      class="line-through"
                    ></nut-price>
                  </view>
                </view>
                <nut-input-number
                  v-model="item.quantity"
                  :min="1"
                  :max="item.Product.stock"
                  @change="(value) => updateItemQuantity(index, value)"
                ></nut-input-number>
              </view>
            </view>
          </view>
          <template #right>
            <view class="delete-button" @click="confirmDelete(index)">
              <nut-icon name="del" size="18"></nut-icon>
              <text>删除</text>
            </view>
          </template>
        </nut-swipe>
      </nut-cell-group>
    </view>
    
    <!-- 加载中 -->
    <nut-empty v-if="loading" description="加载中..."></nut-empty>
    
    <!-- 空购物车 -->
    <nut-empty 
      v-else-if="!loading && cartList.length === 0" 
      description="购物车空空如也" 
      image="/static/icons/empty-cart.png"
    >
      <template #bottom>
        <nut-button type="danger" size="small" @click="navigateToHome">去购物</nut-button>
      </template>
    </nut-empty>
    
    <!-- 底部结算栏 -->
    <view v-if="cartList.length > 0" class="bottom-bar">
      <view class="select-all">
        <nut-checkbox v-model="isAllSelected" @change="selectAllItems">全选</nut-checkbox>
      </view>
      <view class="price-info">
        <view class="total-price-text">合计：<nut-price :price="totalPrice" size="normal" :thousands="true"></nut-price></view>
        <view class="price-desc">不含运费</view>
      </view>
      <nut-button 
        class="checkout-btn" 
        type="danger" 
        :disabled="selectedCount === 0" 
        @click="checkout"
      >
        结算{{ selectedCount ? `(${selectedCount})` : '' }}
      </nut-button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { cartApi } from '../../api/cart';
import VipTag from '@/components/VipTag.vue';

// 从App.vue注入用户信息
const userInfo = inject('userInfo');

// 购物车列表
const cartList = ref([]);
// 加载状态
const loading = ref(false);
// 滑动操作引用
const swipeRef = ref(null);

// 是否全部选中
const isAllSelected = computed(() => {
  return cartList.value.length > 0 && cartList.value.every(item => item.selected);
});

// 选中的商品数量
const selectedCount = computed(() => {
  return cartList.value.filter(item => item.selected).length;
});

// 总价
const totalPrice = computed(() => {
  return cartList.value
    .filter(item => item.selected)
    .reduce((total, item) => {
      // 使用actualPrice字段（如果存在），否则使用Product.price
      const price = item.actualPrice || item.Product.price;
      return total + price * item.quantity;
    }, 0)
    .toFixed(2);
});

// 页面加载和显示时获取购物车数据
onMounted(() => {
  loadCartData();
});

onShow(() => {
  loadCartData();
});

// 加载购物车数据
const loadCartData = async () => {
  try {
    loading.value = true;
    const res = await cartApi.getList();
    console.log('购物车数据:', res);
    
    if (res && res.code === 0 && res.data) {
      // 处理返回的购物车数据
      if (res.data.list && Array.isArray(res.data.list)) {
        cartList.value = res.data.list;
      } else if (Array.isArray(res.data)) {
        cartList.value = res.data;
      } else {
        cartList.value = [];
      }
    } else {
      cartList.value = [];
    }
  } catch (error) {
    console.error('获取购物车失败:', error);
    cartList.value = [];
    uni.showToast({
      title: '获取购物车失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 选择所有商品
const selectAllItems = async (value) => {
  try {
    const res = await cartApi.selectAll(value);
    if (res && res.code === 0) {
      // 更新本地状态
      cartList.value.forEach(item => {
        item.selected = value;
      });
      
      // 或者重新加载数据
      // loadCartData();
    } else {
      uni.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('全选/取消全选失败:', error);
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    });
  }
};

// 更新商品数量
const updateItemQuantity = async (index, value) => {
  const item = cartList.value[index];
  try {
    // 确保数量为正整数
    const quantity = Math.max(1, Math.min(item.Product.stock, parseInt(value) || 1));
    
    const res = await cartApi.update(item.id, { quantity });
    if (res && res.code === 0) {
      // 更新成功
      item.quantity = quantity;
      
      // 如果返回了新的价格信息，更新它
      if (res.data && res.data.actualPrice) {
        item.actualPrice = res.data.actualPrice;
      }
      if (res.data && res.data.priceType) {
        item.priceType = res.data.priceType;
      }
    } else {
      // 更新失败，重新加载数据
      loadCartData();
    }
  } catch (error) {
    console.error('更新商品数量失败:', error);
    loadCartData();
  }
};

// 更新商品选中状态
const updateItemSelected = async (item, value) => {
  try {
    const res = await cartApi.update(item.id, { selected: value });
    if (!(res && res.code === 0)) {
      // 更新失败，恢复原状态
      item.selected = !value;
      uni.showToast({
        title: '更新失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('更新选中状态失败:', error);
    // 恢复原状态
    item.selected = !value;
    uni.showToast({
      title: '更新失败',
      icon: 'none'
    });
  }
};

// 确认删除商品
const confirmDelete = (index) => {
  uni.showModal({
    title: '提示',
    content: '确定要移除该商品吗？',
    success: (res) => {
      if (res.confirm) {
        deleteItem(index);
      }
    }
  });
};

// 删除商品
const deleteItem = async (index) => {
  const item = cartList.value[index];
  try {
    const res = await cartApi.delete(item.id);
    if (res && res.code === 0) {
      cartList.value.splice(index, 1);
      uni.showToast({
        title: '已移除',
        icon: 'success'
      });
    } else {
      uni.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('删除商品失败:', error);
    uni.showToast({
      title: '删除失败',
      icon: 'none'
    });
  }
};

// 结算
const checkout = async () => {
  // 获取选中的商品
  const selectedItems = cartList.value.filter(item => item.selected);
  
  if (selectedItems.length === 0) {
    uni.showToast({
      title: '请选择商品',
      icon: 'none'
    });
    return;
  }
  
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

  try {
    uni.showLoading({
      title: '获取订单信息...'
    });
    
    // 获取选中商品的统计信息
    const res = await cartApi.getSelected();
    
    if (res && res.code === 0 && res.data) {
      // 将选中商品信息存入缓存，以便在结算页面使用
      uni.setStorageSync('selectedCartItems', res.data);
      
      console.log('选中商品信息:', res.data);
      console.log('总金额:', res.data.totalPrice);
      console.log('总数量:', res.data.totalCount);
      
      // 跳转到订单确认页面
      uni.navigateTo({
        url: '/pages/order/checkout?from=cart'
      });
    } else {
      throw new Error(res?.message || '获取商品信息失败');
    }
  } catch (error) {
    console.error('处理订单失败:', error);
    uni.showToast({
      title: error.message || '处理订单失败',
      icon: 'none'
    });
  } finally {
    uni.hideLoading();
  }
};

// 跳转到商品详情
const navigateToProduct = (id) => {
  uni.navigateTo({
    url: `/pages/product/detail?id=${id}`
  });
};

// 跳转到首页
const navigateToHome = () => {
  uni.switchTab({
    url: '/pages/index/index'
  });
};
</script>

<style lang="scss">
.container {
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom));
  background-color: #f5f5f5;
  min-height: 100vh;
}

.cart-list {
  padding: 20rpx;
}

.cart-item {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 20rpx;
  border-radius: 12rpx;
}

.product-image {
  width: 160rpx;
  height: 160rpx;
  margin: 0 20rpx;
  background-color: #f8f8f8;
  border-radius: 8rpx;
}

.product-info {
  flex: 1;
  overflow: hidden;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  line-height: 1.4;
  margin-bottom: 10rpx;
}

.product-spec {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 20rpx;
}

.product-price-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-area {
  display: flex;
  flex-direction: column;
}

.current-price {
  display: flex;
  align-items: center;
}

.price-tag {
  font-size: 20rpx;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  margin-left: 10rpx;
}

.vip-tag {
  background-color: #FFD700;
  color: #8B4513;
}

.wholesale-tag {
  background-color: #87CEEB;
  color: #0000CD;
}

.original-price {
  margin-top: 5rpx;
}

.line-through {
  text-decoration: line-through;
  color: #999;
}

.delete-button {
  width: 120rpx;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #E31D1A;
  color: #fff;
  font-size: 24rpx;
}

.delete-button text {
  margin-top: 8rpx;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100rpx;
  background-color: #fff;
  display: flex;
  align-items: center;
  padding-left: 20rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.select-all {
  display: flex;
  align-items: center;
}

.price-info {
  flex: 1;
  margin-left: 30rpx;
}

.total-price-text {
  font-size: 28rpx;
  color: #333;
}

.price-desc {
  font-size: 24rpx;
  color: #999;
}

.checkout-btn {
  width: 200rpx;
  height: 100%;
  border-radius: 0;
  font-size: 30rpx;
}
</style> 