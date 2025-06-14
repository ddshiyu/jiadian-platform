import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { getAllMenusApi } from '#/api';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';
import { accessRoutes } from './routes';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      console.log('access.ts - 开始获取菜单列表');
      // 获取用户角色
      const userStore = useUserStore();
      const userRole = userStore.userInfo?.role;

      // 根据用户角色过滤菜单
      const menuList = accessRoutes.filter((route: any) => {
        // 如果是管理员，显示所有菜单
        if (userRole === 'admin') {
          return true;
        }

        // 非管理员不显示用户管理和小程序用户管理页面
        if (route.meta?.authority?.includes('admin')) {
          return false;
        }

        return true;
      });

      return menuList;
    },
    // 可以指定没有权限跳转403页面
    forbiddenComponent,
    // 如果 route.meta.menuVisibleWithForbidden = true
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
