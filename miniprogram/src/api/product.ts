import { http } from '@/utils/request'

// 商品相关接口
export const productApi = {
  // 获取商品列表
  getProducts: (params = {}) => {
    return http.get('/products', params)
  },

  // 获取商品详情
  getDetail: (id: string) => {
    return http.get(`/products/${id}`)
  },

  // 获取分类商品列表
  getCategoryProducts: (categoryId, params = {}) => {
    return http.get(`/categories/${categoryId}/products`, params)
  },

  // 搜索商品
  search: (keyword, params = {}) => {
    return http.get('/products/search', { keyword, ...params })
  },

  // 创建预订单
  createPreOrder: (data) => {
    return http.post('/products/pre-order', data)
  },

  // 购买商品（支付）
  buy: (data) => {
    return http.post('/products/buy', data)
  }
}