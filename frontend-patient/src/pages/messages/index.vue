<template>
  <view class="messages-page">
    <view class="conversations-list">
      <view
        v-for="conv in conversations"
        :key="conv.id"
        class="conversation-item"
        @tap="openChat(conv)"
      >
        <view class="avatar">
          <image
            :src="conv.participantAvatar || '/static/default-avatar.png'"
            mode="aspectFill"
          />
        </view>
        <view class="content">
          <view class="header">
            <text class="name">{{ conv.participantName }}</text>
            <text class="time">{{ formatTime(conv.updatedAt) }}</text>
          </view>
          <view class="message">
            <text class="text">{{ formatLastMessage(conv.lastMessage) }}</text>
            <view v-if="conv.unreadCount > 0" class="badge">
              {{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}
            </view>
          </view>
        </view>
      </view>
      <view v-if="conversations.length === 0" class="empty">
        <text>暂无消息</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMessagesStore } from '@/stores/messages';
import type { Conversation } from '@/types/message';

const messagesStore = useMessagesStore();
const conversations = ref<Conversation[]>([]);
const refreshing = ref(false);

onMounted(() => {
  loadData();
});

const loadData = async () => {
  const userId = uni.getStorageSync('userId');
  if (!userId) return;

  await messagesStore.loadConversations(userId);
  conversations.value = messagesStore.conversations;
};

const openChat = (conv: Conversation) => {
  uni.navigateTo({
    url: `/pages/messages/chat?conversationId=${conv.id}&name=${conv.participantName}`,
  });
};

const formatTime = (time: string) => {
  const date = new Date(time);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  return `${date.getMonth() + 1}-${date.getDate()}`;
};

const formatLastMessage = (lastMessage?: Conversation['lastMessage']) => {
  if (!lastMessage) return '暂无消息';
  if (lastMessage.type === 'image') return '[图片]';
  if (lastMessage.type === 'voice') return '[语音]';
  if (lastMessage.type === 'video') return '[视频]';
  if (lastMessage.type === 'file') return '[文件]';
  return lastMessage.content;
};

const onPullDownRefresh = async () => {
  await loadData();
  uni.stopPullDownRefresh();
};

defineExpose({ onPullDownRefresh });
</script>

<style scoped>
.messages-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.conversations-list {
  background-color: #fff;
}

.conversation-item {
  display: flex;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #eee;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  margin-right: 24rpx;
  border-radius: 8rpx;
  overflow: hidden;
}

.avatar image {
  width: 100%;
  height: 100%;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.name {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
}

.time {
  font-size: 24rpx;
  color: #999;
}

.message {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.text {
  flex: 1;
  font-size: 28rpx;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 8rpx;
  background-color: #ff4d4f;
  border-radius: 18rpx;
  color: #fff;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 16rpx;
}

.empty {
  padding: 200rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}
</style>
