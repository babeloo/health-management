<template>
  <view class="compare-container">
    <!-- 评估类型选择 -->
    <view class="type-selector">
      <view
        v-for="type in assessmentTypes"
        :key="type.value"
        class="type-item"
        :class="{ active: selectedType === type.value }"
        @click="selectType(type.value)"
      >
        {{ type.label }}
      </view>
    </view>

    <!-- 时间范围选择 -->
    <view class="range-selector">
      <view
        v-for="range in timeRanges"
        :key="range.value"
        class="range-item"
        :class="{ active: selectedRange === range.value }"
        @click="selectRange(range.value)"
      >
        {{ range.label }}
      </view>
    </view>

    <!-- 图表区域 -->
    <view class="chart-section">
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="chartData.length === 0" class="empty">暂无对比数据</view>
      <view v-else class="chart-wrapper">
        <canvas canvas-id="compareChart" id="compareChart" class="chart-canvas"></canvas>
      </view>
    </view>

    <!-- 数据列表 -->
    <view v-if="chartData.length > 0" class="data-list">
      <view class="list-title">历史记录</view>
      <view
        v-for="item in chartData"
        :key="item.id"
        class="data-item"
      >
        <view class="item-header">
          <text class="item-date">{{ formatDate(item.createdAt) }}</text>
          <view class="risk-badge" :class="item.riskLevel">
            {{ getRiskText(item.riskLevel) }}
          </view>
        </view>
        <view class="item-score">评分: {{ item.score }}</view>
        <view v-if="item.vascularAge" class="item-age">血管年龄: {{ item.vascularAge }}岁</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { assessmentApi } from '@/api/assessment';
import type { AssessmentRecord } from '@/types/assessment';

const assessmentTypes = [
  { label: '糖尿病', value: 'diabetes' },
  { label: '卒中', value: 'stroke' },
  { label: '血管年龄', value: 'vascular_age' },
];

const timeRanges = [
  { label: '最近3次', value: 3 },
  { label: '最近6次', value: 6 },
  { label: '全部', value: 999 },
];

const selectedType = ref('diabetes');
const selectedRange = ref(6);
const chartData = ref<AssessmentRecord[]>([]);
const loading = ref(false);

let chartInstance: any = null;

const selectType = (type: string) => {
  selectedType.value = type;
  loadData();
};

const selectRange = (range: number) => {
  selectedRange.value = range;
  loadData();
};

const loadData = async () => {
  loading.value = true;
  try {
    const res = await assessmentApi.getHistory({
      type: selectedType.value,
      limit: selectedRange.value,
    });
    chartData.value = res.data.reverse();
    if (chartData.value.length > 0) {
      renderChart();
    }
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const renderChart = () => {
  // #ifdef MP-WEIXIN
  const query = uni.createSelectorQuery();
  query.select('#compareChart').fields({ node: true, size: true }).exec((res) => {
    if (res[0]) {
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = uni.getSystemInfoSync().pixelRatio;
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);
      drawChart(ctx, res[0].width, res[0].height);
    }
  });
  // #endif

  // #ifdef H5 || APP-PLUS
  setTimeout(() => {
    const canvas = document.getElementById('compareChart') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      if (ctx) {
        drawChart(ctx, rect.width, rect.height);
      }
    }
  }, 100);
  // #endif
};

const drawChart = (ctx: any, width: number, height: number) => {
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  ctx.clearRect(0, 0, width, height);

  // 绘制背景
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);

  if (chartData.value.length === 0) return;

  const maxScore = 100;
  const minScore = 0;
  const scoreRange = maxScore - minScore;

  // 绘制网格线
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // 绘制Y轴标签
  ctx.fillStyle = '#999';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const score = maxScore - (scoreRange / 4) * i;
    const y = padding + (chartHeight / 4) * i;
    ctx.fillText(score.toString(), padding - 10, y + 4);
  }

  // 绘制折线
  const pointSpacing = chartWidth / (chartData.value.length - 1 || 1);
  ctx.strokeStyle = '#1890ff';
  ctx.lineWidth = 2;
  ctx.beginPath();

  chartData.value.forEach((item, index) => {
    const x = padding + pointSpacing * index;
    const y = padding + chartHeight - ((item.score - minScore) / scoreRange) * chartHeight;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // 绘制数据点
  chartData.value.forEach((item, index) => {
    const x = padding + pointSpacing * index;
    const y = padding + chartHeight - ((item.score - minScore) / scoreRange) * chartHeight;

    ctx.fillStyle = '#1890ff';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // 绘制分数
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.score.toString(), x, y - 10);
  });

  // 绘制X轴标签
  ctx.fillStyle = '#999';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  chartData.value.forEach((item, index) => {
    const x = padding + pointSpacing * index;
    const date = new Date(item.createdAt);
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    ctx.fillText(label, x, height - padding + 20);
  });
};

const formatDate = (time: string) => {
  return new Date(time).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const getRiskText = (level: string) => {
  const map: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  };
  return map[level] || level;
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.compare-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
}

.type-selector {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.type-item {
  flex: 1;
  padding: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  text-align: center;
  font-size: 28rpx;
  color: #666;
}

.type-item.active {
  background: #1890ff;
  color: #fff;
  font-weight: 600;
}

.range-selector {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.range-item {
  flex: 1;
  padding: 16rpx;
  background: #fff;
  border-radius: 12rpx;
  text-align: center;
  font-size: 26rpx;
  color: #666;
}

.range-item.active {
  background: #e6f7ff;
  color: #1890ff;
  border: 1rpx solid #1890ff;
}

.chart-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  min-height: 400rpx;
}

.loading,
.empty {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}

.chart-wrapper {
  width: 100%;
  height: 400rpx;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

.data-list {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
}

.list-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
}

.data-item {
  padding: 24rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.item-date {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
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

.item-score {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.item-age {
  font-size: 26rpx;
  color: #666;
}
</style>
