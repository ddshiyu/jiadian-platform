import { http } from '@/utils/request'

// 购物车相关接口
export const cartApi = {
  // 获取购物车列表
  getList: () => {
    return http.get('/carts')
  },
  
  // 添加商品到购物车
  add: (data) => {
    return http.post('/carts', data)
  },
  
  // 更新购物车商品
  update: (id, data) => {
    return http.put(`/carts/${id}`, data)
  },
  
  // 删除购物车商品
  delete: (id) => {
    return http.delete(`/carts/${id}`)
  },
  
  // 清空购物车
  clear: () => {
    return http.delete('/carts')
  },
  
  // 全选/取消全选
  selectAll: (selected) => {
    return http.put('/carts/selectAll', { selected })
  },
  
  // 获取购物车选中商品的统计信息
  getSelected: () => {
    return http.get('/carts/selected')
  },
  
  // 从购物车结算创建订单
  checkout: (data) => {
    return http.post('/carts/checkout', data)
  },
  
  // 支付购物车订单
  pay: (data) => {
    return http.post('/carts/pay', data)
  }
} 