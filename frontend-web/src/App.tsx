import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { UserOutlined, SettingOutlined, FileTextOutlined } from '@ant-design/icons';
import UsersPage from '@/pages/admin/users';
import SettingsPage from '@/pages/admin/settings';
import AuditLogsPage from '@/pages/admin/audit-logs';

const { Header, Sider, Content } = Layout;

export default function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
          智慧慢病管理系统 - 管理后台
        </Header>
        <Layout>
          <Sider width={200} theme="light">
            <Menu
              mode="inline"
              defaultSelectedKeys={['users']}
              style={{ height: '100%', borderRight: 0 }}
              items={[
                {
                  key: 'users',
                  icon: <UserOutlined />,
                  label: '用户管理',
                  onClick: () => (window.location.href = '/admin/users'),
                },
                {
                  key: 'settings',
                  icon: <SettingOutlined />,
                  label: '系统配置',
                  onClick: () => (window.location.href = '/admin/settings'),
                },
                {
                  key: 'audit-logs',
                  icon: <FileTextOutlined />,
                  label: '审计日志',
                  onClick: () => (window.location.href = '/admin/audit-logs'),
                },
              ]}
            />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Content
              style={{
                padding: 24,
                margin: 0,
                minHeight: 280,
                background: '#fff',
              }}
            >
              <Routes>
                <Route path="/" element={<Navigate to="/admin/users" replace />} />
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </BrowserRouter>
  );
}
