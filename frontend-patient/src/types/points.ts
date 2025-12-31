export interface PointsBalance {
  userId: string;
  balance: number;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  points: number;
  type: 'earn' | 'redeem';
  source: string;
  description: string;
  createdAt: string;
}

export interface Gift {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  pointsRequired: number;
  stock: number;
  category: 'physical' | 'coupon' | 'service';
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  points: number;
  isCurrentUser?: boolean;
}

export interface RedeemOrderResponse {
  orderId: string;
  giftId: string;
  pointsDeducted: number;
  success: boolean;
}
