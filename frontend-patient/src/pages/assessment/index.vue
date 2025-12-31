<template>
  <view class="assessment-container">
    <!-- 评估入口 -->
    <view class="assessment-cards">
      <view
        v-for="item in assessmentTypes"
        :key="item.type"
        class="card"
        @click="navigateTo(item.path)"
      >
        <view class="card-icon">{{ item.icon }}</view>
        <view class="card-title">{{ item.title }}</view>
        <view class="card-desc">{{ item.desc }}</view>
      </view>
    </view>

    <!-- 历史记录 -->
    <view class="history-section">
      <view class="section-title">评估记录</view>
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="records.length === 0" class="empty">暂无评估记录</view>
      <view v-else class="record-list">
        <view
          v-for="record in records"
          :key="record.id"
          class="record-item"
          @click="viewDetail(record.id)"
        >
          <view class="record-header">
            <text class="record-type">{{ getTypeName(record.type) }}</text>
            <view class="risk-badge" :class="record.riskLevel">
              {{ getRiskText(record.riskLevel) }}
            </view>
          </view>
          <view class="record-result">{{ record.result }}</view>
          <view class="record-time">{{ formatTime(record.createdAt) }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { assessmentApi } from '@/api/assessment';
import type { AssessmentRecord } from '@/types/assessment';

const assessmentTypes = [
  {
    type: 'diabetes',
    title: '糖尿病风险',
    desc: '评估患糖尿病风险',
    icon: '🩺',
    path: '/pages/assessment/diabetes',
  },
  {
    type: 'stroke',
    title: '卒中风险',
    desc: '评估脑卒中风险',
    icon: '🧠',
    path: '/pages/assessment/stroke',
  },
  {
    type: 'vascular_age',
    title: '血管年龄',
    desc: '测算血管健康年龄',
    icon: '❤️',
    path: '/pages/assessment/vascular-age',
  },
  {
    type: 'stroke_recognition',
    title: '中风识别',
    desc: 'FAST 识别法',
    icon: '🚨',
    path: '/pages/assessment/stroke-recognition',
  },
];

const records = ref<AssessmentRecord[]>([]);
const loading = ref(false);

const navigateTo = (path: string) => {
  uni.navigateTo({ url: path });
};

const loadHistory = async () => {
  loading.value = true;
  try {
    const res = await assessmentApi.getHistory({ limit: 10 });
    records.value = res.data;
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const viewDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/assessment/detail?id=${id}` });
};

const getTypeName = (type: string) => {
  const map: Record<string, string> = {
    diabetes: '糖尿病风险',
    stroke: '卒中风险',
    vascular_age: '血管年龄',
    stroke_recognition: '中风识别',
  };
  return map[type] || type;
};

const getRiskText = (level: string) => {
  const map: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  };
  return map[level] || level;
};

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

onMounted(() => {
  loadHistory();
});
</script>

<style scoped>
.assessment-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
}

.assessment-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.card-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.card-desc {
  font-size: 24rpx;
  color: #999;
}

.history-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
}

.loading,
.empty {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.record-item {
  padding: 24rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.record-type {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.risk-badge {
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #fff;
}

.risk-badge.low {
  background-color: #52c41a;
}

.risk-badge.medium {
  background-color: #faad14;
}

.risk-badge.high {
  background-color: #f5222d;
}

.record-result {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.record-time {
  font-size: 24rpx;
  color: #999;
}
</style>
