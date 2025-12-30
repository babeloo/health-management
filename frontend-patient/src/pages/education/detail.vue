<template>
  <view class="detail-container">
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>

    <view v-else-if="article" class="article-content">
      <!-- 文章头部 -->
      <view class="article-header">
        <text class="article-title">{{ article.title }}</text>
        <view class="article-meta">
          <text class="category-tag">{{ article.category }}</text>
          <text class="view-count">{{ article.viewCount }} 阅读</text>
          <text class="publish-date">{{ formatDate(article.createdAt) }}</text>
        </view>
      </view>

      <!-- 封面图 -->
      <image
        v-if="article.coverImage"
        class="cover-image"
        :src="article.coverImage"
        mode="widthFix"
      />

      <!-- 文章正文 -->
      <view class="article-body">
        <text class="body-text">{{ article.content }}</text>
      </view>

      <!-- 操作按钮 -->
      <view class="action-bar">
        <button class="action-btn" @click="toggleFavorite">
          {{ article.isFavorite ? '已收藏' : '收藏' }}
        </button>
        <button class="action-btn" @click="shareArticle">分享</button>
      </view>
    </view>

    <view v-else class="error-state">
      <text>文章不存在</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { aiApi } from '@/api/ai';
import type { EducationArticle } from '@/types/ai';

const article = ref<EducationArticle | null>(null);
const loading = ref(true);
const articleId = ref('');

const loadArticle = async () => {
  if (!articleId.value) return;

  loading.value = true;
  try {
    article.value = await aiApi.getArticleDetail(articleId.value);
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
  }
};

const toggleFavorite = async () => {
  if (!article.value) return;

  try {
    if (article.value.isFavorite) {
      await aiApi.unfavoriteArticle(article.value.id);
      article.value.isFavorite = false;
      uni.showToast({ title: '已取消收藏', icon: 'success' });
    } else {
      await aiApi.favoriteArticle(article.value.id);
      article.value.isFavorite = true;
      uni.showToast({ title: '收藏成功', icon: 'success' });
    }
  } catch (error: any) {
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none',
    });
  }
};

const shareArticle = () => {
  uni.showShareMenu({
    withShareTicket: true,
  });
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

onLoad((options) => {
  if (options?.id) {
    articleId.value = options.id as string;
    loadArticle();
  }
});
</script>

<style scoped>
.detail-container {
  min-height: 100vh;
  background-color: #fff;
}

.loading-state,
.error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}

.article-content {
  padding: 32rpx;
}

.article-header {
  margin-bottom: 32rpx;
}

.article-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.5;
  margin-bottom: 20rpx;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 20rpx;
  font-size: 24rpx;
  color: #999;
}

.category-tag {
  padding: 4rpx 12rpx;
  background-color: #f0f9ff;
  color: #07c160;
  border-radius: 4rpx;
}

.cover-image {
  width: 100%;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
}

.article-body {
  margin-bottom: 40rpx;
}

.body-text {
  font-size: 30rpx;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
}

.action-bar {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
  border-top: 1rpx solid #e5e5e5;
}

.action-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #f5f5f5;
  color: #333;
  border-radius: 40rpx;
  font-size: 28rpx;
  border: none;
}

.action-btn:first-child {
  background-color: #07c160;
  color: #fff;
}
</style>
