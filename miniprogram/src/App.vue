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
	isLoggedIn: !!storedUserInfo?.id,
	gender: storedUserInfo?.gender || 0,
	age: storedUserInfo?.age || null,
	openid: storedUserInfo?.openid || '',
	inviteCode: storedUserInfo?.inviteCode || '',
	commission: storedUserInfo?.commission || 0,
	isVip: !!storedUserInfo?.isVip,
	vipExpireDate: storedUserInfo?.vipExpireDate || null
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
		const res = await userApi.getUserInfo();
		
		if (res && res.code === 0 && res.data) {
			// 更新用户信息
			Object.assign(userInfo, {
				id: res.data.id,
				nickname: res.data.nickname,
				avatar: res.data.avatar,
				gender: res.data.gender,
				age: res.data.age,
				phone: res.data.phone,
				inviteCode: res.data.inviteCode,
				commission: res.data.commission || 0,
				userType: res.data.userType || 0,
			});
			
			// 获取VIP状态
			await getVipStatus();
		}
	} catch (error) {
		console.error('获取用户信息失败:', error);
	}
};

// 获取VIP状态
const getVipStatus = async () => {
	try {
		const res = await userApi.getVipStatus();
		if (res && res.code === 0 && res.data) {
			// 更新VIP信息
			userInfo.isVip = res.data.isVip;
			userInfo.vipExpireDate = res.data.vipExpireDate;
		}
	} catch (error) {
		console.error('获取VIP状态失败:', error);
	}
};

// 提供用户信息给全局使用
provide('userInfo', userInfo);

// 应用启动时获取用户信息
onLaunch(() => {
	console.log('App Launch');
	console.log(import.meta.env.VITE_APP_BASE_API)
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