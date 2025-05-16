<script lang="ts" setup>
import type { FormInstance, TablePaginationConfig } from 'ant-design-vue';
import type { RuleObject } from 'ant-design-vue/es/form/interface';
import type { Dayjs } from 'dayjs';

import type { Order, OrderListParams } from '#/api/core/operation';

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
  Table,
  Tag,
  Textarea,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  cancelOrderApi,
  getOrderDetailApi,
  getOrderListApi,
  remarkOrderApi,
  shipOrderApi,
} from '#/api/core/operation';

const { RangePicker } = DatePicker;

// 表格列定义
const columns = [
  {
    title: '订单信息',
    key: 'orderInfo',
    width: 200,
  },
  {
    title: '订单金额',
    key: 'amount',
    width: 100,
  },
  {
    title: '订单状态',
    key: 'status',
    width: 120,
  },
  {
    title: '支付状态',
    key: 'paymentStatus',
    width: 120,
  },
  {
    title: '时间信息',
    key: 'time',
    width: 200,
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
  },
];

// 订单商品列表列定义
const orderItemColumns = [
  {
    title: '商品信息',
    key: 'product',
    width: '40%',
  },
  {
    title: '单价',
    key: 'price',
    width: '15%',
  },
  {
    title: '数量',
    dataIndex: 'quantity',
    key: 'quantity',
    width: '15%',
  },
  {
    title: '金额',
    key: 'total',
    width: '15%',
  },
];

// 表格数据
const tableData = ref<Order[]>([]);
const loading = ref(false);
const currentOrder = ref<null | Order>(null);

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
  orderNo: string;
  userName: string;
  status: string;
  paymentStatus: string;
  startDate: string;
  endDate: string;
}

const searchForm = reactive<SearchForm>({
  orderNo: '',
  userName: '',
  status: '',
  paymentStatus: '',
  startDate: '',
  endDate: '',
});

// 日期范围选择
const dateRange = ref<[Dayjs, Dayjs] | undefined>(undefined);

// 详情弹窗控制
const detailVisible = ref(false);

// 备注弹窗控制
const remarkVisible = ref(false);
const remarkForm = reactive({
  orderId: 0,
  remark: '',
});
const remarkFormRef = ref<FormInstance | null>(null);
const remarkFormRules = {
  remark: [
    {
      required: true,
      message: '请输入订单备注',
      trigger: 'blur',
      type: 'string',
    },
  ] as RuleObject[],
};

// 提交状态
const submitLoading = ref(false);

// 发货弹窗控制
const shipVisible = ref(false);
const shipForm = reactive({
  orderId: 0,
  trackingNumber: '',
  trackingCompany: '',
});
const shipFormRef = ref<FormInstance | null>(null);
const shipFormRules = {
  trackingNumber: [
    {
      required: true,
      message: '请输入快递单号',
      trigger: 'blur',
      type: 'string',
    },
  ] as RuleObject[],
  trackingCompany: [
    {
      required: true,
      message: '请输入快递公司',
      trigger: 'blur',
      type: 'string',
    },
  ] as RuleObject[],
};

// 获取订单列表数据
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

    const params: OrderListParams = {
      orderNo: searchForm.orderNo,
      userName: searchForm.userName,
      status: searchForm.status || undefined,
      paymentStatus: searchForm.paymentStatus || undefined,
      startDate: searchForm.startDate || undefined,
      endDate: searchForm.endDate || undefined,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    };

    try {
      const res = await getOrderListApi(params);
      // 因为requestClient是配置了responseReturn: 'data'的，所以res直接就是接口返回的data部分
      if (res) {
        tableData.value = res.list || [];
        pagination.total = res.pagination?.total || 0;
        pagination.current = res.pagination?.current || 1;
      } else {
        throw new Error('获取订单列表失败: 空响应');
      }
    } catch (apiError: any) {
      console.error('获取订单API失败，使用模拟数据:', apiError);
      message.warning(
        `当前使用测试数据，接口异常：${apiError.message || apiError}`,
      );

      // 使用模拟数据进行测试
      const mockOrders = generateMockOrders();

      // 过滤模拟数据
      let filteredOrders = [...mockOrders];
      if (searchForm.orderNo) {
        filteredOrders = filteredOrders.filter((order) =>
          order.orderNo.includes(searchForm.orderNo),
        );
      }
      if (searchForm.userName) {
        filteredOrders = filteredOrders.filter((order) =>
          order.userName.includes(searchForm.userName),
        );
      }
      if (searchForm.status) {
        filteredOrders = filteredOrders.filter(
          (order) => order.status === searchForm.status,
        );
      }
      if (searchForm.paymentStatus) {
        filteredOrders = filteredOrders.filter(
          (order) => order.paymentStatus === searchForm.paymentStatus,
        );
      }

      // 分页处理
      const current = pagination.current || 1;
      const pageSize = pagination.pageSize || 10;
      const startIndex = (current - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      tableData.value = filteredOrders.slice(startIndex, endIndex);
      pagination.total = filteredOrders.length;
    }
  } catch (error) {
    console.error('获取订单列表失败:', error);
    message.error('获取订单列表失败');
    tableData.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

// 生成模拟订单数据
const generateMockOrders = () => {
  const statuses: Array<Order['status']> = [
    'pending_payment',
    'pending_delivery',
    'delivered',
    'completed',
    'cancelled',
  ];
  const paymentStatuses: Array<Order['paymentStatus']> = [
    'unpaid',
    'paid',
    'refunded',
  ];

  const orderTypes = ['normal', 'vip', 'wholesale'];

  return Array.from({ length: 25 }).map((_, index) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const paymentStatus =
      status === 'pending_payment'
        ? 'unpaid'
        : (status === 'cancelled'
          ? paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)]
          : 'paid');

    // 创建基础订单对象
    const order = {
      id: index + 1,
      orderNo: `ORD${String(index + 10_001).padStart(5, '0')}`,
      userId: index + 100,
      userName: `测试用户${index + 1}`,
      totalAmount: Number(Math.floor(Math.random() * 10_000) / 100 + 100),
      orderType: orderTypes[Math.floor(Math.random() * orderTypes.length)],
      status: status as Order['status'],
      paymentStatus: paymentStatus as Order['paymentStatus'],
      paymentMethod: paymentStatus === 'unpaid' ? undefined : '微信支付',
      paymentTime:
        paymentStatus === 'unpaid'
          ? undefined
          : new Date(
              Date.now() - Math.random() * 86_400_000 * 30,
            ).toISOString(),
      deliveryTime: ['completed', 'delivered'].includes(status)
        ? new Date(Date.now() - Math.random() * 86_400_000 * 15).toISOString()
        : undefined,
      completionTime:
        status === 'completed'
          ? new Date(Date.now() - Math.random() * 86_400_000 * 5).toISOString()
          : undefined,
      cancelTime:
        status === 'cancelled'
          ? new Date(Date.now() - Math.random() * 86_400_000 * 10).toISOString()
          : undefined,
      remark: Math.random() > 0.7 ? `订单备注${index + 1}` : undefined,
      address: `测试地址${index + 1}`,
      consignee: `收货人${index + 1}`,
      phone: `1380000${String(index + 1).padStart(4, '0')}`,
      createdAt: new Date(
        Date.now() - Math.random() * 86_400_000 * 60,
      ).toISOString(),
      updatedAt: new Date(
        Date.now() - Math.random() * 86_400_000 * 30,
      ).toISOString(),
      items: [
        {
          id: index * 2 + 1,
          productId: index * 3 + 100,
          productName: `测试商品${index * 2 + 1}`,
          price: Math.floor(Math.random() * 1000) / 100 + 50,
          quantity: Math.floor(Math.random() * 5) + 1,
          totalAmount: 0,
          productCover: `https://via.placeholder.com/100?text=商品${index * 2 + 1}`,
        },
        {
          id: index * 2 + 2,
          productId: index * 3 + 101,
          productName: `测试商品${index * 2 + 2}`,
          price: Math.floor(Math.random() * 1000) / 100 + 50,
          quantity: Math.floor(Math.random() * 5) + 1,
          totalAmount: 0,
          productCover: `https://via.placeholder.com/100?text=商品${index * 2 + 2}`,
        },
      ],
    };

    // 计算每个商品项的总金额并返回
    order.items = order.items.map((item) => ({
      ...item,
      totalAmount: item.price * item.quantity,
    }));

    return order;
  }) as Order[];
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
    orderNo: '',
    userName: '',
    status: '',
    paymentStatus: '',
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

// 查看订单详情
const handleDetail = async (record: any) => {
  try {
    loading.value = true;

    try {
      const res = await getOrderDetailApi(record.id);
      if (res) {
        currentOrder.value = res as Order;
        detailVisible.value = true;
      } else {
        throw new Error('订单详情获取失败: 空响应');
      }
    } catch (apiError: any) {
      console.error('获取订单详情API失败，使用模拟数据:', apiError);
      message.warning(
        `当前使用测试数据，接口异常：${apiError.message || apiError}`,
      );

      // 直接使用表格中的数据作为详情
      currentOrder.value = record as Order;
      detailVisible.value = true;
    }
  } catch (error) {
    console.error('获取订单详情失败:', error);
    message.error('获取订单详情失败');
  } finally {
    loading.value = false;
  }
};

// 取消订单
const handleCancel = async (record: any) => {
  try {
    await cancelOrderApi(record.id, '管理员取消');
    message.success('订单已取消');
    fetchData();
  } catch (error) {
    console.error('取消订单失败:', error);
    message.error('取消订单失败');
  }
};

// 备注
const handleRemark = (record: any) => {
  remarkForm.orderId = record.id;
  remarkForm.remark = record.remark || '';
  remarkVisible.value = true;
};

// 取消备注
const cancelRemark = () => {
  remarkVisible.value = false;
};

// 确认备注
const confirmRemark = async () => {
  if (!remarkFormRef.value) return;

  try {
    await remarkFormRef.value.validate();
    submitLoading.value = true;

    await remarkOrderApi(remarkForm.orderId, remarkForm.remark);

    message.success('备注成功');
    remarkVisible.value = false;
    fetchData();
  } catch (error) {
    console.error('备注失败:', error);
    message.error('备注失败');
  } finally {
    submitLoading.value = false;
  }
};

// 发货
const handleShip = (record: any) => {
  shipForm.orderId = record.id;
  shipForm.trackingNumber = '';
  shipForm.trackingCompany = '';
  shipVisible.value = true;
};

// 取消发货
const cancelShip = () => {
  shipVisible.value = false;
};

// 确认发货
const confirmShip = async () => {
  if (!shipFormRef.value) return;

  try {
    await shipFormRef.value.validate();
    submitLoading.value = true;

    await shipOrderApi(
      shipForm.orderId,
      shipForm.trackingNumber,
      shipForm.trackingCompany,
    );

    message.success('发货成功');
    shipVisible.value = false;
    fetchData();
  } catch (error) {
    console.error('发货失败:', error);
    message.error('发货失败');
  } finally {
    submitLoading.value = false;
  }
};

// 格式化日期
const formatDate = (date: string) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '';
};

// 获取订单状态文本
const getStatusText = (status: Order['status']) => {
  const statusMap: Record<Order['status'], string> = {
    pending_payment: '待支付',
    pending_delivery: '待发货',
    delivered: '已发货',
    completed: '已完成',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
};

// 获取订单状态颜色
const getStatusColor = (status: Order['status']) => {
  const colorMap: Record<Order['status'], string> = {
    pending_payment: 'orange',
    pending_delivery: 'blue',
    delivered: 'cyan',
    completed: 'green',
    cancelled: 'red',
  };
  return colorMap[status] || 'default';
};

// 获取支付状态文本
const getPaymentStatusText = (status: Order['paymentStatus']) => {
  const statusMap: Record<Order['paymentStatus'], string> = {
    unpaid: '未支付',
    paid: '已支付',
    refunded: '已退款',
  };
  return statusMap[status] || status;
};

// 获取支付状态颜色
const getPaymentStatusColor = (status: Order['paymentStatus']) => {
  const colorMap: Record<Order['paymentStatus'], string> = {
    unpaid: 'orange',
    paid: 'green',
    refunded: 'purple',
  };
  return colorMap[status] || 'default';
};

// 获取订单类型文本
const getOrderTypeText = (type?: string) => {
  const typeMap: Record<string, string> = {
    normal: '普通订单',
    vip: 'VIP订单',
    wholesale: '批发订单',
  };
  return type ? typeMap[type] || type : '-';
};

// 初始化
onMounted(() => {
  fetchData();
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
        <FormItem label="订单号">
          <Input
            v-model:value="searchForm.orderNo"
            placeholder="请输入订单号"
            allow-clear
          />
        </FormItem>
        <FormItem label="用户名">
          <Input
            v-model:value="searchForm.userName"
            placeholder="请输入用户名"
            allow-clear
          />
        </FormItem>
        <FormItem label="订单状态">
          <Select
            v-model:value="searchForm.status"
            placeholder="请选择订单状态"
            style="width: 160px"
            allow-clear
          >
            <SelectOption value="">全部</SelectOption>
            <SelectOption value="pending_payment">待支付</SelectOption>
            <SelectOption value="pending_delivery">待发货</SelectOption>
            <SelectOption value="delivered">已发货</SelectOption>
            <SelectOption value="completed">已完成</SelectOption>
            <SelectOption value="cancelled">已取消</SelectOption>
          </Select>
        </FormItem>
        <FormItem label="支付状态">
          <Select
            v-model:value="searchForm.paymentStatus"
            placeholder="请选择支付状态"
            style="width: 140px"
            allow-clear
          >
            <SelectOption value="">全部</SelectOption>
            <SelectOption value="unpaid">未支付</SelectOption>
            <SelectOption value="paid">已支付</SelectOption>
            <SelectOption value="refunded">已退款</SelectOption>
          </Select>
        </FormItem>
        <FormItem label="下单时间">
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
        <div class="table-title">订单列表</div>
        <div class="table-action">
          <Tooltip title="刷新">
            <Button @click="fetchData">
              <template #icon><ReloadOutlined /></template>
            </Button>
          </Tooltip>
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
        <!-- 订单号和用户信息 -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'orderInfo'">
            <div>
              <div>订单号: {{ record.orderNo }}</div>
              <div>用户: {{ record.userName }}</div>
              <div>类型: {{ getOrderTypeText(record.orderType) }}</div>
            </div>
          </template>

          <!-- 订单金额 -->
          <template v-if="column.key === 'amount'">
            <div class="price">
              ¥{{ Number(record.totalAmount).toFixed(2) }}
            </div>
          </template>

          <!-- 订单状态 -->
          <template v-if="column.key === 'status'">
            <Tag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </Tag>
          </template>

          <!-- 支付状态 -->
          <template v-if="column.key === 'paymentStatus'">
            <Tag :color="getPaymentStatusColor(record.paymentStatus)">
              {{ getPaymentStatusText(record.paymentStatus) }}
            </Tag>
          </template>

          <!-- 时间信息 -->
          <template v-if="column.key === 'time'">
            <div>
              <div>下单: {{ formatDate(record.createdAt) }}</div>
              <div v-if="record.paymentTime">
                支付: {{ formatDate(record.paymentTime) }}
              </div>
            </div>
          </template>

          <!-- 操作 -->
          <template v-if="column.key === 'action'">
            <Space>
              <Button type="link" @click="() => handleDetail(record)">
                详情
              </Button>
              <template v-if="record.status === 'pending_payment'">
                <Popconfirm
                  title="确定取消该订单吗？"
                  @confirm="() => handleCancel(record)"
                  ok-text="确定"
                  cancel-text="取消"
                >
                  <Button type="link" danger>取消订单</Button>
                </Popconfirm>
              </template>
              <template v-if="record.status === 'pending_delivery'">
                <Button type="link" @click="() => handleShip(record)">
                  发货
                </Button>
              </template>
              <Button type="link" @click="() => handleRemark(record)">
                备注
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 订单详情弹窗 -->
    <Modal
      v-model:visible="detailVisible"
      title="订单详情"
      width="800px"
      :footer="null"
      :mask-closable="true"
    >
      <div v-if="currentOrder">
        <Descriptions title="基本信息" bordered :column="2">
          <DescriptionsItem label="订单号">
            {{ currentOrder.orderNo }}
          </DescriptionsItem>
          <DescriptionsItem label="下单时间">
            {{ formatDate(currentOrder.createdAt) }}
          </DescriptionsItem>
          <DescriptionsItem label="用户">
            {{ currentOrder.userName }}
          </DescriptionsItem>
          <DescriptionsItem label="总金额">
            ¥{{ Number(currentOrder.totalAmount).toFixed(2) }}
          </DescriptionsItem>
          <DescriptionsItem label="订单类型">
            {{ getOrderTypeText(currentOrder.orderType) }}
          </DescriptionsItem>
          <DescriptionsItem label="订单状态">
            <Tag :color="getStatusColor(currentOrder.status)">
              {{ getStatusText(currentOrder.status) }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="支付状态">
            <Tag :color="getPaymentStatusColor(currentOrder.paymentStatus)">
              {{ getPaymentStatusText(currentOrder.paymentStatus) }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="支付方式" :span="2">
            {{ currentOrder.paymentMethod || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="支付时间" :span="2">
            {{
              currentOrder.paymentTime
                ? formatDate(currentOrder.paymentTime)
                : '-'
            }}
          </DescriptionsItem>
          <DescriptionsItem label="发货时间" :span="2">
            {{
              currentOrder.deliveryTime
                ? formatDate(currentOrder.deliveryTime)
                : '-'
            }}
          </DescriptionsItem>
          <DescriptionsItem label="完成时间" :span="2">
            {{
              currentOrder.completionTime
                ? formatDate(currentOrder.completionTime)
                : '-'
            }}
          </DescriptionsItem>
          <DescriptionsItem label="备注" :span="2">
            {{ currentOrder.remark || '-' }}
          </DescriptionsItem>
        </Descriptions>

        <Divider />

        <Descriptions title="收货信息" bordered :column="1">
          <DescriptionsItem label="收货人">
            {{ currentOrder.consignee || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="联系电话">
            {{ currentOrder.phone || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="收货地址">
            {{ currentOrder.address || '-' }}
          </DescriptionsItem>
        </Descriptions>

        <Divider />

        <h3>商品信息</h3>
        <Table
          :columns="orderItemColumns"
          :data-source="currentOrder.items"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'product'">
              <div class="product-info">
                <img
                  v-if="record.productCover"
                  :src="record.productCover"
                  alt="商品图片"
                  class="product-img"
                />
                <div>{{ record.productName }}</div>
              </div>
            </template>
            <template v-if="column.key === 'price'">
              <div class="price">¥{{ Number(record.price).toFixed(2) }}</div>
            </template>
            <template v-if="column.key === 'total'">
              <div class="price">
                ¥{{ Number(record.totalAmount).toFixed(2) }}
              </div>
            </template>
          </template>
        </Table>
      </div>
    </Modal>

    <!-- 备注弹窗 -->
    <Modal
      v-model:visible="remarkVisible"
      title="订单备注"
      @ok="confirmRemark"
      :confirm-loading="submitLoading"
      @cancel="cancelRemark"
      ok-text="确定"
      cancel-text="取消"
    >
      <Form
        ref="remarkFormRef"
        :model="remarkForm"
        :rules="remarkFormRules"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 18 }"
      >
        <FormItem label="备注" name="remark">
          <Textarea
            v-model:value="remarkForm.remark"
            placeholder="请输入订单备注"
            :rows="4"
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- 发货弹窗 -->
    <Modal
      v-model:visible="shipVisible"
      title="订单发货"
      @ok="confirmShip"
      :confirm-loading="submitLoading"
      @cancel="cancelShip"
      ok-text="确定"
      cancel-text="取消"
    >
      <Form
        ref="shipFormRef"
        :model="shipForm"
        :rules="shipFormRules"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 18 }"
      >
        <FormItem label="快递公司" name="trackingCompany">
          <Input
            v-model:value="shipForm.trackingCompany"
            placeholder="请输入快递公司名称"
          />
        </FormItem>
        <FormItem label="快递单号" name="trackingNumber">
          <Input
            v-model:value="shipForm.trackingNumber"
            placeholder="请输入快递单号"
          />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>

<style lang="less" scoped>
.search-form {
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
  font-weight: bold;
}

.mb-20 {
  margin-bottom: 20px;
}

.product-info {
  display: flex;
  align-items: center;

  .product-img {
    width: 50px;
    height: 50px;
    object-fit: cover;
    margin-right: 8px;
  }
}
</style>
