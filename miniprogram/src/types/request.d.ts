// 请求配置接口
export interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
}

// 请求响应接口
export interface RequestResponse<T = any> {
  statusCode: number;
  data: T;
}

// 登录响应接口
export interface LoginResponse {
  data: {
    token: string;
  };
}

// 请求队列项接口
export interface QueueItem {
  options?: RequestOptions;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
} 