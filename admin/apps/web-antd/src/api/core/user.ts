import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  return requestClient.get<UserInfo>('/user/info');
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
