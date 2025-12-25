"""
自然语言打卡解析器

解析自然语言输入，提取打卡相关数据
"""

import re
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from loguru import logger
from pydantic import BaseModel, Field


class CheckinType(str, Enum):
    """打卡类型枚举"""

    BLOOD_PRESSURE = "blood_pressure"
    BLOOD_SUGAR = "blood_sugar"
    MEDICATION = "medication"
    EXERCISE = "exercise"
    DIET = "diet"


class BloodSugarTiming(str, Enum):
    """血糖测量时机"""

    FASTING = "fasting"  # 空腹
    BEFORE_MEAL = "before_meal"  # 餐前
    AFTER_MEAL = "after_meal"  # 餐后
    BEFORE_SLEEP = "before_sleep"  # 睡前
    UNKNOWN = "unknown"  # 未知


class CheckinData(BaseModel):
    """打卡数据模型"""

    checkin_type: CheckinType = Field(..., description="打卡类型")
    data: Dict[str, Any] = Field(..., description="打卡数据")
    notes: Optional[str] = Field(None, description="备注")
    timestamp: str = Field(
        default_factory=lambda: datetime.now().isoformat(), description="打卡时间"
    )


class CheckinParserService:
    """
    自然语言打卡解析服务

    解析用户输入的自然语言，提取打卡数据
    """

    def __init__(self):
        """初始化打卡解析服务"""
        logger.info("CheckinParserService initialized")

    def parse_blood_pressure(self, text: str, entities: Dict[str, Any]) -> Optional[CheckinData]:
        """
        解析血压打卡

        Args:
            text: 用户输入文本
            entities: 已提取的实体

        Returns:
            CheckinData: 打卡数据，解析失败返回 None
        """
        try:
            # 优先使用意图识别已提取的实体
            if "systolic" in entities and "diastolic" in entities:
                systolic = entities["systolic"]
                diastolic = entities["diastolic"]
            else:
                # 尝试从文本中提取
                # 支持格式：130/80, 130-80, 收缩压130舒张压80
                patterns = [
                    r"(\d{2,3})[/／\-](\d{2,3})",
                    r"收缩压.*?(\d{2,3}).*?舒张压.*?(\d{2,3})",
                    r"高压.*?(\d{2,3}).*?低压.*?(\d{2,3})",
                ]

                match = None
                for pattern in patterns:
                    match = re.search(pattern, text)
                    if match:
                        break

                if not match:
                    logger.warning(f"Failed to parse blood pressure from: {text}")
                    return None

                systolic = int(match.group(1))
                diastolic = int(match.group(2))

            # 提取心率（可选）
            heart_rate = None
            hr_match = re.search(r"心率.*?(\d{2,3})", text)
            if hr_match:
                heart_rate = int(hr_match.group(1))

            # 提取备注
            notes = self._extract_notes(text)

            # 数据验证
            if not (60 <= systolic <= 250):
                logger.warning(f"Invalid systolic blood pressure: {systolic}")
                return None
            if not (40 <= diastolic <= 150):
                logger.warning(f"Invalid diastolic blood pressure: {diastolic}")
                return None

            checkin_data = CheckinData(
                checkin_type=CheckinType.BLOOD_PRESSURE,
                data={
                    "systolic": systolic,
                    "diastolic": diastolic,
                    "heart_rate": heart_rate,
                    "unit": "mmHg",
                },
                notes=notes,
            )

            logger.info(f"Parsed blood pressure: {systolic}/{diastolic}")
            return checkin_data

        except Exception as e:
            logger.error(f"Error parsing blood pressure: {str(e)}")
            return None

    def parse_blood_sugar(self, text: str, entities: Dict[str, Any]) -> Optional[CheckinData]:
        """
        解析血糖打卡

        Args:
            text: 用户输入文本
            entities: 已提取的实体

        Returns:
            CheckinData: 打卡数据，解析失败返回 None
        """
        try:
            # 提取血糖值
            if "value" in entities:
                value = entities["value"]
            else:
                # 从文本中提取
                match = re.search(r"(\d+\.?\d*)", text)
                if not match:
                    logger.warning(f"Failed to parse blood sugar from: {text}")
                    return None
                value = float(match.group(1))

            # 识别测量时机
            timing = BloodSugarTiming.UNKNOWN
            if re.search(r"空腹", text):
                timing = BloodSugarTiming.FASTING
            elif re.search(r"餐前", text):
                timing = BloodSugarTiming.BEFORE_MEAL
            elif re.search(r"餐后", text):
                timing = BloodSugarTiming.AFTER_MEAL
            elif re.search(r"睡前", text):
                timing = BloodSugarTiming.BEFORE_SLEEP

            # 提取备注
            notes = self._extract_notes(text)

            # 数据验证
            if not (1.0 <= value <= 30.0):
                logger.warning(f"Invalid blood sugar value: {value}")
                return None

            checkin_data = CheckinData(
                checkin_type=CheckinType.BLOOD_SUGAR,
                data={
                    "value": value,
                    "timing": timing.value,
                    "unit": "mmol/L",
                },
                notes=notes,
            )

            logger.info(f"Parsed blood sugar: {value} mmol/L ({timing.value})")
            return checkin_data

        except Exception as e:
            logger.error(f"Error parsing blood sugar: {str(e)}")
            return None

    def parse_medication(self, text: str, entities: Dict[str, Any]) -> Optional[CheckinData]:
        """
        解析用药打卡

        Args:
            text: 用户输入文本
            entities: 已提取的实体

        Returns:
            CheckinData: 打卡数据，解析失败返回 None
        """
        try:
            # 提取药物名称（可选）
            medication_name = entities.get("medication_name")

            # 提取剂量（可选）
            dosage = entities.get("dosage")

            # 提取备注
            notes = self._extract_notes(text)

            checkin_data = CheckinData(
                checkin_type=CheckinType.MEDICATION,
                data={
                    "medication_name": medication_name,
                    "dosage": dosage,
                    "taken": True,
                },
                notes=notes,
            )

            logger.info(f"Parsed medication checkin")
            return checkin_data

        except Exception as e:
            logger.error(f"Error parsing medication: {str(e)}")
            return None

    def parse_exercise(self, text: str, entities: Dict[str, Any]) -> Optional[CheckinData]:
        """
        解析运动打卡

        Args:
            text: 用户输入文本
            entities: 已提取的实体

        Returns:
            CheckinData: 打卡数据，解析失败返回 None
        """
        try:
            # 提取运动时长（分钟）
            duration = entities.get("duration")
            if not duration:
                match = re.search(r"(\d+)\s*分钟", text)
                if match:
                    duration = int(match.group(1))

            # 提取步数
            steps = None
            steps_match = re.search(r"(\d+)\s*步", text)
            if steps_match:
                steps = int(steps_match.group(1))

            # 提取运动类型
            exercise_type = None
            type_patterns = {
                "walk": ["走路", "散步", "步行"],
                "run": ["跑步", "慢跑"],
                "swim": ["游泳"],
                "cycle": ["骑车", "骑行", "单车"],
                "yoga": ["瑜伽"],
            }
            for etype, keywords in type_patterns.items():
                if any(kw in text for kw in keywords):
                    exercise_type = etype
                    break

            # 提取备注
            notes = self._extract_notes(text)

            checkin_data = CheckinData(
                checkin_type=CheckinType.EXERCISE,
                data={
                    "exercise_type": exercise_type,
                    "duration": duration,
                    "steps": steps,
                },
                notes=notes,
            )

            logger.info(f"Parsed exercise checkin: duration={duration}min, steps={steps}")
            return checkin_data

        except Exception as e:
            logger.error(f"Error parsing exercise: {str(e)}")
            return None

    def parse_diet(self, text: str, entities: Dict[str, Any]) -> Optional[CheckinData]:
        """
        解析饮食打卡

        Args:
            text: 用户输入文本
            entities: 已提取的实体

        Returns:
            CheckinData: 打卡数据，解析失败返回 None
        """
        try:
            # 识别餐次
            meal_type = None
            if re.search(r"早餐|早饭|早上", text):
                meal_type = "breakfast"
            elif re.search(r"午餐|午饭|中午", text):
                meal_type = "lunch"
            elif re.search(r"晚餐|晚饭|晚上", text):
                meal_type = "dinner"
            elif re.search(r"加餐|零食|夜宵", text):
                meal_type = "snack"

            # 提取备注（作为食物描述）
            notes = self._extract_notes(text)

            checkin_data = CheckinData(
                checkin_type=CheckinType.DIET,
                data={
                    "meal_type": meal_type,
                    "description": notes or "已完成饮食打卡",
                },
                notes=notes,
            )

            logger.info(f"Parsed diet checkin: meal_type={meal_type}")
            return checkin_data

        except Exception as e:
            logger.error(f"Error parsing diet: {str(e)}")
            return None

    def parse(
        self, checkin_type: CheckinType, text: str, entities: Dict[str, Any]
    ) -> Optional[CheckinData]:
        """
        解析打卡数据（统一入口）

        Args:
            checkin_type: 打卡类型
            text: 用户输入文本
            entities: 已提取的实体

        Returns:
            CheckinData: 打卡数据，解析失败返回 None
        """
        parsers = {
            CheckinType.BLOOD_PRESSURE: self.parse_blood_pressure,
            CheckinType.BLOOD_SUGAR: self.parse_blood_sugar,
            CheckinType.MEDICATION: self.parse_medication,
            CheckinType.EXERCISE: self.parse_exercise,
            CheckinType.DIET: self.parse_diet,
        }

        parser = parsers.get(checkin_type)
        if not parser:
            logger.error(f"Unknown checkin type: {checkin_type}")
            return None

        return parser(text, entities)

    def _extract_notes(self, text: str) -> Optional[str]:
        """
        提取备注信息

        Args:
            text: 用户输入文本

        Returns:
            str: 备注文本，无备注返回 None
        """
        # 查找备注关键词
        patterns = [
            r"备注[:：]?\s*(.+)",
            r"说明[:：]?\s*(.+)",
            r"附言[:：]?\s*(.+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()

        return None


# 全局单例
_checkin_parser_service: Optional[CheckinParserService] = None


def get_checkin_parser_service() -> CheckinParserService:
    """
    获取打卡解析服务实例（单例模式）

    Returns:
        CheckinParserService: 打卡解析服务实例
    """
    global _checkin_parser_service
    if _checkin_parser_service is None:
        _checkin_parser_service = CheckinParserService()
    return _checkin_parser_service
