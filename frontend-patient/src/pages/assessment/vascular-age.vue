<template>
  <view class="vascular-container">
    <view class="form-section">
      <view class="form-item">
        <text class="label">年龄</text>
        <input v-model.number="form.age" type="number" placeholder="请输入年龄" class="input" />
      </view>

      <view class="form-item">
        <text class="label">性别</text>
        <picker :value="genderIndex" :range="genderOptions" @change="onGenderChange">
          <view class="picker">{{ genderOptions[genderIndex] }}</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">收缩压 (mmHg)</text>
        <input v-model.number="form.systolicBP" type="digit" placeholder="请输入收缩压" class="input" />
      </view>

      <view class="form-item">
        <text class="label">舒张压 (mmHg)</text>
        <input v-model.number="form.diastolicBP" type="digit" placeholder="请输入舒张压" class="input" />
      </view>

      <view class="form-item">
        <text class="label">总胆固醇 (mmol/L)</text>
        <input v-model.number="form.cholesterol" type="digit" placeholder="请输入总胆固醇" class="input" />
      </view>

      <view class="form-item">
        <text class="label">吸烟</text>
        <switch :checked="form.smoking" @change="form.smoking = $event.detail.value" />
      </view>

      <view class="form-item">
        <text class="label">糖尿病</text>
        <switch :checked="form.diabetes" @change="form.diabetes = $event.detail.value" />
      </view>
    </view>

    <button class="submit-btn" :disabled="loading" @click="handleSubmit">
      {{ loading ? '评估中...' : '开始评估' }}
    </button>

    <!-- 结果弹窗 -->
    <view v-if="showResult" class="result-modal" @click="showResult = false">
      <view class="result-content" @click.stop>
        <view class="result-header">
          <text class="result-title">血管年龄评估</text>
          <view class="risk-badge" :class="result.riskLevel">
            {{ getRiskText(result.riskLevel) }}
          </view>
        </view>
        <view class="vascular-age">
          <text class="age-label">血管年龄:</text>
          <text class="age-value">{{ result.vascularAge }} 岁</text>
        </view>
        <view class="age-diff" :class="ageDiffClass">
          {{ ageDiffText }}
        </view>
        <view class="result-text">{{ result.result }}</view>
        <view class="suggestions">
          <text class="suggestions-title">健康建议:</text>
          <text v-for="(item, idx) in result.suggestions" :key="idx" class="suggestion-item">
            {{ idx + 1 }}. {{ item }}
          </text>
        </view>
        <button class="close-btn" @click="showResult = false">关闭</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { assessmentApi } from '@/api/assessment';
import type { AssessmentResponse } from '@/types/assessment';

const form = ref({
  age: 0,
  gender: 'male' as 'male' | 'female',
  systolicBP: 0,
  diastolicBP: 0,
  cholesterol: 0,
  smoking: false,
  diabetes: false,
});

const genderOptions = ['男', '女'];
const genderValues: Array<'male' | 'female'> = ['male', 'female'];
const genderIndex = ref(0);

const loading = ref(false);
const showResult = ref(false);
const result = ref<AssessmentResponse>({
  id: '',
  type: 'vascular_age',
  score: 0,
  riskLevel: 'low',
  result: '',
  suggestions: [],
  vascularAge: 0,
});

const ageDiffClass = computed(() => {
  const diff = (result.value.vascularAge || 0) - form.value.age;
  if (diff <= 0) return 'good';
  if (diff <= 5) return 'normal';
  return 'warning';
});

const ageDiffText = computed(() => {
  const diff = (result.value.vascularAge || 0) - form.value.age;
  if (diff <= 0) return '血管年龄小于实际年龄，保持良好！';
  if (diff <= 5) return `血管年龄比实际年龄大 ${diff} 岁`;
  return `血管年龄比实际年龄大 ${diff} 岁，需要注意！`;
});

const onGenderChange = (e: any) => {
  genderIndex.value = e.detail.value;
  form.value.gender = genderValues[e.detail.value];
};

const handleSubmit = async () => {
  if (!form.value.age || !form.value.systolicBP || !form.value.diastolicBP || !form.value.cholesterol) {
    uni.showToast({ title: '请填写所有必填项', icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    const res = await assessmentApi.assessVascularAge(form.value);
    result.value = res;
    showResult.value = true;
  } catch (error) {
    uni.showToast({ title: '评估失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const getRiskText = (level: string) => {
  const map: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  };
  return map[level] || level;
};
</script>

<style scoped>
.vascular-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
}

.form-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 40rpx;
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.form-item:last-child {
  border-bottom: none;
}

.label {
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}

.input,
.picker {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: #333;
}

.input {
  padding: 0 20rpx;
}

.picker {
  padding: 0 20rpx;
  color: #666;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  background-color: #07c160;
  color: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
  border: none;
}

.submit-btn[disabled] {
  background-color: #c0c0c0;
}

.result-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.result-content {
  width: 600rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.result-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.risk-badge {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #fff;
}

.risk-badge.low {
  background-color: #52c41a;
}

.risk-badge.medium {
  background-color: #faad14;
}

.risk-badge.high {
  background-color: #f5222d;
}

.vascular-age {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
  gap: 16rpx;
}

.age-label {
  font-size: 28rpx;
  color: #666;
}

.age-value {
  font-size: 56rpx;
  font-weight: 600;
  color: #07c160;
}

.age-diff {
  text-align: center;
  font-size: 26rpx;
  padding: 16rpx;
  border-radius: 8rpx;
  margin-bottom: 24rpx;
}

.age-diff.good {
  background-color: #f6ffed;
  color: #52c41a;
}

.age-diff.normal {
  background-color: #fffbe6;
  color: #faad14;
}

.age-diff.warning {
  background-color: #fff1f0;
  color: #f5222d;
}

.result-text {
  font-size: 30rpx;
  color: #333;
  line-height: 1.6;
  margin-bottom: 24rpx;
}

.suggestions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 32rpx;
}

.suggestions-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.suggestion-item {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.close-btn {
  width: 100%;
  height: 72rpx;
  background-color: #07c160;
  color: #fff;
  border-radius: 36rpx;
  font-size: 28rpx;
  border: none;
}
</style>
