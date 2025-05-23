# 发货接口增强说明

## 新增功能
1. 支持物流单号和物流公司
2. 支持上传多张发货凭证图片

## 接口说明

### 1. 发货接口
- **URL**: `/admin/orders/:id/ship`
- **方法**: PUT
- **认证**: 需要管理员或商家身份认证
- **参数**:
  - `trackingNumber`: 物流单号（可选）
  - `trackingCompany`: 物流公司（可选）
  - `deliveryImages`: 发货凭证图片URL数组（可选，需要先调用图片上传接口获取）

### 2. 单张图片上传接口
- **URL**: `/upload/image`
- **方法**: POST
- **认证**: 需要token认证
- **Content-Type**: `multipart/form-data`
- **参数**:
  - `image`: 图片文件（支持jpg、png、gif、webp格式，大小限制5MB）

### 3. 多张图片上传接口
- **URL**: `/upload/files`
- **方法**: POST
- **认证**: 需要token认证
- **Content-Type**: `multipart/form-data`
- **参数**:
  - `files`: 多个图片文件（最多10个，支持jpg、png、gif、webp格式，大小限制5MB）

## 使用方式

### 方式一：单张图片上传
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

3. 调用发货接口
```
PUT /admin/orders/123/ship
Content-Type: application/json

{
  "trackingNumber": "SF1234567890",
  "trackingCompany": "顺丰快递",
  "deliveryImages": ["/static/20231225/a1b2c3d4.jpg"]
}
```

### 方式二：多张图片上传
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

3. 调用发货接口，传入图片URL数组
```
PUT /admin/orders/123/ship
Content-Type: application/json

{
  "trackingNumber": "SF1234567890",
  "trackingCompany": "顺丰快递",
  "deliveryImages": [
    "/static/20231225/a1b2c3d4.jpg",
    "/static/20231225/e5f6g7h8.jpg"
  ]
}
```

### 方式三：Base64编码图片
1. 调用Base64图片上传接口，可以多次调用上传多张图片
```
POST /upload/base64
Content-Type: application/json

{
  "base64Data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
  "filename": "发货凭证"
}
```

2. 获取返回的图片URL，收集多个URL后调用发货接口，同方式二第3步

## 返回示例
```json
{
  "message": "订单已发货",
  "status": "delivered",
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
1. 图片格式仅支持jpg、png、gif、webp
2. 单张图片大小限制为5MB，多张图片上传最多支持10张
3. 只有待发货状态的订单可以执行发货操作
4. 商家只能为自己的订单发货
5. 传入单个图片URL时，系统会自动转换为数组格式处理
