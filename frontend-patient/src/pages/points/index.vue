<template>
  <view class="points-container">
    <!-- 积分余额卡片 -->
    <view class="balance-card">
      <text class="balance-label">我的积分</text>
      <text class="balance-value">{{ balance }}</text>
      <view class="action-buttons">
        <button class="action-btn primary" @click="goToMall">去兑换</button>
        <button class="action-btn" @click="goToLeaderboard">排行榜</button>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="records-section">
      <view class="section-header">
        <text class="section-title">积分记录</text>
      </view>

      <scroll-view
        class="records-list"
        scroll-y
        @scrolltolower="loadMore"
      >
        <view v-if="transactions.length === 0 && !loading" class="empty-state">
          <text class="empty-text">暂无积分记录</text>
        </view>

        <view
          v-for="item in transactions"
          :key="item.id"
          class="record-item"
        >
          <view class="record-info">
            <text class="record-desc">{{ item.description }}</text>
            <text class="record-time">{{ formatTime(item.createdAt) }}</text>
          </view>
          <text
            class="record-points"
            :class="item.type === 'earn' ? 'earn' : 'redeem'"
          >
            {{ item.type === 'earn' ? '+' : '-' }}{{ Math.abs(item.points) }}
          </text>
        </view>

        <view v-if="loading" class="loading-more">
          <text>加载中...</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePointsStore } from '@/stores/usePoints';

const pointsStore = usePointsStore();
const currentPage = ref(1);
const hasMore = ref(true);

const balance = computed(() => pointsStore.balance);
const transactions = computed(() => pointsStore.transactions);
const loading = computed(() => pointsStore.loading);

// 模拟用户ID（实际应从用户store获取）
const userId = ref('user-123');

const formatTime = (time: string) => {
  const date = new Date(time);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
};

const loadMore = async () => {
  if (!hasMore.value || loading.value) return;

  currentPage.value++;
  const total = await pointsStore.fetchTransactions(userId.value, currentPage.value);
  hasMore.value = transactions.value.length < total;
};

const goToMall = () => {
  uni.navigateTo({
    url: '/pages/points/mall',
  });
};

const goToLeaderboard = () => {
  uni.navigateTo({
    url: '/pages/points/leaderboard',
  });
};

onMounted(async () => {
  await pointsStore.fetchBalance(userId.value);
  await pointsStore.fetchTransactions(userId.value, 1);
});
</script>

<style scoped>
.points-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.balance-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 20rpx;
}

.balance-value {
  font-size: 96rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 40rpx;
}

.action-buttons {
  display: flex;
  gap: 24rpx;
}

.action-btn {
  padding: 0 48rpx;
  height: 64rpx;
  line-height: 64rpx;
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 32rpx;
  font-size: 28rpx;
  border: none;
}

.action-btn.primary {
  background-color: #fff;
  color: #667eea;
}

.records-section {
  margin-top: 20rpx;
  background-color: #fff;
  min-height: calc(100vh - 400rpx);
}

.section-header {
  padding: 32rpx 40rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.records-list {
  height: calc(100vh - 500rpx);
}

.empty-state {
  display: flex;
  justify-content: center;
  padding: 100rpx 40rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 40rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.record-desc {
  font-size: 30rpx;
  color: #333;
}

.record-time {
  font-size: 24rpx;
  color: #999;
}

.record-points {
  font-size: 36rpx;
  font-weight: 600;
}

.record-points.earn {
  color: #52c41a;
}

.record-points.redeem {
  color: #ff4d4f;
}

.loading-more {
  padding: 32rpx;
  text-align: center;
  font-size: 28rpx;
  color: #999;
}
</style>
