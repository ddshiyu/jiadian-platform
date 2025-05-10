import type { RequestOptions, RequestResponse, LoginResponse, QueueItem } from '@/types/request';

const BASE_URL = import.meta.env.VITE_APP_BASE_API;

let isRefreshing = false; // 刷新标记
let requestsQueue: QueueItem[] = [];   // 请求队列

// 添加队列处理函数
const addToQueue = (options: RequestOptions, resolve: (value: any) => void, reject: (reason?: any) => void): void => {
  requestsQueue.push({ options, resolve, reject });
};

// 处理队列中的请求
const processQueue = (token: string): void => {
  requestsQueue.forEach(({ options, resolve, reject }) => {
    if (options) {
      // 处理请求队列
      resolve(baseRequest(options));
    } else {
      // 处理等待token的情况
      resolve(token);
    }
  });
  requestsQueue = [];
};

// 清空请求队列
const clearQueue = (): void => {
  requestsQueue.forEach(({ reject }) => {
    reject(new Error('Authentication failed'));
  });
  requestsQueue = [];
};

// 导出 request 函数
export const uniLogin = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: async (loginRes: UniNamespace.LoginRes) => {
        try {
          const { code } = loginRes;
          const result = await uni.request({
            url: BASE_URL + '/user/login',
            method: 'POST',
            data: { code }
          });
          const response = result as unknown as RequestResponse<LoginResponse>;
          console.log(response.data);
          if (response.statusCode === 200 && response.data && response.data.data.token) {
            resolve(response.data.data.token);
          } else {
            reject(new Error('登录失败: 无效的响应数据'));
          }
        } catch (err) {
          reject(err);
        }
      },
      fail: reject
    });
  });
};

// 基础请求方法
const baseRequest = async (options: RequestOptions): Promise<any> => {
  try {
    let token = uni.getStorageSync('token');
    // 无 Token 触发登录
    if (!token) {
      if (!isRefreshing) {
        token = await handleLoginBeforeRequest();
      } else {
        return new Promise((resolve, reject) => {
          addToQueue(options, resolve, reject);
        });
      }
    }

    return new Promise((resolve, reject) => {
      uni.request({
        url: BASE_URL + options.url,
        method: options.method || 'GET',
        header: {
          'Authorization': `Bearer ${token}`,
          ...options.header
        },
        data: options.data,
        success: (res) => {
          const response = res as unknown as RequestResponse;
          if (response.statusCode === 401) {
            if (!isRefreshing) {
              isRefreshing = true;
              refreshToken().then(() => {
                resolve(baseRequest(options));
              }).catch(err => {
                reject(err);
              });
            } else {
              addToQueue(options, resolve, reject);
            }
          } else {
            resolve(response.data);
          }
        },
        fail: reject
      });
    });
  } catch (err) {
    console.error('Request Error:', err);
    return Promise.reject(err);
  }
};

// Token 过期处理
const refreshToken = async (): Promise<string> => {
  isRefreshing = true;
  try {
    const newToken = await uniLogin(); // 执行登录逻辑
    uni.setStorageSync('token', newToken);
    processQueue(newToken); // 处理队列请求
    return newToken;
  } catch (err) {
    clearQueue(); // 清空队列
    throw err;
  } finally {
    isRefreshing = false;
  }
};

// 登录前置处理
const handleLoginBeforeRequest = async (): Promise<string> => {
  if (!isRefreshing) {
    isRefreshing = true;
    try {
      const token = await refreshToken();
      return token;
    } catch (err) {
      throw err;
    } finally {
      isRefreshing = false;
    }
  } else {
    return new Promise((resolve, reject) => {
      // 等待刷新完成后的token
      requestsQueue.push({
        resolve: (token: string) => resolve(token),
        reject
      });
    });
  }
};

export const http = {
  get: (url: string, data?: any) => baseRequest({ url, method: 'GET', data }),
  post: (url: string, data?: any) => baseRequest({ url, method: 'POST', data }),
  put: (url: string, data?: any) => baseRequest({ url, method: 'PUT', data }),
  delete: (url: string, data?: any) => baseRequest({ url, method: 'DELETE', data })
}; 