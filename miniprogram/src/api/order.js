import { http } from '@/utils/request'

// 订单相关接口
export const orderApi = {
  // 获取订单列表
  getList: (params = {}) => {
    return http.get('/orders', params)
  },
  
  // 获取订单详情
  getDetail: (id) => {
    return http.get(`/orders/${id}`)
  },
  
  // 创建订单
  create: (data) => {
    return http.post('/orders', data)
  },
  
  // 取消订单
  cancel: (id) => {
    return http.put(`/orders/${id}/cancel`)
  },
  
  // 支付订单
  pay: (id) => {
    return http.put(`/orders/${id}/pay`)
  },
  
  // 确认收货
  complete: (id) => {
    return http.put(`/orders/${id}/complete`)
  },
  
  // 获取订单统计信息
  getStats: () => {
    return http.get('/orders/stats')
  }
} 