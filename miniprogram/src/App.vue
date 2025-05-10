<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { reactive, provide, watch } from 'vue';
import { userApi } from '@/api/user';

// 读取本地存储的用户信息
const getStoredUserInfo = () => {
	try {
		const storedUserInfo = uni.getStorageSync('userInfo');
		return storedUserInfo ? JSON.parse(storedUserInfo) : null;
	} catch (error) {
		console.error('读取用户信息失败:', error);
		return null;
	}
};

// 全局用户状态（优先使用存储中的信息）
const storedUserInfo = getStoredUserInfo();
const userInfo = reactive({
	id: storedUserInfo?.id || null,
	nickname: storedUserInfo?.nickname || '',
	avatar: storedUserInfo?.avatar || '',
	phone: storedUserInfo?.phone || '',
	isLoggedIn: !!storedUserInfo?.id
});

// 监听用户信息变化，保存到本地存储
watch(userInfo, (newValue) => {
	try {
		uni.setStorageSync('userInfo', JSON.stringify(newValue));
		console.log('用户信息已保存到本地存储');
	} catch (error) {
		console.error('保存用户信息失败:', error);
	}
}, { deep: true });

// 获取用户信息
const getUserInfo = async () => {
	try {
		// 判断是否有token
		const token = uni.getStorageSync('token');
		if (!token) return;
		
		// 调用API获取用户信息
		const res = await userApi.getUserInfo();
		
		if (res && res.data) {
			// 更新用户信息
			Object.assign(userInfo, res.data);
			userInfo.isLoggedIn = true;
			console.log('用户信息获取成功', userInfo);
			
			// 保存到本地存储（虽然watch会处理，这里为了保险起见也保存一次）
			uni.setStorageSync('userInfo', JSON.stringify(userInfo));
		}
	} catch (error) {
		console.error('获取用户信息失败:', error);
	}
};

// 提供用户信息给全局使用
provide('userInfo', userInfo);

// 应用启动时获取用户信息
onLaunch(() => {
	console.log('App Launch');
	// 调用获取用户信息接口
	getUserInfo();
});

onShow(() => {
	console.log('App Show');
});

onHide(() => {
	console.log('App Hide');
});
</script>
<!-- 注意这里的 lang="scss"，并且没有 scoped -->
<style lang="scss">
@import "nutui-uniapp/styles/index.scss";

// ...
</style>