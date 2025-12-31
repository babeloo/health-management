<template>
  <view class="leaderboard-container">
    <!-- 榜单类型切换 -->
    <view class="type-tabs">
      <view
        class="tab-item"
        :class="{ active: leaderboardType === 'total' }"
        @click="changeType('total')"
      >
        <text>总榜</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: leaderboardType === 'weekly' }"
        @click="changeType('weekly')"
      >
        <text>周榜</text>
      </view>
    </view>

    <!-- 排行榜列表 -->
    <scroll-view
      class="leaderboard-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="leaderboard.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无排行数据</text>
      </view>

      <view
        v-for="item in leaderboard"
        :key="item.userId"
        class="rank-item"
        :class="{ current: item.isCurrentUser }"
      >
        <view class="rank-badge" :class="getRankClass(item.rank)">
          <text v-if="item.rank <= 3" class="rank-medal">{{ getMedal(item.rank) }}</text>
          <text v-else class="rank-number">{{ item.rank }}</text>
        </view>

        <image
          class="user-avatar"
          :src="item.avatar || '/static/default-avatar.png'"
          mode="aspectFill"
        />

        <view class="user-info">
          <text class="user-name">{{ item.username }}</text>
          <text v-if="item.isCurrentUser" class="current-tag">我</text>
        </view>

        <text class="user-points">{{ item.points }}</text>
      </view>

      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { pointsApi } from '@/api/points';
import type { LeaderboardEntry } from '@/types/points';

const leaderboard = ref<LeaderboardEntry[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const leaderboardType = ref<'total' | 'weekly'>('total');

const userId = ref('user-123');

const getMedal = (rank: number): string => {
  const medals = ['🥇', '🥈', '🥉'];
  return medals[rank - 1] || '';
};

const getRankClass = (rank: number): string => {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return '';
};

const loadLeaderboard = async () => {
  loading.value = true;
  try {
    const response = await pointsApi.getLeaderboard({
      type: leaderboardType.value,
      limit: 100,
    });

    // 标记当前用户
    leaderboard.value = response.data.map((item) => ({
      ...item,
      isCurrentUser: item.userId === userId.value,
    }));
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载排行榜失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
  }
};

const changeType = async (type: 'total' | 'weekly') => {
  leaderboardType.value = type;
  await loadLeaderboard();
};

const onRefresh = async () => {
  refreshing.value = true;
  await loadLeaderboard();
  refreshing.value = false;
};

onMounted(async () => {
  await loadLeaderboard();
});
</script>

<style scoped>
.leaderboard-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.type-tabs {
  display: flex;
  background-color: #fff;
  padding: 20rpx 40rpx;
  gap: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab-item {
  flex: 1;
  padding: 16rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: #666;
  border-radius: 8rpx;
  background-color: #f5f5f5;
}

.tab-item.active {
  background-color: #667eea;
  color: #fff;
  font-weight: 600;
}

.leaderboard-list {
  height: calc(100vh - 120rpx);
  padding: 20rpx;
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

.rank-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  margin-bottom: 16rpx;
  background-color: #fff;
  border-radius: 16rpx;
}

.rank-item.current {
  background: linear-gradient(135deg, #fff5e6 0%, #ffe7ba 100%);
  border: 2rpx solid #ffa940;
}

.rank-badge {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  border-radius: 50%;
  background-color: #f0f0f0;
}

.rank-badge.gold {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
}

.rank-badge.silver {
  background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%);
}

.rank-badge.bronze {
  background: linear-gradient(135deg, #cd7f32 0%, #e8a87c 100%);
}

.rank-medal {
  font-size: 36rpx;
}

.rank-number {
  font-size: 28rpx;
  font-weight: 600;
  color: #666;
}

.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 24rpx;
  background-color: #f0f0f0;
}

.user-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.user-name {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.current-tag {
  padding: 4rpx 16rpx;
  background-color: #ffa940;
  color: #fff;
  font-size: 20rpx;
  border-radius: 8rpx;
}

.user-points {
  font-size: 32rpx;
  font-weight: 600;
  color: #667eea;
}

.loading-state {
  padding: 32rpx;
  text-align: center;
  font-size: 28rpx;
  color: #999;
}
</style>
