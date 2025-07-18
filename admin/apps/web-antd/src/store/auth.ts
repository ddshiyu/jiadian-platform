import type { Recordable, UserInfo } from '@vben/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { defineStore } from 'pinia';

import { getUserInfoApi, loginApi, logoutApi } from '#/api';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);

  /**
   * 异步处理登录操作
   * Asynchronously handle the login process
   * @param params 登录表单数据
   */
  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    // 异步处理用户登录操作并获取 accessToken
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;
      const { token, user } = await loginApi(params);
      const accessToken = token;
      // 如果成功获取到 accessToken
      if (accessToken) {
        accessStore.setAccessToken(accessToken);
        (user as any).roles = [user.role];
        userInfo = user as any;
        userStore.setUserInfo(userInfo);
        // // 获取用户信息并存储到 accessStore 中
        // const [fetchUserInfoResult, accessCodes] = await Promise.all([
        //   fetchUserInfo(),
        //   getAccessCodesApi(),
        // ]);

        // userInfo = fetchUserInfoResult;

        // userStore.setUserInfo(userInfo);
        // accessStore.setAccessCodes(accessCodes);

        // if (accessStore.loginExpired) {
        //   accessStore.setLoginExpired(false);
        // } else {
        if (user.role === 'admin') {
          onSuccess
            ? await onSuccess?.()
            : await router.push('/operation/users');
        } else {
          onSuccess
            ? await onSuccess?.()
            : await router.push('/profile/my');
        }
        // }

        // if (userInfo?.realName) {
        //   notification.success({
        //     description: `${$t('authentication.loginSuccessDesc')}:${userInfo?.realName}`,
        //     duration: 3,
        //     message: $t('authentication.loginSuccess'),
        //   });
        // }
      }
    } finally {
      loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  async function logout(redirect: boolean = true) {
    try {
      await logoutApi();
    } catch {
      // 不做任何处理
    }
    resetAllStores();
    accessStore.setLoginExpired(false);

    // 回登录页带上当前路由地址
    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? {
            redirect: encodeURIComponent(router.currentRoute.value.fullPath),
          }
        : {},
    });
  }

    async function fetchUserInfo() {
    let userInfo: null | UserInfo = null;
    userInfo = await getUserInfoApi();

    // 确保角色信息正确设置
    if (userInfo && (userInfo as any).role) {
      (userInfo as any).roles = [(userInfo as any).role];
    }

    userStore.setUserInfo(userInfo);
    return userInfo;
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});
