<template>
  <view class="education-container">
    <!-- 分类标签 -->
    <view class="category-tabs">
      <view
        v-for="cat in categories"
        :key="cat.value"
        class="tab-item"
        :class="{ active: currentCategory === cat.value }"
        @click="changeCategory(cat.value)"
      >
        {{ cat.label }}
      </view>
    </view>

    <!-- 文章列表 -->
    <scroll-view class="article-list" scroll-y @scrolltolower="loadMore">
      <view v-if="loading && articles.length === 0" class="loading-state">
        <text>加载中...</text>
      </view>

      <view v-else-if="articles.length === 0" class="empty-state">
        <text>暂无科普内容</text>
      </view>

      <view
        v-for="article in articles"
        :key="article.id"
        class="article-item"
        @click="goToDetail(article.id)"
      >
        <view v-if="article.coverImage" class="article-cover">
          <image :src="article.coverImage" mode="aspectFill" />
        </view>
        <view class="article-info">
          <text class="article-title">{{ article.title }}</text>
          <text class="article-summary">{{ article.summary }}</text>
          <view class="article-meta">
            <text class="category-tag">{{ article.category }}</text>
            <text class="view-count">{{ article.viewCount }} 阅读</text>
          </view>
        </view>
      </view>

      <view v-if="loading && articles.length > 0" class="loading-more">
        <text>加载更多...</text>
      </view>

      <view v-if="!hasMore && articles.length > 0" class="no-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { aiApi } from '@/api/ai';
import type { EducationArticle } from '@/types/ai';

const categories = [
  { label: '全部', value: '' },
  { label: '慢病知识', value: 'chronic-disease' },
  { label: '用药指导', value: 'medication' },
  { label: '饮食建议', value: 'diet' },
];

const currentCategory = ref('');
const articles = ref<EducationArticle[]>([]);
const loading = ref(false);
const page = ref(1);
const hasMore = ref(true);

const loadArticles = async (reset = false) => {
  if (loading.value) return;

  if (reset) {
    page.value = 1;
    articles.value = [];
    hasMore.value = true;
  }

  loading.value = true;
  try {
    const response = await aiApi.getArticles({
      category: currentCategory.value || undefined,
      page: page.value,
      limit: 10,
    });

    articles.value = [...articles.value, ...response.data];
    hasMore.value = response.data.length === 10;
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
  }
};

const changeCategory = (category: string) => {
  currentCategory.value = category;
  loadArticles(true);
};

const loadMore = () => {
  if (!hasMore.value || loading.value) return;
  page.value++;
  loadArticles();
};

const goToDetail = (id: string) => {
  uni.navigateTo({
    url: `/pages/education/detail?id=${id}`,
  });
};

onMounted(() => {
  loadArticles();
});
</script>

<style scoped>
.education-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.category-tabs {
  display: flex;
  background-color: #fff;
  padding: 20rpx;
  border-bottom: 1rpx solid #e5e5e5;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 28rpx;
  color: #666;
  border-radius: 8rpx;
}

.tab-item.active {
  color: #07c160;
  background-color: #f0f9ff;
  font-weight: bold;
}

.article-list {
  flex: 1;
  padding: 20rpx;
}

.loading-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}

.article-item {
  display: flex;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.article-cover {
  width: 200rpx;
  height: 150rpx;
  margin-right: 20rpx;
  border-radius: 8rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.article-cover image {
  width: 100%;
  height: 100%;
}

.article-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.article-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.article-summary {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.article-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 24rpx;
  color: #999;
}

.category-tag {
  padding: 4rpx 12rpx;
  background-color: #f0f9ff;
  color: #07c160;
  border-radius: 4rpx;
}

.loading-more,
.no-more {
  text-align: center;
  padding: 20rpx 0;
  color: #999;
  font-size: 24rpx;
}
</style>
