<script setup lang="ts">
import type { TableColumnsType } from 'ant-design-vue';

import type { MiniAppUser } from '#/api/core/operation';

import { h, onMounted, ref } from 'vue';

import {
  Form,
  Input,
  message,
  Modal,
  Select,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  addMiniAppUserApi,
  deleteMiniAppUserApi,
  getMiniAppUserListApi,
  updateMiniAppUserApi,
} from '#/api/core/operation';

const dataSource = ref<MiniAppUser[]>([]);
const loading = ref(false);
const visible = ref(false);
const formRef = ref();
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
});
const formState = ref<Partial<MiniAppUser>>({
  trueName: '',
  photoUrl: '',
  gender: 0,
  age: 0,
  location: '',
  industry: '',
  companyName: '',
  jobName: '',
  phoneNumber: '',
  wxNumber: '',
  companyScale: '',
  revenueScale: '',
  personalProfile: '',
  appeals: '',
  advantage: '',
  userLevel: 0,
  status: 0,
});

const genderOptions = [
  { label: '男', value: 1 },
  { label: '女', value: 2 },
];

const statusOptions = [
  { label: '正常', value: 1 },
  { label: '禁用', value: 0 },
];

const userLevelOptions = [
  { label: '会员', value: 1 },
  { label: '非会员', value: 0 },
];

const columns: TableColumnsType = [
  {
    title: '姓名',
    dataIndex: 'trueName',
    key: 'trueName',
  },
  {
    title: '头像',
    dataIndex: 'photoUrl',
    key: 'photoUrl',
    customRender: ({ text }) => {
      return text
        ? h('img', {
            src: text,
            style:
              'width: 40px; height: 40px; border-radius: 50%; object-fit: cover;',
          })
        : '无';
    },
  },
  {
    title: '性别',
    dataIndex: 'gender',
    key: 'gender',
    customRender: ({ text }) => {
      const gender = genderOptions.find((option) => option.value === text);
      return gender ? gender.label : '未知';
    },
  },
  {
    title: '年龄',
    dataIndex: 'age',
    key: 'age',
  },
  {
    title: '地区',
    dataIndex: 'location',
    key: 'location',
  },
  {
    title: '行业',
    dataIndex: 'industry',
    key: 'industry',
  },
  {
    title: '公司',
    dataIndex: 'companyName',
    key: 'companyName',
  },
  {
    title: '职位',
    dataIndex: 'jobName',
    key: 'jobName',
  },
  {
    title: '手机号',
    dataIndex: 'phoneNumber',
    key: 'phoneNumber',
  },
  {
    title: '微信号',
    dataIndex: 'wxNumber',
    key: 'wxNumber',
  },
  {
    title: '会员状态',
    dataIndex: 'userLevel',
    key: 'userLevel',
    customRender: ({ text }) => {
      const level = userLevelOptions.find((option) => option.value === text);
      return h(
        Tag,
        { color: text === 1 ? 'gold' : 'default' },
        () => level?.label || '未知',
      );
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    customRender: ({ text }) => {
      return h(
        Tag,
        {
          color: text === 0 ? 'success' : 'error',
        },
        text === 0 ? '激活' : '禁用',
      );
    },
  },
  // {
  //   title: '操作',
  //   key: 'action',
  //   customRender: ({ record }) => {
  //     return h('div', [
  //       h(
  //         Button,
  //         {
  //           type: 'link',
  //           onClick: () => handleEdit(record),
  //         },
  //         () => '编辑',
  //       ),
  //       h(
  //         Button,
  //         {
  //           type: 'link',
  //           danger: true,
  //           onClick: () => handleDelete(record),
  //         },
  //         () => '删除',
  //       ),
  //     ]);
  //   },
  // },
];

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getMiniAppUserListApi({
      pageNum: pagination.value.current,
      pageSize: pagination.value.pageSize,
    });
    dataSource.value = res.row;
    pagination.value.total = res.total;
  } catch {
    message.error('获取数据失败');
  } finally {
    loading.value = false;
  }
};

const handleTableChange = (pag: any) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchData();
};

const handleAdd = () => {
  formState.value = {
    trueName: '',
    photoUrl: '',
    gender: 1,
    age: 0,
    location: '',
    industry: '',
    companyName: '',
    jobName: '',
    phoneNumber: '',
    wxNumber: '',
    companyScale: '',
    revenueScale: '',
    personalProfile: '',
    appeals: '',
    advantage: '',
    userLevel: 0,
    status: 1,
  };
  visible.value = true;
};

const handleEdit = (record: MiniAppUser) => {
  formState.value = { ...record };
  visible.value = true;
};

const handleDelete = async (record: MiniAppUser) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除该用户吗？',
    async onOk() {
      try {
        await deleteMiniAppUserApi({ id: record.cardId.toString() });
        message.success('删除成功');
        await fetchData();
      } catch {
        message.error('删除失败');
      }
    },
  });
};

const handleSubmit = async () => {
  try {
    await formRef.value.validateFields();
    const data = {
      ...formState.value,
    };
    await (formState.value.cardId
      ? updateMiniAppUserApi(data)
      : addMiniAppUserApi(data));
    message.success('保存成功');
    visible.value = false;
    await fetchData();
  } catch {
    message.error('保存失败');
  }
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="users-container">
    <div class="header">
      <h1>用户管理</h1>
      <!-- <Button type="primary" @click="handleAdd">新增用户</Button> -->
    </div>

    <Table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      row-key="cardId"
      :pagination="pagination"
      @change="handleTableChange"
    />

    <Modal
      v-model:visible="visible"
      :title="formState.cardId ? '编辑用户' : '新增用户'"
      @ok="handleSubmit"
      @cancel="() => (visible = false)"
    >
      <Form ref="formRef" :model="formState" layout="vertical">
        <Form.Item
          name="trueName"
          label="姓名"
          :rules="[{ required: true, message: '请输入姓名' }]"
        >
          <Input v-model:value="formState.trueName" placeholder="请输入姓名" />
        </Form.Item>

        <Form.Item
          name="photoUrl"
          label="头像"
          :rules="[{ required: true, message: '请上传头像' }]"
        >
          <Input
            v-model:value="formState.photoUrl"
            placeholder="请输入头像链接"
          />
        </Form.Item>

        <Form.Item
          name="gender"
          label="性别"
          :rules="[{ required: true, message: '请选择性别' }]"
        >
          <Select v-model:value="formState.gender" :options="genderOptions" />
        </Form.Item>

        <Form.Item
          name="age"
          label="年龄"
          :rules="[{ required: true, message: '请输入年龄' }]"
        >
          <Input
            v-model:value="formState.age"
            type="number"
            placeholder="请输入年龄"
          />
        </Form.Item>

        <Form.Item
          name="location"
          label="地区"
          :rules="[{ required: true, message: '请输入地区' }]"
        >
          <Input v-model:value="formState.location" placeholder="请输入地区" />
        </Form.Item>

        <Form.Item
          name="industry"
          label="行业"
          :rules="[{ required: true, message: '请输入行业' }]"
        >
          <Input v-model:value="formState.industry" placeholder="请输入行业" />
        </Form.Item>

        <Form.Item
          name="companyName"
          label="公司名称"
          :rules="[{ required: true, message: '请输入公司名称' }]"
        >
          <Input
            v-model:value="formState.companyName"
            placeholder="请输入公司名称"
          />
        </Form.Item>

        <Form.Item
          name="jobName"
          label="职位"
          :rules="[{ required: true, message: '请输入职位' }]"
        >
          <Input v-model:value="formState.jobName" placeholder="请输入职位" />
        </Form.Item>

        <Form.Item
          name="phoneNumber"
          label="手机号"
          :rules="[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式' },
          ]"
        >
          <Input
            v-model:value="formState.phoneNumber"
            placeholder="请输入手机号"
          />
        </Form.Item>

        <Form.Item
          name="wxNumber"
          label="微信号"
          :rules="[{ required: true, message: '请输入微信号' }]"
        >
          <Input
            v-model:value="formState.wxNumber"
            placeholder="请输入微信号"
          />
        </Form.Item>

        <Form.Item
          name="companyScale"
          label="公司规模"
          :rules="[{ required: true, message: '请输入公司规模' }]"
        >
          <Input
            v-model:value="formState.companyScale"
            placeholder="请输入公司规模"
          />
        </Form.Item>

        <Form.Item
          name="revenueScale"
          label="营收规模"
          :rules="[{ required: true, message: '请输入营收规模' }]"
        >
          <Input
            v-model:value="formState.revenueScale"
            placeholder="请输入营收规模"
          />
        </Form.Item>

        <Form.Item
          name="personalProfile"
          label="个人简介"
          :rules="[{ required: true, message: '请输入个人简介' }]"
        >
          <Input.TextArea
            v-model:value="formState.personalProfile"
            placeholder="请输入个人简介"
            :rows="4"
          />
        </Form.Item>

        <Form.Item
          name="appeals"
          label="诉求"
          :rules="[{ required: true, message: '请输入诉求' }]"
        >
          <Input.TextArea
            v-model:value="formState.appeals"
            placeholder="请输入诉求"
            :rows="4"
          />
        </Form.Item>

        <Form.Item
          name="advantage"
          label="优势"
          :rules="[{ required: true, message: '请输入优势' }]"
        >
          <Input.TextArea
            v-model:value="formState.advantage"
            placeholder="请输入优势"
            :rows="4"
          />
        </Form.Item>

        <Form.Item
          name="status"
          label="状态"
          :rules="[{ required: true, message: '请选择状态' }]"
        >
          <Select v-model:value="formState.status" :options="statusOptions" />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.users-container {
  padding: 24px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header h1 {
  margin: 0;
  font-size: 24px;
}
</style>
