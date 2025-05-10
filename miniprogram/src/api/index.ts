import { http } from '@/utils/request'

// 首页相关接口
export const homeApi = {
  // 获取首页轮播图
  getBanners: () => {
    return http.get('/banners')
  },

  // 获取分类列表
  getCategories: () => {
    return http.get('/categories')
  },

  // 获取热门商品列表
  getHotProducts: (limit = 4) => {
    return http.get('/products/hot', { limit })
  },

  // 获取新品商品列表
  getNewProducts: (limit = 4) => {
    return http.get('/products/new', { limit })
  }
}



export default {
  homeApi,
}