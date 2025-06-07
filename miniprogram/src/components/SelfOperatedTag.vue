<template>
  <view v-if="showTag" class="self-operated-tag">
    <text class="tag-text">自营</text>
  </view>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
});

// 判断是否显示自营标签
const showTag = computed(() => {
  return props.product?.merchant?.role === 'admin';
});
</script>

<style lang="scss" scoped>
.self-operated-tag {
  display: inline-block;
  margin-right: 8rpx;
  margin-bottom: 8rpx;
}

.tag-text {
  background: linear-gradient(135deg, #E31D1A 0%, #FF6B6B 100%);
  color: white;
  font-size: 20rpx;
  font-weight: bold;
  padding: 4rpx 8rpx;
  border-radius: 6rpx;
  line-height: 1;
  text-align: center;
  letter-spacing: 1rpx;
}
</style> 