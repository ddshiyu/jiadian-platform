<template>
  <view class="container">
    <view class="form-box">
      <nut-form>
        <nut-form-item label="收货人">
          <nut-input
            v-model="addressForm.name"
            placeholder="请输入收货人姓名"
            clearable
            :border="false"
          />
        </nut-form-item>
        
        <nut-form-item label="手机号码">
          <nut-input
            v-model="addressForm.phone"
            type="number"
            placeholder="请输入手机号码"
            maxlength="11"
            clearable
            :border="false"
          />
        </nut-form-item>
        
        <nut-form-item label="所在地区">
          <view class="address-area-inputs">
            <picker mode="region" :value="region" @change="bindRegionChange">
              <view class="picker">
                <text v-if="addressForm.province" class="region-text">
                  {{ addressForm.province }} {{ addressForm.city }} {{ addressForm.district }}
                </text>
                <text v-else class="region-placeholder">请选择所在地区</text>
              </view>
            </picker>
          </view>
        </nut-form-item>
        
        <nut-form-item label="详细地址">
          <nut-textarea
            v-model="addressForm.detail"
            placeholder="请输入详细地址信息，如道路、门牌号、小区、楼栋号、单元室等"
            :border="false"
            max-length="200"
            limit-show
            rows="3"
            placeholder-style="color: #999;"
            text-align="left"
          />
        </nut-form-item>
        <nut-form-item>
          <view class="default-switch">
            <text>设为默认收货地址</text>
            <nut-switch v-model="addressForm.isDefault" />
          </view>
        </nut-form-item>
      </nut-form>
    </view>
    
    <!-- 底部按钮 -->
    <view class="footer">
      <nut-button 
        type="primary" 
        block 
        @click="saveAddress"
      >
        保存地址
      </nut-button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { addressApi } from '@/api/address';

// 地址表单数据
const addressForm = reactive({
  id: null,
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false
});

// 地区选择器数据
const region = ref(['广东省', '广州市', '海珠区']);

// 地区选择器变化事件
const bindRegionChange = (e) => {
  console.log('地区选择：', e);
  region.value = e.detail.value;
  
  // 更新表单数据
  addressForm.province = e.detail.value[0];
  addressForm.city = e.detail.value[1];
  addressForm.district = e.detail.value[2];
}

// 页面加载时获取地址ID
onLoad(async (options) => {
  console.log('页面参数：', options);
  
  if (options.id) {
    // 编辑已有地址
    await fetchAddressDetail(options.id);
  }
});

// 获取地址详情
const fetchAddressDetail = async (id) => {
  try {
    uni.showLoading({
      title: '加载中'
    });
    
    // 调用API获取地址详情
    const res = await addressApi.getAddressDetail(id);
    console.log('地址详情：', res);
    
    if (res && res.data && res.data.id) {
      // 填充表单
      Object.assign(addressForm, res.data);
      
      // 更新地区选择器
      if (addressForm.province && addressForm.city && addressForm.district) {
        region.value = [addressForm.province, addressForm.city, addressForm.district];
      }
    } else {
      uni.showToast({
        title: '地址不存在',
        icon: 'none'
      });
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    }
  } catch (error) {
    console.error('获取地址详情失败', error);
    uni.showToast({
      title: '获取地址详情失败',
      icon: 'none'
    });
  } finally {
    uni.hideLoading();
  }
};

// 保存地址
const saveAddress = async () => {
  // 表单验证
  if (!addressForm.name) {
    return uni.showToast({
      title: '请输入收货人姓名',
      icon: 'none'
    });
  }
  
  if (!addressForm.phone) {
    return uni.showToast({
      title: '请输入手机号码',
      icon: 'none'
    });
  }
  
  if (!/^1\d{10}$/.test(addressForm.phone)) {
    return uni.showToast({
      title: '手机号码格式不正确',
      icon: 'none'
    });
  }
  
  if (!addressForm.province || !addressForm.city || !addressForm.district) {
    return uni.showToast({
      title: '请选择所在地区',
      icon: 'none'
    });
  }
  
  if (!addressForm.detail) {
    return uni.showToast({
      title: '请输入详细地址',
      icon: 'none'
    });
  }
  
  // 显示加载状态
  uni.showLoading({
    title: '保存中'
  });
  
  try {
    let res;
    // 根据是否有ID判断是新增还是编辑
    if (addressForm.id) {
      // 更新地址
      res = await addressApi.updateAddress(addressForm.id, addressForm);
    } else {
      // 添加地址
      res = await addressApi.addAddress(addressForm);
    }
    
    if (res && (res.code === 200 || res.code === 0 || res.statusCode === 200)) {
      uni.hideLoading();
      uni.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      // 返回上一页
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    } else {
      throw new Error('保存失败');
    }
  } catch (error) {
    uni.hideLoading();
    console.error('保存地址失败', error);
    uni.showToast({
      title: '保存失败，请重试',
      icon: 'none'
    });
  }
};
</script>

<style lang="scss">
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 180rpx;
}

.form-box {
  background-color: #fff;
  margin-top: 20rpx;
}

:deep(.nut-form-item) {
  padding: 20rpx 30rpx;
}

:deep(.nut-form-item__label) {
  width: 180rpx;
  font-size: 28rpx;
}

.input-field {
  width: 100%;
  height: 70rpx;
  font-size: 28rpx;
}

.address-area-inputs {
  display: flex;
  width: 100%;
  gap: 10rpx;
}

.picker {
  width: 100%;
  height: 70rpx;
  display: flex;
  align-items: center;
}

.region-text {
  font-size: 28rpx;
  color: #333;
}

.region-placeholder {
  font-size: 28rpx;
  color: #999;
}

.area-input {
  flex: 1;
}

.placeholder-text {
  color: #999;
}

.address-textarea {
  width: 100%;
  height: 160rpx;
  font-size: 28rpx;
  padding: 10rpx 0;
}

.default-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 30rpx;
  background-color: #fff;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}
</style> 