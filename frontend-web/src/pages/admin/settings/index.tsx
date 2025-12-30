import React, { useEffect, useState } from 'react';
import { Card, Form, InputNumber, Button, message, Spin, Divider } from 'antd';
import { adminService } from '@/services/admin';
import type { SystemConfig } from '@/types';

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await adminService.getConfigs();
      const configMap: Record<string, string> = {};
      res.data.forEach((config: SystemConfig) => {
        configMap[config.key] = config.value;
      });
      form.setFieldsValue(configMap);
    } catch (error) {
      message.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      await Promise.all(
        Object.entries(values).map(([key, value]) =>
          adminService.updateConfig(key, String(value))
        )
      );
      message.success('配置保存成功');
    } catch (error) {
      message.error('配置保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>系统配置</h2>
      <Card>
        <Form form={form} layout="vertical">
          <Divider orientation="left">积分规则配置</Divider>
          <Form.Item
            label="血压打卡积分"
            name="points_blood_pressure"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} style={{ width: 200 }} addonAfter="分" />
          </Form.Item>
          <Form.Item
            label="血糖打卡积分"
            name="points_blood_glucose"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} style={{ width: 200 }} addonAfter="分" />
          </Form.Item>
          <Form.Item label="用药打卡积分" name="points_medication" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: 200 }} addonAfter="分" />
          </Form.Item>
          <Form.Item label="运动打卡积分" name="points_exercise" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: 200 }} addonAfter="分" />
          </Form.Item>
          <Form.Item label="饮食打卡积分" name="points_diet" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: 200 }} addonAfter="分" />
          </Form.Item>
          <Form.Item
            label="连续打卡7天奖励"
            name="points_streak_7days"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} style={{ width: 200 }} addonAfter="分" />
          </Form.Item>

          <Divider orientation="left">风险评估阈值</Divider>
          <Form.Item
            label="糖尿病低风险阈值"
            name="diabetes_low_threshold"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100} style={{ width: 200 }} addonAfter="分" />
          </Form.Item>
          <Form.Item
            label="糖尿病高风险阈值"
            name="diabetes_high_threshold"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100} style={{ width: 200 }} addonAfter="分" />
          </Form.Item>
          <Form.Item
            label="卒中低风险阈值"
            name="stroke_low_threshold"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100} style={{ width: 200 }} addonAfter="分" />
          </Form.Item>
          <Form.Item
            label="卒中高风险阈值"
            name="stroke_high_threshold"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100} style={{ width: 200 }} addonAfter="分" />
          </Form.Item>

          <Divider orientation="left">AI 模型参数</Divider>
          <Form.Item label="Temperature" name="ai_temperature" rules={[{ required: true }]}>
            <InputNumber min={0} max={2} step={0.1} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item label="Max Tokens" name="ai_max_tokens" rules={[{ required: true }]}>
            <InputNumber min={100} max={4000} style={{ width: 200 }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" onClick={handleSave} loading={saving}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
