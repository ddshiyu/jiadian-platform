<script lang="ts" setup>
import type { FormInstance, TablePaginationConfig } from 'ant-design-vue';
import type { RuleObject } from 'ant-design-vue/es/form/interface';
import type {
  UploadChangeParam,
  UploadFile,
} from 'ant-design-vue/lib/upload/interface';

import type { ProductListParams } from '#/api/core/operation';

import { computed, onMounted, reactive, ref, h } from 'vue';

import { useAccessStore, useUserStore } from '@vben/stores';

import { DownloadOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Divider,
  Form,
  FormItem,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  RadioGroup,
  Select,
  SelectOption,
  Space,
  Switch,
  Table,
  Tag,
  Textarea,
  Upload,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  createProductApi,
  deleteProductApi,
  downloadProductTemplateApi,
  getCategoryListApi,
  getProductDetailApi,
  getProductListApi,
  importProductsFromExcelApi,
  updateProductApi,
  updateProductStatusApi,
} from '#/api/core/operation';

import { saveAs } from 'file-saver';

const accessStore = useAccessStore();
const userStore = useUserStore();

// 计算当前用户是否为管理员
const isAdmin = computed(() => {
  return userStore.userInfo?.role === 'admin';
});

// 定义接口
interface CategoryOption {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  wholesalePrice?: number;
  wholesaleThreshold: number;
  vipPrice: number;
  stock: number;
  category?: Category;
  categoryId?: number | undefined;
  status: string;
  cover: string;
  images?: string[];
  isRecommended?: boolean;
  commissionAmount?: string;
  createdAt?: string;
  updatedAt?: string;
  // 仅前端使用的字段
  feeRate?: number; // 手续费百分比（不传给后端）
  basePrices?: {
    price: number;
    originalPrice: number;
    wholesalePrice: number;
    vipPrice: number;
  }; // 保存原始价格（不传给后端）
}

interface FileItem extends UploadFile {
  url: string;
}

// 搜索表单接口
interface SearchForm {
  name: string;
  categoryId: null | number;
  status: null | string;
  isRecommended: boolean | null;
}

// 表格列定义
const columns = [
  {
    title: '商品图片',
    dataIndex: 'cover',
    key: 'cover',
    width: 100,
  },
  {
    title: '商品名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '价格',
    dataIndex: 'price',
    key: 'price',
    width: 100,
  },
  {
    title: '批发价',
    dataIndex: 'wholesalePrice',
    key: 'wholesalePrice',
    width: 100,
  },
  {
    title: '批发阈值',
    dataIndex: 'wholesaleThreshold',
    key: 'wholesaleThreshold',
    width: 100,
  },
  {
    title: 'VIP价格',
    dataIndex: 'vipPrice',
    key: 'vipPrice',
    width: 100,
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    customRender: ({ record }: { record: Product }) =>
      record.category?.name || '-',
  },
  {
    title: '库存',
    dataIndex: 'stock',
    key: 'stock',
    width: 100,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
  {
    title: '推荐',
    dataIndex: 'isRecommended',
    key: 'isRecommended',
    width: 80,
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
    width: 200,
  },
];

// 搜索表单
const searchForm = reactive<SearchForm>({
  name: '',
  categoryId: null,
  status: null,
  isRecommended: null,
});

// 分类选项
const categoryOptions = ref<CategoryOption[]>([]);

// 表格数据
const tableData = ref<Product[]>([]);
const loading = ref(false);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条数据`,
});

// 表单数据
const formRef = ref<FormInstance | null>(null);
const formData = reactive<Product>({
  id: 0,
  name: '',
  description: '',
  price: 0,
  originalPrice: 0,
  wholesalePrice: 0,
  wholesaleThreshold: 0,
  vipPrice: 0,
  stock: 0,
  categoryId: undefined,
  status: 'off_sale',
  cover: '',
  images: [],
  isRecommended: false,
  commissionAmount: '',
  feeRate: 0,
  basePrices: {
    price: 0,
    originalPrice: 0,
    wholesalePrice: 0,
    vipPrice: 0,
  },
});

type FormRuleType = Record<string, RuleObject[]>;

const formRules: FormRuleType = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入商品价格', trigger: 'blur' }],
  wholesalePrice: [
    { required: true, message: '请输入批发价格', trigger: 'blur' },
  ],
  wholesaleThreshold: [
    { required: true, message: '请输入批发阈值', trigger: 'blur' },
  ],
  vipPrice: [{ required: true, message: '请输入VIP价格', trigger: 'blur' }],
  categoryId: [
    { required: true, message: '请选择商品分类', trigger: 'change' },
  ],
  status: [{ required: true, message: '请选择商品状态', trigger: 'change' }],
  stock: [{ required: true, message: '请输入库存数量', trigger: 'blur' }],
  commissionAmount: [
    {
      validator: (rule: RuleObject, value: string) => {
        if (!value) return Promise.resolve();

        // 支持百分比格式（如 "5%"）
        if (value.endsWith('%')) {
          const percent = parseFloat(value.slice(0, -1));
          if (isNaN(percent) || percent < 0 || percent > 100) {
            return Promise.reject('佣金百分比应在0-100%之间');
          }
          return Promise.resolve();
        }

        // 支持固定金额（如 "10"）
        const amount = parseFloat(value);
        if (isNaN(amount) || amount < 0) {
          return Promise.reject('佣金金额应为非负数或百分比格式（如：10 或 5%）');
        }

        return Promise.resolve();
      },
      trigger: 'blur'
    }
  ],
};

// 文件上传
const fileList = ref<FileItem[]>([]);
const imageFileList = ref<FileItem[]>([]);

// 弹窗控制
const modalVisible = ref(false);
const submitLoading = ref(false);
const modalTitle = computed(() => (formData.id ? '编辑商品' : '新增商品'));

// Excel导入相关
const importModalVisible = ref(false);
const importLoading = ref(false);
const uploadFileList = ref<UploadFile[]>([]);

// 上传相关
const uploadHeaders = {
  Authorization: `Bearer ${accessStore.accessToken}`,
};
const uploadUrl = `${import.meta.env.VITE_BASE_URL}/upload/image`;
// 处理封面图变化
const handleCoverChange = (info: UploadChangeParam) => {
  if (info.file.status === 'uploading') {
    return;
  }

  if (info.file.status === 'done') {
    // 从响应中获取图片URL
    const response = info.file.response;
    if (response.code === 0) {
      formData.cover = `${import.meta.env.VITE_BASE_URL}${response.data.image.url}`;
      message.success('封面图上传成功');
    } else {
      message.error('封面图上传失败');
    }
  } else if (info.file.status === 'error') {
    message.error('封面图上传失败');
  }
};

// 处理商品图片变化
const handleImagesChange = (info: UploadChangeParam) => {
  // 限制最多5张图片
  const fileList = [...info.fileList].slice(0, 5);
  imageFileList.value = fileList as FileItem[];

  // 处理上传完成的情况
  if (info.file.status === 'done') {
    // 从响应中获取图片URL
    const response = info.file.response;
    if (response.code === 0) {
      // 更新formData中的images数组
      formData.images = imageFileList.value
        .filter((file) => file.response?.data?.image?.url || file.url)
        .map(
          (file) =>
            `${import.meta.env.VITE_BASE_URL}${file.response?.data?.image?.url}`,
        );

      message.success('商品图片上传成功');
    }
  } else if (info.file.status === 'error') {
    message.error('商品图片上传失败');
  }
};

// 初始化
onMounted(() => {
  fetchCategoryOptions();
  fetchTableData();
});

// 获取分类选项
const fetchCategoryOptions = async () => {
  try {
    const response = await getCategoryListApi();
    // 将树形数据扁平化为选项列表
    if (response && response.list) {
      categoryOptions.value = flattenCategories(response.list);
    }
  } catch (error) {
    console.error('获取分类选项失败:', error);
    message.error('获取分类选项失败');
  }
};

// 将树形分类数据扁平化为选项列表
const flattenCategories = (categories: any[]) => {
  // 只返回一级分类（parentId为0或null的分类）
  return categories
    .filter((item) => !item.parentId || item.parentId === 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
    }));
};

// 获取表格数据
const fetchTableData = async () => {
  loading.value = true;
  try {
    const params: ProductListParams = {
      keyword: searchForm.name,
      categoryId: searchForm.categoryId || undefined,
      status: searchForm.status || undefined,
      isRecommended: searchForm.isRecommended,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    };

    const response = await getProductListApi(params);
    if (response) {
      tableData.value = response.list as unknown as Product[];
      pagination.total = response.total;
    }
    loading.value = false;
  } catch (error) {
    console.error('获取商品列表失败:', error);
    message.error('获取商品列表失败');
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
    name: '',
    categoryId: null,
    status: null,
    isRecommended: null,
  });
  pagination.current = 1;
  fetchTableData();
};

// 新增商品
const handleAdd = () => {
  const initialProduct: Product = {
    id: 0,
    name: '',
    description: '',
    price: 0,
    originalPrice: 0,
    wholesalePrice: 0,
    wholesaleThreshold: 0,
    vipPrice: 0,
    stock: 0,
    categoryId: undefined,
    status: 'off_sale', // 默认为下架状态
    cover: '',
    images: [],
    isRecommended: false,
    commissionAmount: '',
    feeRate: 0,
    basePrices: {
      price: 0,
      originalPrice: 0,
      wholesalePrice: 0,
      vipPrice: 0,
    },
  };

  Object.assign(formData, initialProduct);
  fileList.value = [];
  imageFileList.value = [];
  modalVisible.value = true;
};

// 编辑商品
const handleEdit = async (record: any) => {
  try {
    loading.value = true;
    // 获取详细信息
    const productData = await getProductDetailApi(record.id);
    loading.value = false;

    if (productData) {
      const productToEdit: Product = {
        id: productData.id || 0,
        name: productData.name,
        description: productData.description || '',
        price: productData.price,
        originalPrice: productData.originalPrice || 0,
        wholesalePrice: productData.wholesalePrice || 0,
        wholesaleThreshold: productData.wholesaleThreshold || 0,
        vipPrice: productData.vipPrice || 0,
        stock: productData.stock,
        categoryId: productData.categoryId,
        status: productData.status,
        cover: productData.cover || '',
        images: productData.images || [],
        isRecommended: productData.isRecommended || false,
        commissionAmount: productData.commissionAmount || '',
        feeRate: 0, // 编辑时手续费重置为0
        basePrices: {
          price: productData.price,
          originalPrice: productData.originalPrice || 0,
          wholesalePrice: productData.wholesalePrice || 0,
          vipPrice: productData.vipPrice || 0,
        },
      };

      // 如果不是管理员且商品当前为上架状态，编辑时强制改为下架
      if (!isAdmin.value && productToEdit.status === 'on_sale') {
        productToEdit.status = 'off_sale';
        message.warning('非管理员用户编辑商品时将自动设置为下架状态');
      }

      Object.assign(formData, productToEdit);

      fileList.value = productData.cover
        ? ([
            { uid: '-1', name: 'cover.jpg', url: productData.cover },
          ] as FileItem[])
        : [];
      imageFileList.value = (productData.images || []).map(
        (url: string, index: number) => ({
          uid: `-${index + 1}`,
          name: `image-${index}.jpg`,
          url,
        }),
      ) as FileItem[];

      modalVisible.value = true;
    }
  } catch (error) {
    loading.value = false;
    console.error('获取商品详情失败:', error);
    message.error('获取商品详情失败');
  }
};

// 删除商品
const handleDelete = async (record: any) => {
  try {
    await deleteProductApi(record.id);
    message.success('删除成功');
    fetchTableData();
  } catch (error) {
    console.error('删除商品失败:', error);
    message.error('删除商品失败');
  }
};

// 修改商品状态
const handleStatusChange = async (record: any) => {
  try {
    const newStatus = record.status === 'on_sale' ? 'off_sale' : 'on_sale';

    // 验证非管理员不能将商品上架
    if (!isAdmin.value && newStatus === 'on_sale') {
      message.error('只有管理员可以将商品设置为上架状态');
      return;
    }

    await updateProductStatusApi(record.id, newStatus);
    message.success(newStatus === 'on_sale' ? '商品已上架' : '商品已下架');
    fetchTableData();
  } catch (error) {
    console.error('修改商品状态失败:', error);
    message.error('修改商品状态失败');
  }
};

// 取消
const handleCancel = () => {
  modalVisible.value = false;
};

// 提交表单
const handleSubmit = async () => {
  if (formRef.value) {
    try {
      await formRef.value.validate();

      // 验证非管理员不能设置商品为上架状态
      if (!isAdmin.value && formData.status === 'on_sale') {
        message.error('只有管理员可以将商品设置为上架状态');
        return;
      }

      submitLoading.value = true;

      // 准备提交的数据（排除前端专用字段）
      const productData: any = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        originalPrice: formData.originalPrice,
        wholesalePrice: formData.wholesalePrice || 0,
        wholesaleThreshold: formData.wholesaleThreshold || 0,
        vipPrice: formData.vipPrice || 0,
        stock: formData.stock,
        categoryId: formData.categoryId as number,
        status: formData.status as 'off_sale' | 'on_sale',
        cover: formData.cover,
        images: formData.images,
        isRecommended: formData.isRecommended,
        commissionAmount: formData.commissionAmount,
        // 注意：feeRate 和 basePrices 不传给后端
      };

      try {
        if (formData.id) {
          // 更新商品
          await updateProductApi(formData.id as number, productData);
          message.success('修改成功');
        } else {
          // 创建商品
          await createProductApi(productData);
          message.success('添加成功');
        }

        submitLoading.value = false;
        modalVisible.value = false;
        fetchTableData();
      } catch (error) {
        submitLoading.value = false;
        console.error('保存商品失败:', error);
        message.error('保存商品失败');
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  }
};

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

// 格式化日期
const formatDate = (date: string): string => {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

// 根据手续费率重新计算价格
const calculatePricesWithFee = () => {
  if (!formData.basePrices || !formData.feeRate) {
    return;
  }

  const feeMultiplier = 1 + (formData.feeRate / 100);

  formData.price = Number((formData.basePrices.price * feeMultiplier).toFixed(2));
  formData.originalPrice = Number((formData.basePrices.originalPrice * feeMultiplier).toFixed(2));
  formData.wholesalePrice = Number((formData.basePrices.wholesalePrice * feeMultiplier).toFixed(2));
  formData.vipPrice = Number((formData.basePrices.vipPrice * feeMultiplier).toFixed(2));
};

// 保存基础价格（不含手续费的价格）
const saveBasePrices = () => {
  if (!formData.basePrices) {
    formData.basePrices = {
      price: 0,
      originalPrice: 0,
      wholesalePrice: 0,
      vipPrice: 0,
    };
  }

  formData.basePrices.price = formData.price;
  formData.basePrices.originalPrice = formData.originalPrice || 0;
  formData.basePrices.wholesalePrice = formData.wholesalePrice || 0;
  formData.basePrices.vipPrice = formData.vipPrice || 0;
};

// 手续费变化处理
const handleFeeRateChange = (value: number | string | null) => {
  if (value === null || value === undefined) {
    formData.feeRate = 0;
    return;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  formData.feeRate = isNaN(numValue) ? 0 : numValue;
  calculatePricesWithFee();
};

// 下载商品导入模板
const handleDownloadTemplate = async () => {
  try {
    console.log('开始下载模板...');
    const blob = await downloadProductTemplateApi();
    console.log('收到Blob:', { size: blob.size, type: blob.type });

    // 验证 Blob 对象
    if (!blob || !(blob instanceof Blob) || blob.size === 0) {
      throw new Error('下载的文件为空或格式不正确');
    }

    // 使用中文文件名
    const fileName = '商品导入模板.xlsx';

    // 使用 file-saver 下载
    try {
      saveAs(blob, fileName);
      message.success('模板下载成功');
    } catch (saveError) {
      console.error('file-saver 保存失败:', saveError);
      // 回退到原生方法
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('模板下载成功');
    }
  } catch (error) {
    console.error('下载模板失败:', error);
    message.error(`下载模板失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 打开Excel导入弹窗
const handleOpenImport = () => {
  uploadFileList.value = [];
  importModalVisible.value = true;
};

// Excel文件上传前校验
const beforeExcelUpload = (file: UploadFile): boolean => {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                 file.type === 'application/vnd.ms-excel';
  if (!isExcel) {
    message.error('只能上传Excel格式的文件!');
  }
  const isLt10M = (file.size || 0) / 1024 / 1024 < 10;
  if (!isLt10M) {
    message.error('文件大小不能超过10MB!');
  }
  return isExcel && isLt10M;
};

// Excel文件上传变化处理
const handleExcelUploadChange = (info: UploadChangeParam) => {
  uploadFileList.value = [...info.fileList].slice(-1); // 只保留最新的一个文件
};

// 确认Excel导入
const handleConfirmImport = async () => {
  if (uploadFileList.value.length === 0) {
    message.error('请选择要导入的Excel文件');
    return;
  }

  const uploadFile = uploadFileList.value[0];
  if (!uploadFile?.originFileObj) {
    message.error('文件格式错误');
    return;
  }

  const file = uploadFile.originFileObj;

  try {
    importLoading.value = true;
    console.log('开始Excel导入，文件名:', file.name, '大小:', file.size);

    const response = await importProductsFromExcelApi(file as File);
    console.log('Excel导入响应:', response);

    if (response.success) {
      message.success(`导入成功！成功导入 ${response.data?.successCount || 0} 个商品`);
      importModalVisible.value = false;
      uploadFileList.value = [];
      // 刷新商品列表
      await fetchTableData();
    } else {
      throw new Error(response.message || '导入失败');
    }
  } catch (error: any) {
    console.error('Excel导入失败:', error);

    // 显示详细错误信息
    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const errors = error.response.data.errors;
      const errorCount = error.response.data.totalErrors || errors.length;

      // 创建错误详情弹窗
      Modal.error({
        title: `导入失败 (共${errorCount}个错误)`,
        content: h('div', { style: 'max-height: 300px; overflow-y: auto;' }, [
          h('div', { style: 'margin-bottom: 10px; color: #666;' }, '请修正以下错误后重新导入：'),
          h('ol', { style: 'margin: 0; padding-left: 20px;' },
            errors.slice(0, 20).map((err: string) => h('li', { style: 'margin-bottom: 5px;' }, err))
          ),
          errorCount > 20 ? h('div', { style: 'margin-top: 10px; color: #999;' }, `还有 ${errorCount - 20} 个错误未显示...`) : null
        ]),
        width: 600,
        okText: '我知道了'
      });
    } else if (error.response?.data?.message) {
      message.error(error.response.data.message);
    } else if (error.message) {
      message.error(error.message);
    } else {
      message.error('Excel导入失败，请检查文件格式');
    }
  } finally {
    importLoading.value = false;
  }
};

// 取消Excel导入
const handleCancelImport = () => {
  uploadFileList.value = [];
  importModalVisible.value = false;
};

</script>

<template>
  <div>
    <Card :bordered="false" class="mb-20">
      <Form
        :model="searchForm"
        layout="inline"
        class="search-form"
        @submit.prevent="handleSearch"
      >
        <FormItem label="商品名称">
          <Input
            v-model:value="searchForm.name"
            placeholder="请输入商品名称"
            allow-clear
          />
        </FormItem>
        <FormItem label="商品分类">
          <Select
            v-model:value="searchForm.categoryId as any"
            placeholder="请选择商品分类"
            style="width: 200px"
            allow-clear
          >
            <SelectOption :value="null">全部</SelectOption>
            <SelectOption
              v-for="item in categoryOptions"
              :key="item.id"
              :value="item.id"
            >
              {{ item.name }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem label="商品状态">
          <Select
            v-model:value="searchForm.status as any"
            placeholder="请选择商品状态"
            style="width: 200px"
            allow-clear
          >
            <SelectOption :value="null">全部</SelectOption>
            <SelectOption value="on_sale">在售</SelectOption>
            <SelectOption value="off_sale">下架</SelectOption>
          </Select>
        </FormItem>
        <FormItem label="是否推荐">
          <Select
            v-model:value="searchForm.isRecommended as any"
            placeholder="请选择是否推荐"
            style="width: 200px"
            allow-clear
          >
            <SelectOption :value="null">全部</SelectOption>
            <SelectOption value="true">推荐</SelectOption>
            <SelectOption value="false">不推荐</SelectOption>
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
        <div class="table-title">商品列表</div>
        <div class="table-action">
          <Space>
            <Button @click="handleDownloadTemplate">
              <template #icon><DownloadOutlined /></template>
              下载模板
            </Button>
            <Button @click="handleOpenImport">
              <template #icon><UploadOutlined /></template>
              Excel导入
            </Button>
            <Button type="primary" @click="handleAdd">
              <template #icon><PlusOutlined /></template>
              新增商品
            </Button>
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
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'cover'">
            <div class="product-cover">
              <Image
                :src="record.cover || '/images/default-product.png'"
                alt="商品图片"
                :preview="true"
              />
            </div>
          </template>
          <template v-if="column.key === 'price'">
            <span class="price">¥{{ record.price }}</span>
          </template>
          <template v-if="column.key === 'wholesalePrice'">
            <span class="price">¥{{ record.wholesalePrice }}</span>
          </template>
          <template v-if="column.key === 'wholesaleThreshold'">
            <span>
              {{ record.wholesaleThreshold || '-' }}
              {{ record.wholesaleThreshold ? '件' : '' }}
            </span>
          </template>
          <template v-if="column.key === 'vipPrice'">
            <span class="price">¥{{ record.vipPrice }}</span>
          </template>
          <template v-if="column.key === 'status'">
            <Tag :color="record.status === 'on_sale' ? 'green' : 'orange'">
              {{ record.status === 'on_sale' ? '在售' : '下架' }}
            </Tag>
          </template>
          <template v-if="column.key === 'isRecommended'">
            <Tag :color="record.isRecommended ? 'blue' : 'default'">
              {{ record.isRecommended ? '是' : '否' }}
            </Tag>
          </template>
          <template v-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>
          <template v-if="column.key === 'action'">
            <Space>
              <a @click="handleEdit(record)">编辑</a>
              <Divider type="vertical" />
              <Popconfirm
                title="确定删除该商品吗？"
                @confirm="handleDelete(record)"
                ok-text="确定"
                cancel-text="取消"
              >
                <a class="danger-link">删除</a>
              </Popconfirm>
              <Divider type="vertical" />
              <a
                v-if="isAdmin || record.status === 'on_sale'"
                @click="handleStatusChange(record)"
              >
                {{ record.status === 'on_sale' ? '下架' : '上架' }}
              </a>
              <span v-else class="disabled-text">
                上架（需管理员权限）
              </span>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 新增/编辑商品弹窗 -->
    <Modal
      v-model:visible="modalVisible"
      :title="modalTitle"
      width="800px"
      :mask-closable="false"
      @cancel="handleCancel"
    >
      <Form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 18 }"
      >
        <FormItem label="商品名称" name="name">
          <Input v-model:value="formData.name" placeholder="请输入商品名称" />
        </FormItem>
        <FormItem label="商品分类" name="categoryId">
          <Select
            v-model:value="formData.categoryId"
            placeholder="请选择商品分类"
          >
            <SelectOption
              v-for="item in categoryOptions"
              :key="item.id"
              :value="item.id"
            >
              {{ item.name }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem label="商品价格" name="price">
          <InputNumber
            v-model:value="formData.price"
            placeholder="请输入商品价格"
            :min="0"
            :precision="2"
            style="width: 100%"
            @change="saveBasePrices"
          />
        </FormItem>
        <FormItem label="原价" name="originalPrice">
          <InputNumber
            v-model:value="formData.originalPrice"
            placeholder="请输入商品原价"
            :min="0"
            :precision="2"
            style="width: 100%"
            @change="saveBasePrices"
          />
        </FormItem>
        <FormItem label="批发价格" name="wholesalePrice" required>
          <InputNumber
            v-model:value="formData.wholesalePrice"
            placeholder="请输入批发价格"
            :min="0"
            :precision="2"
            style="width: 100%"
            @change="saveBasePrices"
          />
        </FormItem>
        <FormItem label="批发阈值" name="wholesaleThreshold" required>
          <InputNumber
            v-model:value="formData.wholesaleThreshold"
            placeholder="请输入批发阈值（件）"
            :min="0"
            style="width: 100%"
          />
          <div class="form-item-help">达到此数量可享受批发价</div>
        </FormItem>
        <FormItem label="VIP价格" name="vipPrice" required>
          <InputNumber
            v-model:value="formData.vipPrice"
            placeholder="请输入VIP价格"
            :min="0"
            :precision="2"
            style="width: 100%"
            @change="saveBasePrices"
          />
          <div class="form-item-help">VIP会员专享价格</div>
        </FormItem>
        <FormItem label="手续费率" name="feeRate">
          <InputNumber
            v-model:value="formData.feeRate"
            placeholder="请输入手续费率"
            :min="0"
            :max="100"
            :precision="2"
            style="width: 100%"
            addon-after="%"
            @change="handleFeeRateChange"
          />
          <div class="form-item-help">
            输入手续费率后将自动重新计算各项价格（此字段仅用于前端计算，不会保存到后端）
          </div>
        </FormItem>
        <FormItem label="佣金设置" name="commissionAmount">
          <Input
            v-model:value="formData.commissionAmount"
            placeholder="请输入佣金（如：10 或 5%）"
            style="width: 100%"
          />
          <div class="form-item-help">
            支持两种格式：固定金额（如：10）或百分比（如：5%）
          </div>
        </FormItem>
        <FormItem label="库存" name="stock">
          <InputNumber
            v-model:value="formData.stock"
            placeholder="请输入库存数量"
            :min="0"
            style="width: 100%"
          />
        </FormItem>
        <FormItem label="状态" name="status">
          <RadioGroup v-model:value="formData.status">
            <Radio value="on_sale" :disabled="!isAdmin">上架</Radio>
            <Radio value="off_sale">下架</Radio>
          </RadioGroup>
          <div v-if="!isAdmin" class="form-item-help text-warning">
            提示：只有管理员可以将商品设置为上架状态
          </div>
        </FormItem>
        <FormItem label="是否推荐" name="isRecommended">
          <Switch
            v-model:checked="formData.isRecommended"
            checked-children="是"
            un-checked-children="否"
          />
        </FormItem>
        <FormItem label="封面图" name="cover">
          <Upload
            v-model:file-list="fileList"
            list-type="picture-card"
            :show-upload-list="false"
            :action="uploadUrl"
            :headers="uploadHeaders"
            name="image"
            :before-upload="beforeUpload"
            @change="handleCoverChange"
          >
            <div v-if="formData.cover">
              <img :src="formData.cover" alt="商品封面" style="width: 100%" />
            </div>
            <div v-else>
              <PlusOutlined />
              <div style="margin-top: 8px">上传</div>
            </div>
          </Upload>
        </FormItem>
        <FormItem label="商品图片" name="images">
          <Upload
            v-model:file-list="imageFileList"
            list-type="picture-card"
            :action="uploadUrl"
            :headers="uploadHeaders"
            name="image"
            :before-upload="beforeUpload"
            @change="handleImagesChange"
          >
            <div v-if="imageFileList.length >= 5">
              <div>最多上传5张</div>
            </div>
            <div v-else>
              <PlusOutlined />
              <div style="margin-top: 8px">上传</div>
            </div>
          </Upload>
        </FormItem>
        <FormItem label="商品描述" name="description">
          <Textarea
            v-model:value="formData.description"
            placeholder="请输入商品描述"
            :rows="4"
          />
        </FormItem>
      </Form>
      <template #footer>
        <Button @click="handleCancel">取消</Button>
        <Button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </Button>
      </template>
    </Modal>

    <!-- Excel导入弹窗 -->
    <Modal
      v-model:visible="importModalVisible"
      title="Excel批量导入商品"
      width="600px"
      :mask-closable="false"
      @cancel="handleCancelImport"
    >
      <div class="import-content">
        <div class="import-tips">
          <h4>导入说明：</h4>
          <ul>
            <li>请先下载模板文件，按照模板格式填写商品信息</li>
            <li>必填字段：商品名称、商品价格、批发价格、批发阈值、VIP价格、库存数量、分类ID、商品状态</li>
            <li>商品状态只能填写：on_sale（上架）或 off_sale（下架）</li>
            <li>是否推荐只能填写：true 或 false</li>
            <li>佣金设置支持两种格式：固定金额（如：10）或百分比（如：5%）</li>
            <li>分类ID请参考模板中的分类参考表</li>
            <li>多张商品图片URL请用英文逗号分隔</li>
            <li>文件大小不能超过10MB</li>
          </ul>
        </div>

        <div class="upload-area">
          <Upload
            v-model:file-list="uploadFileList"
            :before-upload="beforeExcelUpload"
            :max-count="1"
            accept=".xlsx,.xls"
            @change="handleExcelUploadChange"
          >
            <Button>
              <template #icon><UploadOutlined /></template>
              选择Excel文件
            </Button>
          </Upload>
          <div class="upload-tip">支持扩展名：.xlsx .xls</div>
        </div>
      </div>

      <template #footer>
        <Button @click="handleCancelImport">取消</Button>
        <Button type="primary" :loading="importLoading" @click="handleConfirmImport">
          确认导入
        </Button>
      </template>
    </Modal>
  </div>
</template>

<style lang="less" scoped>
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

.product-cover {
  width: 60px;
  height: 60px;
  overflow: hidden;
  border-radius: 4px;

  :deep(.ant-image) {
    width: 100%;
    height: 100%;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
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

.form-item-help {
  font-size: 12px;
  color: #999;
  margin-top: 4px;

  &.text-warning {
    color: #faad14;
  }
}

.disabled-text {
  color: #d9d9d9;
  cursor: not-allowed;
}

.import-content {
  .import-tips {
    margin-bottom: 24px;
    padding: 16px;
    background-color: #f6f8fa;
    border-radius: 6px;

    h4 {
      margin: 0 0 12px 0;
      color: #1890ff;
    }

    ul {
      margin: 0;
      padding-left: 20px;

      li {
        margin-bottom: 8px;
        color: #666;
        line-height: 1.4;
      }
    }
  }

  .upload-area {
    text-align: center;
    padding: 24px;
    border: 2px dashed #d9d9d9;
    border-radius: 6px;
    background-color: #fafafa;

    .upload-tip {
      margin-top: 12px;
      color: #999;
      font-size: 12px;
    }
  }
}
</style>
