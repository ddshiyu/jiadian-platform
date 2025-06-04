# 管理员收款方式管理文档

## 概述
管理员用户现在支持配置多种收款方式，包括收款码（微信、支付宝等）和银行卡信息。收款方式以JSON格式存储，支持灵活的配置和管理。

## 数据结构

### paymentMethods 字段结构
```json
{
  "qrCodes": [
    {
      "type": "wechat",
      "name": "微信收款码",
      "imageUrl": "/static/qrcodes/wechat_123.jpg",
      "description": "个人微信收款码",
      "isActive": true
    },
    {
      "type": "alipay",
      "name": "支付宝收款码",
      "imageUrl": "/static/qrcodes/alipay_123.jpg",
      "description": "个人支付宝收款码",
      "isActive": true
    },
    {
      "type": "other",
      "name": "银联云闪付",
      "imageUrl": "/static/qrcodes/unionpay_123.jpg",
      "description": "银联云闪付收款码",
      "isActive": false
    }
  ],
  "bankCards": [
    {
      "bankName": "中国工商银行",
      "cardNumber": "6222 0202 0000 1234",
      "accountName": "张三",
      "branchName": "深圳南山支行",
      "description": "主要收款账户",
      "isActive": true
    },
    {
      "bankName": "中国建设银行",
      "cardNumber": "4367 4200 0000 5678",
      "accountName": "张三",
      "branchName": "深圳科技园支行",
      "description": "备用收款账户",
      "isActive": false
    }
  ]
}
```

### 字段说明

#### 收款码 (qrCodes)
- `type`: 收款码类型，枚举值：`wechat`、`alipay`、`other`
- `name`: 收款码名称
- `imageUrl`: 收款码图片URL
- `description`: 收款码描述（可选）
- `isActive`: 是否启用（可选，默认true）

#### 银行卡 (bankCards)
- `bankName`: 银行名称
- `cardNumber`: 银行卡号（支持空格分隔）
- `accountName`: 账户名称
- `branchName`: 开户行支行名称（可选）
- `description`: 账户描述（可选）
- `isActive`: 是否启用（可选，默认true）

## 使用示例

### 1. 创建管理员时设置收款方式
```javascript
const AdminUser = require('./models/admin/AdminUser');

const adminUser = await AdminUser.create({
  username: 'merchant001',
  password: 'password123',
  name: '张三',
  email: 'zhangsan@example.com',
  phone: '13800138000',
  role: 'user',
  paymentMethods: {
    qrCodes: [
      {
        type: 'wechat',
        name: '微信收款码',
        imageUrl: '/static/qrcodes/wechat_001.jpg',
        description: '个人微信收款码'
      }
    ],
    bankCards: [
      {
        bankName: '中国工商银行',
        cardNumber: '6222 0202 0000 1234',
        accountName: '张三',
        branchName: '深圳南山支行'
      }
    ]
  }
});
```

### 2. 更新收款方式
```javascript
// 获取管理员用户
const admin = await AdminUser.findByPk(1);

// 添加新的收款码
admin.addPaymentMethod('qrCode', {
  type: 'alipay',
  name: '支付宝收款码',
  imageUrl: '/static/qrcodes/alipay_001.jpg',
  description: '个人支付宝收款码'
});

// 添加新的银行卡
admin.addPaymentMethod('bankCard', {
  bankName: '中国建设银行',
  cardNumber: '4367 4200 0000 5678',
  accountName: '张三',
  branchName: '深圳科技园支行'
});

// 保存更改
await admin.save();
```

### 3. 删除收款方式
```javascript
// 删除第一个收款码
admin.removePaymentMethod('qrCode', 0);

// 删除第一个银行卡
admin.removePaymentMethod('bankCard', 0);

// 保存更改
await admin.save();
```

### 4. 获取收款方式
```javascript
const paymentMethods = admin.getPaymentMethods();
console.log('收款码:', paymentMethods.qrCodes);
console.log('银行卡:', paymentMethods.bankCards);
```

## API接口示例

### 1. 更新收款方式接口
```javascript
// routes/admin/profile.js
router.put('/payment-methods', adminAuth, async (req, res) => {
  try {
    const { paymentMethods } = req.body;
    const adminId = req.user.id;

    const admin = await AdminUser.findByPk(adminId);
    if (!admin) {
      return res.status(404).json({ message: '管理员不存在' });
    }

    admin.paymentMethods = paymentMethods;
    await admin.save();

    res.json({
      message: '收款方式更新成功',
      paymentMethods: admin.paymentMethods
    });
  } catch (error) {
    res.status(400).json({
      message: '更新失败',
      error: error.message
    });
  }
});
```

### 2. 获取收款方式接口
```javascript
router.get('/payment-methods', adminAuth, async (req, res) => {
  try {
    const adminId = req.user.id;

    const admin = await AdminUser.findByPk(adminId, {
      attributes: ['id', 'name', 'paymentMethods']
    });

    if (!admin) {
      return res.status(404).json({ message: '管理员不存在' });
    }

    res.json({
      paymentMethods: admin.getPaymentMethods()
    });
  } catch (error) {
    res.status(500).json({
      message: '获取收款方式失败',
      error: error.message
    });
  }
});
```

### 3. 添加单个收款方式接口
```javascript
router.post('/payment-methods/:type', adminAuth, async (req, res) => {
  try {
    const { type } = req.params; // 'qrCode' 或 'bankCard'
    const data = req.body;
    const adminId = req.user.id;

    const admin = await AdminUser.findByPk(adminId);
    if (!admin) {
      return res.status(404).json({ message: '管理员不存在' });
    }

    admin.addPaymentMethod(type, data);
    await admin.save();

    res.json({
      message: '收款方式添加成功',
      paymentMethods: admin.getPaymentMethods()
    });
  } catch (error) {
    res.status(400).json({
      message: '添加失败',
      error: error.message
    });
  }
});
```

## 前端使用示例

### 1. 收款码上传组件
```javascript
// 上传收款码
async function uploadQRCode(file, type) {
  // 先上传图片
  const formData = new FormData();
  formData.append('image', file);

  const uploadResponse = await fetch('/upload/image', {
    method: 'POST',
    body: formData
  });

  const uploadResult = await uploadResponse.json();

  // 添加收款码
  const qrCodeData = {
    type: type, // 'wechat', 'alipay', 'other'
    name: `${type === 'wechat' ? '微信' : type === 'alipay' ? '支付宝' : '其他'}收款码`,
    imageUrl: uploadResult.image.url,
    description: '收款码'
  };

  const response = await fetch('/admin/payment-methods/qrCode', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(qrCodeData)
  });

  return response.json();
}
```

### 2. 银行卡信息表单
```html
<form id="bankCardForm">
  <input type="text" name="bankName" placeholder="银行名称" required>
  <input type="text" name="cardNumber" placeholder="银行卡号" required>
  <input type="text" name="accountName" placeholder="账户名称" required>
  <input type="text" name="branchName" placeholder="开户行支行">
  <textarea name="description" placeholder="账户描述"></textarea>
  <button type="submit">添加银行卡</button>
</form>

<script>
document.getElementById('bankCardForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const bankCardData = Object.fromEntries(formData);

  const response = await fetch('/admin/payment-methods/bankCard', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(bankCardData)
  });

  const result = await response.json();
  console.log('银行卡添加结果:', result);
});
</script>
```

## 数据验证规则

### 收款码验证
- `type` 必须是 `wechat`、`alipay` 或 `other`
- `imageUrl` 必须是有效的图片URL
- `name` 不能为空

### 银行卡验证
- `cardNumber` 必须是16-19位数字（可包含空格）
- `bankName` 和 `accountName` 不能为空
- 自动验证银行卡号格式

## 注意事项

1. **数据安全**: 银行卡号等敏感信息需要妥善保护
2. **图片存储**: 收款码图片建议存储在安全的文件服务器上
3. **数据备份**: 重要的收款信息建议定期备份
4. **权限控制**: 只有管理员本人可以修改自己的收款方式
5. **数据验证**: 前端和后端都需要进行数据格式验证
6. **状态管理**: 可以通过 `isActive` 字段控制收款方式的启用状态
