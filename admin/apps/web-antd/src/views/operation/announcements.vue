<script lang="ts" setup>
import type { FormInstance, TablePaginationConfig } from 'ant-design-vue';
import type { RuleObject } from 'ant-design-vue/es/form/interface';
import type { Dayjs } from 'dayjs';
import type { ColumnType } from 'ant-design-vue/lib/table';

import type {
  Announcement,
  AnnouncementListParams,
  AnnouncementListResult
} from '#/api/core/operation';

import { onMounted, reactive, ref } from 'vue';

import { ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Card,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  getAnnouncementListApi,
  getAnnouncementDetailApi,
  createAnnouncementApi,
  updateAnnouncementApi,
  deleteAnnouncementApi,
  batchDeleteAnnouncementsApi,
  updateAnnouncementStatusApi,
} from '#/api/core/operation';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

// 表格列定义
const columns: ColumnType<Announcement>[] = [
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    width: 200,
    ellipsis: true,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
  {
    title: '浏览次数',
    dataIndex: 'viewCount',
    key: 'viewCount',
    width: 100,
  },
  {
    title: '开始时间',
    dataIndex: 'startTime',
    key: 'startTime',
    width: 150,
  },
  {
    title: '结束时间',
    dataIndex: 'endTime',
    key: 'endTime',
    width: 150,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 150,
  },
  {
    title: '操作',
    key: 'action',
    fixed: 'right' as const,
    width: 280,
  },
];

// 表格数据
const tableData = ref<Announcement[]>([]);
const loading = ref(false);
const selectedRowKeys = ref<number[]>([]);

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
  status: string;
}

const searchForm = reactive<SearchForm>({
  keyword: '',
  status: '',
});

// 编辑/新增弹窗控制
const editVisible = ref(false);
const editForm = reactive<Announcement>({
  id: undefined,
  title: '',
  content: '',
  status: 'active',
  startTime: undefined,
  endTime: undefined,
});

const editFormRef = ref<FormInstance | null>(null);
const editFormRules = {
  title: [
    {
      required: true,
      message: '请输入公告标题',
      trigger: 'blur',
      type: 'string',
    },
  ] as RuleObject[],
  content: [
    {
      required: true,
      message: '请输入公告内容',
      trigger: 'blur',
      type: 'string',
    },
  ] as RuleObject[],
  status: [
    {
      required: true,
      message: '请选择公告状态',
      trigger: 'change',
      type: 'string',
    },
  ] as RuleObject[],
};

// 提交状态
const submitLoading = ref(false);

// 状态选项
const statusOptions = [
  { label: '激活', value: 'active' },
  { label: '未激活', value: 'inactive' },
];

// 获取公告列表数据
const fetchData = async () => {
  loading.value = true;
  try {
    const params: AnnouncementListParams = {
      keyword: searchForm.keyword || undefined,
      status: searchForm.status || undefined,
      page: pagination.current,
      limit: pagination.pageSize,
    };

    const res = await getAnnouncementListApi(params);
    tableData.value = res.list;
    pagination.total = res.total;
    pagination.current = res.page;
    pagination.pageSize = res.limit;
  } catch (error) {
    console.error('获取公告列表失败:', error);
    message.error('获取公告列表失败');
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  pagination.current = 1;
  fetchData();
};

// 重置搜索
const handleReset = () => {
  searchForm.keyword = '';
  searchForm.status = '';
  pagination.current = 1;
  fetchData();
};

// 表格分页变化
const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchData();
};

// 行选择
const rowSelection = {
  selectedRowKeys: selectedRowKeys,
  onChange: (keys: any[]) => {
    selectedRowKeys.value = keys as number[];
  },
};

// 打开新增弹窗
const handleAdd = () => {
  resetEditForm();
  editVisible.value = true;
};

// 打开编辑弹窗
const handleEdit = async (record: Announcement) => {
  try {
    const res = await getAnnouncementDetailApi(record.id!);
    Object.assign(editForm, res);
    editVisible.value = true;
  } catch (error) {
    console.error('获取公告详情失败:', error);
    message.error('获取公告详情失败');
  }
};

// 重置编辑表单
const resetEditForm = () => {
  Object.assign(editForm, {
    id: undefined,
    title: '',
    content: '',
    status: 'active',
    startTime: undefined,
    endTime: undefined,
  });
  editFormRef.value?.resetFields();
};

// 提交编辑表单
const handleSubmit = async () => {
  try {
    await editFormRef.value?.validate();
    submitLoading.value = true;

    if (editForm.id) {
      const res = await updateAnnouncementApi(editForm.id, editForm);
      console.log('编辑响应:', res);
    } else {
      const res = await createAnnouncementApi(editForm);
      console.log('创建响应:', res);
    }

    message.success(editForm.id ? '更新成功' : '创建成功');
    editVisible.value = false;
    // 确保刷新列表
    await fetchData();
  } catch (error) {
    console.error('提交失败:', error);
    message.error('提交失败');
  } finally {
    submitLoading.value = false;
  }
};

// 删除公告
const handleDelete = async (id: number) => {
  try {
    const res = await deleteAnnouncementApi(id);
    if (res.code === 0) {
      message.success('删除成功');
      fetchData();
    } else {
      message.error(res.message || '删除失败');
    }
  } catch (error) {
    console.error('删除失败:', error);
    message.error('删除失败');
  }
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请选择要删除的公告');
    return;
  }

  try {
    const res = await batchDeleteAnnouncementsApi(selectedRowKeys.value);
    if (res.code === 0) {
      message.success('批量删除成功');
      selectedRowKeys.value = [];
      fetchData();
    } else {
      message.error(res.message || '批量删除失败');
    }
  } catch (error) {
    console.error('批量删除失败:', error);
    message.error('批量删除失败');
  }
};

// 更新状态
const handleUpdateStatus = async (id: number, status: 'active' | 'inactive') => {
  try {
    const res = await updateAnnouncementStatusApi(id, status);
    console.log('状态更新响应:', res);

    // 无论响应格式如何，都显示成功消息并刷新列表
    message.success(status === 'active' ? '启用成功' : '停用成功');
    // 确保刷新列表
    await fetchData();
  } catch (error) {
    console.error('状态更新失败:', error);
    message.error('状态更新失败');
  }
};

// 获取状态标签颜色
const getStatusTagColor = (status: string) => {
  return status === 'active' ? 'success' : 'default';
};

// 格式化时间
const formatDateTime = (dateTime?: string) => {
  return dateTime ? dayjs(dateTime).format('YYYY-MM-DD HH:mm') : '-';
};

// 页面加载时获取数据
onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="p-4">
    <Card>
      <!-- 搜索表单 -->
      <Form layout="inline" class="mb-4">
        <FormItem label="关键词">
          <Input
            v-model:value="searchForm.keyword"
            placeholder="搜索标题或内容"
            allow-clear
            style="width: 200px"
          />
        </FormItem>
        <FormItem label="状态">
          <Select
            v-model:value="searchForm.status"
            placeholder="请选择状态"
            allow-clear
            style="width: 120px"
          >
            <SelectOption
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem>
          <Space>
            <Button type="primary" @click="handleSearch">搜索</Button>
            <Button @click="handleReset">重置</Button>
            <Button @click="fetchData">
              <template #icon>
                <ReloadOutlined />
              </template>
              刷新
            </Button>
          </Space>
        </FormItem>
      </Form>

      <!-- 操作按钮 -->
      <div class="mb-4">
        <Space>
          <Button type="primary" @click="handleAdd">
            <template #icon>
              <PlusOutlined />
            </template>
            新增公告
          </Button>
          <Popconfirm
            title="确定要删除选中的公告吗？"
            @confirm="handleBatchDelete"
          >
            <Button
              type="primary"
              danger
              :disabled="selectedRowKeys.length === 0"
            >
              <template #icon>
                <DeleteOutlined />
              </template>
              批量删除
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <!-- 表格 -->
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="pagination"
        :row-selection="rowSelection"
        :scroll="{ x: 1400 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag :color="getStatusTagColor(record.status)">
              {{ statusOptions.find(opt => opt.value === record.status)?.label }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'startTime'">
            {{ formatDateTime(record.startTime) }}
          </template>
          <template v-else-if="column.key === 'endTime'">
            {{ formatDateTime(record.endTime) }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTime(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button
                type="primary"
                size="small"
                @click="handleEdit(record)"
              >
                <template #icon>
                  <EditOutlined />
                </template>
                编辑
              </Button>
              <Button
                v-if="record.status === 'active'"
                size="small"
                @click="handleUpdateStatus(record.id!, 'inactive')"
              >
                停用
              </Button>
              <Button
                v-else
                type="primary"
                size="small"
                @click="handleUpdateStatus(record.id!, 'active')"
              >
                启用
              </Button>
              <Popconfirm
                title="确定要删除这条公告吗？"
                @confirm="handleDelete(record.id!)"
              >
                <Button
                  type="primary"
                  danger
                  size="small"
                >
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 编辑/新增弹窗 -->
    <Modal
      v-model:open="editVisible"
      :title="editForm.id ? '编辑公告' : '新增公告'"
      width="800px"
      :confirm-loading="submitLoading"
      @ok="handleSubmit"
      @cancel="editVisible = false"
    >
      <Form
        ref="editFormRef"
        :model="editForm"
        :rules="editFormRules"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 20 }"
      >
        <FormItem label="公告标题" name="title">
          <Input v-model:value="editForm.title" placeholder="请输入公告标题" />
        </FormItem>
        <FormItem label="公告内容" name="content">
          <TextArea
            v-model:value="editForm.content"
            placeholder="请输入公告内容"
            :rows="6"
          />
        </FormItem>
        <FormItem label="公告状态" name="status">
          <Select v-model:value="editForm.status" placeholder="请选择公告状态">
            <SelectOption
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem label="开始时间">
          <DatePicker
            v-model:value="editForm.startTime"
            show-time
            placeholder="请选择开始时间"
            style="width: 100%"
          />
        </FormItem>
        <FormItem label="结束时间">
          <DatePicker
            v-model:value="editForm.endTime"
            show-time
            placeholder="请选择结束时间"
            style="width: 100%"
          />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.ant-table-tbody > tr > td {
  padding: 8px;
}
</style>
