import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ic:baseline-view-in-ar',
      keepAlive: false,
      order: 1000,
      title: '功能',
      authority: ['admin'],
    },
    name: 'Operation',
    path: '/operation',
    redirect: '/operation/users',
    children: [
      {
        meta: {
          title: '用户管理',
          authority: ['admin'],
        },
        name: 'users',
        path: '/operation/users',
        component: () => import('#/views/operation/users.vue'),
      },
      {
        meta: {
          title: '小程序用户',
          authority: ['admin'],
        },
        name: 'miniUsers',
        path: '/operation/mini-users',
        component: () => import('#/views/operation/mini-users.vue'),
      },
    ],
  },
  {
    meta: {
      icon: 'material-symbols:person-outline',
      keepAlive: false,
      order: 1500,
      title: '我的',
    },
    name: 'Profile',
    path: '/profile',
    redirect: '/profile/my',
    children: [
      {
        meta: {
          title: '我的信息',
        },
        name: 'MyProfile',
        path: '/profile/my',
        component: () => import('#/views/profile/my-profile.vue'),
      },
    ],
  },
  {
    meta: {
      icon: 'material-symbols:local-mall-outline',
      keepAlive: false,
      order: 2000,
      title: '商品管理',
    },
    name: 'Product',
    path: '/product',
    redirect: '/product/list',
    children: [
      {
        meta: {
          title: '商品列表',
        },
        name: 'ProductList',
        path: '/product/list',
        component: () => import('#/views/product/index.vue'),
      },
      {
        meta: {
          title: '商品分类',
        },
        name: 'ProductCategory',
        path: '/product/category',
        component: () => import('#/views/product/category.vue'),
      },
      {
        meta: {
          title: 'Banner管理',
        },
        name: 'ProductBanner',
        path: '/product/banner',
        component: () => import('#/views/product/banner.vue'),
      },
    ],
  },
  {
    meta: {
      icon: 'material-symbols:order-approve-outline',
      keepAlive: false,
      order: 3000,
      title: '订单管理',
    },
    name: 'Order',
    path: '/order',
    redirect: '/order/list',
    children: [
      {
        meta: {
          title: '订单列表',
        },
        name: 'OrderList',
        path: '/order/list',
        component: () => import('#/views/operation/orders.vue'),
      },
    ],
  },
  {
    meta: {
      icon: 'material-symbols:payments-outline',
      keepAlive: false,
      order: 4000,
      title: '佣金管理',
      authority: ['admin'],
    },
    name: 'Commission',
    path: '/commission',
    redirect: '/commission/list',
    children: [
      {
        meta: {
          title: '佣金记录',
        },
        name: 'CommissionList',
        path: '/commission/list',
        component: () => import('#/views/operation/commission.vue'),
      },
    ],
  },
];

export default routes;
