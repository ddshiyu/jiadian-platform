# 管理员用户接口VIP状态返回说明

## 概述
管理员用户相关接口现在会返回详细的VIP状态信息，包括VIP状态、到期时间和实时状态检查。

## 返回字段说明

### VIP相关字段
- `isVip`: 数据库中的VIP标记（boolean）
- `vipExpireDate`: VIP到期时间（ISO 8601格式）
- `vipStatus`: 实时VIP状态（string）
  - `"active"`: VIP有效
  - `"expired"`: VIP已过期
  - `"none"`: 非VIP用户
- `isVipActive`: 当前VIP是否有效（boolean）
- `vipStatusNote`: VIP状态备注（可选，string）

## 接口返回示例

### 1. 获取用户列表 - VIP用户
```http
GET /admin/mini-users/page
```

**响应示例**:
```json
{
  "data": [
    {
      "id": 123,
      "nickname": "张三",
      "gender": "男",
      "avatar": "/static/avatar/123.jpg",
      "phone": "13800138000",
      "age": 25,
      "openid": "wx_openid_123",
      "createdAt": "2023-12-01T08:00:00.000Z",
      "updatedAt": "2023-12-25T10:30:00.000Z",
      "userType": "consumer",
      "isVip": true,
      "vipExpireDate": "2024-12-25T08:30:00.000Z",
      "vipStatus": "active",
      "isVipActive": true
    },
    {
      "id": 124,
      "nickname": "李四",
      "gender": "女",
      "avatar": "/static/avatar/124.jpg",
      "phone": "13800138001",
      "age": 28,
      "openid": "wx_openid_124",
      "createdAt": "2023-11-01T08:00:00.000Z",
      "updatedAt": "2023-12-20T15:20:00.000Z",
      "userType": "supplier",
      "isVip": true,
      "vipExpireDate": "2023-12-20T08:30:00.000Z",
      "vipStatus": "expired",
      "isVipActive": false,
      "vipStatusNote": "VIP已过期，建议更新状态"
    },
    {
      "id": 125,
      "nickname": "王五",
      "gender": "男",
      "avatar": "/static/avatar/125.jpg",
      "phone": "13800138002",
      "age": 30,
      "openid": "wx_openid_125",
      "createdAt": "2023-12-15T08:00:00.000Z",
      "updatedAt": "2023-12-15T08:00:00.000Z",
      "userType": "consumer",
      "isVip": false,
      "vipExpireDate": null,
      "vipStatus": "none",
      "isVipActive": false
    }
  ],
  "pageNum": 1,
  "pageSize": 10,
  "total": 3,
  "totalPages": 1
}
```

### 2. 获取用户详情 - 包含VIP信息
```http
GET /admin/mini-users/123
```

**响应示例**:
```json
{
  "id": 123,
  "nickname": "张三",
  "gender": "男",
  "avatar": "/static/avatar/123.jpg",
  "phone": "13800138000",
  "age": 25,
  "openid": "wx_openid_123",
  "createdAt": "2023-12-01T08:00:00.000Z",
  "updatedAt": "2023-12-25T10:30:00.000Z",
  "userType": "consumer",
  "isVip": true,
  "vipExpireDate": "2024-12-25T08:30:00.000Z",
  "vipStatus": "active",
  "isVipActive": true,
  "Addresses": [
    {
      "id": 1,
      "name": "张三",
      "phone": "13800138000",
      "province": "广东省",
      "city": "深圳市",
      "district": "南山区",
      "detail": "科技园南区",
      "isDefault": true
    }
  ],
  "Orders": [
    {
      "id": 1,
      "orderNo": "202312251234567890",
      "totalAmount": "99.00",
      "status": "completed",
      "createdAt": "2023-12-20T08:30:00.000Z"
    }
  ]
}
```

### 3. VIP过期用户示例
```json
{
  "id": 124,
  "nickname": "李四",
  "gender": "女",
  "avatar": "/static/avatar/124.jpg",
  "phone": "13800138001",
  "age": 28,
  "openid": "wx_openid_124",
  "createdAt": "2023-11-01T08:00:00.000Z",
  "updatedAt": "2023-12-20T15:20:00.000Z",
  "userType": "supplier",
  "isVip": true,
  "vipExpireDate": "2023-12-20T08:30:00.000Z",
  "vipStatus": "expired",
  "isVipActive": false,
  "vipStatusNote": "VIP已过期，建议更新状态",
  "Addresses": [],
  "Orders": []
}
```

## VIP状态判断逻辑

### 状态判断规则
1. **active**: `isVip = true` 且 `vipExpireDate > 当前时间`
2. **expired**: `isVip = true` 且 `vipExpireDate <= 当前时间`
3. **none**: `isVip = false` 或 `vipExpireDate = null`

### 实时状态检查
- 每次请求都会实时检查VIP到期状态
- 不会自动更新数据库中的VIP状态，但会在返回数据中标注状态
- 过期用户会显示 `vipStatusNote` 提示管理员处理

## 前端使用建议

### 1. VIP状态显示
```javascript
// 根据vipStatus显示不同的标签
function getVipStatusTag(user) {
  switch(user.vipStatus) {
    case 'active':
      return '<span class="vip-active">VIP有效</span>';
    case 'expired':
      return '<span class="vip-expired">VIP已过期</span>';
    case 'none':
      return '<span class="vip-none">普通用户</span>';
    default:
      return '<span class="vip-unknown">未知状态</span>';
  }
}
```

### 2. VIP到期时间显示
```javascript
// 格式化VIP到期时间
function formatVipExpireDate(user) {
  if (!user.vipExpireDate) {
    return '无';
  }

  const expireDate = new Date(user.vipExpireDate);
  const now = new Date();
  const diffDays = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `${expireDate.toLocaleDateString()} (还有${diffDays}天)`;
  } else {
    return `${expireDate.toLocaleDateString()} (已过期${Math.abs(diffDays)}天)`;
  }
}
```

### 3. 操作按钮显示
```javascript
// 根据VIP状态显示不同的操作按钮
function getVipActionButtons(user) {
  if (user.vipStatus === 'none') {
    return '<button onclick="setVip(' + user.id + ')">开通VIP</button>';
  } else if (user.vipStatus === 'expired') {
    return '<button onclick="renewVip(' + user.id + ')">续费VIP</button>';
  } else {
    return '<button onclick="extendVip(' + user.id + ')">延长VIP</button>';
  }
}
```

## 注意事项
1. `isVip` 字段反映数据库中的状态，可能与实际有效性不符
2. `isVipActive` 字段反映当前实际的VIP有效性
3. 建议使用 `vipStatus` 和 `isVipActive` 进行业务逻辑判断
4. 过期用户的处理需要管理员手动操作或系统定时任务处理
