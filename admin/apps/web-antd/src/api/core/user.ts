import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  return requestClient.get<UserInfo>('/admin/users/profile');
}

// 后台用户管理相关接口
export interface AdminUser {
  id: number;
  username: string;
  name?: string;
  phone?: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserListParams {
  keyword?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface AdminUserListResult {
  list: AdminUser[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUserDetailResult extends AdminUser {
  stats: {
    orderCount: number;
    recentOrders: any[];
  };
}

/**
 * 获取后台用户列表
 * @param params 查询参数
 */
export function getAdminUserListApi(params: AdminUserListParams) {
  return requestClient.get<AdminUserListResult>('/admin/users', { params });
}

/**
 * 获取后台用户详情
 * @param id 用户ID
 */
export function getAdminUserDetailApi(id: number) {
  return requestClient.get<AdminUserDetailResult>(`/admin/users/${id}`);
}

/**
 * 创建后台用户
 * @param data 用户数据
 */
export function createAdminUserApi(data: {
  name?: string;
  password: string;
  phone?: string;
  role?: string;
  username: string;
}) {
  return requestClient.post<AdminUser>('/admin/users', data);
}

/**
 * 更新后台用户
 * @param id 用户ID
 * @param data 用户数据
 */
export function updateAdminUserApi(
  id: number,
  data: {
    name?: string;
    phone?: string;
    role?: string;
    status?: string;
  },
) {
  return requestClient.put<AdminUser>(`/admin/users/${id}`, data);
}

/**
 * 重置后台用户密码
 * @param id 用户ID
 * @param password 新密码
 */
export function resetAdminUserPasswordApi(id: number, password: string) {
  return requestClient.put(`/admin/users/${id}/reset-password`, { password });
}

/**
 * 更新后台用户状态
 * @param id 用户ID
 * @param status 用户状态
 */
export function updateAdminUserStatusApi(
  id: number,
  status: 'active' | 'inactive',
) {
  return requestClient.put(`/admin/users/${id}/status`, { status });
}

/**
 * 获取用户统计摘要
 */
export function getAdminUserStatisticsSummaryApi() {
  return requestClient.get<{
    activeUserCount: number;
    monthNewUsers: number;
    todayNewUsers: number;
    totalCount: number;
  }>('/admin/users/statistics/summary');
}

// 付款方式相关接口
export interface QRCodePayment {
  type: 'wechat' | 'alipay' | 'other';
  imageUrl: string;
  name: string;
}

export interface BankCardPayment {
  bankName: string;
  cardNumber: string;
  accountName: string;
}

export interface PaymentMethods {
  qrCodes: QRCodePayment[];
  bankCards: BankCardPayment[];
}

export interface AdminUserWithPayments extends AdminUser {
  paymentMethods?: PaymentMethods;
}

/**
 * 获取管理员付款方式
 * @param id 管理员ID，如果不传则获取当前管理员的付款方式
 */
export function getAdminUserPaymentMethodsApi(id?: number) {
  const url = id ? `/admin/users/${id}/payment-methods` : '/admin/users/profile/payment-methods';
  return requestClient.get<{ paymentMethods: PaymentMethods }>(url);
}

/**
 * 更新管理员付款方式
 * @param id 管理员ID
 * @param paymentMethods 付款方式数据
 */
export function updateAdminUserPaymentMethodsApi(id: number, paymentMethods: PaymentMethods) {
  return requestClient.put<{ message: string; paymentMethods: PaymentMethods }>(
    `/admin/users/${id}/payment-methods`,
    { paymentMethods }
  );
}

/**
 * 添加单个付款方式
 * @param id 管理员ID
 * @param type 付款方式类型
 * @param data 付款方式数据
 */
export function addAdminUserPaymentMethodApi(
  id: number,
  type: 'qrCode' | 'bankCard',
  data: QRCodePayment | BankCardPayment
) {
  return requestClient.post<{ message: string; paymentMethods: PaymentMethods }>(
    `/admin/users/${id}/payment-methods/${type}`,
    data
  );
}

/**
 * 删除单个付款方式
 * @param id 管理员ID
 * @param type 付款方式类型
 * @param index 要删除的索引
 */
export function deleteAdminUserPaymentMethodApi(
  id: number,
  type: 'qrCode' | 'bankCard',
  index: number
) {
  return requestClient.delete<{ message: string; paymentMethods: PaymentMethods }>(
    `/admin/users/${id}/payment-methods/${type}/${index}`
  );
}
