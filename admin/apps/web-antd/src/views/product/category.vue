<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';
import type { RuleObject } from 'ant-design-vue/es/form/interface';
import type {
  UploadChangeParam,
  UploadFile,
} from 'ant-design-vue/lib/upload/interface';

import type { Category } from '#/api/core/operation';

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
  Textarea,
  Upload,
} from 'ant-design-vue';

import {
  createCategoryApi,
  deleteCategoryApi,
  getCategoryListApi,
  updateCategoryApi,
} from '#/api/core/operation';
// 定义分类数据接口
interface CategoryItem {
  id: number;
  name: string;
  icon: string;
  sort: number;
  status: string;
  parentId: number;
  description: string;
}

// 类型定义
interface FileItem extends UploadFile {
  url: string;
}

// 表格列定义
const columns = [
  {
    title: '分类名称',
    dataIndex: 'name',
    key: 'name',
    width: '30%',
  },
  {
    title: '图标',
    dataIndex: 'icon',
    key: 'icon',
    width: 100,
  },
  {
    title: '排序',
    dataIndex: 'sort',
    key: 'sort',
    width: 100,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
  },
];

// 表格数据
const tableData = ref<CategoryItem[]>([]);
const loading = ref(false);

const accessStore = useAccessStore();
const uploadUrl = `${import.meta.env.VITE_BASE_URL}/upload/image`;
// 上传相关
const uploadHeaders = {
  Authorization: `Bearer ${accessStore.accessToken}`,
};

// 编辑模式标识
const editMode = ref(false);

// 表单数据
const formRef = ref<FormInstance | null>(null);
const formData = reactive<CategoryItem>({
  id: 0,
  name: '',
  parentId: 0, // 始终为0，表示一级分类
  icon: '',
  sort: 0,
  status: 'active',
  description: '',
});

type FormRuleType = Record<string, RuleObject[]>;

const formRules: FormRuleType = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择分类状态', trigger: 'change' }],
};

// 文件上传
const fileList = ref<FileItem[]>([]);

// 弹窗控制
const modalVisible = ref(false);
const submitLoading = ref(false);
const modalTitle = computed(() => {
  return formData.id ? '编辑分类' : '新增分类';
});

// 搜索表单接口
interface SearchForm {
  name: string;
  status: string;
}

// 搜索表单
const searchForm = reactive<SearchForm>({
  name: '',
  status: '',
});

// 初始化
onMounted(() => {
  fetchCategoryData();
});

// 获取分类数据
const fetchCategoryData = async () => {
  loading.value = true;
  try {
    const result = await getCategoryListApi();
    if (result) {
      // 转换API返回的分类数据格式为组件所需格式
      const allCategories = convertCategoryData(result);

      // 根据筛选条件过滤数据
      tableData.value =
        searchForm.name || searchForm.status
          ? filterCategories(allCategories, searchForm)
          : allCategories;
    }
    loading.value = false;
  } catch (error) {
    console.error('获取分类列表失败:', error);
    message.error('获取分类列表失败');
    loading.value = false;
  }
};

// 转换分类数据格式
const convertCategoryData = (categories: Category[]): CategoryItem[] => {
  // 这里将API返回的分类数据转换为组件需要的格式
  // 只保留一级分类
  return categories.list
    .filter((item: any) => !item.parentId || item.parentId === 0)
    .map((item: any) => ({
      id: item.id || 0,
      name: item.name,
      icon: item.icon || '',
      sort: item.sort || 0,
      status: 'active', // 根据实际API返回的状态字段调整
      parentId: 0,
      description: item.description || '',
    }));
};

// 过滤分类数据
const filterCategories = (
  categories: CategoryItem[],
  filters: SearchForm,
): CategoryItem[] => {
  return categories.filter((category) => {
    let nameMatch = true;
    let statusMatch = true;

    if (filters.name) {
      nameMatch = category.name.includes(filters.name);
    }

    if (filters.status) {
      statusMatch = category.status === filters.status;
    }

    return nameMatch && statusMatch;
  });
};

// 搜索
const handleSearch = () => {
  fetchCategoryData();
};

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    name: '',
    status: '',
  });
  fetchCategoryData();
};

// 添加分类按钮点击事件
const handleAddClick = () => {
  handleAdd();
};

// 新增分类
const handleAdd = () => {
  editMode.value = false;
  Object.assign(formData, {
    id: 0,
    name: '',
    parentId: 0,
    icon: '',
    sort: 0,
    status: 'active',
    description: '',
  });
  fileList.value = [];
  modalVisible.value = true;
};

// 编辑分类
const handleEdit = (record: CategoryItem) => {
  editMode.value = true;
  Object.assign(formData, {
    id: record.id,
    name: record.name,
    parentId: 0,
    icon: record.icon,
    sort: record.sort,
    status: record.status,
    description: record.description || '',
  });

  fileList.value = record.icon
    ? ([{ uid: '-1', name: 'icon.jpg', url: record.icon }] as FileItem[])
    : [];
  modalVisible.value = true;
};

// 删除分类
const handleDelete = async (record: CategoryItem) => {
  try {
    await deleteCategoryApi(record.id);
    message.success('删除成功');
    fetchCategoryData();
  } catch (error) {
    console.error('删除分类失败:', error);
    message.error('删除分类失败');
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
      const categoryData: Category = {
        name: formData.name,
        icon: formData.icon,
        sort: formData.sort,
        parentId: 0, // 始终为0，表示一级分类
      };

      try {
        if (formData.id) {
          // 更新分类
          await updateCategoryApi(formData.id, categoryData);
          message.success('修改成功');
        } else {
          // 创建分类
          await createCategoryApi(categoryData);
          message.success('添加成功');
        }

        // 重新获取分类列表
        await fetchCategoryData();
        // 关闭弹窗
        modalVisible.value = false;
        editMode.value = false;
      } catch (error) {
        console.error('保存分类失败:', error);
        message.error('保存分类失败');
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

// 处理图标变化
const handleIconChange = (info: UploadChangeParam) => {
  if (info.file.status === 'uploading') {
    return;
  }
  if (info.file.status === 'done') {
    // 这里应该获取上传后的URL
    formData.icon = `${import.meta.env.VITE_BASE_URL}${info.file.response.data.image.url}`;

    // 实际项目中，这里应该调用上传API，获取服务器返回的图片URL
    // 示例：
    // const response = info.file.response;
    // formData.icon = response.url;
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
        <FormItem label="分类名称">
          <Input
            v-model:value="searchForm.name"
            placeholder="请输入分类名称"
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
        <div class="table-title">商品分类</div>
        <div class="table-action">
          <Button type="primary" @click="handleAddClick">
            <template #icon><PlusOutlined /></template>
            新增分类
          </Button>
        </div>
      </div>

      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'icon'">
            <div class="category-icon">
              <img v-if="record.icon" :src="record.icon" alt="分类图标" />
              <div v-else class="no-icon">无</div>
            </div>
          </template>
          <template v-if="column.key === 'status'">
            <Tag :color="record.status === 'active' ? 'green' : 'orange'">
              {{ record.status === 'active' ? '启用' : '禁用' }}
            </Tag>
          </template>
          <template v-if="column.key === 'action'">
            <Space>
              <a @click="() => handleEdit(record as CategoryItem)">编辑</a>
              <Divider type="vertical" />
              <Popconfirm
                title="确定删除该分类吗？"
                @confirm="() => handleDelete(record as CategoryItem)"
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

    <!-- 新增/编辑分类弹窗 -->
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
        <FormItem label="分类名称" name="name">
          <Input v-model:value="formData.name" placeholder="请输入分类名称" />
        </FormItem>
        <FormItem label="分类图标" name="icon">
          <Upload
            v-model:file-list="fileList"
            list-type="picture-card"
            :show-upload-list="false"
            :action="uploadUrl"
            :headers="uploadHeaders"
            name="image"
            :before-upload="beforeUpload"
            @change="handleIconChange"
          >
            <div v-if="formData.icon">
              <img :src="formData.icon" alt="分类图标" style="width: 100%" />
            </div>
            <div v-else>
              <PlusOutlined />
              <div style="margin-top: 8px">上传</div>
            </div>
          </Upload>
        </FormItem>
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
        <FormItem label="描述" name="description">
          <Textarea
            v-model:value="formData.description"
            placeholder="请输入分类描述"
            :rows="3"
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

.category-icon {
  width: 32px;
  height: 32px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .no-icon {
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
