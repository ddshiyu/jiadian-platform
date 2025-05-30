import { requestClient } from '#/api/request';
// 用户管理相关接口
export interface MiniAppUserStatistics {
  totalCount: number;
  todayNewUsers: number;
  monthNewUsers: number;
  activeUserCount: number;
}

export async function getMiniAppUserStatisticsApi() {
  return requestClient.get<MiniAppUserStatistics>(
    '/admin/users/statistics/summary',
  );
}

export interface MiniAppUser {
  cardId: number;
  userId: number;
  trueName: string;
  photoUrl: string;
  gender: number;
  age: number;
  location: string;
  industry: string;
  companyName: string;
  jobName: string;
  phoneNumber: string;
  wxNumber: string;
  companyScale: string;
  revenueScale: string;
  personalProfile: string;
  appeals: string;
  advantage: string;
  userLevel: number;
  status: number;
}

export async function getMiniAppUserListApi(params: any) {
  return requestClient.get<any>('/admin/mini-users/page', { params });
}

export async function getMiniAppUserDetailApi(id: number) {
  return requestClient.get<any>(`/admin/mini-users/${id}`);
}

export async function updateMiniAppUserWarningNumApi(
  id: number,
  warningNum: number,
) {
  return requestClient.put<any>(`/admin/mini-users/${id}/warning-num`, {
    warningNum,
  });
}

export async function updateMiniAppUserTypeApi(
  id: number,
  supplierInfo?: Record<string, any>,
) {
  return requestClient.put<any>(`/admin/mini-users/${id}/user-type`, {
    supplierInfo,
  });
}

/**
 * 赠送用户VIP
 * @param id 用户ID
 * @param duration VIP时长（月数，默认12个月）
 * @param remark 备注信息
 */
export async function grantUserVipApi(
  id: number,
  duration: number = 12,
  remark?: string,
) {
  return requestClient.put<any>(`/admin/mini-users/${id}/vip`, {
    duration,
    remark,
  });
}

export async function addMiniAppUserApi(data: MiniAppUser) {
  return requestClient.post<any>('/sys/miniAppUser/add', data);
}

export async function updateMiniAppUserApi(data: MiniAppUser) {
  return requestClient.post<any>('/sys/miniAppUser/update', data);
}

export async function deleteMiniAppUserApi(params: { id: string }) {
  return requestClient.delete<any>('/sys/miniAppUser/delete', { params });
}

// 产品管理相关接口
export interface Product {
  id?: number;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  wholesalePrice: number;
  wholesaleThreshold: number;
  vipPrice: number;
  stock: number;
  cover?: string;
  images?: string[];
  status: 'deleted' | 'off_sale' | 'on_sale';
  categoryId: number;
  isRecommended?: boolean;
  createdAt?: string;
  updatedAt?: string;
  category?: {
    id: number;
    name: string;
  };
}

export interface ProductListParams {
  keyword?: string;
  categoryId?: number;
  status?: string;
  isRecommended?: boolean | null;
  pageNum?: number;
  pageSize?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface ProductListResult {
  list: Product[];
  total: number;
  message: string;
  pageNum: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 获取商品列表
 * @param params 查询参数
 */
export function getProductListApi(params: ProductListParams) {
  return requestClient.get<ProductListResult>('/admin/products', {
    params,
  });
}

/**
 * 获取商品详情
 * @param id 商品ID
 */
export function getProductDetailApi(id: number) {
  return requestClient.get<Product>(`/admin/products/${id}`);
}

/**
 * 创建商品
 * @param data 商品数据
 */
export function createProductApi(data: Product) {
  return requestClient.post<Product>('/admin/products', data);
}

/**
 * 更新商品
 * @param id 商品ID
 * @param data 商品数据
 */
export function updateProductApi(id: number, data: Product) {
  return requestClient.put<Product>(`/admin/products/${id}`, data);
}

/**
 * 删除商品
 * @param id 商品ID
 */
export function deleteProductApi(id: number) {
  return requestClient.delete(`/admin/products/${id}`);
}

/**
 * 更新商品状态
 * @param id 商品ID
 * @param status 商品状态
 */
export function updateProductStatusApi(
  id: number,
  status: 'off_sale' | 'on_sale',
) {
  return requestClient.put(`/admin/products/${id}/status`, { status });
}

/**
 * 批量操作商品
 * @param ids 商品ID数组
 * @param action 操作类型
 */
export function batchOperateProductsApi(
  ids: number[],
  action: 'delete' | 'off_sale' | 'on_sale',
) {
  return requestClient.post('/admin/products/batch', { ids, action });
}

/**
 * 商品分类相关接口
 */
export interface Category {
  id?: number;
  name: string;
  icon?: string;
  sort?: number;
  parentId?: null | number;
  children?: Category[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryListResult {
  list: Category[];
  total: number;
  message: string;
  pageNum: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 获取分类列表
 */
export function getCategoryListApi() {
  return requestClient.get<CategoryListResult>('/admin/categories');
}

/**
 * 创建分类
 * @param data 分类数据
 */
export function createCategoryApi(data: Category) {
  return requestClient.post<Category>('/admin/categories', data);
}

/**
 * 更新分类
 * @param id 分类ID
 * @param data 分类数据
 */
export function updateCategoryApi(id: number, data: Category) {
  return requestClient.put<Category>(`/admin/categories/${id}`, data);
}

/**
 * 删除分类
 * @param id 分类ID
 */
export function deleteCategoryApi(id: number) {
  return requestClient.delete(`/admin/categories/${id}`);
}

/**
 * 订单管理相关接口
 */
export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  totalAmount: number;
  productCover?: string;
}

export interface Order {
  id: number;
  orderNo: string;
  userId: number;
  userName: string;
  totalAmount: number;
  orderType?: string;
  status:
    | 'cancelled'
    | 'completed'
    | 'delivered'
    | 'pending_delivery'
    | 'pending_payment'
    | 'refund_approved'
    | 'refund_pending'
    | 'refund_rejected';
  paymentStatus: 'paid' | 'refunded' | 'unpaid';
  paymentMethod?: string;
  paymentTime?: string;
  deliveryTime?: string;
  completionTime?: string;
  cancelTime?: string;
  refundRequestTime?: string;
  refundApprovalTime?: string;
  refundReason?: string;
  refundRemark?: string;
  remark?: string;
  address?: string;
  consignee?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface OrderListParams {
  orderNo?: string;
  userId?: number;
  userName?: string;
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  pageNum?: number;
  pageSize?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface OrderListResult {
  list: Order[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 获取订单列表
 * @param params 查询参数
 */
export function getOrderListApi(params: OrderListParams) {
  return requestClient.get<OrderListResult>('/admin/orders', { params });
}

/**
 * 获取订单详情
 * @param id 订单ID
 */
export function getOrderDetailApi(id: number) {
  return requestClient.get<Order>(`/admin/orders/${id}`);
}

/**
 * 更新订单状态
 * @param id 订单ID
 * @param status 订单状态
 */
export function updateOrderStatusApi(id: number, status: Order['status']) {
  return requestClient.put(`/admin/orders/${id}/status`, { status });
}

/**
 * 发货
 * @param id 订单ID
 * @param trackingNumber 快递单号
 * @param trackingCompany 快递公司
 * @param deliveryImages 发货图片
 */
export function shipOrderApi(
  id: number,
  trackingNumber: string,
  trackingCompany: string,
  deliveryImages?: string[],
) {
  return requestClient.put(`/admin/orders/${id}/ship`, {
    trackingNumber,
    trackingCompany,
    deliveryImages,
  });
}

/**
 * 备注订单
 * @param id 订单ID
 * @param remark 备注内容
 */
export function remarkOrderApi(id: number, remark: string) {
  return requestClient.put(`/admin/orders/${id}/remark`, { remark });
}

/**
 * 取消订单
 * @param id 订单ID
 * @param reason 取消原因
 */
export function cancelOrderApi(id: number, reason: string) {
  return requestClient.put(`/admin/orders/${id}/cancel`, { reason });
}

/**
 * 获取退款订单列表
 * @param params 查询参数
 */
export function getRefundOrderListApi(params: OrderListParams) {
  return requestClient.get<OrderListResult>('/admin/orders/refunds', {
    params,
  });
}

/**
 * 处理退款申请
 * @param id 订单ID
 * @param action 处理结果: 'approved' 通过, 'rejected' 拒绝
 * @param remark 处理备注
 */
export function handleRefundApi(
  id: number,
  action: 'approved' | 'rejected',
  remark?: string,
) {
  const data: { remark?: string; status: string } = { status: action };
  if (remark) {
    data.remark = remark;
  }
  return requestClient.put(`/admin/orders/${id}/refund`, data);
}

/**
 * 上传文件相关接口
 */

export interface UploadedFile {
  url: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface UploadImageResult {
  message: string;
  image: UploadedFile;
}

/**
 * 上传图片
 * @param file 图片文件
 * @returns Promise<UploadImageResult> 上传结果
 */
export async function uploadImageApi(file: File): Promise<UploadImageResult> {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch('/api/upload/image', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '图片上传失败');
    }

    const result = await response.json();

    // 确保返回格式正确
    if (!result.image || !result.image.url) {
      throw new Error('服务器返回的数据格式不正确');
    }

    return result as UploadImageResult;
  } catch (error) {
    // 重新抛出错误，让调用者处理
    const error_ = error instanceof Error ? error : new Error('图片上传失败');
    throw error_;
  }
}

/**
 * Banner相关接口
 */
export interface Banner {
  id?: number;
  image: string;
  content?: string;
  link?: string;
  sort: number;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface BannerListResult {
  list: Banner[];
  total: number;
  message: string;
  pageNum: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 获取Banner列表
 */
export function getBannerListApi() {
  return requestClient.get<BannerListResult>('/admin/banners');
}

/**
 * 创建Banner
 * @param data Banner数据
 */
export function createBannerApi(data: Banner) {
  return requestClient.post<Banner>('/admin/banners', data);
}

/**
 * 更新Banner
 * @param id Banner ID
 * @param data Banner数据
 */
export function updateBannerApi(id: number, data: Banner) {
  return requestClient.put<Banner>(`/admin/banners/${id}`, data);
}

/**
 * 删除Banner
 * @param id Banner ID
 */
export function deleteBannerApi(id: number) {
  return requestClient.delete(`/admin/banners/${id}`);
}

/**
 * 推荐产品相关接口
 */
export interface RecommendedProduct {
  id?: number;
  productId: number;
  sort: number;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
  product?: Product;
}

export interface RecommendedProductListResult {
  list: RecommendedProduct[];
  total: number;
  message: string;
  pageNum: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 获取推荐产品列表
 */
export function getRecommendedProductListApi() {
  return requestClient.get<RecommendedProductListResult>(
    '/admin/products/recommended',
  );
}

/**
 * 创建推荐产品
 * @param data 推荐产品数据
 */
export function createRecommendedProductApi(data: RecommendedProduct) {
  return requestClient.post<RecommendedProduct>(
    '/admin/products/recommended',
    data,
  );
}

/**
 * 更新推荐产品
 * @param id 推荐产品ID
 * @param data 推荐产品数据
 */
export function updateRecommendedProductApi(
  id: number,
  data: RecommendedProduct,
) {
  return requestClient.put<RecommendedProduct>(
    `/admin/products/recommended/${id}`,
    data,
  );
}

/**
 * 删除推荐产品
 * @param id 推荐产品ID
 */
export function deleteRecommendedProductApi(id: number) {
  return requestClient.delete(`/admin/recommended-products/${id}`);
}

/**
 * 佣金管理相关接口
 */
export interface Commission {
  id: number;
  userId: number;
  inviteeId: number;
  orderId: number;
  amount: number;
  status: 'cancelled' | 'pending' | 'settled';
  createdAt: string;
  updatedAt: string;
  user?: {
    avatar: string;
    id: number;
    nickname: string;
    phone: string;
  };
  invitee?: {
    avatar: string;
    id: number;
    nickname: string;
    phone: string;
  };
  order?: {
    createdAt: string;
    id: number;
    orderNo: string;
    status: string;
    totalAmount: number;
  };
}

export interface CommissionListParams {
  status?: string;
  userId?: number;
  pageNum?: number;
  pageSize?: number;
}

export interface CommissionListResult {
  list: Commission[];
  total: number;
  message: string;
  pageNum: number;
  pageSize: number;
  totalPages: number;
}

export interface CommissionStatistics {
  totalCommission: number;
  todayCommission: number;
  monthCommission: number;
  totalRecords: number;
}

/**
 * 获取佣金列表
 * @param params 查询参数
 */
export function getCommissionListApi(params: CommissionListParams) {
  return requestClient.get<CommissionListResult>('/admin/commissions/page', {
    params,
  });
}

/**
 * 获取佣金统计数据
 */
export function getCommissionStatisticsApi() {
  return requestClient.get<CommissionStatistics>(
    '/admin/commissions/statistics',
  );
}

/**
 * 获取佣金详情
 * @param id 佣金ID
 */
export function getCommissionDetailApi(id: number) {
  return requestClient.get<Commission>(`/admin/commissions/${id}`);
}

/**
 * 更新佣金状态
 * @param id 佣金ID
 * @param status 佣金状态
 */
export function updateCommissionStatusApi(
  id: number,
  status: 'cancelled' | 'pending' | 'settled',
) {
  return requestClient.put(`/admin/commissions/${id}/status`, { status });
}
