<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { reactive, provide } from 'vue';
import { userApi } from '@/api/user';

// 全局用户状态（使用默认值初始化）
const userInfo = reactive({
	id: null,
	nickname: '',
	avatar: '',
	phone: '',
	isLoggedIn: false,
	gender: 0,
	age: null,
	openid: '',
	inviteCode: '',
	commission: 0,
	isVip: false,
	vipExpireDate: null,
	userType: ''
});

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
				isLoggedIn: true
			});
			
			// 获取VIP状态
			await getVipStatus();
		} else if (res && res.code === 404) {
			// 用户不存在，重置用户信息
			Object.assign(userInfo, {
				id: null,
				nickname: '',
				avatar: '',
				phone: '',
				isLoggedIn: false,
				gender: 0,
				age: null,
				openid: '',
				inviteCode: '',
				commission: 0,
				isVip: false,
				vipExpireDate: null
			});
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

// 应用启动时获取用户信息
onLaunch(async () => {
	console.log('App Launch');
	console.log(import.meta.env.VITE_APP_BASE_API)
	// 调用获取用户信息接口
	await getUserInfo();
	uni.setStorageSync('userInfo', userInfo);
});

// 提供用户信息给全局使用
provide('userInfo', userInfo);

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