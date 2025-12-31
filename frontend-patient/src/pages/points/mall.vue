<template>
  <view class="mall-container">
    <!-- 分类筛选 -->
    <view class="category-tabs">
      <view
        v-for="cat in categories"
        :key="cat.value"
        class="tab-item"
        :class="{ active: category === cat.value }"
        @click="changeCategory(cat.value)"
      >
        <text>{{ cat.label }}</text>
      </view>
    </view>

    <!-- 礼品列表 -->
    <scroll-view class="gifts-list" scroll-y @scrolltolower="loadMore">
      <view v-if="gifts.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无可兑换礼品</text>
      </view>

      <view class="gifts-grid">
        <view
          v-for="gift in gifts"
          :key="gift.id"
          class="gift-item"
          @click="showRedeemDialog(gift)"
        >
          <image class="gift-image" :src="gift.imageUrl" mode="aspectFill" lazy-load />
          <view class="gift-info">
            <text class="gift-name">{{ gift.name }}</text>
            <text class="gift-desc">{{ gift.description }}</text>
            <view class="gift-footer">
              <view class="points-required">
                <text class="points-value">{{ gift.pointsRequired }}</text>
                <text class="points-unit">积分</text>
              </view>
              <text class="stock-info">库存: {{ gift.stock }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading-more">
        <text>加载中...</text>
      </view>
    </scroll-view>

    <!-- 兑换确认弹窗 -->
    <view v-if="showDialog" class="dialog-mask" @click="closeDialog">
      <view class="dialog-content" @click.stop>
        <text class="dialog-title">确认兑换</text>
        <view class="dialog-body">
          <image class="dialog-image" :src="selectedGift?.imageUrl" mode="aspectFill" />
          <text class="dialog-name">{{ selectedGift?.name }}</text>
          <text class="dialog-points">需要 {{ selectedGift?.pointsRequired }} 积分</text>
          <text class="dialog-balance">当前积分: {{ balance }}</text>
        </view>
        <view class="dialog-actions">
          <button class="dialog-btn cancel" @click="closeDialog">取消</button>
          <button class="dialog-btn confirm" @click="confirmRedeem">确认兑换</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { pointsApi } from '@/api/points';
import { usePointsStore } from '@/stores/usePoints';
import type { Gift } from '@/types/points';

const pointsStore = usePointsStore();
const gifts = ref<Gift[]>([]);
const loading = ref(false);
const category = ref<string>('all');
const currentPage = ref(1);
const hasMore = ref(true);
const showDialog = ref(false);
const selectedGift = ref<Gift | null>(null);

const balance = computed(() => pointsStore.balance);

const categories = [
  { label: '全部', value: 'all' },
  { label: '实物', value: 'physical' },
  { label: '优惠券', value: 'coupon' },
  { label: '服务', value: 'service' },
];

const userId = ref('user-123');

const changeCategory = async (cat: string) => {
  category.value = cat;
  currentPage.value = 1;
  gifts.value = [];
  await loadGifts();
};

const loadGifts = async () => {
  if (loading.value) return;

  loading.value = true;
  try {
    const params: any = { page: currentPage.value, limit: 20 };
    if (category.value !== 'all') {
      params.category = category.value;
    }

    const response = await pointsApi.getGifts(params);
    if (currentPage.value === 1) {
      gifts.value = response.data;
    } else {
      gifts.value.push(...response.data);
    }
    hasMore.value = gifts.value.length < response.total;
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载礼品失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
  }
};

const loadMore = async () => {
  if (!hasMore.value || loading.value) return;
  currentPage.value++;
  await loadGifts();
};

const showRedeemDialog = (gift: Gift) => {
  selectedGift.value = gift;
  showDialog.value = true;
};

const closeDialog = () => {
  showDialog.value = false;
  selectedGift.value = null;
};

const confirmRedeem = async () => {
  if (!selectedGift.value) return;

  if (balance.value < selectedGift.value.pointsRequired) {
    uni.showToast({
      title: '积分不足',
      icon: 'none',
    });
    return;
  }

  try {
    const response = await pointsApi.redeemGift(selectedGift.value.id);
    uni.showToast({
      title: '兑换成功',
      icon: 'success',
    });

    // 更新积分余额
    pointsStore.updateBalance(-selectedGift.value.pointsRequired);

    closeDialog();

    // 刷新礼品列表
    currentPage.value = 1;
    await loadGifts();
  } catch (error: any) {
    uni.showToast({
      title: error.message || '兑换失败',
      icon: 'none',
    });
  }
};

onMounted(async () => {
  await pointsStore.fetchBalance(userId.value);
  await loadGifts();
});
</script>

<style scoped>
.mall-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.category-tabs {
  display: flex;
  background-color: #fff;
  padding: 20rpx 40rpx;
  gap: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab-item {
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  font-size: 28rpx;
  color: #666;
  background-color: #f5f5f5;
}

.tab-item.active {
  background-color: #667eea;
  color: #fff;
}

.gifts-list {
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

.gifts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.gift-item {
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.gift-image {
  width: 100%;
  height: 280rpx;
  background-color: #f0f0f0;
}

.gift-info {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.gift-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gift-desc {
  font-size: 24rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gift-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8rpx;
}

.points-required {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.points-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #667eea;
}

.points-unit {
  font-size: 24rpx;
  color: #667eea;
}

.stock-info {
  font-size: 24rpx;
  color: #999;
}

.loading-more {
  padding: 32rpx;
  text-align: center;
  font-size: 28rpx;
  color: #999;
}

.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  width: 600rpx;
  background-color: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}

.dialog-title {
  display: block;
  padding: 40rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  border-bottom: 1rpx solid #f0f0f0;
}

.dialog-body {
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.dialog-image {
  width: 200rpx;
  height: 200rpx;
  border-radius: 16rpx;
}

.dialog-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.dialog-points {
  font-size: 28rpx;
  color: #667eea;
}

.dialog-balance {
  font-size: 24rpx;
  color: #999;
}

.dialog-actions {
  display: flex;
  border-top: 1rpx solid #f0f0f0;
}

.dialog-btn {
  flex: 1;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  font-size: 30rpx;
  border: none;
  background-color: transparent;
}

.dialog-btn.cancel {
  color: #666;
  border-right: 1rpx solid #f0f0f0;
}

.dialog-btn.confirm {
  color: #667eea;
  font-weight: 600;
}
</style>
