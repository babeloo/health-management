import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PointsBalance, PointsTransaction } from '@/types/points';
import { pointsApi } from '@/api/points';

export const usePointsStore = defineStore('points', () => {
  const balance = ref<number>(0);
  const transactions = ref<PointsTransaction[]>([]);
  const loading = ref(false);

  // 获取积分余额
  const fetchBalance = async (userId: string) => {
    loading.value = true;
    try {
      const response = await pointsApi.getBalance(userId);
      balance.value = response.balance;
    } catch (error: any) {
      uni.showToast({
        title: error.message || '获取积分余额失败',
        icon: 'none',
      });
    } finally {
      loading.value = false;
    }
  };

  // 获取积分交易历史
  const fetchTransactions = async (userId: string, page = 1, limit = 20) => {
    loading.value = true;
    try {
      const response = await pointsApi.getTransactions(userId, { page, limit });
      if (page === 1) {
        transactions.value = response.data;
      } else {
        transactions.value.push(...response.data);
      }
      return response.total;
    } catch (error: any) {
      uni.showToast({
        title: error.message || '获取交易记录失败',
        icon: 'none',
      });
      return 0;
    } finally {
      loading.value = false;
    }
  };

  // 更新积分余额（用于打卡后实时更新）
  const updateBalance = (points: number) => {
    balance.value += points;
  };

  return {
    balance,
    transactions,
    loading,
    fetchBalance,
    fetchTransactions,
    updateBalance,
  };
});
