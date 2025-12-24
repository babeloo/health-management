"""
Prompt 模板管理系统

提供预定义的 Prompt 模板，包括：
- 健康科普
- 症状分析
- 用药指导
- 生活方式建议

所有模板都包含免责声明，确保合规性
"""

from typing import Dict, Any, List, Optional
from enum import Enum


class PromptType(str, Enum):
    """Prompt 模板类型枚举"""
    HEALTH_EDUCATION = "health_education"  # 健康科普
    SYMPTOM_ANALYSIS = "symptom_analysis"  # 症状分析
    MEDICATION_GUIDE = "medication_guide"  # 用药指导
    LIFESTYLE_ADVICE = "lifestyle_advice"  # 生活方式建议
    RISK_ASSESSMENT = "risk_assessment"  # 风险评估
    CHAT = "chat"  # 普通对话


# 免责声明文本
DISCLAIMER = "\n\n【免责声明】此建议仅供参考，请咨询专业医生。"


class PromptTemplate:
    """
    Prompt 模板类

    负责根据用户数据和模板类型生成 Prompt
    """

    # 系统角色定义
    SYSTEM_ROLES = {
        PromptType.HEALTH_EDUCATION: """你是一位专业的健康管理师，擅长用通俗易懂的语言讲解慢性病相关知识。
请根据用户的问题，提供准确、实用的健康科普信息。重点关注高血压、糖尿病等慢性病的预防和管理。""",

        PromptType.SYMPTOM_ANALYSIS: """你是一位有经验的健康顾问，能够根据患者描述的症状进行初步分析。
请根据症状信息，提供可能的原因分析和初步建议。注意：你的建议仅供参考，不能替代医生诊断。""",

        PromptType.MEDICATION_GUIDE: """你是一位资深药师，熟悉常见慢性病药物的使用方法和注意事项。
请根据药物名称，提供用法用量、注意事项、副作用等信息。强调遵医嘱用药的重要性。""",

        PromptType.LIFESTYLE_ADVICE: """你是一位健康生活方式专家，擅长为慢性病患者制定个性化的生活方式改善方案。
请根据患者的健康数据，提供饮食、运动、作息等方面的建议。""",

        PromptType.RISK_ASSESSMENT: """你是一位慢性病风险评估专家，能够根据患者的健康数据进行风险分析。
请根据提供的数据，评估患者当前的健康风险等级，并给出预防建议。""",

        PromptType.CHAT: """你是一位友善的健康助手，能够回答用户关于慢性病管理的各种问题。
请用温和、专业的语气回答问题，必要时提供实用的健康建议。"""
    }

    @staticmethod
    def build_health_education_prompt(topic: str, patient_context: Optional[Dict[str, Any]] = None) -> str:
        """
        构建健康科普 Prompt

        Args:
            topic: 科普主题（如"高血压饮食注意事项"）
            patient_context: 患者上下文信息（年龄、疾病等）

        Returns:
            格式化的 Prompt 文本
        """
        prompt = f"请介绍以下健康主题：{topic}\n\n"

        if patient_context:
            if patient_context.get("age"):
                prompt += f"患者年龄：{patient_context['age']}岁\n"
            if patient_context.get("diseases"):
                diseases_str = "、".join(patient_context["diseases"])
                prompt += f"已有疾病：{diseases_str}\n"

        prompt += "\n请提供：\n"
        prompt += "1. 核心知识点（3-5条）\n"
        prompt += "2. 实用建议\n"
        prompt += "3. 常见误区\n"
        prompt += "\n要求：语言简洁易懂，重点突出，适合普通患者阅读。"

        return prompt

    @staticmethod
    def build_symptom_analysis_prompt(symptoms: str, patient_data: Dict[str, Any]) -> str:
        """
        构建症状分析 Prompt

        Args:
            symptoms: 症状描述
            patient_data: 患者数据（年龄、性别、病史、最近检测数据等）

        Returns:
            格式化的 Prompt 文本
        """
        prompt = f"患者描述的症状：{symptoms}\n\n"

        prompt += "患者基本信息：\n"
        if patient_data.get("age"):
            prompt += f"- 年龄：{patient_data['age']}岁\n"
        if patient_data.get("gender"):
            prompt += f"- 性别：{patient_data['gender']}\n"
        if patient_data.get("diseases"):
            diseases_str = "、".join(patient_data["diseases"])
            prompt += f"- 已有疾病：{diseases_str}\n"

        if patient_data.get("recent_data"):
            prompt += "\n最近健康数据：\n"
            recent_data = patient_data["recent_data"]
            if recent_data.get("blood_pressure"):
                bp = recent_data["blood_pressure"]
                prompt += f"- 血压：{bp.get('systolic')}/{bp.get('diastolic')} mmHg\n"
            if recent_data.get("blood_sugar"):
                bs = recent_data["blood_sugar"]
                prompt += f"- 血糖：{bs.get('value')} mmol/L ({bs.get('type')})\n"

        prompt += "\n请提供：\n"
        prompt += "1. 症状可能的原因分析\n"
        prompt += "2. 风险等级评估（低/中/高）\n"
        prompt += "3. 初步建议（是否需要就医、注意事项等）\n"
        prompt += "\n注意：必须强调这不是医疗诊断，建议患者咨询医生。"

        return prompt

    @staticmethod
    def build_medication_guide_prompt(medication_name: str, patient_info: Optional[Dict[str, Any]] = None) -> str:
        """
        构建用药指导 Prompt

        Args:
            medication_name: 药物名称
            patient_info: 患者信息（年龄、病史等）

        Returns:
            格式化的 Prompt 文本
        """
        prompt = f"药物名称：{medication_name}\n\n"

        if patient_info:
            prompt += "患者信息：\n"
            if patient_info.get("age"):
                prompt += f"- 年龄：{patient_info['age']}岁\n"
            if patient_info.get("diseases"):
                diseases_str = "、".join(patient_info["diseases"])
                prompt += f"- 疾病：{diseases_str}\n"
            prompt += "\n"

        prompt += "请提供以下信息：\n"
        prompt += "1. 药物作用和适应症\n"
        prompt += "2. 用法用量（常规剂量）\n"
        prompt += "3. 注意事项（饮食、时间等）\n"
        prompt += "4. 常见副作用\n"
        prompt += "5. 禁忌症\n"
        prompt += "\n要求：\n"
        prompt += "- 必须强调遵医嘱用药\n"
        prompt += "- 不能提供具体处方建议\n"
        prompt += "- 提醒患者咨询医生或药师"

        return prompt

    @staticmethod
    def build_lifestyle_advice_prompt(health_data: Dict[str, Any]) -> str:
        """
        构建生活方式建议 Prompt

        Args:
            health_data: 患者健康数据（打卡记录、检测数据、风险评估等）

        Returns:
            格式化的 Prompt 文本
        """
        prompt = "基于患者的健康数据，请提供个性化的生活方式改善建议。\n\n"

        prompt += "患者健康概况：\n"
        if health_data.get("age"):
            prompt += f"- 年龄：{health_data['age']}岁\n"
        if health_data.get("diseases"):
            diseases_str = "、".join(health_data["diseases"])
            prompt += f"- 疾病：{diseases_str}\n"

        if health_data.get("recent_check_ins"):
            prompt += "\n最近打卡记录（近7天）：\n"
            check_ins = health_data["recent_check_ins"]
            if "blood_pressure" in check_ins:
                prompt += f"- 血压打卡：{check_ins['blood_pressure']}次\n"
            if "medication" in check_ins:
                prompt += f"- 用药打卡：{check_ins['medication']}次\n"
            if "exercise" in check_ins:
                prompt += f"- 运动打卡：{check_ins['exercise']}次\n"

        if health_data.get("average_bp"):
            bp = health_data["average_bp"]
            prompt += f"\n平均血压：{bp.get('systolic')}/{bp.get('diastolic')} mmHg\n"

        if health_data.get("risk_level"):
            prompt += f"风险等级：{health_data['risk_level']}\n"

        prompt += "\n请提供：\n"
        prompt += "1. 饮食建议（3-5条具体建议）\n"
        prompt += "2. 运动建议（类型、强度、时长）\n"
        prompt += "3. 作息建议\n"
        prompt += "4. 其他注意事项\n"
        prompt += "\n要求：建议要具体、可操作，考虑患者的实际情况。"

        return prompt

    @staticmethod
    def build_risk_assessment_prompt(health_data: Dict[str, Any]) -> str:
        """
        构建风险评估 Prompt

        Args:
            health_data: 患者健康数据

        Returns:
            格式化的 Prompt 文本
        """
        prompt = "请基于以下健康数据，评估患者的慢性病风险。\n\n"

        prompt += "患者基本信息：\n"
        if health_data.get("age"):
            prompt += f"- 年龄：{health_data['age']}岁\n"
        if health_data.get("gender"):
            prompt += f"- 性别：{health_data['gender']}\n"
        if health_data.get("bmi"):
            prompt += f"- BMI：{health_data['bmi']}\n"

        if health_data.get("diseases"):
            diseases_str = "、".join(health_data["diseases"])
            prompt += f"- 已有疾病：{diseases_str}\n"

        if health_data.get("health_metrics"):
            prompt += "\n健康指标（近30天平均）：\n"
            metrics = health_data["health_metrics"]
            if "blood_pressure" in metrics:
                bp = metrics["blood_pressure"]
                prompt += f"- 血压：{bp.get('systolic')}/{bp.get('diastolic')} mmHg\n"
            if "blood_sugar" in metrics:
                bs = metrics["blood_sugar"]
                prompt += f"- 血糖：{bs.get('fasting')} mmol/L (空腹)\n"
            if "heart_rate" in metrics:
                prompt += f"- 心率：{metrics['heart_rate']} bpm\n"

        if health_data.get("lifestyle"):
            prompt += "\n生活方式：\n"
            lifestyle = health_data["lifestyle"]
            if "smoking" in lifestyle:
                prompt += f"- 吸烟：{'是' if lifestyle['smoking'] else '否'}\n"
            if "drinking" in lifestyle:
                prompt += f"- 饮酒：{'是' if lifestyle['drinking'] else '否'}\n"
            if "exercise_frequency" in lifestyle:
                prompt += f"- 运动频率：{lifestyle['exercise_frequency']}\n"

        prompt += "\n请提供：\n"
        prompt += "1. 风险等级评估（低风险/中风险/高风险）\n"
        prompt += "2. 主要风险因素分析\n"
        prompt += "3. 预防建议（优先级排序）\n"
        prompt += "4. 建议复查项目和频率\n"

        return prompt

    @staticmethod
    def build_chat_prompt(user_message: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> str:
        """
        构建普通对话 Prompt

        Args:
            user_message: 用户消息
            conversation_history: 对话历史（可选）

        Returns:
            格式化的 Prompt 文本
        """
        # 对于普通对话，直接返回用户消息
        # 对话历史由调用方通过 messages 参数处理
        return user_message

    @staticmethod
    def add_disclaimer(response: str) -> str:
        """
        为 AI 响应添加免责声明

        Args:
            response: AI 原始响应

        Returns:
            包含免责声明的响应
        """
        # 检查是否已包含免责声明（避免重复添加）
        if "仅供参考" in response or "请咨询专业医生" in response or "免责声明" in response:
            return response

        return response + DISCLAIMER

    @staticmethod
    def build_messages(
        prompt_type: PromptType,
        user_prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> List[Dict[str, str]]:
        """
        构建完整的消息列表（包含系统角色和对话历史）

        Args:
            prompt_type: Prompt 类型
            user_prompt: 用户 Prompt
            conversation_history: 对话历史

        Returns:
            消息列表，格式为 [{"role": "system", "content": "..."}, ...]
        """
        messages = []

        # 添加系统角色
        system_role = PromptTemplate.SYSTEM_ROLES.get(prompt_type)
        if system_role:
            messages.append({"role": "system", "content": system_role})

        # 添加对话历史
        if conversation_history:
            messages.extend(conversation_history)

        # 添加当前用户消息
        messages.append({"role": "user", "content": user_prompt})

        return messages
