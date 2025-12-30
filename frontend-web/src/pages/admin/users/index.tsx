import React, { useEffect, useState } from 'react';
import { Table, Button, Select, Input, Space, Tag, message, Modal } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminService } from '@/services/admin';
import type { User, Role } from '@/types';

const { Option } = Select;

const roleColors: Record<string, string> = {
  admin: 'red',
  doctor: 'blue',
  health_manager: 'green',
  patient: 'default',
};

const roleLabels: Record<string, string> = {
  admin: '管理员',
  doctor: '医生',
  health_manager: '健康管理师',
  patient: '患者',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({ role: '', status: '', search: '' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({ page, pageSize, ...filters });
      setUsers(res.data.items);
      setTotal(res.data.total);
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, filters]);

  const handleRoleChange = (userId: number, role: string) => {
    Modal.confirm({
      title: '确认修改角色',
      content: `确定要修改该用户的角色为 ${roleLabels[role]} 吗？`,
      onOk: async () => {
        try {
          await adminService.updateUserRole(userId, role);
          message.success('角色修改成功');
          fetchUsers();
        } catch (error) {
          message.error('角色修改失败');
        }
      },
    });
  };

  const handleStatusToggle = (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    Modal.confirm({
      title: '确认修改状态',
      content: `确定要${newStatus === 'active' ? '启用' : '禁用'}该用户吗？`,
      onOk: async () => {
        try {
          await adminService.updateUserStatus(userId, newStatus);
          message.success('状态修改成功');
          fetchUsers();
        } catch (error) {
          message.error('状态修改失败');
        }
      },
    });
  };

  const columns: ColumnsType<User> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '用户名', dataIndex: 'username', width: 150 },
    { title: '邮箱', dataIndex: 'email', width: 200 },
    {
      title: '角色',
      dataIndex: 'role',
      width: 150,
      render: (role: Role, record) => (
        <Select
          value={role}
          style={{ width: 120 }}
          onChange={(value) => handleRoleChange(record.id, value)}
        >
          <Option value="patient">患者</Option>
          <Option value="doctor">医生</Option>
          <Option value="health_manager">健康管理师</Option>
          <Option value="admin">管理员</Option>
        </Select>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Button
          size="small"
          danger={record.status === 'active'}
          onClick={() => handleStatusToggle(record.id, record.status)}
        >
          {record.status === 'active' ? '禁用' : '启用'}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>用户管理</h2>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索用户名或邮箱"
          prefix={<SearchOutlined />}
          style={{ width: 200 }}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <Select
          placeholder="角色筛选"
          style={{ width: 150 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, role: value || '' })}
        >
          <Option value="patient">患者</Option>
          <Option value="doctor">医生</Option>
          <Option value="health_manager">健康管理师</Option>
          <Option value="admin">管理员</Option>
        </Select>
        <Select
          placeholder="状态筛选"
          style={{ width: 120 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, status: value || '' })}
        >
          <Option value="active">启用</Option>
          <Option value="inactive">禁用</Option>
        </Select>
      </Space>
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: setPage,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    </div>
  );
}
