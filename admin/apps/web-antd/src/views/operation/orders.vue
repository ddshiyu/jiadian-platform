<script lang="ts" setup>
import type { FormInstance, TablePaginationConfig } from 'ant-design-vue';
import type { RuleObject } from 'ant-design-vue/es/form/interface';
import type { UploadFile } from 'ant-design-vue/lib/upload/interface';
import type { Dayjs } from 'dayjs';

import type { Order, OrderListParams, Merchant } from '#/api/core/operation';

import { onMounted, reactive, ref } from 'vue';

import { useAccessStore } from '@vben/stores';

import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue';
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
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Table,
  TabPane,
  Tabs,
  Tag,
  Textarea,
  Tooltip,
  Upload,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  cancelOrderApi,
  getOrderDetailApi,
  getOrderListApi,
  getRefundOrderListApi,
  handleRefundApi,
  remarkOrderApi,
  settleOrderApi,
  shipOrderApi,
} from '#/api/core/operation';

const { RangePicker } = DatePicker;
const accessStore = useAccessStore();
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
    title: '结算状态',
    key: 'settlementStatus',
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
  deliveryImages: [] as string[],
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

interface FileItem extends UploadFile {
  url: string;
}

// 图片上传相关
const deliveryImageFileList = ref<FileItem[]>([]);
const uploadHeaders = {
  Authorization: `Bearer ${accessStore.accessToken}`,
};
const uploadUrl = `${import.meta.env.VITE_BASE_URL}/upload/image`;

// 处理上传前校验
const beforeUpload = (file: any) => {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!isJpgOrPng) {
    message.error('只能上传JPG或PNG格式的图片!');
  }
  const isLt2M = file.size / 1024 / 1024 < 2;
  if (!isLt2M) {
    message.error('图片大小不能超过2MB!');
  }
  return isJpgOrPng && isLt2M;
};

// 处理上传图片变化
const handleDeliveryImagesChange = (info: any) => {
  // 限制最多5张图片
  const fileList = [...info.fileList].slice(0, 5);
  deliveryImageFileList.value = fileList;

  // 处理上传完成的情况
  if (info.file.status === 'done') {
    const response = info.file.response;
    if (response && response.code === 0) {
      // 更新shipForm中的deliveryImages数组
      shipForm.deliveryImages = deliveryImageFileList.value
        .filter((file) => file.response?.data?.image?.url || file.url)
        .map(
          (file) =>
            `${import.meta.env.VITE_BASE_URL}${file.response?.data?.image?.url}`,
        );

      message.success(`${info.file.name} 上传成功`);
    } else {
      message.error(`${info.file.name} 上传失败`);
    }
  } else if (info.file.status === 'error') {
    message.error(`${info.file.name} 上传失败`);
  }
};

// 状态表单控制
const statusVisible = ref(false);
const statusForm = reactive({
  orderId: 0,
  status: '' as '' | 'approved' | 'rejected',
  remark: '',
});
const statusFormRef = ref<FormInstance | null>(null);
const statusFormRules = {
  status: [
    {
      required: true,
      message: '请选择操作结果',
      trigger: 'change',
      type: 'string',
    },
  ] as RuleObject[],
};

// 结算表单控制
const settlementVisible = ref(false);
const settlementForm = reactive({
  orderId: 0,
  settlementAmount: 0 as number,
  remark: '',
});
const settlementFormRef = ref<FormInstance | null>(null);
const settlementFormRules = {
  settlementAmount: [
    {
      required: true,
      message: '请输入结算金额',
      trigger: 'change',
      type: 'number',
    },
    {
      min: 0.01,
      message: '结算金额必须大于0.01',
      trigger: 'change',
      type: 'number',
    },
  ] as RuleObject[],
};

// Tab 切换
const activeTab = ref<string>('all');
const handleTabChange = (activeKey: any) => {
  activeTab.value = activeKey as string;
  // 重置搜索条件
  handleReset();
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
      // 根据当前标签页选择不同的API
      const res =
        activeTab.value === 'refund'
          ? await getRefundOrderListApi(params)
          : await getOrderListApi(params);

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
      settlementStatus: (
        status === 'completed' && paymentStatus === 'paid'
          ? (Math.random() > 0.7 ? 'settled' : Math.random() > 0.5 ? 'settling' : 'unsettled')
          : 'unsettled'
      ) as Order['settlementStatus'],
      settlementTime: (
        status === 'completed' && paymentStatus === 'paid' && Math.random() > 0.5
          ? new Date(Date.now() - Math.random() * 86_400_000 * 7).toISOString()
          : undefined
      ),
      settlementAmount: (
        status === 'completed' && paymentStatus === 'paid' && Math.random() > 0.5
          ? Number((Math.floor(Math.random() * 10_000) / 100 + 100) * 0.95) // 确保是数字类型，结算金额略低于订单金额
          : undefined
      ),
      settlementRemark: (
        status === 'completed' && paymentStatus === 'paid' && Math.random() > 0.5
          ? `订单结算完成${index + 1}`
          : undefined
      ),
      paymentTime:
        paymentStatus === 'unpaid'
          ? undefined
          : new Date(
              Date.now() - Math.random() * 86_400_000 * 30,
            ).toISOString(),
      deliveryTime: ['completed', 'delivered'].includes(status as string)
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
      merchant: {
        id: Math.floor(index / 5) + 1,
        username: `merchant${Math.floor(index / 5) + 1}`,
        name: `商家${Math.floor(index / 5) + 1}`,
        phone: `1380000${String(Math.floor(index / 5) + 1).padStart(4, '0')}`,
        email: `merchant${Math.floor(index / 5) + 1}@example.com`,
        role: Math.random() > 0.8 ? 'admin' as const : 'user' as const,
        paymentMethods: {
          qrCodes: [
            {
              type: 'wechat' as const,
              imageUrl: `https://via.placeholder.com/200x200?text=微信收款码${Math.floor(index / 5) + 1}`,
              name: `微信收款码${Math.floor(index / 5) + 1}`,
            },
            {
              type: 'alipay' as const,
              imageUrl: `https://via.placeholder.com/200x200?text=支付宝收款码${Math.floor(index / 5) + 1}`,
              name: `支付宝收款码${Math.floor(index / 5) + 1}`,
            },
          ],
          bankCards: [
            {
              bankName: '中国银行',
              cardNumber: `6217000${String(Math.floor(index / 5) + 1).padStart(10, '0')}`,
              accountName: `商家${Math.floor(index / 5) + 1}`,
            },
            {
              bankName: '招商银行',
              cardNumber: `6225000${String(Math.floor(index / 5) + 1).padStart(10, '0')}`,
              accountName: `商家${Math.floor(index / 5) + 1}`,
            },
          ],
        },
      },
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
  shipForm.deliveryImages = [];
  deliveryImageFileList.value = [];
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

    // 传递三个必要参数以及发货图片数组
    await shipOrderApi(
      shipForm.orderId,
      shipForm.trackingNumber,
      shipForm.trackingCompany,
      shipForm.deliveryImages,
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

// 获取token
const handleRefund = (record: any) => {
  statusForm.orderId = record.id;
  statusForm.status = '';
  statusForm.remark = '';
  statusVisible.value = true;
};

// 取消退款处理
const cancelStatus = () => {
  statusVisible.value = false;
};

// 确认退款处理
const confirmStatus = async () => {
  if (!statusFormRef.value) return;

  try {
    await statusFormRef.value.validate();
    submitLoading.value = true;

    // 后端API期望的参数名是action
    const action = statusForm.status as 'approved' | 'rejected';

    // 只有在有备注内容时才传入remark参数
    const remark = statusForm.remark || undefined;

    await handleRefundApi(statusForm.orderId, action, remark);

    message.success(
      statusForm.status === 'approved' ? '退款申请已通过' : '退款申请已拒绝',
    );
    statusVisible.value = false;
    fetchData();
  } catch (error) {
    console.error('处理退款失败:', error);
    message.error('处理退款失败');
  } finally {
    submitLoading.value = false;
  }
};

// 结算订单
const handleSettle = (record: any) => {
  settlementForm.orderId = record.id;
  settlementForm.settlementAmount = Number(record.totalAmount); // 确保是数字类型
  settlementForm.remark = '';
  settlementVisible.value = true;
};

// 取消结算
const cancelSettlement = () => {
  settlementVisible.value = false;
};

// 确认结算
const confirmSettlement = async () => {
  if (!settlementFormRef.value) return;

  try {
    await settlementFormRef.value.validate();
    submitLoading.value = true;

    // 确保传递数字类型的金额
    const settlementAmount = Number(settlementForm.settlementAmount);

    await settleOrderApi(
      settlementForm.orderId,
      settlementAmount,
      settlementForm.remark,
    );

    message.success('订单结算成功');
    settlementVisible.value = false;
    fetchData();
  } catch (error) {
    console.error('订单结算失败:', error);
    message.error('订单结算失败');
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
    refund_pending: '退款处理中',
    refund_approved: '退款已通过',
    refund_rejected: '退款已拒绝',
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
    refund_pending: 'gold',
    refund_approved: 'purple',
    refund_rejected: 'volcano',
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

// 获取结算状态文本
const getSettlementStatusText = (status: Order['settlementStatus']) => {
  const statusMap: Record<Order['settlementStatus'], string> = {
    unsettled: '未结算',
    settling: '结算中',
    settled: '已结算',
  };
  return statusMap[status] || status;
};

// 获取结算状态颜色
const getSettlementStatusColor = (status: Order['settlementStatus']) => {
  const colorMap: Record<Order['settlementStatus'], string> = {
    unsettled: 'orange',
    settling: 'blue',
    settled: 'green',
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

// 获取二维码类型文本
const getQRCodeTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    wechat: '微信',
    alipay: '支付宝',
    other: '其他',
  };
  return typeMap[type] || type;
};

// 获取二维码类型颜色
const getQRCodeTypeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    wechat: 'green',
    alipay: 'blue',
    other: 'orange',
  };
  return colorMap[type] || 'default';
};

// 隐藏银行卡号
const maskCardNumber = (cardNumber: string) => {
  if (!cardNumber) return '-';
  const length = cardNumber.length;
  if (length <= 8) return cardNumber;
  const start = cardNumber.slice(0, 4);
  const end = cardNumber.slice(-4);
  const masked = '*'.repeat(length - 8);
  return `${start}${masked}${end}`;
};

// 处理图片加载错误
const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1zaXplPSIxMiI+5LiN5q+V6L6J5YqgPC90ZXh0Pgo8L3N2Zz4K';
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

      <Tabs v-model:active-key="activeTab" @change="handleTabChange">
        <TabPane tab="所有订单" key="all">
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

              <!-- 结算状态 -->
              <template v-if="column.key === 'settlementStatus'">
                <Tag :color="getSettlementStatusColor(record.settlementStatus)">
                  {{ getSettlementStatusText(record.settlementStatus) }}
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
                  <template v-if="record.status === 'refund_pending'">
                    <Button type="link" @click="() => handleRefund(record)">
                      处理退款
                    </Button>
                  </template>
                  <template v-if="record.status === 'completed' && record.settlementStatus === 'unsettled'">
                    <Button type="link" @click="() => handleSettle(record)">
                      结算
                    </Button>
                  </template>
                  <Button type="link" @click="() => handleRemark(record)">
                    备注
                  </Button>
                </Space>
              </template>
            </template>
          </Table>
        </TabPane>
        <TabPane tab="退款订单" key="refund">
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

              <!-- 结算状态 -->
              <template v-if="column.key === 'settlementStatus'">
                <Tag :color="getSettlementStatusColor(record.settlementStatus)">
                  {{ getSettlementStatusText(record.settlementStatus) }}
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
                  <template v-if="record.status === 'refund_pending'">
                    <Button type="link" @click="() => handleRefund(record)">
                      处理退款
                    </Button>
                  </template>
                  <template v-if="record.status === 'completed' && record.settlementStatus === 'unsettled'">
                    <Button type="link" @click="() => handleSettle(record)">
                      结算
                    </Button>
                  </template>
                  <Button type="link" @click="() => handleRemark(record)">
                    备注
                  </Button>
                </Space>
              </template>
            </template>
          </Table>
        </TabPane>
      </Tabs>
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
          <DescriptionsItem label="结算状态">
            <Tag :color="getSettlementStatusColor(currentOrder.settlementStatus)">
              {{ getSettlementStatusText(currentOrder.settlementStatus) }}
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
          <DescriptionsItem label="结算时间" :span="2">
            {{
              currentOrder.settlementTime
                ? formatDate(currentOrder.settlementTime)
                : '-'
            }}
          </DescriptionsItem>
          <DescriptionsItem label="结算金额" :span="2">
            {{
              currentOrder.settlementAmount
                ? `¥${Number(currentOrder.settlementAmount).toFixed(2)}`
                : '-'
            }}
          </DescriptionsItem>
          <DescriptionsItem label="结算备注" :span="2">
            {{ currentOrder.settlementRemark || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="备注" :span="2">
            {{ currentOrder.remark || '-' }}
          </DescriptionsItem>
        </Descriptions>

        <Divider />

        <Descriptions title="商家信息" bordered :column="2">
          <DescriptionsItem label="商家名称">
            {{ currentOrder.merchant?.name || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="商家用户名">
            {{ currentOrder.merchant?.username || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="联系电话">
            {{ currentOrder.merchant?.phone || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="邮箱地址">
            {{ currentOrder.merchant?.email || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="角色类型" :span="2">
            <Tag :color="currentOrder.merchant?.role === 'admin' ? 'red' : 'blue'">
              {{ currentOrder.merchant?.role === 'admin' ? '超级管理员' : '商家用户' }}
            </Tag>
          </DescriptionsItem>
        </Descriptions>

        <Divider />

        <Descriptions title="商家收款信息" bordered :column="1">
          <!-- 二维码收款方式 -->
          <DescriptionsItem label="收款码" v-if="currentOrder.merchant?.paymentMethods?.qrCodes?.length">
            <div class="payment-qrcodes">
              <div
                v-for="(qrCode, index) in currentOrder.merchant.paymentMethods.qrCodes"
                :key="index"
                class="qrcode-item"
              >
                <div class="qrcode-header">
                  <Tag :color="getQRCodeTypeColor(qrCode.type)">
                    {{ getQRCodeTypeText(qrCode.type) }}
                  </Tag>
                  <span class="qrcode-name">{{ qrCode.name }}</span>
                </div>
                <div class="qrcode-image">
                  <img
                    :src="qrCode.imageUrl"
                    :alt="qrCode.name"
                    class="qrcode-img"
                    @error="handleImageError"
                  />
                </div>
              </div>
            </div>
          </DescriptionsItem>
          <DescriptionsItem label="收款码" v-else>
            <span class="no-data">暂无收款码信息</span>
          </DescriptionsItem>

          <!-- 银行卡收款方式 -->
          <DescriptionsItem label="银行卡" v-if="currentOrder.merchant?.paymentMethods?.bankCards?.length">
            <div class="payment-bankcards">
              <div
                v-for="(bankCard, index) in currentOrder.merchant.paymentMethods.bankCards"
                :key="index"
                class="bankcard-item"
              >
                <div class="bankcard-info">
                  <div class="bankcard-row">
                    <span class="bankcard-label">银行名称：</span>
                    <span class="bankcard-value">{{ bankCard.bankName }}</span>
                  </div>
                  <div class="bankcard-row">
                    <span class="bankcard-label">账户名：</span>
                    <span class="bankcard-value">{{ bankCard.accountName }}</span>
                  </div>
                  <div class="bankcard-row">
                    <span class="bankcard-label">卡号：</span>
                    <span class="bankcard-value">{{ maskCardNumber(bankCard.cardNumber) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </DescriptionsItem>
          <DescriptionsItem label="银行卡" v-else>
            <span class="no-data">暂无银行卡信息</span>
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
        <FormItem label="发货图片">
          <Upload
            v-model:file-list="deliveryImageFileList"
            list-type="picture-card"
            :action="uploadUrl"
            :headers="uploadHeaders"
            name="image"
            :before-upload="beforeUpload"
            @change="handleDeliveryImagesChange"
          >
            <div v-if="deliveryImageFileList.length >= 5">
              <div>最多上传5张</div>
            </div>
            <div v-else>
              <PlusOutlined />
              <div style="margin-top: 8px">上传</div>
            </div>
          </Upload>
          <div class="upload-hint">
            请上传发货图片，最多5张，支持jpg、png格式
          </div>
        </FormItem>
      </Form>
    </Modal>

    <!-- 状态弹窗 -->
    <Modal
      v-model:visible="statusVisible"
      title="处理退款申请"
      @ok="confirmStatus"
      :confirm-loading="submitLoading"
      @cancel="cancelStatus"
      ok-text="确定"
      cancel-text="取消"
    >
      <Form
        ref="statusFormRef"
        :model="statusForm"
        :rules="statusFormRules"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 18 }"
      >
        <FormItem label="操作结果" name="status">
          <Select
            v-model:value="statusForm.status"
            placeholder="请选择操作结果"
          >
            <SelectOption value="approved">通过</SelectOption>
            <SelectOption value="rejected">拒绝</SelectOption>
          </Select>
        </FormItem>
        <FormItem label="备注" name="remark">
          <Textarea
            v-model:value="statusForm.remark"
            placeholder="请输入备注"
            :rows="4"
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- 结算弹窗 -->
    <Modal
      v-model:visible="settlementVisible"
      title="订单结算"
      @ok="confirmSettlement"
      :confirm-loading="submitLoading"
      @cancel="cancelSettlement"
      ok-text="确定"
      cancel-text="取消"
    >
      <Form
        ref="settlementFormRef"
        :model="settlementForm"
        :rules="settlementFormRules"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 18 }"
      >
        <FormItem label="结算金额" name="settlementAmount">
          <InputNumber
            v-model:value="settlementForm.settlementAmount"
            :min="0.01"
            :step="0.01"
            :precision="2"
            placeholder="请输入结算金额"
            addon-before="¥"
            style="width: 100%"
          />
        </FormItem>
        <FormItem label="结算备注" name="remark">
          <Textarea
            v-model:value="settlementForm.remark"
            placeholder="请输入结算备注"
            :rows="4"
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

.upload-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

// 收款信息样式
.payment-qrcodes {
  .qrcode-item {
    margin-bottom: 16px;
    padding: 12px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    background-color: #fafafa;

    &:last-child {
      margin-bottom: 0;
    }

    .qrcode-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;

      .qrcode-name {
        margin-left: 8px;
        font-weight: 500;
      }
    }

    .qrcode-image {
      text-align: center;

      .qrcode-img {
        max-width: 120px;
        max-height: 120px;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
      }
    }
  }
}

.payment-bankcards {
  .bankcard-item {
    margin-bottom: 16px;
    padding: 12px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    background-color: #fafafa;

    &:last-child {
      margin-bottom: 0;
    }

    .bankcard-info {
      .bankcard-row {
        display: flex;
        margin-bottom: 8px;

        &:last-child {
          margin-bottom: 0;
        }

        .bankcard-label {
          width: 80px;
          color: #666;
          font-weight: 500;
        }

        .bankcard-value {
          flex: 1;
          color: #333;
        }
      }
    }
  }
}

.no-data {
  color: #999;
  font-style: italic;
}
</style>
