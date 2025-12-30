<template>
  <view class="chat-container">
    <!-- 消息列表 -->
    <scroll-view
      class="message-list"
      scroll-y
      :scroll-into-view="scrollIntoView"
      scroll-with-animation
    >
      <view v-if="messages.length === 0" class="empty-state">
        <text class="empty-text">👋 您好！我是您的健康助手</text>
        <text class="empty-hint">请问有什么可以帮助您的？</text>
      </view>

      <view
        v-for="msg in messages"
        :key="msg.id"
        :id="`msg-${msg.id}`"
        class="message-item"
        :class="msg.role"
      >
        <view class="message-bubble">
          <text class="message-content">{{ msg.content }}</text>
        </view>
      </view>

      <view v-if="loading" class="message-item assistant">
        <view class="message-bubble">
          <text class="loading-text">正在思考...</text>
        </view>
      </view>
    </scroll-view>

    <!-- 输入框 -->
    <view class="input-bar">
      <input
        v-model="inputText"
        class="input-field"
        placeholder="输入您的健康问题..."
        :disabled="loading"
        @confirm="handleSend"
      />
      <button
        class="send-btn"
        :disabled="!inputText.trim() || loading"
        @click="handleSend"
      >
        发送
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useAiStore } from '@/stores/ai';

const aiStore = useAiStore();
const inputText = ref('');
const scrollIntoView = ref('');

const messages = computed(() => aiStore.messages);
const loading = computed(() => aiStore.loading);

const handleSend = async () => {
  if (!inputText.value.trim() || loading.value) return;

  const text = inputText.value.trim();
  inputText.value = '';

  await aiStore.sendMessage(text);

  // 滚动到底部
  nextTick(() => {
    const lastMsg = messages.value[messages.value.length - 1];
    if (lastMsg) {
      scrollIntoView.value = `msg-${lastMsg.id}`;
    }
  });
};

onMounted(() => {
  aiStore.loadHistory();
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.message-list {
  flex: 1;
  padding: 20rpx;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
  text-align: center;
}

.empty-text {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 20rpx;
}

.empty-hint {
  font-size: 28rpx;
  color: #999;
}

.message-item {
  display: flex;
  margin-bottom: 24rpx;
}

.message-item.user {
  justify-content: flex-end;
}

.message-item.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 24rpx;
  border-radius: 16rpx;
  word-wrap: break-word;
}

.user .message-bubble {
  background-color: #07c160;
}

.assistant .message-bubble {
  background-color: #fff;
}

.message-content {
  font-size: 28rpx;
  line-height: 1.6;
}

.user .message-content {
  color: #fff;
}

.assistant .message-content {
  color: #333;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

.input-bar {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: #fff;
  border-top: 1rpx solid #e5e5e5;
}

.input-field {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 36rpx;
  font-size: 28rpx;
}

.send-btn {
  margin-left: 20rpx;
  padding: 0 32rpx;
  height: 72rpx;
  line-height: 72rpx;
  background-color: #07c160;
  color: #fff;
  border-radius: 36rpx;
  font-size: 28rpx;
  border: none;
}

.send-btn[disabled] {
  background-color: #c0c0c0;
}
</style>
