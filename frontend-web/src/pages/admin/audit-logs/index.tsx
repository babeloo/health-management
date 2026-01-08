import React, { useEffect, useState } from 'react';
import { Table, Input, DatePicker, Space, Button, message, Tag } from 'antd';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { adminService } from '@/services/admin';
import type { AuditLog } from '@/types';

const { RangePicker } = DatePicker;

const actionColors: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  LOGIN: 'cyan',
  LOGOUT: 'default',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({
    action: '',
    startDate: '',
    endDate: '',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAuditLogs({ page, pageSize, ...filters });
      setLogs(res.data.items);
      setTotal(res.data.total);
    } catch (error) {
      message.error('获取审计日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const handleExport = async () => {
    try {
      const blob = await adminService.exportAuditLogs({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${dayjs().format('YYYY-MM-DD')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleDateChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (dates) {
      setFilters({
        ...filters,
        startDate: dates[0]?.format('YYYY-MM-DD') || '',
        endDate: dates[1]?.format('YYYY-MM-DD') || '',
      });
    } else {
      setFilters({ ...filters, startDate: '', endDate: '' });
    }
  };

  const columns: ColumnsType<AuditLog> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '用户', dataIndex: 'username', width: 120 },
    {
      title: '操作',
      dataIndex: 'action',
      width: 120,
      render: (action: string) => (
        <Tag color={actionColors[action] || 'default'}>{action}</Tag>
      ),
    },
    { title: '资源', dataIndex: 'resource', width: 150 },
    { title: '详情', dataIndex: 'details', ellipsis: true },
    { title: 'IP地址', dataIndex: 'ipAddress', width: 140 },
    { title: '时间', dataIndex: 'createdAt', width: 180 },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>审计日志</h2>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索操作类型"
          prefix={<SearchOutlined />}
          style={{ width: 200 }}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
        />
        <RangePicker onChange={handleDateChange} />
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
          导出日志
        </Button>
      </Space>
      <Table
        columns={columns}
        dataSource={logs}
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
