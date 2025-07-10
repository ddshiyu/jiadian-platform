<script lang="ts" setup>
import type { MerchantProfile, PaymentMethods } from '#/api/core/operation';

import { onMounted, reactive, ref } from 'vue';
import type { UploadChangeParam, UploadFile } from 'ant-design-vue/lib/upload/interface';

import { useAccessStore } from '@vben/stores';

import { InboxOutlined, PlusOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Image,
  Input,
  message,
  Modal,
  Popconfirm,
  Radio,
  RadioGroup,
  Table,
  TabPane,
  Tabs,
  Tag,
  Upload,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  addBankCardPaymentApi,
  addQRCodePaymentApi,
  deleteBankCardPaymentApi,
  deleteQRCodePaymentApi,
  getMerchantProfileApi,
  getPaymentMethodsApi,
  updateMerchantProfileApi,
} from '#/api/core/operation';

const accessStore = useAccessStore();

// 状态数据
const loading = ref(false);
const profileLoading = ref(false);
const paymentLoading = ref(false);
const profile = ref<MerchantProfile | null>(null);
const paymentMethods = ref<PaymentMethods>({ qrCodes: [], bankCards: [] });

// 编辑个人信息相关
const editProfileVisible = ref(false);
const profileForm = reactive({
  name: '',
  email: '',
  phone: '',
});

// 收款方式相关
const paymentModalVisible = ref(false);
const paymentType = ref<'bankCard' | 'qrCode'>('qrCode');
const qrCodeForm = reactive({
  type: 'alipay' as 'alipay' | 'other' | 'wechat',
  name: '',
  imageUrl: '',
});
const bankCardForm = reactive({
  bankName: '',
  cardNumber: '',
  accountName: '',
});

// 收款码表格列定义
const qrCodeColumns = [
  {
    title: '收款方式',
    dataIndex: 'type',
    key: 'type',
    customRender: ({ text }: { text: string }) => {
      const typeMap: Record<string, string> = {
        alipay: '支付宝',
        wechat: '微信',
        other: '其他',
      };
      return typeMap[text] || text;
    },
  },
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '二维码',
    dataIndex: 'imageUrl',
    key: 'imageUrl',
    customRender: ({ text }: { text: string }) => {
      return text ? '已上传' : '未上传';
    },
  },
  {
    title: '操作',
    key: 'action',
  },
];

// 银行卡表格列定义
const bankCardColumns = [
  {
    title: '银行名称',
    dataIndex: 'bankName',
    key: 'bankName',
  },
  {
    title: '卡号',
    dataIndex: 'cardNumber',
    key: 'cardNumber',
    customRender: ({ text }: { text: string }) => {
      // 隐藏卡号中间部分
      if (text && text.length > 8) {
        return `${text.slice(0, 4)}****${text.slice(-4)}`;
      }
      return text;
    },
  },
  {
    title: '开户姓名',
    dataIndex: 'accountName',
    key: 'accountName',
  },
  {
    title: '操作',
    key: 'action',
  },
];

// 方法定义
const formatDate = (date: string) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-';
};

const getRoleText = (role: string) => {
  const roleMap: Record<string, string> = {
    admin: '超级管理员',
    user: '普通管理员',
  };
  return roleMap[role] || role;
};

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    active: '启用',
    inactive: '禁用',
  };
  return statusMap[status] || status;
};

const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    active: 'green',
    inactive: 'red',
  };
  return colorMap[status] || 'default';
};

// 上传相关配置
const uploadHeaders = {
  Authorization: `Bearer ${accessStore.accessToken}`,
};
const uploadUrl = `${import.meta.env.VITE_BASE_URL}/upload/image`;

// 上传前校验
const beforeUpload = (file: UploadFile): boolean => {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!isJpgOrPng) {
    message.error('只能上传JPG或PNG格式的图片!');
  }
  let isLt2M = true;
  if (file.size !== undefined) {
    isLt2M = file.size / 1024 / 1024 < 2;
  }
  if (!isLt2M) {
    message.error('图片大小不能超过2MB!');
  }
  return isJpgOrPng && isLt2M;
};

// 获取管理员信息
const fetchProfile = async () => {
  try {
    profileLoading.value = true;
    const res = await getMerchantProfileApi();
    profile.value = res;
  } catch (error) {
    console.error('获取管理员信息失败:', error);
    message.error('获取管理员信息失败');
  } finally {
    profileLoading.value = false;
  }
};

// 获取收款方式列表
const fetchPaymentMethods = async () => {
  try {
    paymentLoading.value = true;
    const res = await getPaymentMethodsApi();
    paymentMethods.value = res.paymentMethods || { qrCodes: [], bankCards: [] };
  } catch (error) {
    console.error('获取收款方式失败:', error);
    message.error('获取收款方式失败');
  } finally {
    paymentLoading.value = false;
  }
};

// 编辑个人信息
const handleEditProfile = () => {
  if (profile.value) {
    profileForm.name = profile.value.name || '';
    profileForm.email = profile.value.email || '';
    profileForm.phone = profile.value.phone || '';
  }
  editProfileVisible.value = true;
};

// 保存个人信息
const handleSaveProfile = async () => {
  try {
    loading.value = true;
    await updateMerchantProfileApi(profileForm);
    message.success('个人信息更新成功');
    editProfileVisible.value = false;
    fetchProfile();
  } catch (error) {
    console.error('更新个人信息失败:', error);
    message.error('更新个人信息失败');
  } finally {
    loading.value = false;
  }
};

// 添加收款方式
const handleAddPayment = (type: 'bankCard' | 'qrCode') => {
  paymentType.value = type;
  // 重置表单
  qrCodeForm.type = 'alipay';
  qrCodeForm.name = '';
  qrCodeForm.imageUrl = '';
  bankCardForm.bankName = '';
  bankCardForm.cardNumber = '';
  bankCardForm.accountName = '';
  paymentModalVisible.value = true;
};

// 保存收款方式
const handleSavePayment = async () => {
  try {
    loading.value = true;

    if (paymentType.value === 'qrCode') {
      // 验证收款码表单
      if (!qrCodeForm.name || !qrCodeForm.imageUrl) {
        message.error('请填写完整的收款码信息');
        return;
      }
      const result = await addQRCodePaymentApi(qrCodeForm);
      paymentMethods.value = result.paymentMethods;
      message.success('收款码添加成功');
    } else {
      // 验证银行卡表单
      if (
        !bankCardForm.bankName ||
        !bankCardForm.cardNumber ||
        !bankCardForm.accountName
      ) {
        message.error('请填写完整的银行卡信息');
        return;
      }

      // 验证银行卡号格式（16-19位数字）
      const cardNumberClean = bankCardForm.cardNumber.replace(/\s/g, '');
      if (!/^\d{16,19}$/.test(cardNumberClean)) {
        message.error('银行卡号格式不正确，应为16-19位数字');
        return;
      }

      const result = await addBankCardPaymentApi(bankCardForm);
      paymentMethods.value = result.paymentMethods;
      message.success('银行卡添加成功');
    }

    paymentModalVisible.value = false;
  } catch (error) {
    console.error('保存收款方式失败:', error);
    message.error('保存收款方式失败');
  } finally {
    loading.value = false;
  }
};

// 删除收款码
const handleDeleteQRCode = async (index: number) => {
  try {
    const result = await deleteQRCodePaymentApi(index);
    paymentMethods.value = result.paymentMethods;
    message.success('收款码删除成功');
  } catch (error) {
    console.error('删除收款码失败:', error);
    message.error('删除收款码失败');
  }
};

// 删除银行卡
const handleDeleteBankCard = async (index: number) => {
  try {
    const result = await deleteBankCardPaymentApi(index);
    paymentMethods.value = result.paymentMethods;
    message.success('银行卡删除成功');
  } catch (error) {
    console.error('删除银行卡失败:', error);
    message.error('删除银行卡失败');
  }
};

// 文件上传处理
const handleUpload = (info: UploadChangeParam) => {
  if (info.file.status === 'uploading') {
    return;
  }

  if (info.file.status === 'done') {
    // 从响应中获取图片URL
    const response = info.file.response;
    if (response.code === 0) {
      qrCodeForm.imageUrl = `${import.meta.env.VITE_BASE_URL}${response.data.image.url}`;
      message.success('二维码上传成功');
    } else {
      message.error('二维码上传失败');
    }
  } else if (info.file.status === 'error') {
    message.error('二维码上传失败');
  }
};

// 初始化
onMounted(() => {
  fetchProfile();
  fetchPaymentMethods();
});
</script>

<template>
  <div class="profile-container">
    <!-- 个人信息卡片 -->
    <Card title="个人信息" :loading="profileLoading" class="mb-4">
      <template #extra>
        <Button type="primary" @click="handleEditProfile">编辑信息</Button>
      </template>

      <div v-if="profile">
        <Descriptions :column="2" bordered>
          <DescriptionsItem label="用户名">
            {{ profile.username }}
          </DescriptionsItem>
          <DescriptionsItem label="姓名">
            {{ profile.name || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="手机号">
            {{ profile.phone || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="邮箱">
            {{ profile.email || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="角色">
            {{ getRoleText(profile.role) }}
          </DescriptionsItem>
          <DescriptionsItem label="状态">
            <Tag :color="getStatusColor(profile.status)">
              {{ getStatusText(profile.status) }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="注册时间">
            {{ formatDate(profile.createdAt) }}
          </DescriptionsItem>
          <DescriptionsItem label="更新时间">
            {{ formatDate(profile.updatedAt) }}
          </DescriptionsItem>
        </Descriptions>
      </div>
    </Card>

    <!-- 收款方式卡片 -->
    <Card title="收款方式" :loading="paymentLoading">
      <template #extra>
        <div class="add-buttons">
          <Button
            type="primary"
            @click="handleAddPayment('qrCode')"
            class="mr-2"
          >
            添加收款码
          </Button>
          <Button type="primary" @click="handleAddPayment('bankCard')">
            添加银行卡
          </Button>
        </div>
      </template>

      <Tabs default-active-key="qrCode">
        <TabPane key="qrCode" tab="收款码">
          <div v-if="paymentMethods.qrCodes.length === 0" class="empty-state">
            <div class="empty-content">
              <InboxOutlined class="empty-icon" />
              <p class="empty-text">暂无收款码</p>
              <p class="empty-description">
                您可以添加支付宝、微信等收款二维码
              </p>
              <Button type="primary" @click="handleAddPayment('qrCode')">
                立即添加
              </Button>
            </div>
          </div>

          <Table
            v-else
            :columns="qrCodeColumns"
            :data-source="paymentMethods.qrCodes"
            :pagination="false"
            row-key="name"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'imageUrl'">
                <div
                  v-if="paymentMethods.qrCodes[index]?.imageUrl"
                  class="qr-preview-small"
                >
                  <Image
                    :src="paymentMethods.qrCodes[index].imageUrl"
                    alt="收款码"
                    :preview="true"
                  />
                </div>
                <span v-else>未上传</span>
              </template>
              <template v-if="column.key === 'action'">
                <Popconfirm
                  title="确定要删除这个收款码吗？"
                  @confirm="handleDeleteQRCode(index)"
                >
                  <Button type="link" size="small" danger>删除</Button>
                </Popconfirm>
              </template>
            </template>
          </Table>
        </TabPane>

        <TabPane key="bankCard" tab="银行卡">
          <div v-if="paymentMethods.bankCards.length === 0" class="empty-state">
            <div class="empty-content">
              <InboxOutlined class="empty-icon" />
              <p class="empty-text">暂无银行卡</p>
              <p class="empty-description">您可以添加银行卡信息用于收款</p>
              <Button type="primary" @click="handleAddPayment('bankCard')">
                立即添加
              </Button>
            </div>
          </div>

          <Table
            v-else
            :columns="bankCardColumns"
            :data-source="paymentMethods.bankCards"
            :pagination="false"
            row-key="cardNumber"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'action'">
                <Popconfirm
                  title="确定要删除这张银行卡吗？"
                  @confirm="handleDeleteBankCard(index)"
                >
                  <Button type="link" size="small" danger>删除</Button>
                </Popconfirm>
              </template>
            </template>
          </Table>
        </TabPane>
      </Tabs>
    </Card>

    <!-- 编辑个人信息弹窗 -->
    <Modal
      v-model:visible="editProfileVisible"
      title="编辑个人信息"
      width="600px"
      @ok="handleSaveProfile"
      :confirm-loading="loading"
    >
      <Form :model="profileForm" layout="vertical">
        <FormItem label="姓名">
          <Input v-model:value="profileForm.name" placeholder="请输入姓名" />
        </FormItem>
        <FormItem label="邮箱">
          <Input v-model:value="profileForm.email" placeholder="请输入邮箱" />
        </FormItem>
        <FormItem label="手机号">
          <Input v-model:value="profileForm.phone" placeholder="请输入手机号" />
        </FormItem>
      </Form>
    </Modal>

    <!-- 收款方式弹窗 -->
    <Modal
      v-model:visible="paymentModalVisible"
      :title="paymentType === 'qrCode' ? '添加收款码' : '添加银行卡'"
      width="600px"
      @ok="handleSavePayment"
      :confirm-loading="loading"
    >
      <!-- 收款码表单 -->
      <Form
        v-if="paymentType === 'qrCode'"
        :model="qrCodeForm"
        layout="vertical"
      >
        <FormItem label="收款方式类型" required>
          <RadioGroup v-model:value="qrCodeForm.type">
            <Radio value="alipay">支付宝</Radio>
            <Radio value="wechat">微信</Radio>
            <Radio value="other">其他</Radio>
          </RadioGroup>
        </FormItem>

        <FormItem label="名称" required>
          <Input
            v-model:value="qrCodeForm.name"
            placeholder="请输入收款码名称"
          />
        </FormItem>

        <FormItem label="收款二维码" required>
          <Upload
            name="image"
            list-type="picture-card"
            class="qr-uploader"
            :show-upload-list="false"
            :action="uploadUrl"
            :headers="uploadHeaders"
            :before-upload="beforeUpload"
            @change="handleUpload"
          >
            <div v-if="qrCodeForm.imageUrl" class="qr-preview">
              <Image
                :src="qrCodeForm.imageUrl"
                alt="收款码"
                :preview="true"
              />
            </div>
            <div v-else class="upload-button">
              <PlusOutlined />
              <div class="ant-upload-text">上传二维码</div>
            </div>
          </Upload>
        </FormItem>
      </Form>

      <!-- 银行卡表单 -->
      <Form v-else :model="bankCardForm" layout="vertical">
        <FormItem label="银行名称" required>
          <Input
            v-model:value="bankCardForm.bankName"
            placeholder="请输入银行名称"
          />
        </FormItem>

        <FormItem label="银行卡号" required>
          <Input
            v-model:value="bankCardForm.cardNumber"
            placeholder="请输入银行卡号"
            :maxlength="19"
          />
        </FormItem>

        <FormItem label="开户姓名" required>
          <Input
            v-model:value="bankCardForm.accountName"
            placeholder="请输入开户姓名"
          />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.profile-container {
  padding: 20px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mr-2 {
  margin-right: 8px;
}

.add-buttons {
  display: flex;
  gap: 8px;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  margin-bottom: 16px;
  font-size: 64px;
  color: #d9d9d9;
}

.empty-text {
  margin-bottom: 8px;
  font-size: 16px;
  color: #262626;
}

.empty-description {
  margin-bottom: 24px;
  font-size: 14px;
  color: #8c8c8c;
}

.qr-uploader .upload-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  cursor: pointer;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  transition: border-color 0.3s;
}

.qr-uploader .upload-button:hover {
  border-color: #1890ff;
}

.qr-preview :deep(.ant-image) {
  display: block;
}

.qr-preview :deep(.ant-image img) {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
}

.qr-preview-small :deep(.ant-image) {
  display: block;
}

.qr-preview-small :deep(.ant-image img) {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
}
</style>
