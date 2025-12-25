"""
打卡解析服务测试
"""

import pytest

from app.services.checkin_parser import (
    CheckinParserService,
    CheckinType,
    BloodSugarTiming,
)


class TestCheckinParserService:
    """测试打卡解析服务"""

    def setup_method(self):
        """测试前准备"""
        self.service = CheckinParserService()

    def test_parse_blood_pressure_standard_format(self):
        """测试血压解析 - 标准格式"""
        text = "今天血压 130/80"
        result = self.service.parse_blood_pressure(text, {})

        assert result is not None
        assert result.checkin_type == CheckinType.BLOOD_PRESSURE
        assert result.data["systolic"] == 130
        assert result.data["diastolic"] == 80
        assert result.data["unit"] == "mmHg"

    def test_parse_blood_pressure_with_heart_rate(self):
        """测试血压解析 - 包含心率"""
        text = "血压 120/75 心率 68"
        result = self.service.parse_blood_pressure(text, {})

        assert result is not None
        assert result.data["systolic"] == 120
        assert result.data["diastolic"] == 75
        assert result.data["heart_rate"] == 68

    def test_parse_blood_pressure_chinese_description(self):
        """测试血压解析 - 中文描述"""
        text = "收缩压 135 舒张压 85"
        result = self.service.parse_blood_pressure(text, {})

        assert result is not None
        assert result.data["systolic"] == 135
        assert result.data["diastolic"] == 85

    def test_parse_blood_pressure_with_entities(self):
        """测试血压解析 - 使用已提取实体"""
        text = "今天血压"
        entities = {"systolic": 140, "diastolic": 90}
        result = self.service.parse_blood_pressure(text, entities)

        assert result is not None
        assert result.data["systolic"] == 140
        assert result.data["diastolic"] == 90

    def test_parse_blood_pressure_invalid_values(self):
        """测试血压解析 - 无效数值"""
        text = "血压 300/20"  # 收缩压过高
        result = self.service.parse_blood_pressure(text, {})

        assert result is None

    def test_parse_blood_sugar_standard(self):
        """测试血糖解析 - 标准格式"""
        text = "空腹血糖 5.6"
        result = self.service.parse_blood_sugar(text, {})

        assert result is not None
        assert result.checkin_type == CheckinType.BLOOD_SUGAR
        assert result.data["value"] == 5.6
        assert result.data["timing"] == BloodSugarTiming.FASTING.value
        assert result.data["unit"] == "mmol/L"

    def test_parse_blood_sugar_after_meal(self):
        """测试血糖解析 - 餐后血糖"""
        text = "餐后血糖 7.8"
        result = self.service.parse_blood_sugar(text, {})

        assert result is not None
        assert result.data["value"] == 7.8
        assert result.data["timing"] == BloodSugarTiming.AFTER_MEAL.value

    def test_parse_blood_sugar_before_sleep(self):
        """测试血糖解析 - 睡前血糖"""
        text = "睡前血糖 6.2"
        result = self.service.parse_blood_sugar(text, {})

        assert result is not None
        assert result.data["value"] == 6.2
        assert result.data["timing"] == BloodSugarTiming.BEFORE_SLEEP.value

    def test_parse_blood_sugar_with_entities(self):
        """测试血糖解析 - 使用已提取实体"""
        text = "今天血糖"
        entities = {"value": 5.2}
        result = self.service.parse_blood_sugar(text, entities)

        assert result is not None
        assert result.data["value"] == 5.2

    def test_parse_blood_sugar_invalid_values(self):
        """测试血糖解析 - 无效数值"""
        text = "血糖 50"  # 数值过高
        result = self.service.parse_blood_sugar(text, {})

        assert result is None

    def test_parse_medication_simple(self):
        """测试用药解析 - 简单打卡"""
        text = "已服药"
        result = self.service.parse_medication(text, {})

        assert result is not None
        assert result.checkin_type == CheckinType.MEDICATION
        assert result.data["taken"] is True

    def test_parse_exercise_with_duration(self):
        """测试运动解析 - 包含时长"""
        text = "今天跑步 30 分钟"
        entities = {"duration": 30}
        result = self.service.parse_exercise(text, entities)

        assert result is not None
        assert result.checkin_type == CheckinType.EXERCISE
        assert result.data["duration"] == 30

    def test_parse_exercise_with_steps(self):
        """测试运动解析 - 包含步数"""
        text = "今天走了 8000 步"
        result = self.service.parse_exercise(text, {})

        assert result is not None
        assert result.data["steps"] == 8000

    def test_parse_diet_breakfast(self):
        """测试饮食解析 - 早餐"""
        text = "吃了早餐"
        result = self.service.parse_diet(text, {})

        assert result is not None
        assert result.checkin_type == CheckinType.DIET
        assert result.data["meal_type"] == "breakfast"

    def test_parse_diet_lunch(self):
        """测试饮食解析 - 午餐"""
        text = "午餐打卡"
        result = self.service.parse_diet(text, {})

        assert result is not None
        assert result.data["meal_type"] == "lunch"

    def test_parse_unified_interface(self):
        """测试统一解析接口"""
        text = "血压 125/80"
        result = self.service.parse(CheckinType.BLOOD_PRESSURE, text, {})

        assert result is not None
        assert result.checkin_type == CheckinType.BLOOD_PRESSURE
        assert result.data["systolic"] == 125
        assert result.data["diastolic"] == 80
