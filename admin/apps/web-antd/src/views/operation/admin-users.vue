<script lang="ts" setup>
import type { FormInstance, TablePaginationConfig } from 'ant-design-vue';
import type { RuleObject } from 'ant-design-vue/es/form/interface';
import type { Dayjs } from 'dayjs';

import type { AdminUser, AdminUserListParams } from '#/api/core/user';

import { onMounted, reactive, ref } from 'vue';

import { ReloadOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  DescriptionsItem,
  Divider,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  createAdminUserApi,
  getAdminUserDetailApi,
  getAdminUserListApi,
  getAdminUserStatisticsSummaryApi,
  resetAdminUserPasswordApi,
  updateAdminUserApi,
  updateAdminUserStatusApi,
} from '#/api/core/user';

const { RangePicker } = DatePicker;

// 表格列定义
const columns = [
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: '姓名',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '手机号',
    dataIndex: 'phone',
    key: 'phone',
  },
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
  },
  {
    title: '操作',
    key: 'action',
    fixed: 'right',
    width: 300,
  },
];

// 表格数据
const tableData = ref<AdminUser[]>([]);
const loading = ref(false);
const currentUser = ref<AdminUser | null>(null);

// 分页设置
const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
});

// 搜索表单
interface SearchForm {
  keyword: string;
  role: string;
  startDate: string;
  endDate: string;
}

const searchForm = reactive<SearchForm>({
  keyword: '',
  role: '',
  startDate: '',
  endDate: '',
});

// 日期范围选择
const dateRange = ref<[Dayjs, Dayjs] | undefined>(undefined);

// 用户统计数据
const statistics = ref({
  totalCount: 0,
  todayNewUsers: 0,
  monthNewUsers: 0,
  activeUserCount: 0,
});

// 详情弹窗控制
const detailVisible = ref(false);

// 编辑/新增弹窗控制
const editVisible = ref(false);
const editForm = reactive({
  id: 0,
  username: '',
  password: '',
  name: '',
  phone: '',
  role: 'user',
});
const editFormRef = ref<FormInstance | null>(null);
const editFormRules = {
  username: [
    {
      required: true,
      message: '请输入用户名',
      trigger: 'blur',
      type: 'string',
    },
  ] as RuleObject[],
  password: [
    {
      required: true,
      message: '请输入密码',
      trigger: 'blur',
      type: 'string',
    },
  ] as RuleObject[],
  phone: [
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号格式',
      trigger: 'blur',
      type: 'string',
    },
  ] as RuleObject[],
};

// 重置密码弹窗控制
const resetPasswordVisible = ref(false);
const resetPasswordForm = reactive({
  id: 0,
  password: '',
});
const resetPasswordFormRef = ref<FormInstance | null>(null);
const resetPasswordFormRules = {
  password: [
    {
      required: true,
      message: '请输入新密码',
      trigger: 'blur',
      type: 'string',
    },
    {
      min: 6,
      message: '密码长度至少6位',
      trigger: 'blur',
      type: 'string',
    },
  ] as RuleObject[],
};

// 提交状态
const submitLoading = ref(false);

// 获取用户列表数据
const fetchData = async () => {
  loading.value = true;
  try {
    // 处理日期范围
    if (dateRange.value && dateRange.value.length === 2) {
      searchForm.startDate = dateRange.value[0].format('YYYY-MM-DD');
      searchForm.endDate = dateRange.value[1].format('YYYY-MM-DD');
    } else {
      searchForm.startDate = '';
      searchForm.endDate = '';
    }

    const params: AdminUserListParams = {
      keyword: searchForm.keyword || undefined,
      role: searchForm.role || undefined,
      startDate: searchForm.startDate || undefined,
      endDate: searchForm.endDate || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
    };

    const res = await getAdminUserListApi(params);
    tableData.value = res.list || [];
    pagination.total = res.pagination?.total || 0;
    pagination.current = res.pagination?.current || 1;
  } catch (error: any) {
    console.error('获取用户列表失败:', error);
    message.error(`获取用户列表失败: ${error.message || '未知错误'}`);
    tableData.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

// 获取用户统计数据
const fetchStatistics = async () => {
  try {
    const res = await getAdminUserStatisticsSummaryApi();
    statistics.value = res;
  } catch (error: any) {
    console.error('获取用户统计数据失败:', error);
    message.error(`获取用户统计数据失败: ${error.message || '未知错误'}`);
  }
};

// 搜索
const handleSearch = () => {
  pagination.current = 1;
  fetchData();
};

// 重置搜索
const handleReset = () => {
  // 重置表单
  Object.assign(searchForm, {
    keyword: '',
    role: '',
    startDate: '',
    endDate: '',
  });
  dateRange.value = undefined;

  // 重新加载数据
  pagination.current = 1;
  fetchData();
};

// 表格变化
const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchData();
};

// 查看用户详情
const handleDetail = async (record: AdminUser) => {
  try {
    loading.value = true;
    const res = await getAdminUserDetailApi(record.id);
    currentUser.value = res;
    detailVisible.value = true;
  } catch (error: any) {
    console.error('获取用户详情失败:', error);
    message.error(`获取用户详情失败: ${error.message || '未知错误'}`);
  } finally {
    loading.value = false;
  }
};

// 新增用户
const handleAdd = () => {
  editForm.id = 0;
  editForm.username = '';
  editForm.password = '';
  editForm.name = '';
  editForm.phone = '';
  editForm.role = 'user';
  editVisible.value = true;
};

// 编辑用户
const handleEdit = (record: AdminUser) => {
  editForm.id = record.id;
  editForm.username = record.username;
  editForm.password = ''; // 编辑时不需要填写密码
  editForm.name = record.name || '';
  editForm.phone = record.phone || '';
  editForm.role = record.role;
  editVisible.value = true;
};

// 取消编辑
const cancelEdit = () => {
  editVisible.value = false;
};

// 确认编辑/新增
const confirmEdit = async () => {
  if (!editFormRef.value) return;

  try {
    // 新增用户时验证密码，编辑用户时不验证
    const validateFields = editForm.id
      ? ['username', 'phone']
      : ['username', 'password', 'phone'];
    await editFormRef.value.validateFields(validateFields);
    submitLoading.value = true;

    if (editForm.id) {
      // 编辑用户
      await updateAdminUserApi(editForm.id, {
        name: editForm.name,
        phone: editForm.phone,
        role: editForm.role,
      });
      message.success('更新用户成功');
    } else {
      // 新增用户
      await createAdminUserApi({
        username: editForm.username,
        password: editForm.password,
        name: editForm.name,
        phone: editForm.phone,
        role: editForm.role,
      });
      message.success('创建用户成功');
    }

    editVisible.value = false;
    fetchData();
  } catch (error: any) {
    console.error('保存用户失败:', error);
    message.error(`保存用户失败: ${error.message || '未知错误'}`);
  } finally {
    submitLoading.value = false;
  }
};

// 重置密码
const handleResetPassword = (record: AdminUser) => {
  resetPasswordForm.id = record.id;
  resetPasswordForm.password = '';
  resetPasswordVisible.value = true;
};

// 取消重置密码
const cancelResetPassword = () => {
  resetPasswordVisible.value = false;
};

// 确认重置密码
const confirmResetPassword = async () => {
  if (!resetPasswordFormRef.value) return;

  try {
    await resetPasswordFormRef.value.validateFields();
    submitLoading.value = true;

    await resetAdminUserPasswordApi(
      resetPasswordForm.id,
      resetPasswordForm.password,
    );

    message.success('重置密码成功');
    resetPasswordVisible.value = false;
  } catch (error: any) {
    console.error('重置密码失败:', error);
    message.error(`重置密码失败: ${error.message || '未知错误'}`);
  } finally {
    submitLoading.value = false;
  }
};

// 更新用户状态
const handleStatusChange = async (record: AdminUser) => {
  try {
    const newStatus = record.status === 'active' ? 'inactive' : 'active';
    await updateAdminUserStatusApi(
      record.id,
      newStatus as 'active' | 'inactive',
    );
    message.success(`${newStatus === 'active' ? '启用' : '禁用'}用户成功`);
    fetchData();
  } catch (error: any) {
    console.error('更新用户状态失败:', error);
    message.error(`更新用户状态失败: ${error.message || '未知错误'}`);
  }
};

// 获取角色显示文本
const getRoleText = (role: string) => {
  return role === 'admin' ? '管理员' : '普通用户';
};

// 获取角色标签颜色
const getRoleColor = (role: string) => {
  return role === 'admin' ? 'blue' : 'green';
};

// 获取状态显示文本
const getStatusText = (status: string) => {
  return status === 'active' ? '正常' : '禁用';
};

// 获取状态标签颜色
const getStatusColor = (status: string) => {
  return status === 'active' ? 'success' : 'error';
};

// 格式化日期
const formatDate = (date: string) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '';
};

// 初始化
onMounted(() => {
  fetchData();
  fetchStatistics();
});
</script>

<template>
  <div>
    <!-- 统计信息 -->
    <Card :bordered="false" class="mb-20">
      <div class="statistics-container">
        <Statistic title="用户总数" :value="statistics.totalCount" />
        <Statistic title="今日新增" :value="statistics.todayNewUsers" />
        <Statistic title="本月新增" :value="statistics.monthNewUsers" />
        <Statistic title="活跃用户" :value="statistics.activeUserCount" />
      </div>
    </Card>

    <!-- 搜索表单 -->
    <Card :bordered="false" class="mb-20">
      <Form
        :model="searchForm"
        layout="inline"
        class="search-form"
        @submit.prevent="handleSearch"
      >
        <FormItem label="关键词">
          <Input
            v-model:value="searchForm.keyword"
            placeholder="用户名/姓名/手机号"
            allow-clear
          />
        </FormItem>
        <FormItem label="角色">
          <Select
            v-model:value="searchForm.role"
            placeholder="请选择角色"
            style="width: 140px"
            allow-clear
          >
            <SelectOption value="">全部</SelectOption>
            <SelectOption value="admin">管理员</SelectOption>
            <SelectOption value="user">普通用户</SelectOption>
          </Select>
        </FormItem>
        <FormItem label="创建时间">
          <RangePicker
            v-model:value="dateRange"
            format="YYYY-MM-DD"
            :placeholder="['开始日期', '结束日期']"
            style="width: 240px"
          />
        </FormItem>
        <FormItem>
          <Space>
            <Button type="primary" html-type="submit">查询</Button>
            <Button @click="handleReset">重置</Button>
          </Space>
        </FormItem>
      </Form>
    </Card>

    <!-- 表格 -->
    <Card :bordered="false">
      <div class="table-header">
        <div class="table-title">用户列表</div>
        <div class="table-action">
          <Space>
            <Button type="primary" @click="handleAdd">新增用户</Button>
            <Tooltip title="刷新">
              <Button @click="fetchData">
                <template #icon><ReloadOutlined /></template>
              </Button>
            </Tooltip>
          </Space>
        </div>
      </div>

      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <!-- 角色 -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'role'">
            <Tag :color="getRoleColor(record.role)">
              {{ getRoleText(record.role) }}
            </Tag>
          </template>

          <!-- 状态 -->
          <template v-if="column.key === 'status'">
            <Tag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </Tag>
          </template>

          <!-- 创建时间 -->
          <template v-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>

          <!-- 操作 -->
          <template v-if="column.key === 'action'">
            <Space>
              <Button type="link" @click="() => handleDetail(record)">
                详情
              </Button>
              <Button type="link" @click="() => handleEdit(record)">
                编辑
              </Button>
              <Button type="link" @click="() => handleResetPassword(record)">
                重置密码
              </Button>
              <Popconfirm
                :title="`确定${record.status === 'active' ? '禁用' : '启用'}该用户吗？`"
                @confirm="() => handleStatusChange(record)"
                ok-text="确定"
                cancel-text="取消"
              >
                <Button type="link" :danger="record.status === 'active'">
                  {{ record.status === 'active' ? '禁用' : '启用' }}
                </Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 用户详情弹窗 -->
    <Modal
      v-model:visible="detailVisible"
      title="用户详情"
      width="800px"
      :footer="null"
      :mask-closable="true"
    >
      <div v-if="currentUser">
        <Descriptions title="基本信息" bordered :column="2">
          <DescriptionsItem label="ID">
            {{ currentUser.id }}
          </DescriptionsItem>
          <DescriptionsItem label="用户名">
            {{ currentUser.username }}
          </DescriptionsItem>
          <DescriptionsItem label="姓名">
            {{ currentUser.name || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="手机号">
            {{ currentUser.phone || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="角色">
            <Tag :color="getRoleColor(currentUser.role)">
              {{ getRoleText(currentUser.role) }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="状态">
            <Tag :color="getStatusColor(currentUser.status)">
              {{ getStatusText(currentUser.status) }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="创建时间">
            {{ formatDate(currentUser.createdAt) }}
          </DescriptionsItem>
          <DescriptionsItem label="更新时间">
            {{ formatDate(currentUser.updatedAt) }}
          </DescriptionsItem>
        </Descriptions>

        <Divider />

        <Descriptions title="统计信息" bordered :column="1">
          <DescriptionsItem label="订单数量">
            {{ currentUser.stats?.orderCount || 0 }}
          </DescriptionsItem>
        </Descriptions>

        <div v-if="currentUser.stats?.recentOrders?.length" class="mt-20">
          <h3>最近订单</h3>
          <Table
            :columns="[
              { title: '订单号', dataIndex: 'orderNo', key: 'orderNo' },
              { title: '金额', dataIndex: 'totalAmount', key: 'totalAmount' },
              { title: '状态', dataIndex: 'status', key: 'status' },
              { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
            ]"
            :data-source="currentUser.stats.recentOrders"
            :pagination="false"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'createdAt'">
                {{ formatDate(record.createdAt) }}
              </template>
            </template>
          </Table>
        </div>
      </div>
    </Modal>

    <!-- 编辑/新增用户弹窗 -->
    <Modal
      v-model:visible="editVisible"
      :title="editForm.id ? '编辑用户' : '新增用户'"
      @ok="confirmEdit"
      :confirm-loading="submitLoading"
      @cancel="cancelEdit"
      ok-text="确定"
      cancel-text="取消"
    >
      <Form
        ref="editFormRef"
        :model="editForm"
        :rules="editFormRules"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 20 }"
      >
        <FormItem label="用户名" name="username">
          <Input
            v-model:value="editForm.username"
            placeholder="请输入用户名"
            :disabled="!!editForm.id"
          />
        </FormItem>
        <FormItem v-if="!editForm.id" label="密码" name="password">
          <Input.Password
            v-model:value="editForm.password"
            placeholder="请输入密码"
          />
        </FormItem>
        <FormItem label="姓名" name="name">
          <Input v-model:value="editForm.name" placeholder="请输入姓名" />
        </FormItem>
        <FormItem label="手机号" name="phone">
          <Input v-model:value="editForm.phone" placeholder="请输入手机号" />
        </FormItem>
        <FormItem label="角色" name="role">
          <Select v-model:value="editForm.role">
            <SelectOption value="admin">管理员</SelectOption>
            <SelectOption value="user">普通用户</SelectOption>
          </Select>
        </FormItem>
      </Form>
    </Modal>

    <!-- 重置密码弹窗 -->
    <Modal
      v-model:visible="resetPasswordVisible"
      title="重置密码"
      @ok="confirmResetPassword"
      :confirm-loading="submitLoading"
      @cancel="cancelResetPassword"
      ok-text="确定"
      cancel-text="取消"
    >
      <Form
        ref="resetPasswordFormRef"
        :model="resetPasswordForm"
        :rules="resetPasswordFormRules"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 20 }"
      >
        <FormItem label="新密码" name="password">
          <Input.Password
            v-model:value="resetPasswordForm.password"
            placeholder="请输入新密码"
          />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.mb-20 {
  margin-bottom: 20px;
}

.mt-20 {
  margin-top: 20px;
}

.search-form {
  .ant-form-item {
    margin-bottom: 16px;
  }
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .table-title {
    font-size: 16px;
    font-weight: 500;
  }
}

.statistics-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.statistics-container .ant-statistic {
  margin-right: 48px;
}
</style>
