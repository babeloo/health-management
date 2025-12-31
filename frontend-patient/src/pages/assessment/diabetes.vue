<template>
  <view class="diabetes-container">
    <view class="form-section">
      <view class="form-item">
        <text class="label">年龄</text>
        <input v-model.number="form.age" type="number" placeholder="请输入年龄" class="input" />
      </view>

      <view class="form-item">
        <text class="label">体重 (kg)</text>
        <input v-model.number="form.weight" type="digit" placeholder="请输入体重" class="input" />
      </view>

      <view class="form-item">
        <text class="label">身高 (cm)</text>
        <input v-model.number="form.height" type="digit" placeholder="请输入身高" class="input" />
      </view>

      <view class="form-item">
        <text class="label">腰围 (cm，可选)</text>
        <input v-model.number="form.waistCircumference" type="digit" placeholder="请输入腰围" class="input" />
      </view>

      <view class="form-item">
        <text class="label">运动频率</text>
        <picker :value="exerciseIndex" :range="exerciseOptions" @change="onExerciseChange">
          <view class="picker">{{ exerciseOptions[exerciseIndex] }}</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">家族糖尿病史</text>
        <switch :checked="form.familyHistory" @change="form.familyHistory = $event.detail.value" />
      </view>

      <view class="form-item">
        <text class="label">高血压</text>
        <switch :checked="form.hypertension" @change="form.hypertension = $event.detail.value" />
      </view>
    </view>

    <button class="submit-btn" :disabled="loading" @click="handleSubmit">
      {{ loading ? '评估中...' : '开始评估' }}
    </button>

    <!-- 结果弹窗 -->
    <view v-if="showResult" class="result-modal" @click="showResult = false">
      <view class="result-content" @click.stop>
        <view class="result-header">
          <text class="result-title">评估结果</text>
          <view class="risk-badge" :class="result.riskLevel">
            {{ getRiskText(result.riskLevel) }}
          </view>
        </view>
        <view class="result-score">风险评分: {{ result.score }}</view>
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
  weight: 0,
  height: 0,
  waistCircumference: undefined as number | undefined,
  exerciseFrequency: 'occasionally' as 'never' | 'occasionally' | 'regularly',
  familyHistory: false,
  hypertension: false,
});

const exerciseOptions = ['从不运动', '偶尔运动', '经常运动'];
const exerciseValues: Array<'never' | 'occasionally' | 'regularly'> = ['never', 'occasionally', 'regularly'];
const exerciseIndex = ref(1);

const loading = ref(false);
const showResult = ref(false);
const result = ref<AssessmentResponse>({
  id: '',
  type: 'diabetes',
  score: 0,
  riskLevel: 'low',
  result: '',
  suggestions: [],
});

const onExerciseChange = (e: any) => {
  exerciseIndex.value = e.detail.value;
  form.value.exerciseFrequency = exerciseValues[e.detail.value];
};

const handleSubmit = async () => {
  if (!form.value.age || !form.value.weight || !form.value.height) {
    uni.showToast({ title: '请填写必填项', icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    const res = await assessmentApi.assessDiabetes(form.value);
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
.diabetes-container {
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

.result-score {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
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
