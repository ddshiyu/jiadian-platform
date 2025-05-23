# 订单物流信息与发货凭证显示指南

## 概述
订单系统已升级，现在支持显示物流信息和多张发货凭证图片。本文档说明如何在前端获取和展示这些信息。

## 数据结构
订单对象新增了以下字段：
- `trackingNumber`：物流单号
- `trackingCompany`：物流公司名称
- `deliveryImages`：发货凭证图片URL数组
- `deliveryTime`：发货时间

## 获取物流信息
### 订单列表接口
- **接口**: `/orders?page=1&pageSize=10`
- **返回示例**:
```json
{
  "data": [
    {
      "id": 29,
      "orderNo": "202312251234567890",
      "totalAmount": "128.00",
      "status": "delivered",
      "trackingNumber": "SF1234567890",
      "trackingCompany": "顺丰快递",
      "deliveryImages": ["/static/20231225/image1.jpg", "/static/20231225/image2.jpg"],
      "deliveryTime": "2023-12-25T14:30:00.000Z",
      ...
    }
  ],
  "total": 20,
  "current": 1,
  "pageSize": 10,
  "totalPages": 2
}
```

### 订单详情接口
- **接口**: `/orders/29`
- **返回示例**:
```json
{
  "id": 29,
  "orderNo": "202312251234567890",
  "totalAmount": "128.00",
  "status": "delivered",
  "trackingNumber": "SF1234567890",
  "trackingCompany": "顺丰快递",
  "deliveryImages": ["/static/20231225/image1.jpg", "/static/20231225/image2.jpg"],
  "deliveryTime": "2023-12-25T14:30:00.000Z",
  "OrderItems": [
    {
      "id": 45,
      "productId": 12,
      "productName": "智能电饭煲",
      "price": "128.00",
      "quantity": 1,
      "Product": {
        "id": 12,
        "name": "智能电饭煲",
        "cover": "/static/products/rice-cooker.jpg",
        "price": "128.00"
      }
    }
  ],
  ...
}
```

## 前端展示
### 订单状态为已发货(delivered)时的物流信息展示

#### 订单详情页示例：
```jsx
const OrderDetail = ({ order }) => {
  // 判断是否为已发货状态且有物流信息
  const hasLogistics = order.status === 'delivered' && (order.trackingNumber || order.trackingCompany);

  return (
    <div className="order-detail">
      <div className="order-status">订单状态: {getStatusText(order.status)}</div>

      {/* 物流信息区块 */}
      {hasLogistics && (
        <div className="logistics-info">
          <h3>物流信息</h3>
          {order.trackingCompany && <div>物流公司: {order.trackingCompany}</div>}
          {order.trackingNumber && <div>物流单号: {order.trackingNumber}</div>}
          {order.deliveryTime && <div>发货时间: {formatDate(order.deliveryTime)}</div>}

          {/* 发货凭证图片 */}
          {order.deliveryImages && order.deliveryImages.length > 0 && (
            <div className="delivery-images">
              <h4>发货凭证</h4>
              <div className="image-gallery">
                {order.deliveryImages.map((img, index) => (
                  <div key={index} className="image-item">
                    <img
                      src={img}
                      alt={`发货凭证${index + 1}`}
                      onClick={() => openImageViewer(img)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 其他订单信息 */}
      <div className="order-items">
        {/* 订单商品列表 */}
      </div>
    </div>
  );
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 状态文本转换
const getStatusText = (status) => {
  const statusMap = {
    'pending_payment': '待付款',
    'pending_delivery': '待发货',
    'delivered': '已发货',
    'completed': '已完成',
    'cancelled': '已取消',
    'refund_pending': '退款申请中',
    'refund_processing': '退款处理中',
    'refund_approved': '退款已通过',
    'refund_rejected': '退款已拒绝'
  };
  return statusMap[status] || status;
};
```

### 图片查看器组件

可以使用类似 [react-image-lightbox](https://www.npmjs.com/package/react-image-lightbox) 组件来实现点击查看大图功能：

```jsx
import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';

const OrderDetail = ({ order }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  // ... 其他代码

  // 打开图片查看器
  const openImageViewer = (img) => {
    const index = order.deliveryImages.indexOf(img);
    setPhotoIndex(index >= 0 ? index : 0);
    setIsOpen(true);
  };

  return (
    <div className="order-detail">
      {/* ... 其他代码 */}

      {/* 图片查看器 */}
      {isOpen && order.deliveryImages && order.deliveryImages.length > 0 && (
        <Lightbox
          mainSrc={order.deliveryImages[photoIndex]}
          nextSrc={order.deliveryImages[(photoIndex + 1) % order.deliveryImages.length]}
          prevSrc={order.deliveryImages[(photoIndex + order.deliveryImages.length - 1) % order.deliveryImages.length]}
          onCloseRequest={() => setIsOpen(false)}
          onMovePrevRequest={() => setPhotoIndex((photoIndex + order.deliveryImages.length - 1) % order.deliveryImages.length)}
          onMoveNextRequest={() => setPhotoIndex((photoIndex + 1) % order.deliveryImages.length)}
        />
      )}
    </div>
  );
};
```

## 样式建议

```css
/* 物流信息区块 */
.logistics-info {
  margin: 15px 0;
  padding: 15px;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.logistics-info h3 {
  margin-top: 0;
  font-size: 16px;
  color: #333;
}

.logistics-info div {
  margin: 8px 0;
  color: #666;
}

/* 发货凭证图片区域 */
.delivery-images {
  margin-top: 15px;
}

.delivery-images h4 {
  font-size: 14px;
  margin-bottom: 10px;
  color: #333;
}

.image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.image-item {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #eee;
  transition: all 0.3s ease;
}

.image-item:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

## 注意事项
1. 确保图片URL前缀正确，系统返回的URL格式为 `/static/日期/文件名`，可能需要根据环境拼接完整URL
2. 在移动端展示时，可以考虑减小图片缩略图尺寸，但保持点击查看大图的功能
3. 对于物流信息，可以考虑添加"复制物流单号"功能，方便用户追踪物流
4. 系统返回的 `deliveryImages` 可能为 `null`，前端需要做好兼容处理
