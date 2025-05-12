import { http } from '@/utils/request'

interface OrderParams {
  status?: string;
  page?: number;
  limit?: number;
  [key: string]: any;
}

interface OrderData {
  addressId: string;
  products: Array<{
    id: string;
    quantity: number;
    [key: string]: any;
  }>;
  [key: string]: any;
}

// 订单相关接口
export const orderApi = {
  // 获取订单列表
  getList: (params: OrderParams = {}) => {
    return http.get('/orders', params)
  },
  
  // 获取订单详情
  getDetail: (id: string) => {
    return http.get(`/orders/${id}`)
  },
  
  // 创建订单
  create: (data: OrderData) => {
    return http.post('/orders', data)
  },
  
  // 取消订单
  cancel: (id: string) => {
    return http.put(`/orders/${id}/cancel`)
  },
  
  // 支付订单
  pay: (id: string) => {
    return http.put(`/orders/${id}/pay`)
  },
  
  // 确认收货
  complete: (id: string) => {
    return http.put(`/orders/${id}/complete`)
  },
  
  // 获取订单统计信息
  getStats: () => {
    return http.get('/orders/stats')
  }
} 