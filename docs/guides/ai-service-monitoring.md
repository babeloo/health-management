"""
AI 服务监控与优化快速指南

包含所有监控、缓存和性能测试的使用说明
"""

# ============================================================================

# 1. 性能监控（Prometheus Metrics）

# ============================================================================

# 1.1 启动 AI 服务

#

# 在 ai-service 目录中运行

#

# uv pip install -r requirements.txt

# uvicorn app.main:app --reload --port 8001

#

# 服务将在以下端口启动

# - 主服务：<http://localhost:8001>

# - Metrics 服务：<http://localhost:8002/metrics>

#

# 1.2 访问 Prometheus metrics

#

# 打开浏览器访问：<http://localhost:8002/metrics>

#

# 将看到所有监控指标，例如

#

# # HELP api_request_duration_seconds API 请求响应时间（单位：秒）

# # TYPE api_request_duration_seconds histogram

# api_request_duration_seconds_bucket{endpoint="/health",method="GET",status="200",le="0.01"} 5.0

# api_request_duration_seconds_bucket{endpoint="/health",method="GET",status="200",le="0.025"} 10.0

# 

#

# 1.3 主要监控指标

#

# - api_request_duration_seconds: API 请求响应时间（直方图）

# - api_errors_total: API 错误总数（计数器）

# - deepseek_tokens_total: DeepSeek Token 使用量（计数器）

# - vector_search_total: 向量检索次数（计数器）

# - vector_search_duration_seconds: 向量检索响应时间（直方图）

# - cache_hits_total: 缓存命中次数（计数器）

# - cache_misses_total: 缓存未命中次数（计数器）

# - rag_retrievals_total: RAG 检索次数（计数器）

# - rag_retrieval_duration_seconds: RAG 检索响应时间（直方图）

#

# ============================================================================

# 2. Redis 缓存优化

# ============================================================================

# 2.1 缓存策略配置

#

# 当前配置的缓存类型（详见 cache_service.py）

#

# 1. rag_answer: RAG 常见问题的 AI 回答缓存

# - TTL: 1 小时（3600 秒）

# - 用途：缓存常见问题的 AI 回答，避免重复调用 DeepSeek API

#

# 2. vector_search: 向量检索结果缓存

# - TTL: 30 分钟（1800 秒）

# - 用途：缓存相同查询的向量检索结果，加速 RAG 流程

#

# 3. health_advice: 健康建议模板缓存

# - TTL: 24 小时（86400 秒）

# - 用途：缓存常见的健康建议模板，减少 AI 模型调用

#

# 4. embedding: 文本 embedding 缓存

# - TTL: 7 天（604800 秒）

# - 用途：缓存文本的向量表示，避免重复 embedding

#

# 5. diagnosis: 诊断建议缓存

# - TTL: 1 小时（3600 秒）

# - 用途：缓存诊断建议，支持用户重新查询时快速响应

#

# 2.2 在代码中使用缓存

#

# 方法 1：使用装饰器（推荐）

#

# from app.services.cache_service import cache_result

#

# @cache_result(ttl=3600, cache_type="rag_answer")

# async def get_health_advice(question: str) -> str

# # 调用 DeepSeek API 获取健康建议

# advice = await deepseek_client.generate(question)

# return advice

#

# 第一次调用时，结果会被缓存；后续相同问题会直接从缓存返回

#

# 方法 2：使用缓存管理器

#

# from app.services.cache_service import get_cache_manager

#

# cache_manager = get_cache_manager()

#

# # 尝试从缓存获取

# cached_result = await cache_manager.get("rag_answer", "问题内容")

# if cached_result is not None

# return cached_result

#

# # 缓存未命中，执行业务逻辑

# result = await expensive_operation()

#

# # 存储到缓存

# await cache_manager.set("rag_answer", "问题内容", result, ttl=3600)

# return result

#

# 2.3 缓存失效策略

#

# 当前实现使用 LRU（最近最少使用）策略

#

# 手动清除缓存的方法

#

# # 删除单个缓存项

# await cache_manager.delete("rag_answer", "问题内容")

#

# # 清除指定前缀的所有缓存（当前版本需要 SCAN 实现）

# await cache_manager.clear_by_prefix("rag_answer")

#

# ============================================================================

# 3. 性能测试

# ============================================================================

# 3.1 单元测试

#

# 运行监控和缓存的单元测试

#

# cd ai-service

# pytest tests/test_monitoring_and_cache.py -v

#

# 或运行所有测试

#

# pytest tests/ -v --cov=app --cov-report=html

#

# 测试覆盖项包括

# - Metrics Service 初始化和指标记录

# - Cache Service 的 get/set/delete 操作

# - 缓存键的一致性和唯一性

# - 缓存装饰器的功能

# - 集成测试：监控和缓存的协同工作

#

# 3.2 性能测试（Locust）

#

# 运行完整的性能测试套件

#

# cd ai-service

#

# # 启动 Locust Web UI（推荐交互式使用）

# locust -f tests/performance_test.py --host <http://localhost:8001>

#

# # 无头测试（自动化脚本）

# locust -f tests/performance_test.py --host <http://localhost:8001> \

# -u 100 -r 10 --run-time 1m --headless

#

# 参数说明

# - -u 100: 100 个并发用户

# - -r 10: 每秒增加 10 个新用户

# - --run-time 1m: 运行时长 1 分钟

# - --headless: 无 Web UI，输出到控制台

#

# 3.3 性能测试场景

#

# 当前实现的测试场景

#

# 1. 健康检查（权重 3）

# - 端点：GET /health

# - 预期响应时间：< 50ms

# - 用途：测试基础网络连接

#

# 2. AI 对话（权重 5）

# - 端点：POST /api/v1/ai/chat

# - 预期响应时间：< 1000ms

# - 用途：测试 AI 模型调用

#

# 3. RAG 检索（权重 4）

# - 端点：POST /api/v1/rag/retrieve

# - 预期响应时间：< 500ms

# - 用途：测试向量检索性能

#

# 4. 诊断分析（权重 2）

# - 端点：POST /api/v1/diagnosis/analyze

# - 预期响应时间：< 2000ms

# - 用途：测试诊断逻辑

#

# 5. Metrics 端点（权重 2）

# - 端点：GET /api/v1/metrics

# - 预期响应时间：< 100ms

# - 用途：测试监控端点

#

# 3.4 Locust Web UI 使用

#

# 启动 Locust Web UI 后，在浏览器打开：<http://localhost:8089>

#

# 在 Web 界面中

# 1. 设置 "Number of users"（并发用户数）和 "Spawn rate"（增长速率）

# 2. 点击 "Start swarming" 开始测试

# 3. 实时查看性能数据

# - Response Times: 响应时间分布

# - Charts: 吞吐量、错误率等图表

# - Statistics: 详细统计信息

#

# 3.5 性能测试报告

#

# 测试完成后，使用分析脚本生成报告

#

# from tests.test_analyzer import PerformanceTestAnalyzer

#

# analyzer = PerformanceTestAnalyzer()

# analyzer.start_test()

#

# # 记录测试数据

# analyzer.record_endpoint_performance(

# endpoint_name="health_check"

# response_times=[30, 35, 40, 45, 50, 55, 60, 65, 70]

# error_count=1

# success_count=9

# )

#

# analyzer.end_test()

# print(analyzer.generate_report())

# analyzer.export_results("test_results.json")

#

# ============================================================================

# 4. 性能指标和验收标准

# ============================================================================

# 4.1 API 响应时间

#

# | 端点 | P50 | P95 | P99 | 目标 |

# |----------------|-----|-----|------|---------------|

# | 健康检查 | 40 | 100 | 200 | < 50ms |

# | AI 对话 | 500 | 1s | 2s | < 1000ms |

# | RAG 检索 | 200 | 500 | 800 | < 500ms |

# | 诊断分析 | 1s | 2s | 3s | < 2000ms |

# | Metrics | 50 | 100 | 200 | < 100ms |

#

# 单位：毫秒（ms），P95 = 95分位数响应时间

#

# 4.2 错误率和可用性

#

# - 总体错误率：< 1%

# - 单个端点错误率：< 2%

# - 服务可用性（Uptime）：> 99%

#

# 4.3 缓存有效性

#

# - 缓存命中率：> 60%（常见问题）

# - 缓存命中率：> 40%（其他查询）

# - RAG 检索加速：平均减少 50% 的响应时间

#

# 4.4 Token 使用成本

#

# - 单日平均成本：< $1

# - Token 使用效率：缓存命中减少 60% 的 API 调用

#

# ============================================================================

# 5. 监控集成到 AI 服务

# ============================================================================

# 5.1 中间件自动化

#

# 在 main.py 中已自动添加 MetricsMiddleware

# 所有 API 请求都会自动记录以下信息

#

# - HTTP 方法和路径

# - 响应状态码

# - 响应时间

# - 错误类型（如果发生）

#

# 5.2 手动记录指标

#

# 在需要的地方手动记录特定指标

#

# from app.services.metrics_service import get_metrics_service

#

# metrics = get_metrics_service()

#

# # 记录 DeepSeek API 调用

# metrics.record_deepseek_tokens("deepseek-chat", "prompt", 150)

# metrics.record_deepseek_tokens("deepseek-chat", "completion", 100)

#

# # 记录向量检索

# metrics.record_vector_search("health_knowledge", duration=0.1)

#

# # 记录缓存操作

# metrics.record_cache_hit("rag_answer")

# metrics.record_rag_retrieval("health_advice", duration=0.5)

#

# ============================================================================

# 6. 故障排查

# ============================================================================

# 6.1 问题：Prometheus metrics 端口 8002 被占用

#

# 解决方案

# - 修改 start_metrics_server 的端口参数

# - 或杀死占用该端口的进程：lsof -i :8002 | kill -9 <PID>

#

# 6.2 问题：Redis 连接失败

#

# 解决方案

# - 确保 Redis 服务正在运行：docker-compose ps

# - 检查 Redis 配置：.env 文件中的 REDIS_HOST 和 REDIS_PORT

# - 如果 Redis 不可用，缓存将被跳过（graceful degradation）

#

# 6.3 问题：缓存命中率低

#

# 原因分析

# - 查询内容差异大（缓存键不同）

# - TTL 设置过短，缓存过期

# - 缓存容量不足（Redis 内存限制）

#

# 优化方案

# - 增加 TTL 配置

# - 实现查询规范化（例如，统一问题格式）

# - 扩大 Redis 容量

#

# ============================================================================

# 7. 下一步优化建议

# ============================================================================

# 1. 添加 Grafana 仪表板

# - 实时可视化 Prometheus metrics

# - 配置告警规则

#

# 2. 实现缓存预热（Cache Warming）

# - 启动时预加载常见问题的答案

# - 减少冷启动延迟

#

# 3. 添加请求追踪（Distributed Tracing）

# - 使用 Jaeger 或 DataDog 追踪跨服务请求

# - 识别性能瓶颈

#

# 4. 实现动态阈值告警

# - 基于历史数据的异常检测

# - 自动告警和扩容

#

# 5. 添加更多缓存层

# - 客户端缓存（Redis）

# - CDN 缓存（静态资源）

# - 数据库查询缓存

#

print(**doc**)
