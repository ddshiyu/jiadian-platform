# 用户发货功能使用指南

## 概述
本文档介绍如何使用系统的发货功能，包括设置物流信息和上传发货凭证图片。

## 接口说明

### 1. 普通用户发货接口
- **URL**: `/orders/:id/ship`
- **方法**: PUT
- **认证**: 需要管理员权限
- **参数**:
  - `trackingNumber`: 物流单号（可选）
  - `trackingCompany`: 物流公司（可选）
  - `deliveryImages`: 发货凭证图片URL数组（可选，需要先调用图片上传接口获取）

### 2. 管理员发货接口
- **URL**: `/admin/orders/:id/ship`
- **方法**: PUT
- **认证**: 需要管理员或商家身份认证
- **参数**:
  - `trackingNumber`: 物流单号（可选）
  - `trackingCompany`: 物流公司（可选）
  - `deliveryImages`: 发货凭证图片URL数组（可选，需要先调用图片上传接口获取）

## 使用步骤

### 步骤一：准备发货图片
首先需要上传发货凭证图片。系统支持三种图片上传方式：

#### 方式1：单张图片上传
1. 调用图片上传接口
```
POST /upload/image
Content-Type: multipart/form-data

{
  "image": [图片文件]
}
```

2. 获取返回的图片URL
```json
{
  "message": "图片上传成功",
  "image": {
    "url": "/static/20231225/a1b2c3d4.jpg",
    "filename": "a1b2c3d4.jpg",
    "originalname": "发货凭证.jpg",
    "mimetype": "image/jpeg",
    "size": 102400
  }
}
```

#### 方式2：多张图片上传
1. 调用多张图片上传接口
```
POST /upload/files
Content-Type: multipart/form-data

{
  "files": [图片文件1, 图片文件2, ...]
}
```

2. 获取返回的图片URL数组
```json
{
  "message": "文件上传成功",
  "files": [
    {
      "url": "/static/20231225/a1b2c3d4.jpg",
      "filename": "a1b2c3d4.jpg",
      "originalname": "发货凭证1.jpg",
      "mimetype": "image/jpeg",
      "size": 102400
    },
    {
      "url": "/static/20231225/e5f6g7h8.jpg",
      "filename": "e5f6g7h8.jpg",
      "originalname": "发货凭证2.jpg",
      "mimetype": "image/jpeg",
      "size": 98765
    }
  ]
}
```

#### 方式3：Base64编码图片
1. 调用Base64图片上传接口
```
POST /upload/base64
Content-Type: application/json

{
  "base64Data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
  "filename": "发货凭证"
}
```

### 步骤二：调用发货接口

#### 普通用户发货示例
```
PUT /orders/123/ship
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "trackingNumber": "SF1234567890",
  "trackingCompany": "顺丰快递",
  "deliveryImages": [
    "/static/20231225/a1b2c3d4.jpg",
    "/static/20231225/e5f6g7h8.jpg"
  ]
}
```

#### 管理员发货示例
```
PUT /admin/orders/123/ship
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "trackingNumber": "SF1234567890",
  "trackingCompany": "顺丰快递",
  "deliveryImages": [
    "/static/20231225/a1b2c3d4.jpg",
    "/static/20231225/e5f6g7h8.jpg"
  ]
}
```

### 步骤三：处理返回结果
发货成功后，接口将返回更新后的订单信息：

```json
{
  "message": "订单已发货",
  "order": {
    "id": 123,
    "orderNo": "202312251234567890",
    "status": "delivered",
    "deliveryTime": "2023-12-25T08:30:00.000Z",
    "trackingNumber": "SF1234567890",
    "trackingCompany": "顺丰快递",
    "deliveryImages": [
      "/static/20231225/a1b2c3d4.jpg",
      "/static/20231225/e5f6g7h8.jpg"
    ]
  }
}
```

## 注意事项

1. 只有管理员用户或者特定商家才能为订单发货
2. 只有状态为"待发货"(`pending_delivery`)的订单可以执行发货操作
3. 图片格式仅支持jpg、png、gif、webp
4. 单张图片大小限制为5MB，多张图片上传最多支持10张
5. 发货后订单状态会自动变更为"已发货"(`delivered`)
6. 物流信息和发货图片都是可选的，但建议至少提供其中一项
7. 商家只能为自己的订单发货，不能为其他商家的订单发货
8. 发货操作不可撤销，请确认信息无误后再提交
