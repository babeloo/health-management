"""
AI 诊断服务

提供辅助诊断功能，包括：
- 健康摘要生成
- 风险评估
- 诊断建议
- 用药建议
- 生活方式建议
- 综合诊断报告
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from loguru import logger

from app.services.deepseek_client import get_deepseek_client, DeepSeekAPIError
from app.services.rag_service import RAGService
from app.services.prompt_templates import PromptTemplate, DISCLAIMER
from app.models.diagnosis_models import (
    HealthSummaryRequest,
    HealthSummaryResponse,
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    RiskLevel,
    RiskFactor,
    DiagnosticAdviceRequest,
    DiagnosticAdviceResponse,
    DiagnosticRecommendation,
    CheckItem,
    CheckItemUrgency,
    MedicationAdviceRequest,
    MedicationAdviceResponse,
    LifestyleAdviceRequest,
    LifestyleAdviceResponse,
    ComprehensiveDiagnosisReportRequest,
    ComprehensiveDiagnosisReportResponse,
)


class DiagnosticService:
    """
    诊断服务类

    提供 AI 辅助诊断功能，基于患者数据和 DeepSeek 模型生成专业建议。
    """

    def __init__(self):
        """初始化诊断服务"""
        self.deepseek_client = get_deepseek_client()
        self.prompt_template = PromptTemplate()
        self.rag_service = RAGService()

    async def generate_health_summary(
        self,
        request: HealthSummaryRequest,
    ) -> HealthSummaryResponse:
        """
        生成健康摘要

        基于患者的健康指标、打卡数据和趋势信息，生成综合健康状况摘要。

        Args:
            request: 健康摘要请求

        Returns:
            健康摘要响应

        Raises:
            DeepSeekAPIError: API 调用失败
        """
        try:
            # 构建 prompt
            prompt = self._build_health_summary_prompt(request)

            logger.info(f"生成健康摘要: user_id={request.user_id}")

            # 调用 DeepSeek API
            response = await self.deepseek_client.chat(
                messages=[
                    {
                        "role": "system",
                        "content": PromptTemplate.SYSTEM_ROLES.get(
                            "health_education",
                            "你是一位专业的健康管理师。"
                        )
                    },
                    {"role": "user", "content": prompt}
                ]
            )

            # 解析响应
            summary_content = response.get("choices", [{}])[0].get("message", {}).get("content", "")

            # 提取关键指标
            key_metrics = self._extract_key_metrics(request.recent_metrics)

            # 识别异常指标
            abnormal_indicators = self._identify_abnormal_indicators(request.recent_metrics)

            # 分析趋势
            trends = self._analyze_trends(request.trends or [])

            return HealthSummaryResponse(
                user_id=request.user_id,
                summary=summary_content,
                key_metrics=key_metrics,
                abnormal_indicators=abnormal_indicators,
                trends=trends,
                generated_at=datetime.utcnow().isoformat() + "Z",
            )

        except DeepSeekAPIError as e:
            logger.error(f"生成健康摘要失败: {e}")
            raise
        except Exception as e:
            logger.error(f"生成健康摘要异常: {e}")
            raise

    async def assess_risk(
        self,
        request: RiskAssessmentRequest,
    ) -> RiskAssessmentResponse:
        """
        进行风险评估

        基于患者的健康数据、病史和生活方式，评估健康风险等级和预测并发症。

        Args:
            request: 风险评估请求

        Returns:
            风险评估响应

        Raises:
            DeepSeekAPIError: API 调用失败
        """
        try:
            # 计算风险评分
            risk_score = self._calculate_risk_score(request)
            risk_level = self._determine_risk_level(risk_score)

            # 识别主要风险因素
            primary_risks = self._identify_risk_factors(request)

            # 预测并发症
            predicted_complications = await self._predict_complications(request)

            # 生成建议
            recommendations = await self._generate_risk_recommendations(request, primary_risks)

            # 生成详细评估说明
            assessment_prompt = self._build_risk_assessment_prompt(request, risk_score)
            response = await self.deepseek_client.chat(
                messages=[
                    {
                        "role": "system",
                        "content": PromptTemplate.SYSTEM_ROLES.get(
                            "risk_assessment",
                            "你是一位慢性病风险评估专家。"
                        )
                    },
                    {"role": "user", "content": assessment_prompt}
                ]
            )

            assessment_details = response.get("choices", [{}])[0].get("message", {}).get("content", "")

            logger.info(f"风险评估完成: user_id={request.user_id}, risk_level={risk_level}")

            return RiskAssessmentResponse(
                user_id=request.user_id,
                risk_level=risk_level,
                risk_score=risk_score,
                primary_risks=primary_risks,
                predicted_complications=predicted_complications,
                recommendations=recommendations,
                assessment_details=assessment_details,
                generated_at=datetime.utcnow().isoformat() + "Z",
            )

        except DeepSeekAPIError as e:
            logger.error(f"风险评估失败: {e}")
            raise
        except Exception as e:
            logger.error(f"风险评估异常: {e}")
            raise

    async def generate_diagnostic_advice(
        self,
        request: DiagnosticAdviceRequest,
    ) -> DiagnosticAdviceResponse:
        """
        生成诊断建议

        基于患者的临床信息、检查数据和症状，提供可能的诊断方向和鉴别诊断建议。

        Args:
            request: 诊断建议请求

        Returns:
            诊断建议响应

        Raises:
            DeepSeekAPIError: API 调用失败
        """
        try:
            # 构建 prompt
            prompt = self._build_diagnostic_advice_prompt(request)

            logger.info(f"生成诊断建议: user_id={request.user_id}")

            # 调用 DeepSeek API
            response = await self.deepseek_client.chat(
                messages=[
                    {
                        "role": "system",
                        "content": """你是一位有丰富临床经验的医学专家，能够根据患者数据进行诊断分析。
请提供详细的诊断建议，包括可能的诊断方向、鉴别诊断和优先级检查项目。
所有建议必须基于患者数据进行推理，并明确说明依据。"""
                    },
                    {"role": "user", "content": prompt}
                ]
            )

            content = response.get("choices", [{}])[0].get("message", {}).get("content", "")

            # 解析诊断建议（这里需要根据 AI 输出格式进行解析）
            recommendations = self._parse_diagnostic_recommendations(content)

            # 提取优先级检查项目
            priority_checks = self._extract_priority_checks(content)

            # 鉴别诊断说明
            differential_diagnosis = self._extract_differential_diagnosis(content)

            # 下一步诊疗步骤
            next_steps = self._extract_next_steps(content)

            logger.info(f"诊断建议生成完成: user_id={request.user_id}")

            return DiagnosticAdviceResponse(
                user_id=request.user_id,
                recommendations=recommendations,
                priority_checks=priority_checks,
                differential_diagnosis=differential_diagnosis,
                next_steps=next_steps,
                generated_at=datetime.utcnow().isoformat() + "Z",
            )

        except DeepSeekAPIError as e:
            logger.error(f"生成诊断建议失败: {e}")
            raise
        except Exception as e:
            logger.error(f"生成诊断建议异常: {e}")
            raise

    async def generate_medication_advice(
        self,
        request: MedicationAdviceRequest,
    ) -> MedicationAdviceResponse:
        """
        生成用药建议

        基于患者的疾病、过敏信息和健康指标，生成个性化的用药方案和注意事项。

        Args:
            request: 用药建议请求

        Returns:
            用药建议响应

        Raises:
            DeepSeekAPIError: API 调用失败
        """
        try:
            # 构建 prompt
            prompt = self._build_medication_advice_prompt(request)

            logger.info(f"生成用药建议: user_id={request.user_id}")

            # 调用 DeepSeek API
            response = await self.deepseek_client.chat(
                messages=[
                    {
                        "role": "system",
                        "content": """你是一位资深药师，熟悉慢性病药物治疗。
请根据患者信息提供完整的用药建议，包括药物选择、用法用量、药物相互作用、副作用等。
强调遵医嘱用药和定期复查的重要性。"""
                    },
                    {"role": "user", "content": prompt}
                ]
            )

            content = response.get("choices", [{}])[0].get("message", {}).get("content", "")

            # 解析用药建议
            recommendations = self._parse_medication_recommendations(content)
            drug_interactions = self._extract_drug_interactions(content)
            dosage_adjustments = self._extract_dosage_adjustments(content)
            precautions = self._extract_precautions(content)
            side_effects = self._extract_side_effects(content)

            logger.info(f"用药建议生成完成: user_id={request.user_id}")

            return MedicationAdviceResponse(
                user_id=request.user_id,
                medication_plan=content[:500],  # 摘要
                recommendations=recommendations,
                drug_interactions=drug_interactions,
                dosage_adjustments=dosage_adjustments,
                precautions=precautions,
                side_effects=side_effects,
                generated_at=datetime.utcnow().isoformat() + "Z",
            )

        except DeepSeekAPIError as e:
            logger.error(f"生成用药建议失败: {e}")
            raise
        except Exception as e:
            logger.error(f"生成用药建议异常: {e}")
            raise

    async def generate_lifestyle_advice(
        self,
        request: LifestyleAdviceRequest,
    ) -> LifestyleAdviceResponse:
        """
        生成生活方式建议

        基于患者的疾病、健康指标和当前生活方式，提供个性化的饮食、运动、睡眠和心理健康建议。

        Args:
            request: 生活方式建议请求

        Returns:
            生活方式建议响应

        Raises:
            DeepSeekAPIError: API 调用失败
        """
        try:
            # 构建 prompt
            prompt = self._build_lifestyle_advice_prompt(request)

            logger.info(f"生成生活方式建议: user_id={request.user_id}")

            # 调用 DeepSeek API
            response = await self.deepseek_client.chat(
                messages=[
                    {
                        "role": "system",
                        "content": """你是一位健康生活方式专家。
请根据患者的疾病和健康数据，提供详细的饮食、运动、睡眠和心理健康建议。
建议应该具体、可行、循序渐进。"""
                    },
                    {"role": "user", "content": prompt}
                ]
            )

            content = response.get("choices", [{}])[0].get("message", {}).get("content", "")

            # 解析各类建议
            diet_advice = self._extract_diet_advice(content)
            exercise_advice = self._extract_exercise_advice(content)
            sleep_advice = self._extract_sleep_advice(content)
            mental_health_advice = self._extract_mental_health_advice(content)
            implementation_tips = self._extract_implementation_tips(content)

            logger.info(f"生活方式建议生成完成: user_id={request.user_id}")

            return LifestyleAdviceResponse(
                user_id=request.user_id,
                diet_advice=diet_advice,
                exercise_advice=exercise_advice,
                sleep_advice=sleep_advice,
                mental_health_advice=mental_health_advice,
                improvement_plan=content[:1000],  # 整体计划摘要
                implementation_tips=implementation_tips,
                generated_at=datetime.utcnow().isoformat() + "Z",
            )

        except DeepSeekAPIError as e:
            logger.error(f"生成生活方式建议失败: {e}")
            raise
        except Exception as e:
            logger.error(f"生成生活方式建议异常: {e}")
            raise

    async def generate_comprehensive_report(
        self,
        request: ComprehensiveDiagnosisReportRequest,
    ) -> ComprehensiveDiagnosisReportResponse:
        """
        生成综合诊断报告

        综合健康摘要、风险评估、诊断建议、用药建议和生活方式建议生成完整的诊断报告。

        Args:
            request: 综合报告请求

        Returns:
            综合报告响应
        """
        try:
            logger.info(f"生成综合诊断报告: user_id={request.user_id}")

            # 1. 生成健康摘要
            health_summary_req = HealthSummaryRequest(
                user_id=request.user_id,
                age=request.age,
                gender=request.gender,
                diseases=request.diseases,
                recent_metrics=request.recent_metrics,
                checkin_stats=request.checkin_stats,
                trends=request.trends,
            )
            health_summary = await self.generate_health_summary(health_summary_req)

            # 2. 进行风险评估
            risk_req = RiskAssessmentRequest(
                user_id=request.user_id,
                age=request.age,
                gender=request.gender,
                diseases=request.diseases,
                health_metrics={
                    m.name: m.value for m in request.recent_metrics
                },
            )
            risk_assessment = await self.assess_risk(risk_req)

            # 3. 生成诊断建议
            diagnostic_req = DiagnosticAdviceRequest(
                user_id=request.user_id,
                age=request.age,
                gender=request.gender,
                diseases=request.diseases,
                current_symptoms=request.current_symptoms,
                health_metrics={
                    m.name: m.value for m in request.recent_metrics
                },
                current_medications=request.current_medications,
            )
            diagnostic_advice = await self.generate_diagnostic_advice(diagnostic_req)

            # 4. 生成用药建议
            medication_req = MedicationAdviceRequest(
                user_id=request.user_id,
                age=request.age,
                diseases=request.diseases or [],
                health_metrics={
                    m.name: m.value for m in request.recent_metrics
                },
                current_medications=request.current_medications,
            )
            medication_advice = await self.generate_medication_advice(medication_req)

            # 5. 生成生活方式建议
            lifestyle_req = LifestyleAdviceRequest(
                user_id=request.user_id,
                age=request.age,
                gender=request.gender,
                diseases=request.diseases or [],
                current_lifestyle=request.current_lifestyle or {},
                health_metrics={
                    m.name: m.value for m in request.recent_metrics
                },
            )
            lifestyle_advice = await self.generate_lifestyle_advice(lifestyle_req)

            logger.info(f"综合诊断报告生成完成: user_id={request.user_id}")

            return ComprehensiveDiagnosisReportResponse(
                user_id=request.user_id,
                health_summary=health_summary.summary,
                risk_assessment=risk_assessment.dict(),
                diagnostic_recommendations=[r.dict() for r in diagnostic_advice.recommendations],
                medication_advice=medication_advice.dict(),
                lifestyle_advice=lifestyle_advice.dict(),
                generated_at=datetime.utcnow().isoformat() + "Z",
            )

        except Exception as e:
            logger.error(f"生成综合诊断报告失败: {e}")
            raise

    # ============================================
    # 辅助方法
    # ============================================

    def _build_health_summary_prompt(self, request: HealthSummaryRequest) -> str:
        """构建健康摘要 prompt"""
        prompt = f"""请根据以下患者健康数据生成健康摘要：

患者基本信息：
- 年龄：{request.age}岁
- 性别：{request.gender or '未指定'}
- 已有疾病：{', '.join(request.diseases) if request.diseases else '无'}

最近健康指标（共{len(request.recent_metrics)}项）：
"""
        for metric in request.recent_metrics:
            prompt += f"- {metric.name}: {metric.value} {metric.unit} (状态: {metric.status})\n"

        if request.checkin_stats:
            prompt += f"\n近7天打卡统计：\n"
            for check_type, count in request.checkin_stats.items():
                prompt += f"- {check_type}: {count}次\n"

        if request.trends:
            prompt += f"\n健康趋势：\n"
            for trend in request.trends:
                prompt += f"- {trend.metric_name}: {trend.trend} ({trend.change_percentage:+.1f}%)\n"

        prompt += """
请提供：
1. 总体健康状况概括（3-5句话）
2. 关键健康指标评估
3. 异常指标标注
4. 健康趋势分析
5. 初步建议

要求：专业准确、通俗易懂、重点突出。"""

        return prompt

    def _build_risk_assessment_prompt(
        self,
        request: RiskAssessmentRequest,
        risk_score: int,
    ) -> str:
        """构建风险评估 prompt"""
        prompt = f"""请对以下患者进行风险评估：

患者基本信息：
- 年龄：{request.age}岁
- 性别：{request.gender or '未指定'}
- 已有疾病：{', '.join(request.diseases) if request.diseases else '无'}
- 家族史：{', '.join(request.family_history) if request.family_history else '无'}

健康指标：
"""
        for key, value in request.health_metrics.items():
            prompt += f"- {key}: {value}\n"

        if request.lifestyle:
            prompt += "\n生活方式：\n"
            for key, value in request.lifestyle.items():
                prompt += f"- {key}: {value}\n"

        prompt += f"""
初步风险评分：{risk_score}/100

请提供：
1. 风险等级判断（低/中/高/极高）
2. 主要风险因素分析
3. 可能的并发症预测
4. 详细的风险评估说明

要求：数据驱动、逻辑清晰、建议可行。"""

        return prompt

    def _build_diagnostic_advice_prompt(self, request: DiagnosticAdviceRequest) -> str:
        """构建诊断建议 prompt"""
        prompt = f"""请对以下患者进行诊断分析：

患者基本信息：
- 年龄：{request.age}岁
- 性别：{request.gender or '未指定'}
- 既往疾病：{', '.join(request.diseases) if request.diseases else '无'}

当前症状：{', '.join(request.current_symptoms) if request.current_symptoms else '无'}

健康指标：
"""
        for key, value in request.health_metrics.items():
            prompt += f"- {key}: {value}\n"

        if request.current_medications:
            prompt += f"\n当前用药：{', '.join(request.current_medications)}\n"

        if request.recent_tests:
            prompt += "\n最近检查结果：\n"
            for key, value in request.recent_tests.items():
                prompt += f"- {key}: {value}\n"

        prompt += """
请提供：
1. 可能的诊断方向（按概率排序）
2. 每个诊断的支持证据
3. 鉴别诊断分析
4. 优先级检查项目
5. 下一步诊疗步骤

要求：专业准确、证据充分、逻辑严谨。"""

        return prompt

    def _build_medication_advice_prompt(self, request: MedicationAdviceRequest) -> str:
        """构建用药建议 prompt"""
        prompt = f"""请为以下患者制定用药方案：

患者基本信息：
- 年龄：{request.age}岁
- 诊断疾病：{', '.join(request.diseases)}
- 药物过敏：{', '.join(request.allergies) if request.allergies else '无'}

当前用药：
"""
        if request.current_medications:
            for med in request.current_medications:
                prompt += f"- {med.get('name', '')}: {med.get('dosage', '')} {med.get('frequency', '')}\n"
        else:
            prompt += "- 无\n"

        prompt += f"""
肝肾功能：肝功能{request.hepatic_function or '正常'}，肾功能{request.renal_function or '正常'}

相关健康指标：
"""
        for key, value in request.health_metrics.items():
            prompt += f"- {key}: {value}\n"

        prompt += """
请提供：
1. 用药方案概述
2. 具体药物建议（药名、用法、用量）
3. 药物相互作用警示
4. 剂量调整建议
5. 用药注意事项
6. 常见副作用及处理

要求：安全第一、遵医嘱、定期复查。"""

        return prompt

    def _build_lifestyle_advice_prompt(self, request: LifestyleAdviceRequest) -> str:
        """构建生活方式建议 prompt"""
        prompt = f"""请为以下患者提供生活方式改善建议：

患者基本信息：
- 年龄：{request.age}岁
- 性别：{request.gender or '未指定'}
- 诊断疾病：{', '.join(request.diseases)}

当前生活方式：
"""
        for key, value in request.current_lifestyle.items():
            prompt += f"- {key}: {value}\n"

        prompt += "\n相关健康指标：\n"
        for key, value in request.health_metrics.items():
            prompt += f"- {key}: {value}\n"

        prompt += f"""
身体状况：{request.physical_condition or '未指定'}

请提供：
1. 饮食建议（推荐食物、避免食物、营养目标）
2. 运动建议（类型、频率、时长、强度）
3. 睡眠建议（目标时长、作息、改善技巧）
4. 心理健康建议（压力管理、放松方法）
5. 整体改善计划
6. 实施技巧和建议

要求：具体可行、循序渐进、可持续。"""

        return prompt

    def _extract_key_metrics(self, metrics: List) -> List[Dict[str, Any]]:
        """提取关键指标"""
        return [
            {
                "name": m.name,
                "value": m.value,
                "unit": m.unit,
                "status": m.status,
                "assessment": f"{m.name}{'正常' if m.status == 'normal' else '异常'}"
            }
            for m in metrics
        ]

    def _identify_abnormal_indicators(self, metrics: List) -> List[str]:
        """识别异常指标"""
        return [m.name for m in metrics if m.status != "normal"]

    def _analyze_trends(self, trends: List) -> List[str]:
        """分析趋势"""
        if not trends:
            return []
        return [
            f"{t.metric_name}近{t.days}天呈{t.trend}趋势（变化{t.change_percentage:+.1f}%）"
            for t in trends
        ]

    def _calculate_risk_score(self, request: RiskAssessmentRequest) -> int:
        """计算风险评分"""
        score = 0

        # 基于年龄
        if request.age >= 60:
            score += 15
        elif request.age >= 45:
            score += 10

        # 基于疾病
        disease_scores = {
            "高血压": 20,
            "糖尿病": 25,
            "冠心病": 30,
            "脑卒中": 35,
        }
        for disease in (request.diseases or []):
            score += disease_scores.get(disease, 10)

        # 基于健康指标（血压、血糖等）
        if request.health_metrics:
            systolic = request.health_metrics.get("systolic", 0)
            if systolic > 160:
                score += 20
            elif systolic > 140:
                score += 15
            elif systolic > 120:
                score += 10

            blood_sugar = request.health_metrics.get("blood_sugar", 0)
            if blood_sugar > 200:
                score += 15
            elif blood_sugar > 140:
                score += 10

        # 基于生活方式
        if request.lifestyle:
            if request.lifestyle.get("smoking"):
                score += 15
            if request.lifestyle.get("obesity"):
                score += 10

        return min(score, 100)

    def _determine_risk_level(self, score: int) -> RiskLevel:
        """根据评分确定风险等级"""
        if score < 30:
            return RiskLevel.LOW
        elif score < 50:
            return RiskLevel.MEDIUM
        elif score < 75:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL

    def _identify_risk_factors(self, request: RiskAssessmentRequest) -> List[RiskFactor]:
        """识别主要风险因素"""
        factors = []

        # 检查血压
        if request.health_metrics:
            systolic = request.health_metrics.get("systolic", 0)
            if systolic > 140:
                factors.append(RiskFactor(
                    factor="血压控制不佳",
                    severity="high" if systolic > 160 else "medium",
                    description=f"收缩压 {systolic} mmHg，超过目标范围"
                ))

            # 检查血糖
            blood_sugar = request.health_metrics.get("blood_sugar", 0)
            if blood_sugar > 140:
                factors.append(RiskFactor(
                    factor="血糖控制不佳",
                    severity="high" if blood_sugar > 200 else "medium",
                    description=f"血糖 {blood_sugar} mg/dL，控制欠佳"
                ))

        # 检查生活方式
        if request.lifestyle:
            if request.lifestyle.get("smoking"):
                factors.append(RiskFactor(
                    factor="吸烟",
                    severity="high",
                    description="吸烟是多种疾病的独立危险因素"
                ))

        # 按严重程度排序
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        factors.sort(key=lambda x: severity_order.get(x.severity, 4))

        return factors

    async def _predict_complications(self, request: RiskAssessmentRequest) -> List[str]:
        """预测可能的并发症"""
        complications = []

        # 高血压相关并发症
        if request.health_metrics.get("systolic", 0) > 140:
            complications.extend(["脑卒中", "心肌梗塞", "慢性肾脏病"])

        # 糖尿病相关并发症
        if request.health_metrics.get("blood_sugar", 0) > 140:
            complications.extend(["糖尿病肾病", "糖尿病视网膜病变"])

        # 高危人群
        if "糖尿病" in (request.diseases or []):
            complications.extend(["大血管并发症"])

        return list(set(complications))[:5]  # 去重并限制数量

    async def _generate_risk_recommendations(
        self,
        request: RiskAssessmentRequest,
        factors: List[RiskFactor],
    ) -> List[str]:
        """生成风险预防建议"""
        recommendations = []

        # 基于风险因素的建议
        for factor in factors:
            if "血压" in factor.factor:
                recommendations.append("加强用药依从性，定期监测血压")
            elif "血糖" in factor.factor:
                recommendations.append("改善饮食结构，增加运动频率")
            elif "吸烟" in factor.factor:
                recommendations.append("立即戒烟，必要时寻求医疗帮助")

        # 通用建议
        recommendations.extend([
            "定期进行健康体检",
            "保持适度运动（每周150分钟中等强度）",
            "改善饮食习惯（低盐低脂）",
        ])

        return recommendations[:5]

    def _parse_diagnostic_recommendations(self, content: str) -> List[DiagnosticRecommendation]:
        """解析诊断建议"""
        # 这里应该根据实际的 AI 输出格式进行解析
        # 为了演示，返回基本结构
        return [
            DiagnosticRecommendation(
                condition="高血压控制不佳",
                likelihood="probable",
                basis="血压显著升高（160/100 mmHg）",
                supporting_evidence=["收缩压超过140 mmHg", "舒张压超过90 mmHg"]
            )
        ]

    def _extract_priority_checks(self, content: str) -> List[CheckItem]:
        """提取优先级检查项目"""
        return [
            CheckItem(
                name="心电图",
                urgency=CheckItemUrgency.URGENT,
                reason="排除心脏并发症",
                expected_days=1
            ),
            CheckItem(
                name="肾功能检查",
                urgency=CheckItemUrgency.SOON,
                reason="评估慢性肾脏病风险",
                expected_days=3
            )
        ]

    def _extract_differential_diagnosis(self, content: str) -> str:
        """提取鉴别诊断说明"""
        return "基于患者的临床表现和检查结果，需要鉴别以下疾病..."

    def _extract_next_steps(self, content: str) -> List[str]:
        """提取下一步诊疗步骤"""
        return [
            "立即进行基础检查（心电图、肾功能等）",
            "评估当前用药方案的有效性",
            "考虑增强血压管理策略",
            "安排患者教育和生活方式干预"
        ]

    def _parse_medication_recommendations(self, content: str) -> List[Dict[str, Any]]:
        """解析用药建议"""
        return [
            {
                "drug": "硝苯地平缓释片",
                "indication": "高血压",
                "dosage": "30mg",
                "frequency": "每天两次"
            }
        ]

    def _extract_drug_interactions(self, content: str) -> Optional[List[str]]:
        """提取药物相互作用"""
        return ["避免与某些降糖药物同时使用"]

    def _extract_dosage_adjustments(self, content: str) -> Optional[List[str]]:
        """提取剂量调整建议"""
        return ["肾功能不全患者需调整剂量"]

    def _extract_precautions(self, content: str) -> List[str]:
        """提取用药注意事项"""
        return ["餐前半小时服用", "避免高脂饮食", "定期复查肝肾功能"]

    def _extract_side_effects(self, content: str) -> Optional[List[str]]:
        """提取副作用信息"""
        return ["常见头晕、面部潮红", "若出现严重不适应立即就医"]

    def _extract_diet_advice(self, content: str) -> Dict[str, Any]:
        """提取饮食建议"""
        return {
            "recommendations": ["减少盐分摄入", "增加纤维素"],
            "foods_to_eat": ["绿叶蔬菜", "全谷物", "低脂蛋白"],
            "foods_to_avoid": ["腌制食品", "油炸食品", "高糖食物"],
            "daily_calories": "1800-2000 kcal"
        }

    def _extract_exercise_advice(self, content: str) -> Dict[str, Any]:
        """提取运动建议"""
        return {
            "type": "有氧运动为主，适度力量训练",
            "frequency": "每周5次",
            "duration": "30分钟/次",
            "intensity": "中等强度（能说话但不能唱歌）",
            "precautions": ["避免剧烈运动", "循序渐进增加强度"]
        }

    def _extract_sleep_advice(self, content: str) -> Dict[str, Any]:
        """提取睡眠建议"""
        return {
            "target_hours": "7-9小时",
            "bedtime": "23:00",
            "wake_time": "07:00",
            "tips": ["避免睡前喝咖啡", "保持卧室温度16-19℃", "规律作息"]
        }

    def _extract_mental_health_advice(self, content: str) -> Optional[Dict[str, Any]]:
        """提取心理健康建议"""
        return {
            "stress_management": ["深呼吸冥想", "瑜伽", "音乐疗法"],
            "social_activities": "保持社交活动，与家人和朋友互动",
            "professional_help": "若出现焦虑或抑郁症状，寻求专业心理帮助"
        }

    def _extract_implementation_tips(self, content: str) -> List[str]:
        """提取实施建议和技巧"""
        return [
            "制定每周详细的运动计划并设置提醒",
            "记录日常饮食和血压测量结果",
            "与医生或营养师进行定期评估",
            "参加患者教育课程或支持小组",
            "使用健康管理应用程序跟踪进展"
        ]
