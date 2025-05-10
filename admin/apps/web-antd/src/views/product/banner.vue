<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';
import type { RuleObject } from 'ant-design-vue/es/form/interface';
import type {
  UploadChangeParam,
  UploadFile,
} from 'ant-design-vue/lib/upload/interface';

import type { Banner } from '#/api/core/operation';

import { computed, onMounted, reactive, ref } from 'vue';

import { useAccessStore } from '@vben/stores';

import { PlusOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Divider,
  Form,
  FormItem,
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
  Table,
  Tag,
  Upload,
} from 'ant-design-vue';

import {
  createBannerApi,
  deleteBannerApi,
  getBannerListApi,
  updateBannerApi,
} from '#/api/core/operation';

// 定义Banner数据接口
interface BannerItem {
  id: number;
  image: string;
  content: string;
  link: string;
  sort: number;
  status: string;
}

// 类型定义
interface FileItem extends UploadFile {
  url: string;
}

// 表格列定义
const columns = [
  {
    title: '图片',
    dataIndex: 'image',
    key: 'image',
    width: 150,
  },
  {
    title: '内容描述',
    dataIndex: 'content',
    key: 'content',
    width: '30%',
  },
  // {
  //   title: '跳转链接',
  //   dataIndex: 'link',
  //   key: 'link',
  //   width: '30%',
  // },
  {
    title: '排序',
    dataIndex: 'sort',
    key: 'sort',
    width: 80,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
  },
];

// 表格数据
const tableData = ref<BannerItem[]>([]);
const loading = ref(false);

const accessStore = useAccessStore();

// 上传相关
const uploadHeaders = {
  Authorization: `Bearer ${accessStore.accessToken}`,
};

const uploadUrl = `${import.meta.env.VITE_BASE_URL}/upload/image`;

// 编辑模式标识
const editMode = ref(false);

// 表单数据
const formRef = ref<FormInstance | null>(null);
const formData = reactive<BannerItem>({
  id: 0,
  image: '',
  content: '',
  link: '',
  sort: 0,
  status: 'active',
});

type FormRuleType = Record<string, RuleObject[]>;

const formRules: FormRuleType = {
  image: [{ required: true, message: '请上传Banner图片', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
};

// 文件上传
const fileList = ref<FileItem[]>([]);

// 弹窗控制
const modalVisible = ref(false);
const submitLoading = ref(false);
const modalTitle = computed(() => {
  return formData.id ? '编辑Banner' : '新增Banner';
});

// 搜索表单接口
interface SearchForm {
  content: string;
  status: string;
}

// 搜索表单
const searchForm = reactive<SearchForm>({
  content: '',
  status: '',
});

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: (total: number) => `共 ${total} 条记录`,
  onChange: (page: number) => {
    pagination.current = page;
  },
});

// 初始化
onMounted(() => {
  fetchBannerData();
});

// 获取Banner数据
const fetchBannerData = async () => {
  loading.value = true;
  try {
    const result = await getBannerListApi();
    if (result) {
      // 转换API返回的Banner数据格式为组件所需格式
      const allBanners = convertBannerData(result);

      // 根据筛选条件过滤数据
      const filteredData =
        searchForm.content || searchForm.status
          ? filterBanners(allBanners, searchForm)
          : allBanners;

      // 更新表格数据和分页信息
      tableData.value = filteredData;
      pagination.total = filteredData.length;

      // 如果当前页码超出范围，重置为第一页
      if (
        filteredData.length > 0 &&
        Math.ceil(filteredData.length / pagination.pageSize) <
          pagination.current
      ) {
        pagination.current = 1;
      }
    }
    loading.value = false;
  } catch (error) {
    console.error('获取Banner列表失败:', error);
    message.error('获取Banner列表失败');
    loading.value = false;
  }
};

// 转换Banner数据格式
const convertBannerData = (banners: any): BannerItem[] => {
  // 这里将API返回的Banner数据转换为组件需要的格式
  if (!banners || !banners.list) {
    return [];
  }

  return banners.list.map((item: any) => ({
    id: item.id || 0,
    image: item.image || '',
    content: item.content || '',
    link: item.link || '',
    sort: item.sort || 0,
    status: item.status || 'active',
  }));
};

// 过滤Banner数据
const filterBanners = (
  banners: BannerItem[],
  filters: SearchForm,
): BannerItem[] => {
  return banners.filter((banner) => {
    let contentMatch = true;
    let statusMatch = true;

    if (filters.content) {
      contentMatch = banner.content.includes(filters.content);
    }

    if (filters.status) {
      statusMatch = banner.status === filters.status;
    }

    return contentMatch && statusMatch;
  });
};

// 搜索
const handleSearch = () => {
  fetchBannerData();
};

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    content: '',
    status: '',
  });
  fetchBannerData();
};

// 添加Banner按钮点击事件
const handleAddClick = () => {
  handleAdd();
};

// 新增Banner
const handleAdd = () => {
  editMode.value = false;
  Object.assign(formData, {
    id: 0,
    image: '',
    content: '',
    link: '',
    sort: 0,
    status: 'active',
  });
  fileList.value = [];
  modalVisible.value = true;
};

// 编辑Banner
const handleEdit = (record: BannerItem) => {
  editMode.value = true;
  Object.assign(formData, {
    id: record.id,
    image: record.image,
    content: record.content,
    link: record.link,
    sort: record.sort,
    status: record.status,
  });

  fileList.value = record.image
    ? ([{ uid: '-1', name: 'banner.jpg', url: record.image }] as FileItem[])
    : [];
  modalVisible.value = true;
};

// 删除Banner
const handleDelete = async (record: BannerItem) => {
  try {
    await deleteBannerApi(record.id);
    message.success('删除成功');
    fetchBannerData();
  } catch (error) {
    console.error('删除Banner失败:', error);
    message.error('删除Banner失败');
  }
};

// 取消
const handleCancel = () => {
  modalVisible.value = false;
  editMode.value = false;
};

// 提交表单
const handleSubmit = async () => {
  if (formRef.value) {
    try {
      await formRef.value.validate();
      submitLoading.value = true;

      // 准备提交的数据
      const bannerData: Banner = {
        image: formData.image,
        content: formData.content,
        link: formData.link,
        sort: formData.sort,
        status: formData.status as 'active' | 'inactive',
      };

      try {
        if (formData.id) {
          // 更新Banner
          await updateBannerApi(formData.id, bannerData);
          message.success('修改成功');
        } else {
          // 创建Banner
          await createBannerApi(bannerData);
          message.success('添加成功');
        }

        // 重新获取Banner列表
        await fetchBannerData();
        // 关闭弹窗
        modalVisible.value = false;
        editMode.value = false;
      } catch (error) {
        console.error('保存Banner失败:', error);
        message.error('保存Banner失败');
      } finally {
        submitLoading.value = false;
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
    message.error('只能上传JPG/PNG格式的图片!');
  }
  const isLt2M = file.size !== undefined && file.size / 1024 / 1024 < 2;
  if (!isLt2M) {
    message.error('图片必须小于2MB!');
  }
  return isJpgOrPng && isLt2M;
};

// 处理图片变化
const handleImageChange = (info: UploadChangeParam) => {
  if (info.file.status === 'uploading') {
    return;
  }
  if (info.file.status === 'done') {
    // 图片上传成功，获取URL
    formData.image = `${import.meta.env.VITE_BASE_URL}${info.file.response.data.image.url}`;
  }
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
        <FormItem label="内容描述">
          <Input
            v-model:value="searchForm.content"
            placeholder="请输入Banner内容描述"
            allow-clear
          />
        </FormItem>
        <FormItem label="状态">
          <Select
            v-model:value="searchForm.status"
            placeholder="请选择状态"
            style="width: 140px"
            allow-clear
          >
            <SelectOption value="">全部</SelectOption>
            <SelectOption value="active">启用</SelectOption>
            <SelectOption value="inactive">禁用</SelectOption>
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
        <div class="table-title">Banner管理</div>
        <div class="table-action">
          <Button type="primary" @click="handleAddClick">
            <template #icon><PlusOutlined /></template>
            新增Banner
          </Button>
        </div>
      </div>

      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'image'">
            <div class="banner-image">
              <img v-if="record.image" :src="record.image" alt="Banner图片" />
              <div v-else class="no-image">无</div>
            </div>
          </template>
          <template v-if="column.key === 'status'">
            <Tag :color="record.status === 'active' ? 'green' : 'orange'">
              {{ record.status === 'active' ? '启用' : '禁用' }}
            </Tag>
          </template>
          <template v-if="column.key === 'action'">
            <Space>
              <a @click="() => handleEdit(record as BannerItem)">编辑</a>
              <Divider type="vertical" />
              <Popconfirm
                title="确定删除该Banner吗？"
                @confirm="() => handleDelete(record as BannerItem)"
                ok-text="确定"
                cancel-text="取消"
              >
                <a class="danger-link">删除</a>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 新增/编辑Banner弹窗 -->
    <Modal
      v-model:visible="modalVisible"
      :title="modalTitle"
      width="600px"
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
        <FormItem label="图片" name="image">
          <Upload
            v-model:file-list="fileList"
            list-type="picture-card"
            :show-upload-list="false"
            :action="uploadUrl"
            :headers="uploadHeaders"
            name="image"
            :before-upload="beforeUpload"
            @change="handleImageChange"
          >
            <div v-if="formData.image">
              <img :src="formData.image" alt="Banner图片" style="width: 100%" />
            </div>
            <div v-else>
              <PlusOutlined />
              <div style="margin-top: 8px">上传</div>
            </div>
          </Upload>
        </FormItem>
        <FormItem label="内容描述" name="content">
          <Input
            v-model:value="formData.content"
            placeholder="请输入Banner内容描述"
          />
        </FormItem>
        <!-- <FormItem label="跳转链接" name="link">
          <Input
            v-model:value="formData.link"
            placeholder="请输入Banner跳转链接"
          />
        </FormItem> -->
        <FormItem label="排序" name="sort">
          <InputNumber
            v-model:value="formData.sort"
            placeholder="数字越小越靠前"
            :min="0"
            style="width: 100%"
          />
        </FormItem>
        <FormItem label="状态" name="status">
          <RadioGroup v-model:value="formData.status">
            <Radio value="active">启用</Radio>
            <Radio value="inactive">禁用</Radio>
          </RadioGroup>
        </FormItem>
      </Form>
      <template #footer>
        <Button @click="handleCancel">取消</Button>
        <Button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </Button>
      </template>
    </Modal>
  </div>
</template>

<style lang="less" scoped>
.search-form {
  margin-bottom: 16px;

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

.banner-image {
  width: 120px;
  height: 60px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #eee;
  border-radius: 4px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .no-image {
    font-size: 12px;
    color: #999;
  }
}

.danger-link {
  color: #f5222d;

  &:hover {
    color: #ff4d4f;
  }
}

.mb-20 {
  margin-bottom: 20px;
}
</style>
