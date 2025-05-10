// Banner 数据结构
export interface Banner {
  id: number;
  image: string;
  productId: number;
}

// 分类数据结构
export interface Category {
  id: number;
  name: string;
  icon: string;
}

// 商品数据结构
export interface Product {
  id: number;
  name: string;
  cover: string;
  price: number;
  originalPrice?: number;
} 