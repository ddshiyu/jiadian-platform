import { userApi } from '@/api/user';

/**
 * 根据merchant.role过滤商品
 * @param products 商品列表
 * @returns 过滤后的商品列表
 */
export const filterProductsByUserType = async (products: any[]): Promise<any[]> => {
  try {
    if (!Array.isArray(products)) {
      return products;
    }
    const userInfo = await getUserInfo();
    console.log(userInfo);
    // 根据merchant.role过滤商品
    return products.filter(product => {
      if (!product.merchant) return true; // 如果没有merchant信息，默认显示

      // 这里可以根据需要调整过滤规则
      // 例如：只显示role为'admin'的商品
      if (userInfo.userType === 'consumer') {
        return product.merchant.role === 'admin';
      } else {
        return product.merchant.role === 'user';
      }
      // 或者排除特定role的商品
      // 目前暂时显示所有商品，您可以根据需要修改过滤规则
    });
  } catch (error) {
    console.error('过滤商品失败:', error);
    return products; // 过滤失败时返回原数据
  }
};

/**
 * 获取用户信息
 * @returns 用户信息对象
 */
export const getUserInfo = async (): Promise<any> => {
  try {
    // 先尝试从缓存获取
    const cachedUserInfo = uni.getStorageSync('userInfo');
    if (cachedUserInfo) {
      return JSON.parse(cachedUserInfo);
    }
    
    // 如果缓存没有，从接口获取
    const res = await userApi.getUserInfo();
    if (res && res.code === 0 && res.data) {
      // 缓存用户信息
      uni.setStorageSync('userInfo', JSON.stringify(res.data));
      return res.data;
    }
    
    return null;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}; 