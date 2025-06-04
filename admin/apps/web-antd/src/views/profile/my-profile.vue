<script lang="ts" setup>
import type { MerchantProfile, PaymentMethod } from '#/api/core/operation';

import { onMounted, reactive, ref } from 'vue';

import { InboxOutlined, PlusOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Radio,
  RadioGroup,
  Table,
  Tag,
  Upload,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  addPaymentMethodApi,
  deletePaymentMethodApi,
  getMerchantProfileApi,
  getPaymentMethodsApi,
  setDefaultPaymentMethodApi,
  updateMerchantProfileApi,
  updatePaymentMethodApi,
} from '#/api/core/operation';

// 状态数据
const loading = ref(false);
const profileLoading = ref(false);
const paymentLoading = ref(false);
const profile = ref<MerchantProfile | null>(null);
const paymentMethods = ref<PaymentMethod[]>([]);

// 编辑个人信息相关
const editProfileVisible = ref(false);
const profileForm = reactive({
  name: '',
  email: '',
  phone: '',
});

// 收款方式相关
const paymentModalVisible = ref(false);
const editingPayment = ref<null | PaymentMethod>(null);
const paymentForm = reactive({
  type: 'alipay' as 'alipay' | 'bank' | 'wechat',
  name: '',
  account: '',
  qrCode: '',
  bankName: '',
});

// 表格列定义
const paymentColumns = [
  {
    title: '收款方式',
    dataIndex: 'type',
    key: 'type',
    customRender: ({ text }: { text: string }) => {
      const typeMap: Record<string, string> = {
        alipay: '支付宝',
        wechat: '微信',
        bank: '银行卡',
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
    title: '账号',
    dataIndex: 'account',
    key: 'account',
  },
  {
    title: '银行名称',
    dataIndex: 'bankName',
    key: 'bankName',
    customRender: ({ text }: { text: string }) => text || '-',
  },
  {
    title: '状态',
    dataIndex: 'isDefault',
    key: 'isDefault',
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
    paymentMethods.value = res;
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
const handleAddPayment = () => {
  editingPayment.value = null;
  paymentForm.type = 'alipay';
  paymentForm.name = '';
  paymentForm.account = '';
  paymentForm.qrCode = '';
  paymentForm.bankName = '';
  paymentModalVisible.value = true;
};

// 编辑收款方式
const handleEditPayment = (record: PaymentMethod) => {
  editingPayment.value = record;
  paymentForm.type = record.type;
  paymentForm.name = record.name;
  paymentForm.account = record.account;
  paymentForm.qrCode = record.qrCode || '';
  paymentForm.bankName = record.bankName || '';
  paymentModalVisible.value = true;
};

// 保存收款方式
const handleSavePayment = async () => {
  try {
    loading.value = true;
    const data = {
      type: paymentForm.type,
      name: paymentForm.name,
      account: paymentForm.account,
      qrCode: paymentForm.qrCode,
      bankName: paymentForm.bankName,
    };

    if (editingPayment.value) {
      await updatePaymentMethodApi(editingPayment.value.id!, data);
      message.success('收款方式更新成功');
    } else {
      await addPaymentMethodApi(data);
      message.success('收款方式添加成功');
    }

    paymentModalVisible.value = false;
    fetchPaymentMethods();
  } catch (error) {
    console.error('保存收款方式失败:', error);
    message.error('保存收款方式失败');
  } finally {
    loading.value = false;
  }
};

// 删除收款方式
const handleDeletePayment = async (record: PaymentMethod) => {
  try {
    await deletePaymentMethodApi(record.id!);
    message.success('收款方式删除成功');
    fetchPaymentMethods();
  } catch (error) {
    console.error('删除收款方式失败:', error);
    message.error('删除收款方式失败');
  }
};

// 设置默认收款方式
const handleSetDefault = async (record: PaymentMethod) => {
  try {
    await setDefaultPaymentMethodApi(record.id!);
    message.success('默认收款方式设置成功');
    fetchPaymentMethods();
  } catch (error) {
    console.error('设置默认收款方式失败:', error);
    message.error('设置默认收款方式失败');
  }
};

// 文件上传处理
const handleUpload = (info: any) => {
  const { status } = info.file;
  if (status === 'done') {
    paymentForm.qrCode = info.file.response?.url || '';
    message.success('二维码上传成功');
  } else if (status === 'error') {
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
      <div v-if="paymentMethods.length === 0" class="empty-state">
        <div class="empty-content">
          <InboxOutlined class="empty-icon" />
          <p class="empty-text">暂无收款方式</p>
          <p class="empty-description">
            您可以添加支付宝、微信收款码或银行卡信息
          </p>
          <Button type="primary" @click="handleAddPayment"> 立即添加 </Button>
        </div>
      </div>

      <Table
        v-else
        :columns="paymentColumns"
        :data-source="paymentMethods"
        :pagination="false"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'isDefault'">
            <Tag :color="record.isDefault ? 'green' : 'default'">
              {{ record.isDefault ? '默认' : '普通' }}
            </Tag>
          </template>
          <template v-if="column.key === 'action'">
            <div class="action-buttons">
              <Button
                type="link"
                size="small"
                @click="handleEditPayment(record as PaymentMethod)"
              >
                编辑
              </Button>
              <Button
                v-if="!record.isDefault"
                type="link"
                size="small"
                @click="handleSetDefault(record as PaymentMethod)"
              >
                设为默认
              </Button>
              <Button
                type="link"
                size="small"
                danger
                @click="handleDeletePayment(record as PaymentMethod)"
              >
                删除
              </Button>
            </div>
          </template>
        </template>
      </Table>
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
      :title="editingPayment ? '编辑收款方式' : '添加收款方式'"
      width="600px"
      @ok="handleSavePayment"
      :confirm-loading="loading"
    >
      <Form :model="paymentForm" layout="vertical">
        <FormItem label="收款方式类型" required>
          <RadioGroup v-model:value="paymentForm.type">
            <Radio value="alipay">支付宝</Radio>
            <Radio value="wechat">微信</Radio>
            <Radio value="bank">银行卡</Radio>
          </RadioGroup>
        </FormItem>

        <FormItem label="名称" required>
          <Input
            v-model:value="paymentForm.name"
            placeholder="请输入收款方式名称"
          />
        </FormItem>

        <FormItem label="账号" required>
          <Input v-model:value="paymentForm.account" placeholder="请输入账号" />
        </FormItem>

        <FormItem v-if="paymentForm.type === 'bank'" label="银行名称" required>
          <Input
            v-model:value="paymentForm.bankName"
            placeholder="请输入银行名称"
          />
        </FormItem>

        <FormItem v-if="paymentForm.type !== 'bank'" label="收款二维码">
          <Upload
            name="file"
            list-type="picture-card"
            class="qr-uploader"
            :show-upload-list="false"
            action="/api/upload"
            @change="handleUpload"
          >
            <div v-if="paymentForm.qrCode" class="qr-preview">
              <img :src="paymentForm.qrCode" alt="收款码" />
            </div>
            <div v-else class="upload-button">
              <PlusOutlined />
              <div class="ant-upload-text">上传二维码</div>
            </div>
          </Upload>
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

.action-buttons {
  display: flex;
  gap: 8px;
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

.qr-preview img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
}
</style>
