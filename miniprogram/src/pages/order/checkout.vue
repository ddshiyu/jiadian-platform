<template>
  <view class="container">
    <view class="section address-section" @click="chooseAddress">
      <view v-if="address.id" class="address-box">
        <view class="address-info">
          <view class="user-info">
            <text class="name">{{ address.receiverName }}</text>
            <text class="phone">{{ address.receiverPhone }}</text>
          </view>
          <view class="address-detail">{{ address.receiverAddress }}</view>
        </view>
        <nut-icon name="right" size="16"></nut-icon>
      </view>
      <view v-else class="no-address">
        <text>请选择收货地址</text>
        <nut-icon name="right" size="16"></nut-icon>
      </view>
    </view>

    <view class="section product-section">
      <view class="section-title">商品信息</view>
      <!-- 从购物车来的多商品 -->
      <block v-if="isFromCart && cartItems.length > 0">
        <view v-for="(item, index) in cartItems" :key="index" class="product-item">
          <image :src="item.productImage" class="product-image"></image>
          <view class="product-info">
            <view class="product-name">{{ item.productName }}</view>
            <view class="product-price-box">
              <nut-price :price="item.price" size="normal" :thousands="true"></nut-price>
              <text class="product-count">x{{ item.quantity }}</text>
            </view>
          </view>
        </view>
      </block>
      <!-- 直接购买的单个商品 -->
      <view v-else class="product-item">
        <image :src="product.cover" class="product-image"></image>
        <view class="product-info">
          <view class="product-name">{{ product.name }}</view>
          <view class="product-price-box">
            <nut-price :price="product.price" size="normal" :thousands="true"></nut-price>
            <text class="product-count">x{{ quantity }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section remark-section">
      <view class="remark-title">订单备注</view>
      <input
        v-model="remark"
        class="remark-input"
        type="text"
        placeholder="选填，请填写订单备注"
      />
    </view>

    <view class="section amount-section">
      <view class="amount-item">
        <text>商品金额</text>
        <text>¥{{ totalAmount.toFixed(2) }}</text>
      </view>
      <view class="amount-item">
        <text>运费</text>
        <text>¥{{ freight }}</text>
      </view>
      <view class="divider"></view>
      <view class="amount-item total">
        <text>实付款</text>
        <text class="total-price">¥{{ (totalAmount + freight).toFixed(2) }}</text>
      </view>
    </view>

    <view class="footer">
      <view class="total-box">
        <text>合计：</text>
        <text class="total-amount">¥{{ (totalAmount + freight).toFixed(2) }}</text>
      </view>
      <nut-button type="danger" class="submit-btn" @click="submitOrder">提交订单</nut-button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { productApi } from '../../api/product';
import { cartApi } from '../../api/cart';
import { addressApi } from '../../api/address';

// 商品ID
const productId = ref(0);

// 购买数量
const quantity = ref(1);

// 备注
const remark = ref('');

// 是否来自购物车
const isFromCart = ref(false);

// 购物车选中的商品列表
const cartItems = ref([]);

// 商品信息
const product = reactive({
  id: 0,
  name: '',
  price: 0,
  cover: '',
  stock: 0
});

// 收货地址
const address = reactive({
  id: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: ''
});

// 运费（这里固定为0，实际应根据商品和地址计算）
const freight = ref(0);

// 计算总金额
const totalAmount = computed(() => {
  if (isFromCart.value && cartItems.value.length > 0) {
    // 如果从购物车缓存中获取了总金额，直接使用
    const cartData = uni.getStorageSync('selectedCartItems');
    if (cartData && cartData.totalPrice !== undefined) {
      return parseFloat(cartData.totalPrice);
    }
    
    // 否则计算总金额
    return cartItems.value.reduce((total, item) => {
      return total + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);
  } else {
    return product.price * quantity.value;
  }
});

// 页面加载
onLoad((options) => {
  console.log('订单确认页参数:', options);
  
  if (options.from === 'cart') {
    // 从购物车来的结算
    isFromCart.value = true;
    loadCartSelectedItems();
  } else if (options.productId) {
    // 直接购买
    productId.value = Number(options.productId);
    
    if (options.quantity) {
      quantity.value = Number(options.quantity);
    }
    
    // 加载商品详情
    loadProductDetail();
  }
  
  // 加载默认收货地址
  loadDefaultAddress();
});

// 加载购物车选中的商品
const loadCartSelectedItems = () => {
  const selectedItems = uni.getStorageSync('selectedCartItems');
  if (selectedItems && selectedItems.items) {
    cartItems.value = selectedItems.items;
    console.log('购物车选中商品:', cartItems.value);
  } else {
    uni.showToast({
      title: '没有选中商品',
      icon: 'none'
    });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  }
};

// 加载商品详情
const loadProductDetail = async () => {
  if (!productId.value) return;
  
  try {
    uni.showLoading({ title: '加载中' });
    const res = await productApi.getDetail(productId.value.toString());
    
    if (res && res.code === 0 && res.data) {
      Object.assign(product, {
        id: res.data.id,
        name: res.data.name,
        price: res.data.price,
        cover: res.data.cover,
        stock: res.data.stock
      });
    } else {
      uni.showToast({
        title: '获取商品信息失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('获取商品信息失败:', error);
    uni.showToast({
      title: '获取商品信息失败',
      icon: 'none'
    });
  } finally {
    uni.hideLoading();
  }
};

// 加载默认收货地址
const loadDefaultAddress = async () => {
  try {
    uni.showLoading({ title: '加载地址...' });
    // 调用地址API获取默认地址
    const res = await addressApi.getDefaultAddress();
    
    if (res && res.code === 0 && res.data) {
      Object.assign(address, {
        id: res.data.id,
        receiverName: res.data.name,
        receiverPhone: res.data.phone,
        receiverAddress: `${res.data.province}${res.data.city}${res.data.district}${res.data.detail}`
      });
    } else {
      console.log('没有默认地址');
    }
  } catch (error) {
    console.error('获取默认地址失败:', error);
  } finally {
    uni.hideLoading();
  }
};

// 选择收货地址
const chooseAddress = () => {
  uni.navigateTo({
    url: '/pages/address/list?select=true',
    events: {
      // 监听选择地址事件
      selectAddress: (addr) => {
        console.log('选择了地址:', addr);
        Object.assign(address, {
          id: addr.id,
          receiverName: addr.name,
          receiverPhone: addr.phone,
          receiverAddress: `${addr.province}${addr.city}${addr.district}${addr.detail}`
        });
      }
    }
  });
};

// 提交订单
const submitOrder = async () => {
  if (!address.id) {
    return uni.showToast({
      title: '请选择收货地址',
      icon: 'none'
    });
  }
  
  try {
    uni.showLoading({ title: '提交中' });
    
    let orderRes;
    
    if (isFromCart.value) {
      // 购物车结算 - 使用购物车结算接口
      const cartOrderData = {
        addressId: address.id,
        remark: remark.value
      };
      
      console.log('提交购物车订单数据:', cartOrderData);
      orderRes = await cartApi.checkout(cartOrderData);
    } else {
      // 直接购买 - 使用商品接口
      const productOrderData = {
        productId: product.id,
        quantity: quantity.value,
        addressId: address.id,  // 使用地址ID
        remark: remark.value
      };
      
      console.log('提交商品订单数据:', productOrderData);
      orderRes = await productApi.createPreOrder(productOrderData);
    }
    
    if (orderRes && orderRes.code === 0 && orderRes.data) {
      console.log('创建订单成功:', orderRes.data);
      
      // 获取订单ID
      const orderId = orderRes.data.order?.id || orderRes.data.id;
      if (!orderId) {
        throw new Error('获取订单ID失败');
      }
      
      // 调用对应的支付接口
      const payApi = isFromCart.value ? cartApi.pay : productApi.buy;
      const payRes = await payApi({ orderId });
      
      if (payRes && payRes.code === 0 && payRes.data) {
        console.log('获取支付参数成功:', payRes.data);
        
        // 调用微信支付
        uni.requestPayment({
          provider: 'wxpay',
          timeStamp: payRes.data.payParams.timeStamp,
          nonceStr: payRes.data.payParams.nonceStr,
          package: payRes.data.payParams.package,
          signType: payRes.data.payParams.signType,
          paySign: payRes.data.payParams.paySign,
          success: (res) => {
            console.log('支付成功:', res);
            uni.showToast({
              title: '支付成功',
              icon: 'success'
            });
            
            // 支付成功后跳转到订单列表页
            setTimeout(() => {
              uni.redirectTo({
                url: '/pages/order/index?status=pending_delivery'
              });
            }, 1500);
          },
          fail: (err) => {
            console.log('支付失败或取消:', err);
            uni.showToast({
              title: '支付失败或已取消',
              icon: 'none'
            });
            
            // 支付失败跳转到订单列表页
            setTimeout(() => {
              uni.redirectTo({
                url: '/pages/order/index?status=pending_payment'
              });
            }, 1500);
          }
        });
      } else {
        throw new Error('获取支付参数失败');
      }
    } else {
      throw new Error(orderRes?.message || '创建订单失败');
    }
  } catch (error) {
    console.error('提交订单失败:', error);
    uni.showToast({
      title: error.message || '提交订单失败',
      icon: 'none'
    });
  } finally {
    uni.hideLoading();
  }
};
</script>

<style lang="scss">
.container {
  background-color: #f7f7f7;
  min-height: 100vh;
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom));
}

.section {
  background-color: #fff;
  margin-bottom: 20rpx;
  padding: 30rpx;
  border-radius: 10rpx;
}

.address-section {
  display: flex;
  align-items: center;
}

.address-box {
  flex: 1;
  display: flex;
  align-items: center;
}

.address-info {
  flex: 1;
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-right: 20rpx;
}

.phone {
  font-size: 26rpx;
  color: #666;
}

.address-detail {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}

.no-address {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
  color: #666;
  padding: 20rpx 0;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.product-item {
  display: flex;
  align-items: center;
}

.product-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  background-color: #f7f7f7;
}

.product-info {
  flex: 1;
  margin-left: 20rpx;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
  margin-bottom: 10rpx;
}

.product-price-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-count {
  font-size: 26rpx;
  color: #999;
}

.remark-section {
  padding: 30rpx;
}

.remark-title {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 20rpx;
}

.remark-input {
  width: 100%;
  height: 60rpx;
  font-size: 26rpx;
  color: #333;
}

.amount-section {
  padding: 30rpx;
}

.amount-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  font-size: 28rpx;
  color: #666;
}

.divider {
  height: 1rpx;
  background-color: #f1f1f1;
  margin: 20rpx 0;
}

.total {
  font-weight: bold;
  color: #333;
}

.total-price {
  color: #E31D1A;
  font-size: 32rpx;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100rpx;
  background-color: #fff;
  display: flex;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.total-box {
  flex: 1;
  display: flex;
  align-items: center;
  padding-left: 30rpx;
  font-size: 28rpx;
}

.total-amount {
  color: #E31D1A;
  font-size: 32rpx;
  font-weight: bold;
}

.submit-btn {
  height: 100%;
  border-radius: 0;
  font-size: 30rpx;
  width: 240rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style> 