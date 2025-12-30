<template>
  <view class="index-container">
    <view class="header">
      <text class="title">智慧慢病管理</text>
      <text class="subtitle">您的健康管理助手</text>
    </view>

    <view class="feature-grid">
      <view class="feature-item" @click="navigateTo('/pages/ai-chat/index')">
        <text class="feature-icon">💬</text>
        <text class="feature-name">AI 问答</text>
      </view>

      <view class="feature-item" @click="navigateTo('/pages/education/index')">
        <text class="feature-icon">📚</text>
        <text class="feature-name">健康科普</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const navigateTo = (url: string) => {
  uni.switchTab({ url });
};
</script>

<style scoped>
.index-container {
  min-height: 100vh;
  padding: 40rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  text-align: center;
  padding: 80rpx 0;
  color: #fff;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  opacity: 0.9;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30rpx;
  margin-top: 60rpx;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 280rpx;
  background-color: #fff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.feature-name {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}
</style>
