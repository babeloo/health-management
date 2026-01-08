"""
Prompt 模板管理系统

提供预定义的 Prompt 模板，包括：
- 健康咨询
- 症状分析
- 用药咨询
- 诊断建议
- RAG 问答
- 意图识别
"""

from typing import Dict, Any, List, Optional
from enum import Enum


class PromptType(str, Enum):
    """Prompt 模板类型枚举"""

    HEALTH_CONSULTATION = "health_consultation"  # 健康咨询
    SYMPTOM_ANALYSIS = "symptom_analysis"  # 症状分析
    MEDICATION_CONSULTATION = "medication_consultation"  # 用药咨询
    DIAGNOSIS_ADVICE = "diagnosis_advice"  # 诊断建议
    RAG_QUERY = "rag_query"  # RAG 问答
    INTENT_RECOGNITION = "intent_recognition"  # 意图识别
    DIET_ADVICE = "diet_advice"  # 饮食建议
    EXERCISE_ADVICE = "exercise_advice"  # 运动建议


# 免责声明
DISCLAIMER = "此建议仅供参考，请咨询专业医生。AI 生成内容不应替代专业医疗诊断和治疗。"


class PromptTemplates:
    """Prompt 模板类"""

    @staticmethod
    def get_system_role(prompt_type: PromptType) -> str:
        """
        获取系统角色定义

        Args:
            prompt_type: Prompt 类型

        Returns:
            系统角色描述
        """
        roles = {
            PromptType.HEALTH_CONSULTATION: """你是一位专业的健康顾问，擅长慢病管理和健康咨询。
请用温和、专业的语气回答用户的健康问题，提供准确、实用的建议。
重点关注高血压、糖尿病等慢性病的预防和管理。""",
            PromptType.SYMPTOM_ANALYSIS: """你是一位有经验的健康顾问，能够根据患者描述的症状进行初步分析。
请根据症状信息，提供可能的原因分析和初步建议。
注意：你的建议仅供参考，不能替代医生诊断。如果症状严重，建议立即就医。""",
            PromptType.MEDICATION_CONSULTATION: """你是一位资深药师，熟悉常见慢性病药物的使用方法和注意事项。
请根据药物名称，提供用法用量、注意事项、副作用等信息。
强调遵医嘱用药的重要性，不要自行调整药量。""",
            PromptType.DIAGNOSIS_ADVICE: """你是一位慢性病管理专家，能够根据患者的健康数据提供诊断建议。
请根据提供的数据，评估患者当前的健康状况，并给出个性化的管理建议。
包括饮食、运动、用药、复查等方面的建议。""",
            PromptType.RAG_QUERY: """你是一位专业的健康顾问，擅长慢病管理和健康咨询。
请基于提供的健康知识回答用户问题。
如果知识中没有相关信息，请诚实告知，不要编造内容。""",
            PromptType.INTENT_RECOGNITION: """你是一个意图识别助手，能够准确识别用户的意图。
请分析用户的输入，判断用户想要做什么。""",
            PromptType.DIET_ADVICE: """你是一位营养师，擅长为慢性病患者制定饮食方案。
请根据患者的健康状况，提供个性化的饮食建议。""",
            PromptType.EXERCISE_ADVICE: """你是一位运动康复专家，擅长为慢性病患者制定运动方案。
请根据患者的健康状况，提供安全、有效的运动建议。""",
        }
        return roles.get(prompt_type, roles[PromptType.HEALTH_CONSULTATION])

    @staticmethod
    def build_health_consultation_prompt(
        question: str, patient_context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """
        构建健康咨询 Prompt

        Args:
            question: 用户问题
            patient_context: 患者上下文信息

        Returns:
            消息列表
        """
        system_content = PromptTemplates.get_system_role(PromptType.HEALTH_CONSULTATION)

        if patient_context:
            system_content += "\n\n患者信息：\n"
            if patient_context.get("age"):
                system_content += f"- 年龄：{patient_context['age']}岁\n"
            if patient_context.get("gender"):
                system_content += f"- 性别：{patient_context['gender']}\n"
            if patient_context.get("diseases"):
                diseases = ", ".join(patient_context["diseases"])
                system_content += f"- 已有疾病：{diseases}\n"

        system_content += f"\n重要提示：必须在回答末尾添加免责声明：{DISCLAIMER}"

        return [
            {"role": "system", "content": system_content},
            {"role": "user", "content": question},
        ]

    @staticmethod
    def build_rag_query_prompt(
        question: str,
        context: str,
    ) -> List[Dict[str, str]]:
        """
        构建 RAG 问答 Prompt

        Args:
            question: 用户问题
            context: 检索到的上下文

        Returns:
            消息列表
        """
        system_content = f"""{PromptTemplates.get_system_role(PromptType.RAG_QUERY)}

参考以下健康知识回答用户问题：

{context}

重要提示：
1. 基于提供的知识回答问题
2. 如果知识中没有相关信息，请诚实告知
3. 不要诊断疾病，只提供健康建议
4. 如果涉及严重症状，建议立即就医
5. 必须在回答末尾添加免责声明：{DISCLAIMER}
"""

        return [
            {"role": "system", "content": system_content},
            {"role": "user", "content": question},
        ]

    @staticmethod
    def build_intent_recognition_prompt(user_input: str) -> List[Dict[str, str]]:
        """
        构建意图识别 Prompt

        Args:
            user_input: 用户输入

        Returns:
            消息列表
        """
        system_content = f"""{PromptTemplates.get_system_role(PromptType.INTENT_RECOGNITION)}

支持的意图类型：
1. health_consultation - 健康咨询（询问健康问题、症状、疾病等）
2. checkin - 健康打卡（记录血压、血糖、体重、用药等）
3. medication_consultation - 用药咨询（询问药物用法、副作用等）
4. diet_advice - 饮食建议（询问饮食注意事项）
5. exercise_advice - 运动建议（询问运动方案）
6. chat - 闲聊（问候、感谢等）
7. other - 其他

请分析用户输入，返回 JSON 格式：
{{
    "intent": "意图类型",
    "confidence": 0.95,
    "entities": {{}}
}}

只返回 JSON，不要其他内容。
"""

        return [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_input},
        ]

    @staticmethod
    def build_symptom_analysis_prompt(
        symptoms: str, patient_data: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """
        构建症状分析 Prompt

        Args:
            symptoms: 症状描述
            patient_data: 患者数据

        Returns:
            消息列表
        """
        system_content = PromptTemplates.get_system_role(PromptType.SYMPTOM_ANALYSIS)

        user_content = f"患者描述的症状：{symptoms}\n\n"
        user_content += "患者基本信息：\n"

        if patient_data.get("age"):
            user_content += f"- 年龄：{patient_data['age']}岁\n"
        if patient_data.get("gender"):
            user_content += f"- 性别：{patient_data['gender']}\n"
        if patient_data.get("diseases"):
            diseases = ", ".join(patient_data["diseases"])
            user_content += f"- 已有疾病：{diseases}\n"

        user_content += "\n请提供：\n"
        user_content += "1. 症状可能的原因分析\n"
        user_content += "2. 风险等级评估（低/中/高）\n"
        user_content += "3. 初步建议（是否需要就医、注意事项等）\n"
        user_content += f"\n必须在回答末尾添加：{DISCLAIMER}"

        return [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ]

    @staticmethod
    def build_medication_consultation_prompt(
        medication_name: str, patient_info: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """
        构建用药咨询 Prompt

        Args:
            medication_name: 药物名称
            patient_info: 患者信息

        Returns:
            消息列表
        """
        system_content = PromptTemplates.get_system_role(PromptType.MEDICATION_CONSULTATION)

        user_content = f"药物名称：{medication_name}\n\n"

        if patient_info:
            user_content += "患者信息：\n"
            if patient_info.get("age"):
                user_content += f"- 年龄：{patient_info['age']}岁\n"
            if patient_info.get("diseases"):
                diseases = ", ".join(patient_info["diseases"])
                user_content += f"- 疾病：{diseases}\n"
            user_content += "\n"

        user_content += "请提供：\n"
        user_content += "1. 药物作用和适应症\n"
        user_content += "2. 用法用量\n"
        user_content += "3. 注意事项和禁忌\n"
        user_content += "4. 常见副作用\n"
        user_content += f"\n必须在回答末尾添加：{DISCLAIMER}"

        return [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ]

    @staticmethod
    def build_diet_advice_prompt(
        patient_data: Dict[str, Any], specific_question: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        构建饮食建议 Prompt

        Args:
            patient_data: 患者数据
            specific_question: 具体问题

        Returns:
            消息列表
        """
        system_content = PromptTemplates.get_system_role(PromptType.DIET_ADVICE)

        user_content = "患者信息：\n"
        if patient_data.get("age"):
            user_content += f"- 年龄：{patient_data['age']}岁\n"
        if patient_data.get("diseases"):
            diseases = ", ".join(patient_data["diseases"])
            user_content += f"- 疾病：{diseases}\n"
        if patient_data.get("bmi"):
            user_content += f"- BMI：{patient_data['bmi']}\n"

        if specific_question:
            user_content += f"\n具体问题：{specific_question}\n"
        else:
            user_content += "\n请提供个性化的饮食建议，包括：\n"
            user_content += "1. 推荐食物\n"
            user_content += "2. 应避免的食物\n"
            user_content += "3. 饮食原则\n"

        user_content += f"\n必须在回答末尾添加：{DISCLAIMER}"

        return [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ]

    @staticmethod
    def build_exercise_advice_prompt(
        patient_data: Dict[str, Any], specific_question: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        构建运动建议 Prompt

        Args:
            patient_data: 患者数据
            specific_question: 具体问题

        Returns:
            消息列表
        """
        system_content = PromptTemplates.get_system_role(PromptType.EXERCISE_ADVICE)

        user_content = "患者信息：\n"
        if patient_data.get("age"):
            user_content += f"- 年龄：{patient_data['age']}岁\n"
        if patient_data.get("diseases"):
            diseases = ", ".join(patient_data["diseases"])
            user_content += f"- 疾病：{diseases}\n"

        if specific_question:
            user_content += f"\n具体问题：{specific_question}\n"
        else:
            user_content += "\n请提供个性化的运动建议，包括：\n"
            user_content += "1. 推荐的运动类型\n"
            user_content += "2. 运动强度和时长\n"
            user_content += "3. 注意事项\n"

        user_content += f"\n必须在回答末尾添加：{DISCLAIMER}"

        return [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ]
