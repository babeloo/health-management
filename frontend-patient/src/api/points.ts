import { request } from '@/utils/request';
import type { PointsBalance, PointsTransaction, Gift, LeaderboardEntry, RedeemOrderResponse } from '@/types/points';

export const pointsApi = {
  // 获取积分余额
  getBalance: (userId: string) => {
    return request<PointsBalance>(`/points/balance/${userId}`, {
      method: 'GET',
    });
  },

  // 获取积分交易历史
  getTransactions: (userId: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ data: PointsTransaction[]; total: number }>(`/points/transactions/${userId}?${query}`, {
      method: 'GET',
    });
  },

  // 获取礼品列表
  getGifts: (params?: { category?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ data: Gift[]; total: number }>(`/points/gifts?${query}`, {
      method: 'GET',
    });
  },

  // 兑换礼品
  redeemGift: (giftId: string) => {
    return request<RedeemOrderResponse>('/points/redeem', {
      method: 'POST',
      data: { giftId },
    });
  },

  // 获取排行榜
  getLeaderboard: (params?: { type?: 'total' | 'weekly'; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ data: LeaderboardEntry[] }>(`/points/leaderboard?${query}`, {
      method: 'GET',
    });
  },
};
