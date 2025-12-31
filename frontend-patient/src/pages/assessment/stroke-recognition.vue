<template>
  <view class="recognition-container">
    <!-- FAST 原则介绍 -->
    <view class="fast-section">
      <view class="section-title">FAST 中风识别法</view>
      <view class="fast-desc">快速识别中风症状，争取黄金救治时间</view>

      <view class="fast-items">
        <view class="fast-item">
          <view class="fast-icon">😊</view>
          <view class="fast-letter">F - Face (面部)</view>
          <view class="fast-text">让患者微笑，观察面部是否对称，一侧是否下垂</view>
        </view>

        <view class="fast-item">
          <view class="fast-icon">💪</view>
          <view class="fast-letter">A - Arm (手臂)</view>
          <view class="fast-text">让患者双臂平举，观察是否有一侧无力下垂</view>
        </view>

        <view class="fast-item">
          <view class="fast-icon">💬</view>
          <view class="fast-letter">S - Speech (语言)</view>
          <view class="fast-text">让患者说一句简单的话，观察是否口齿不清或无法说话</view>
        </view>

        <view class="fast-item">
          <view class="fast-icon">⏰</view>
          <view class="fast-letter">T - Time (时间)</view>
          <view class="fast-text">如出现以上任一症状，立即拨打 120 急救电话</view>
        </view>
      </view>
    </view>

    <!-- 其他症状 -->
    <view class="symptoms-section">
      <view class="section-title">其他中风症状</view>
      <view class="symptom-list">
        <view class="symptom-item">• 突然剧烈头痛</view>
        <view class="symptom-item">• 突然视力模糊或失明</view>
        <view class="symptom-item">• 突然行走困难、失去平衡</view>
        <view class="symptom-item">• 突然意识模糊或昏迷</view>
      </view>
    </view>

    <!-- 紧急提示 -->
    <view class="warning-section">
      <view class="warning-icon">⚠️</view>
      <view class="warning-title">重要提示</view>
      <view class="warning-text">
        中风发生后的 3-4.5 小时是黄金救治时间，越早治疗效果越好。如发现疑似症状，请立即拨打急救电话！
      </view>
    </view>

    <!-- 急救按钮 -->
    <view class="action-buttons">
      <button class="emergency-btn" @click="call120">
        <text class="btn-icon">📞</text>
        <text class="btn-text">拨打 120</text>
      </button>
      <button class="test-btn" @click="startTest">自测评估</button>
    </view>
  </view>
</template>

<script setup lang="ts">
const call120 = () => {
  // #ifdef MP-WEIXIN
  uni.showModal({
    title: '拨打急救电话',
    content: '是否拨打 120 急救电话？',
    success: (res) => {
      if (res.confirm) {
        uni.makePhoneCall({
          phoneNumber: '120',
          fail: () => {
            uni.showToast({ title: '拨号失败', icon: 'none' });
          },
        });
      }
    },
  });
  // #endif

  // #ifndef MP-WEIXIN
  uni.makePhoneCall({
    phoneNumber: '120',
    fail: () => {
      uni.showToast({ title: '拨号失败', icon: 'none' });
    },
  });
  // #endif
};

const startTest = () => {
  uni.showModal({
    title: '自测评估',
    content: '请根据 FAST 原则观察患者症状。如有任一症状，请立即拨打 120！',
    confirmText: '拨打 120',
    cancelText: '我知道了',
    success: (res) => {
      if (res.confirm) {
        call120();
      }
    },
  });
};
</script>

<style scoped>
.recognition-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
}

.fast-section,
.symptoms-section,
.warning-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.fast-desc {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 32rpx;
}

.fast-items {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.fast-item {
  padding: 24rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
}

.fast-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.fast-letter {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.fast-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.symptom-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.symptom-item {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
}

.warning-section {
  background: #fff7e6;
  border: 2rpx solid #faad14;
}

.warning-icon {
  font-size: 48rpx;
  text-align: center;
  margin-bottom: 16rpx;
}

.warning-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #d46b08;
  text-align: center;
  margin-bottom: 16rpx;
}

.warning-text {
  font-size: 26rpx;
  color: #ad6800;
  line-height: 1.8;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}

.emergency-btn,
.test-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.emergency-btn {
  background-color: #f5222d;
  color: #fff;
}

.test-btn {
  background-color: #fff;
  color: #333;
  border: 2rpx solid #d9d9d9;
}

.btn-icon {
  font-size: 36rpx;
}

.btn-text {
  font-size: 32rpx;
}
</style>
