import { http } from '@/utils/request'

// 地址相关接口
export const addressApi = {
  // 获取用户的所有收货地址
  getAddressList: () => {
    return http.get('/addresses')
  },

  // 获取默认收货地址
  getDefaultAddress: () => {
    return http.get('/addresses/default')
  },

  // 获取单个收货地址详情
  getAddressDetail: (id) => {
    return http.get(`/addresses/${id}`)
  },

  // 添加收货地址
  addAddress: (addressData) => {
    return http.post('/addresses', addressData)
  },

  // 更新收货地址
  updateAddress: (id, addressData) => {
    return http.put(`/addresses/${id}`, addressData)
  },

  // 删除收货地址
  deleteAddress: (id) => {
    return http.delete(`/addresses/${id}`)
  },

  // 设置默认收货地址
  setDefaultAddress: (id) => {
    return http.put(`/addresses/${id}/default`)
  }
} 