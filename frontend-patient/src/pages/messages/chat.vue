<template>
  <view class="chat-page">
    <scroll-view
      class="messages-container"
      scroll-y
      :scroll-into-view="scrollToView"
      scroll-with-animation
    >
      <view
        v-for="(msg, index) in messages"
        :id="`msg-${index}`"
        :key="msg.id"
        class="message-item"
        :class="{ 'is-mine': msg.senderId === currentUserId }"
      >
        <view class="message-content">
          <view v-if="msg.type === 'text'" class="text-message">
            {{ msg.content }}
          </view>
          <image
            v-else-if="msg.type === 'image'"
            class="image-message"
            :src="msg.content"
            mode="aspectFill"
            @tap="previewImage(msg.content)"
          />
        </view>
        <view class="message-status">
          <text v-if="msg.senderId === currentUserId" class="status">
            {{ msg.status === 'read' ? '已读' : '已发送' }}
          </text>
          <text class="time">{{ formatTime(msg.createdAt) }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="input-bar">
      <view class="input-wrapper">
        <input
          v-model="inputText"
          class="input"
          type="text"
          placeholder="输入消息..."
          confirm-type="send"
          @confirm="sendTextMessage"
          @input="onTyping"
        />
        <view class="actions">
          <view class="action-btn" @tap="chooseImage">
            <text>📷</text>
          </view>
          <view class="send-btn" :class="{ disabled: !inputText.trim() }" @tap="sendTextMessage">
            发送
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useMessagesStore } from '@/stores/messages';
import { socketService } from '@/utils/socket';
import { messagesApi } from '@/api/messages';
import type { Message } from '@/types/message';

const messagesStore = useMessagesStore();
const messages = ref<Message[]>([]);
const inputText = ref('');
const scrollToView = ref('');
const currentUserId = ref('');
const conversationId = ref('');
const recipientId = ref('');

onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1] as any;
  conversationId.value = currentPage.options.conversationId || '';

  currentUserId.value = uni.getStorageSync('userId');
  const token = uni.getStorageSync('token');

  if (!token) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    uni.navigateBack();
    return;
  }

  loadMessages();
  connectSocket(token);
});

onUnmounted(() => {
  socketService.offNewMessage();
  socketService.offMessageSent();
  messagesStore.clearCurrentMessages();
});

const loadMessages = async () => {
  await messagesStore.loadMessages(conversationId.value);
  messages.value = messagesStore.currentMessages;

  // 获取接收者ID
  if (messages.value.length > 0) {
    const firstMsg = messages.value[0];
    recipientId.value =
      firstMsg.senderId === currentUserId.value ? firstMsg.recipientId : firstMsg.senderId;
  }

  scrollToBottom();
  markAsRead();
};

const connectSocket = (token: string) => {
  socketService.connect(token);

  socketService.onNewMessage((message: Message) => {
    if (message.conversationId === conversationId.value) {
      messages.value.push(message);
      messagesStore.addMessage(message);
      scrollToBottom();
      markAsRead();
    }
  });

  socketService.onMessageSent((data: any) => {
    const msg = messages.value.find((m) => m.id === data.id);
    if (msg) {
      msg.status = 'sent';
    }
  });
};

const sendTextMessage = async () => {
  const text = inputText.value.trim();
  if (!text) return;

  const tempMessage: Message = {
    id: `temp-${Date.now()}`,
    conversationId: conversationId.value,
    senderId: currentUserId.value,
    recipientId: recipientId.value,
    type: 'text',
    content: text,
    status: 'sent',
    createdAt: new Date().toISOString(),
  };

  messages.value.push(tempMessage);
  inputText.value = '';
  scrollToBottom();

  socketService.sendMessage(
    {
      recipientId: recipientId.value,
      type: 'text',
      content: text,
    },
    (response: any) => {
      const index = messages.value.findIndex((m) => m.id === tempMessage.id);
      if (index !== -1 && response.data) {
        messages.value[index].id = response.data.id;
      }
    }
  );
};

const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const filePath = res.tempFilePaths[0];

      uni.showLoading({ title: '上传中...' });

      try {
        const imageUrl = await messagesApi.uploadImage(filePath);

        socketService.sendMessage({
          recipientId: recipientId.value,
          type: 'image',
          content: imageUrl,
        });

        uni.hideLoading();
      } catch (error) {
        uni.hideLoading();
        uni.showToast({ title: '上传失败', icon: 'none' });
      }
    },
  });
};

const previewImage = (url: string) => {
  const imageUrls = messages.value
    .filter((m) => m.type === 'image')
    .map((m) => m.content);

  uni.previewImage({
    current: url,
    urls: imageUrls,
  });
};

const onTyping = () => {
  socketService.sendTyping(recipientId.value);
};

const scrollToBottom = () => {
  nextTick(() => {
    scrollToView.value = `msg-${messages.value.length - 1}`;
  });
};

const markAsRead = async () => {
  await messagesStore.markMessagesAsRead(conversationId.value);
};

const formatTime = (time: string) => {
  const date = new Date(time);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};
</script>

<style scoped>
.chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.messages-container {
  flex: 1;
  padding: 24rpx;
}

.message-item {
  margin-bottom: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.message-item.is-mine {
  align-items: flex-end;
}

.message-content {
  max-width: 70%;
}

.text-message {
  padding: 20rpx 24rpx;
  background-color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
  word-wrap: break-word;
}

.is-mine .text-message {
  background-color: #95ec69;
}

.image-message {
  max-width: 400rpx;
  max-height: 400rpx;
  border-radius: 8rpx;
}

.message-status {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.status,
.time {
  font-size: 20rpx;
  color: #999;
}

.input-bar {
  background-color: #fff;
  border-top: 1rpx solid #eee;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 36rpx;
  font-size: 28rpx;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.action-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
}

.send-btn {
  padding: 16rpx 32rpx;
  background-color: #07c160;
  color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.send-btn.disabled {
  background-color: #ccc;
}
</style>
