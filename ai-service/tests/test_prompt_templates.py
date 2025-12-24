"""
Prompt 模板单元测试
"""

import pytest
from app.services.prompt_templates import PromptTemplate, PromptType, DISCLAIMER


class TestPromptTemplate:
    """Prompt 模板测试类"""

    def test_build_health_education_prompt(self):
        """测试健康科普 Prompt 构建"""
        topic = "高血压饮食注意事项"
        prompt = PromptTemplate.build_health_education_prompt(topic)

        assert topic in prompt
        assert "核心知识点" in prompt
        assert "实用建议" in prompt
        assert "常见误区" in prompt

    def test_build_health_education_prompt_with_context(self):
        """测试带患者上下文的健康科普 Prompt"""
        topic = "高血压饮食注意事项"
        context = {
            "age": 50,
            "diseases": ["高血压", "糖尿病"]
        }
        prompt = PromptTemplate.build_health_education_prompt(topic, context)

        assert "50岁" in prompt
        assert "高血压" in prompt
        assert "糖尿病" in prompt

    def test_build_symptom_analysis_prompt(self):
        """测试症状分析 Prompt 构建"""
        symptoms = "头晕、头痛"
        patient_data = {
            "age": 55,
            "gender": "male",
            "diseases": ["高血压"],
            "recent_data": {
                "blood_pressure": {
                    "systolic": 160,
                    "diastolic": 95
                }
            }
        }
        prompt = PromptTemplate.build_symptom_analysis_prompt(symptoms, patient_data)

        assert symptoms in prompt
        assert "55岁" in prompt
        assert "男" in prompt or "male" in prompt
        assert "160/95" in prompt
        assert "可能的原因分析" in prompt
        assert "风险等级评估" in prompt

    def test_build_medication_guide_prompt(self):
        """测试用药指导 Prompt 构建"""
        medication = "硝苯地平缓释片"
        prompt = PromptTemplate.build_medication_guide_prompt(medication)

        assert medication in prompt
        assert "用法用量" in prompt
        assert "注意事项" in prompt
        assert "副作用" in prompt
        assert "遵医嘱用药" in prompt

    def test_build_medication_guide_prompt_with_patient_info(self):
        """测试带患者信息的用药指导 Prompt"""
        medication = "硝苯地平缓释片"
        patient_info = {
            "age": 60,
            "diseases": ["高血压"]
        }
        prompt = PromptTemplate.build_medication_guide_prompt(medication, patient_info)

        assert "60岁" in prompt
        assert "高血压" in prompt

    def test_build_lifestyle_advice_prompt(self):
        """测试生活方式建议 Prompt 构建"""
        health_data = {
            "age": 45,
            "diseases": ["高血压"],
            "recent_check_ins": {
                "blood_pressure": 5,
                "medication": 7,
                "exercise": 3
            },
            "average_bp": {
                "systolic": 145,
                "diastolic": 90
            },
            "risk_level": "medium"
        }
        prompt = PromptTemplate.build_lifestyle_advice_prompt(health_data)

        assert "45岁" in prompt
        assert "高血压" in prompt
        assert "5次" in prompt  # 血压打卡次数
        assert "145/90" in prompt
        assert "饮食建议" in prompt
        assert "运动建议" in prompt

    def test_build_risk_assessment_prompt(self):
        """测试风险评估 Prompt 构建"""
        health_data = {
            "age": 50,
            "gender": "male",
            "bmi": 28.5,
            "diseases": ["高血压"],
            "health_metrics": {
                "blood_pressure": {
                    "systolic": 150,
                    "diastolic": 95
                },
                "blood_sugar": {
                    "fasting": 6.5
                }
            },
            "lifestyle": {
                "smoking": True,
                "drinking": False,
                "exercise_frequency": "1-2次/周"
            }
        }
        prompt = PromptTemplate.build_risk_assessment_prompt(health_data)

        assert "50岁" in prompt
        assert "28.5" in prompt  # BMI
        assert "150/95" in prompt
        assert "6.5" in prompt  # 血糖
        assert "吸烟" in prompt
        assert "风险等级评估" in prompt

    def test_build_chat_prompt(self):
        """测试普通对话 Prompt 构建"""
        message = "高血压患者应该注意什么？"
        prompt = PromptTemplate.build_chat_prompt(message)

        assert prompt == message

    def test_add_disclaimer(self):
        """测试添加免责声明"""
        response = "建议您控制饮食，增加运动。"
        result = PromptTemplate.add_disclaimer(response)

        assert response in result
        assert DISCLAIMER in result or "仅供参考" in result

    def test_add_disclaimer_already_exists(self):
        """测试避免重复添加免责声明"""
        response = "建议您控制饮食。此建议仅供参考，请咨询专业医生。"
        result = PromptTemplate.add_disclaimer(response)

        # 不应该重复添加
        assert result == response

    def test_build_messages_with_system_role(self):
        """测试构建包含系统角色的消息列表"""
        messages = PromptTemplate.build_messages(
            prompt_type=PromptType.HEALTH_EDUCATION,
            user_prompt="什么是高血压？"
        )

        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "健康管理师" in messages[0]["content"]
        assert messages[1]["role"] == "user"
        assert messages[1]["content"] == "什么是高血压？"

    def test_build_messages_with_conversation_history(self):
        """测试构建包含对话历史的消息列表"""
        history = [
            {"role": "user", "content": "你好"},
            {"role": "assistant", "content": "你好！有什么可以帮助你的？"}
        ]
        messages = PromptTemplate.build_messages(
            prompt_type=PromptType.CHAT,
            user_prompt="高血压应该注意什么？",
            conversation_history=history
        )

        assert len(messages) == 4  # system + 2 history + user
        assert messages[0]["role"] == "system"
        assert messages[1] == history[0]
        assert messages[2] == history[1]
        assert messages[3]["role"] == "user"

    def test_all_prompt_types_have_system_roles(self):
        """测试所有 Prompt 类型都有系统角色定义"""
        for prompt_type in PromptType:
            system_role = PromptTemplate.SYSTEM_ROLES.get(prompt_type)
            assert system_role is not None, f"{prompt_type} 缺少系统角色定义"
            assert len(system_role) > 0, f"{prompt_type} 系统角色不能为空"
