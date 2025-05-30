# 管理员VIP用户管理接口文档

## 概述
本文档介绍管理员如何为小程序用户设置VIP状态，包括开通新VIP和延长现有VIP时长。

## 接口详情

### 设置用户VIP状态
- **URL**: `/admin/mini-users/:id/vip`
- **方法**: PUT
- **认证**: 需要管理员权限
- **参数**:
  - `id` (路径参数): 用户ID
  - `duration` (可选): VIP时长，单位为月，默认12个月
  - `remark` (可选): 备注信息

## 使用示例

### 1. 为用户开通12个月VIP（默认）
```http
PUT /admin/mini-users/123/vip
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "remark": "新用户福利"
}
```

### 2. 为用户开通指定时长VIP
```http
PUT /admin/mini-users/123/vip
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "duration": 6,
  "remark": "半年VIP体验"
}
```

### 3. 为现有VIP用户延长时长
```http
PUT /admin/mini-users/123/vip
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "duration": 3,
  "remark": "VIP延期3个月"
}
```

## 返回结果

### 成功响应
```json
{
  "message": "用户VIP已设置成功，有效期至 2024/12/25",
  "user": {
    "id": 123,
    "nickname": "张三",
    "isVip": true,
    "vipExpireDate": "2024-12-25T08:30:00.000Z"
  },
  "operation": {
    "duration": 12,
    "remark": "管理员手动设置",
    "operatedAt": "2023-12-25T08:30:00.000Z"
  }
}
```

### 错误响应
```json
{
  "message": "用户不存在"
}
```

```json
{
  "message": "VIP时长必须是正整数（月数）"
}
```

## 业务逻辑说明

### VIP时长计算规则
1. **新用户开通VIP**: 从当前时间开始计算，增加指定月数
2. **现有VIP用户延长**:
   - 如果VIP未过期：在现有到期时间基础上增加指定月数
   - 如果VIP已过期：从当前时间开始重新计算

### 示例场景
假设当前时间是 2023-12-25：

1. **用户A（非VIP）开通12个月VIP**:
   - VIP到期时间：2024-12-25

2. **用户B（VIP到期时间：2024-06-25）延长6个月**:
   - 新的VIP到期时间：2024-12-25

3. **用户C（VIP已过期：2023-10-25）重新开通3个月**:
   - 新的VIP到期时间：2024-03-25

## 权限要求
- 只有具有管理员权限的用户才能调用此接口
- 需要在请求头中提供有效的管理员Token

## 注意事项
1. VIP时长必须是正整数，单位为月
2. 系统会自动处理VIP延期逻辑，无需手动计算到期时间
3. 操作会记录在返回结果中，便于审计
4. 所有VIP操作都使用数据库事务，确保数据一致性
5. 建议在备注中说明设置VIP的原因，便于后续管理

## 相关接口
- 获取用户详情: `GET /admin/mini-users/:id`
- 获取用户列表: `GET /admin/mini-users/page`
- 用户身份切换: `PUT /admin/mini-users/:id/user-type`
