<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue';

import type {
  Commission,
  CommissionListParams,
  CommissionStatistics,
} from '#/api/core/operation';

import { onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Divider,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  SelectOption,
  Space,
  Statistic,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  getCommissionDetailApi,
  getCommissionListApi,
  getCommissionStatisticsApi,
  updateCommissionStatusApi,
} from '#/api/core/operation';

// 定义接口
interface SearchForm {
  status: null | string;
  userId: null | number;
}

// 表格列定义
const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: '获得用户',
    dataIndex: 'user',
    key: 'user',
    customRender: ({ record }: { record: Commission }) =>
      record.user ? `${record.user.nickname} (${record.user.phone})` : '-',
  },
  {
    title: '邀请用户',
    dataIndex: 'invitee',
    key: 'invitee',
    customRender: ({ record }: { record: Commission }) =>
      record.invitee
        ? `${record.invitee.nickname} (${record.invitee.phone})`
        : '-',
  },
  {
    title: '订单号',
    dataIndex: 'order',
    key: 'order',
    customRender: ({ record }: { record: Commission }) =>
      record.order ? record.order.orderNo : '-',
  },
  {
    title: '佣金金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    customRender: ({ text }: { text: number }) => `¥${text.toFixed(2)}`,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
  },
  {
    title: '操作',
    key: 'action',
    width: 180,
  },
];

// 统计数据
const statisticsData = ref<CommissionStatistics>({
  totalCommission: 0,
  todayCommission: 0,
  monthCommission: 0,
  totalRecords: 0,
});

// 搜索表单
const searchForm = reactive<SearchForm>({
  status: null,
  userId: null,
});

// 表格数据
const tableData = ref<Commission[]>([]);
const loading = ref(false);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => `共 ${total} 条数据`,
});

// 详情弹窗
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailData = ref<Commission | null>(null);

// 状态颜色映射
const statusColorMap = {
  pending: 'orange',
  settled: 'green',
  cancelled: 'red',
};

// 状态文本映射
const statusTextMap = {
  pending: '待结算',
  settled: '已结算',
  cancelled: '已取消',
};

// 初始化
onMounted(() => {
  fetchStatisticsData();
  fetchTableData();
});

// 获取统计数据
const fetchStatisticsData = async () => {
  try {
    const result = await getCommissionStatisticsApi();
    if (result) {
      statisticsData.value = result;
    }
  } catch (error) {
    console.error('获取佣金统计数据失败:', error);
    message.error('获取佣金统计数据失败');
  }
};

// 获取表格数据
const fetchTableData = async () => {
  loading.value = true;
  try {
    const params: CommissionListParams = {
      status: searchForm.status || undefined,
      userId: searchForm.userId === null ? undefined : searchForm.userId,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    };

    const response = await getCommissionListApi(params);
    if (response) {
      tableData.value = response.list;
      pagination.total = response.total;
    }
    loading.value = false;
  } catch (error) {
    console.error('获取佣金列表失败:', error);
    message.error('获取佣金列表失败');
    loading.value = false;
  }
};

// 表格变化（排序、分页等）
const handleTableChange = (pag: TablePaginationConfig) => {
  if (pag.current) pagination.current = pag.current;
  if (pag.pageSize) pagination.pageSize = pag.pageSize;
  fetchTableData();
};

// 搜索
const handleSearch = () => {
  pagination.current = 1;
  fetchTableData();
};

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    status: null,
    userId: null,
  });
  pagination.current = 1;
  fetchTableData();
};

// 查看详情
const handleViewDetail = async (record: any) => {
  detailLoading.value = true;
  detailVisible.value = true;

  try {
    const result = await getCommissionDetailApi(record.id);
    if (result) {
      detailData.value = result;
    }
    detailLoading.value = false;
  } catch (error) {
    console.error('获取佣金详情失败:', error);
    message.error('获取佣金详情失败');
    detailLoading.value = false;
  }
};

// 更新佣金状态
const handleUpdateStatus = async (
  record: any,
  status: 'cancelled' | 'pending' | 'settled',
) => {
  try {
    await updateCommissionStatusApi(record.id, status);
    message.success('状态更新成功');
    fetchTableData();
    // 如果状态变更成功，还需要刷新统计数据
    fetchStatisticsData();
  } catch (error) {
    console.error('更新佣金状态失败:', error);
    message.error('更新佣金状态失败');
  }
};

// 格式化日期
const formatDate = (date: string): string => {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};
</script>

<template>
  <div>
    <!-- 统计卡片 -->
    <Row :gutter="16" class="mb-20">
      <Col :span="6">
        <Card>
          <Statistic
            title="总佣金金额"
            :value="statisticsData.totalCommission"
            :precision="2"
            suffix="元"
            :value-style="{ color: '#3f8600' }"
          />
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="今日佣金"
            :value="statisticsData.todayCommission"
            :precision="2"
            suffix="元"
            :value-style="{ color: '#cf1322' }"
          />
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="本月佣金"
            :value="statisticsData.monthCommission"
            :precision="2"
            suffix="元"
          />
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            title="佣金记录总数"
            :value="statisticsData.totalRecords"
            :value-style="{ color: '#1890ff' }"
          />
        </Card>
      </Col>
    </Row>

    <!-- 搜索表单 -->
    <Card :bordered="false" class="mb-20">
      <Form
        :model="searchForm"
        layout="inline"
        class="search-form"
        @submit.prevent="handleSearch"
      >
        <FormItem label="佣金状态">
          <Select
            v-model:value="searchForm.status as any"
            placeholder="请选择佣金状态"
            style="width: 200px"
            allow-clear
          >
            <SelectOption :value="null">全部</SelectOption>
            <SelectOption value="pending">待结算</SelectOption>
            <SelectOption value="settled">已结算</SelectOption>
            <SelectOption value="cancelled">已取消</SelectOption>
          </Select>
        </FormItem>
        <FormItem label="用户ID">
          <Input
            :value="searchForm.userId === null ? '' : searchForm.userId"
            placeholder="请输入用户ID"
            style="width: 200px"
            allow-clear
            @update:value="
              (val) => (searchForm.userId = val ? Number(val) : null)
            "
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
        <div class="table-title">佣金记录</div>
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
          <template v-if="column.key === 'status'">
            <Tag
              :color="
                statusColorMap[record.status as keyof typeof statusColorMap]
              "
            >
              {{ statusTextMap[record.status as keyof typeof statusTextMap] }}
            </Tag>
          </template>
          <template v-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>
          <template v-if="column.key === 'action'">
            <Space>
              <a @click="handleViewDetail(record)">详情</a>
              <Divider type="vertical" />
              <Popconfirm
                v-if="record.status === 'pending'"
                title="确定结算该佣金吗？"
                @confirm="handleUpdateStatus(record, 'settled')"
                ok-text="确定"
                cancel-text="取消"
              >
                <a>结算</a>
              </Popconfirm>
              <Popconfirm
                v-if="record.status === 'pending'"
                title="确定取消该佣金吗？"
                @confirm="handleUpdateStatus(record, 'cancelled')"
                ok-text="确定"
                cancel-text="取消"
              >
                <a class="danger-link">取消</a>
              </Popconfirm>
              <Popconfirm
                v-if="record.status === 'cancelled'"
                title="确定恢复为待结算状态吗？"
                @confirm="handleUpdateStatus(record, 'pending')"
                ok-text="确定"
                cancel-text="取消"
              >
                <a>恢复</a>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 详情弹窗 -->
    <Modal
      v-model:visible="detailVisible"
      title="佣金详情"
      width="800px"
      :footer="null"
      :mask-closable="true"
    >
      <div v-if="detailLoading" class="loading-container">加载中...</div>
      <div v-else-if="detailData">
        <Descriptions bordered :column="2">
          <DescriptionsItem label="佣金ID">
            {{ detailData.id }}
          </DescriptionsItem>
          <DescriptionsItem label="佣金金额">
            <span class="price">¥{{ detailData.amount.toFixed(2) }}</span>
          </DescriptionsItem>
          <DescriptionsItem label="佣金状态">
            <Tag
              :color="
                statusColorMap[detailData.status as keyof typeof statusColorMap]
              "
            >
              {{
                statusTextMap[detailData.status as keyof typeof statusTextMap]
              }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="创建时间">
            {{ formatDate(detailData.createdAt) }}
          </DescriptionsItem>
          <DescriptionsItem label="更新时间">
            {{ formatDate(detailData.updatedAt) }}
          </DescriptionsItem>
        </Descriptions>

        <Divider>佣金获得者信息</Divider>
        <Descriptions bordered :column="2" v-if="detailData.user">
          <DescriptionsItem label="用户ID">
            {{ detailData.user.id }}
          </DescriptionsItem>
          <DescriptionsItem label="用户昵称">
            {{ detailData.user.nickname }}
          </DescriptionsItem>
          <DescriptionsItem label="手机号">
            {{ detailData.user.phone }}
          </DescriptionsItem>
          <DescriptionsItem label="头像">
            <img
              v-if="detailData.user.avatar"
              :src="detailData.user.avatar"
              alt="用户头像"
              class="user-avatar"
            />
            <span v-else>无头像</span>
          </DescriptionsItem>
        </Descriptions>

        <Divider>邀请人信息</Divider>
        <Descriptions bordered :column="2" v-if="detailData.invitee">
          <DescriptionsItem label="用户ID">
            {{ detailData.invitee.id }}
          </DescriptionsItem>
          <DescriptionsItem label="用户昵称">
            {{ detailData.invitee.nickname }}
          </DescriptionsItem>
          <DescriptionsItem label="手机号">
            {{ detailData.invitee.phone }}
          </DescriptionsItem>
          <DescriptionsItem label="头像">
            <img
              v-if="detailData.invitee.avatar"
              :src="detailData.invitee.avatar"
              alt="用户头像"
              class="user-avatar"
            />
            <span v-else>无头像</span>
          </DescriptionsItem>
        </Descriptions>

        <Divider>关联订单信息</Divider>
        <Descriptions bordered :column="2" v-if="detailData.order">
          <DescriptionsItem label="订单ID">
            {{ detailData.order.id }}
          </DescriptionsItem>
          <DescriptionsItem label="订单号">
            {{ detailData.order.orderNo }}
          </DescriptionsItem>
          <DescriptionsItem label="订单金额">
            <span class="price">¥{{ detailData.order.totalAmount }}</span>
          </DescriptionsItem>
          <DescriptionsItem label="订单状态">
            {{ detailData.order.status }}
          </DescriptionsItem>
          <DescriptionsItem label="下单时间">
            {{ formatDate(detailData.order.createdAt) }}
          </DescriptionsItem>
        </Descriptions>

        <div
          class="modal-action"
          v-if="detailData && detailData.status === 'pending'"
        >
          <Popconfirm
            title="确定结算该佣金吗？"
            @confirm="
              () => {
                handleUpdateStatus(detailData as any, 'settled');
                detailVisible = false;
              }
            "
            ok-text="确定"
            cancel-text="取消"
          >
            <Button type="primary">结算佣金</Button>
          </Popconfirm>
          <Popconfirm
            title="确定取消该佣金吗？"
            @confirm="
              () => {
                handleUpdateStatus(detailData as any, 'cancelled');
                detailVisible = false;
              }
            "
            ok-text="确定"
            cancel-text="取消"
          >
            <Button danger style="margin-left: 10px">取消佣金</Button>
          </Popconfirm>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style lang="less" scoped>
.mb-20 {
  margin-bottom: 20px;
}

.search-form {
  margin-bottom: 20px;

  .ant-form-item {
    margin-bottom: 16px;
  }
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .table-title {
    font-size: 16px;
    font-weight: 500;
  }
}

.price {
  color: #f5222d;
  font-weight: 500;
}

.danger-link {
  color: #f5222d;

  &:hover {
    color: #ff4d4f;
  }
}

.loading-container {
  text-align: center;
  padding: 40px 0;
  color: #999;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.modal-action {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>
