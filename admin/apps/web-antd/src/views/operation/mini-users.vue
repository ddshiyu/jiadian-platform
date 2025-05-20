<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue';

import { onMounted, reactive, ref } from 'vue';

import {
  Avatar,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Divider,
  Form,
  FormItem,
  Input,
  List,
  ListItem,
  message,
  Modal,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  getMiniAppUserDetailApi,
  getMiniAppUserListApi,
  updateMiniAppUserTypeApi,
} from '#/api/core/operation';

// 定义接口
interface Address {
  id: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

interface Order {
  id: number;
  orderNo: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface User {
  id: number;
  nickname: string;
  gender: string;
  avatar: string;
  phone: string;
  age: number;
  openid: string;
  createdAt: string;
  updatedAt: string;
  userType?: 'consumer' | 'supplier';
  supplierInfo?: Record<string, any>;
  Addresses?: Address[];
  Orders?: Order[];
}

// 列定义
const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: '头像',
    dataIndex: 'avatar',
    key: 'avatar',
    width: 80,
  },
  {
    title: '昵称',
    dataIndex: 'nickname',
    key: 'nickname',
    width: 150,
  },
  {
    title: '手机号',
    dataIndex: 'phone',
    key: 'phone',
    width: 120,
  },
  {
    title: '性别',
    dataIndex: 'gender',
    key: 'gender',
    width: 80,
  },
  {
    title: '年龄',
    dataIndex: 'age',
    key: 'age',
    width: 80,
  },
  {
    title: '用户类型',
    dataIndex: 'userType',
    key: 'userType',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      return text === 'supplier' ? '供应商' : '消费者';
    },
  },
  {
    title: '注册时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 150,
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
  },
];

// 状态数据
const loading = ref(false);
const tableData = ref<User[]>([]);
const searchForm = reactive({
  keyword: '',
  gender: null,
});
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
});

// 详情相关
const detailModalVisible = ref(false);
const currentUser = ref<null | User>(null);
const submitLoading = ref(false);

// 方法定义
const formatDate = (date: string) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-';
};

const getOrderStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待付款',
    paid: '已付款',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
};

const fetchUserList = async () => {
  loading.value = true;
  try {
    const params = {
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      gender: searchForm.gender || undefined,
    };

    const res = await getMiniAppUserListApi(params);

    tableData.value = res.list || [];
    pagination.total = res.total || 0;
    pagination.current = res.pageNum || 1;
    pagination.pageSize = res.pageSize || 10;
  } catch (error) {
    console.error('获取用户列表失败:', error);
    message.error('获取用户列表失败');
  } finally {
    loading.value = false;
  }
};

const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.current = pag.current || 1;
  pagination.pageSize = pag.pageSize || 10;
  fetchUserList();
};

const handleSearch = () => {
  pagination.current = 1;
  fetchUserList();
};

const handleReset = () => {
  searchForm.keyword = '';
  searchForm.gender = null;
  pagination.current = 1;
  fetchUserList();
};

const handleViewDetail = async (record: User) => {
  try {
    loading.value = true;
    const res = await getMiniAppUserDetailApi(record.id);
    currentUser.value = res;
    detailModalVisible.value = true;
  } catch (error) {
    console.error('获取用户详情失败:', error);
    message.error('获取用户详情失败');
  } finally {
    loading.value = false;
  }
};

const handleDetailCancel = () => {
  detailModalVisible.value = false;
  currentUser.value = null;
};

// 处理变更用户身份
const handleChangeUserType = (record: User) => {
  // 确认是否变更用户身份
  const currentType = record.userType === 'supplier' ? '供应商' : '消费者';
  const newType = record.userType === 'supplier' ? '消费者' : '供应商';

  Modal.confirm({
    title: '变更用户身份',
    content: `确定将用户 "${record.nickname}" 的身份从${currentType}变更为${newType}吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        submitLoading.value = true;
        await updateMiniAppUserTypeApi(record.id);
        message.success('变更用户身份成功');
        fetchUserList();
      } catch (error) {
        console.error('变更用户身份失败:', error);
        message.error('变更用户身份失败');
      } finally {
        submitLoading.value = false;
      }
    },
  });
};

// 初始化
onMounted(() => {
  fetchUserList();
});
</script>

<template>
  <div>
    <!-- 搜索表单 -->
    <Card :bordered="false" class="mb-20">
      <Form
        :model="searchForm"
        layout="inline"
        class="search-form"
        @submit.prevent="handleSearch"
      >
        <FormItem label="用户信息">
          <Input
            v-model:value="searchForm.keyword"
            placeholder="请输入昵称或手机号"
            allow-clear
          />
        </FormItem>
        <FormItem label="性别">
          <Select
            v-model:value="searchForm.gender"
            placeholder="请选择性别"
            style="width: 120px"
            allow-clear
          >
            <SelectOption :value="null">全部</SelectOption>
            <SelectOption value="男">男</SelectOption>
            <SelectOption value="女">女</SelectOption>
            <SelectOption value="其他">其他</SelectOption>
          </Select>
        </FormItem>
        <FormItem>
          <Space>
            <Button type="primary" html-type="submit">查询</Button>
            <Button @click="handleReset">重置</Button>
          </Space>
        </FormItem>
      </Form>
    </Card>

    <Card :bordered="false">
      <div class="table-header">
        <div class="table-title">小程序用户列表</div>
      </div>

      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'avatar'">
            <Avatar :src="record.avatar || '/images/default-avatar.png'" />
          </template>
          <template v-if="column.key === 'gender'">
            <span>{{ record.gender || '-' }}</span>
          </template>
          <template v-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>
          <template v-if="column.key === 'action'">
            <Space>
              <a @click="handleViewDetail(record)">查看</a>
              <Divider type="vertical" />
              <a @click="handleChangeUserType(record)">变更身份</a>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 用户详情弹窗 -->
    <Modal
      v-model:visible="detailModalVisible"
      title="用户详情"
      width="700px"
      :footer="null"
      @cancel="handleDetailCancel"
    >
      <div v-if="currentUser">
        <Descriptions :column="2" bordered>
          <DescriptionsItem label="头像" :span="2">
            <Avatar
              :src="currentUser.avatar || '/images/default-avatar.png'"
              :size="64"
            />
          </DescriptionsItem>
          <DescriptionsItem label="昵称">
            {{ currentUser.nickname }}
          </DescriptionsItem>
          <DescriptionsItem label="性别">
            {{ currentUser.gender || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="手机号">
            {{ currentUser.phone || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="年龄">
            {{ currentUser.age || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="用户类型">
            {{ currentUser.userType === 'supplier' ? '供应商' : '消费者' }}
          </DescriptionsItem>
          <DescriptionsItem label="注册时间">
            {{ formatDate(currentUser.createdAt) }}
          </DescriptionsItem>
          <DescriptionsItem
            v-if="
              currentUser.userType === 'supplier' && currentUser.supplierInfo
            "
            label="供应商信息"
            :span="2"
          >
            <div>
              <p>公司名称: {{ currentUser.supplierInfo.companyName || '-' }}</p>
              <p>联系人: {{ currentUser.supplierInfo.contactPerson || '-' }}</p>
              <p>
                联系电话: {{ currentUser.supplierInfo.contactPhone || '-' }}
              </p>
              <p>公司地址: {{ currentUser.supplierInfo.address || '-' }}</p>
              <p>
                营业执照: {{ currentUser.supplierInfo.businessLicense || '-' }}
              </p>
            </div>
          </DescriptionsItem>
          <DescriptionsItem label="收货地址" :span="2">
            <List
              size="small"
              :data-source="currentUser.Addresses || []"
              :pagination="false"
            >
              <template #renderItem="{ item }">
                <ListItem>
                  <div>
                    <div>{{ item.name }} {{ item.phone }}</div>
                    <div>
                      {{
                        item.province + item.city + item.district + item.detail
                      }}
                    </div>
                    <Tag v-if="item.isDefault" color="blue">默认</Tag>
                  </div>
                </ListItem>
              </template>
              <template #header>
                <div>收货地址列表</div>
              </template>
              <template #empty>
                <div>暂无收货地址</div>
              </template>
            </List>
          </DescriptionsItem>
          <DescriptionsItem label="订单信息" :span="2">
            <List
              size="small"
              :data-source="currentUser.Orders || []"
              :pagination="false"
            >
              <template #renderItem="{ item }">
                <ListItem>
                  <div>
                    <div>订单号: {{ item.orderNo }}</div>
                    <div>金额: ¥{{ item.totalAmount }}</div>
                    <div>状态: {{ getOrderStatusText(item.status) }}</div>
                    <div>创建时间: {{ formatDate(item.createdAt) }}</div>
                  </div>
                </ListItem>
              </template>
              <template #header>
                <div>订单列表</div>
              </template>
              <template #empty>
                <div>暂无订单信息</div>
              </template>
            </List>
          </DescriptionsItem>
        </Descriptions>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.search-form {
  margin-bottom: 16px;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.table-title {
  font-size: 16px;
  font-weight: 500;
}

.table-action {
  display: flex;
  gap: 8px;
}

.danger-link {
  color: #ff4d4f;
}
</style>
