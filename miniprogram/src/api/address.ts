import { http } from '@/utils/request'

interface AddressData {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  isDefault?: boolean;
  [key: string]: any;
}

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
  getAddressDetail: (id: string) => {
    return http.get(`/addresses/${id}`)
  },

  // 添加收货地址
  addAddress: (addressData: AddressData) => {
    return http.post('/addresses', addressData)
  },

  // 更新收货地址
  updateAddress: (id: string, addressData: AddressData) => {
    return http.put(`/addresses/${id}`, addressData)
  },

  // 删除收货地址
  deleteAddress: (id: string) => {
    return http.delete(`/addresses/${id}`)
  },

  // 设置默认收货地址
  setDefaultAddress: (id: string) => {
    return http.put(`/addresses/${id}/default`)
  }
} 