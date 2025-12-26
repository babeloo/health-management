"""
性能测试脚本

使用 Locust 进行负载测试、性能测试和压力测试

Usage:
    # 运行 Web UI 界面
    locust -f tests/performance_test.py --host http://localhost:8001

    # 运行无头测试（自动化）
    locust -f tests/performance_test.py --host http://localhost:8001 -u 100 -r 10 --run-time 1m --headless
"""

from locust import HttpUser, task, between
from loguru import logger


class AIServiceUser(HttpUser):
    """
    AI 服务用户行为模拟

    模拟真实用户与 AI 服务的交互
    """

    wait_time = between(1, 3)  # 请求之间等待 1-3 秒

    @task(3)
    def health_check(self):
        """
        健康检查端点测试（权重：3）

        预期性能：< 50ms
        """
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Unexpected status code: {response.status_code}")

    @task(5)
    def ai_chat_endpoint(self):
        """
        AI 对话端点测试（权重：5）

        预期性能：< 1000ms（取决于模型响应时间）
        """
        payload = {
            "message": "我最近血压有点高，应该怎么办？",
            "conversation_id": "test_conversation",
            "user_id": "test_user",
        }

        with self.client.post(
            "/api/v1/ai/chat",
            json=payload,
            catch_response=True,
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Unexpected status code: {response.status_code}")

    @task(4)
    def rag_retrieval_endpoint(self):
        """
        RAG 检索端点测试（权重：4）

        预期性能：< 500ms（RAG 检索应该很快）
        """
        payload = {
            "query": "高血压的治疗方法",
            "top_k": 5,
        }

        with self.client.post(
            "/api/v1/rag/retrieve",
            json=payload,
            catch_response=True,
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Unexpected status code: {response.status_code}")

    @task(2)
    def diagnosis_endpoint(self):
        """
        辅助诊断端点测试（权重：2）

        预期性能：< 2000ms（需要调用 DeepSeek API）
        """
        payload = {
            "symptoms": ["头晕", "心率加快"],
            "vital_signs": {
                "blood_pressure": "150/90",
                "heart_rate": 95,
                "temperature": 37.5,
            },
        }

        with self.client.post(
            "/api/v1/diagnosis/analyze",
            json=payload,
            catch_response=True,
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Unexpected status code: {response.status_code}")

    @task(2)
    def metrics_endpoint(self):
        """
        Prometheus metrics 端点测试（权重：2）

        预期性能：< 100ms
        """
        with self.client.get("/api/v1/metrics", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Unexpected status code: {response.status_code}")

    @task(1)
    def root_endpoint(self):
        """
        根路径端点测试（权重：1）

        预期性能：< 50ms
        """
        with self.client.get("/", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Unexpected status code: {response.status_code}")


class HighLoadUser(HttpUser):
    """
    高并发用户行为模拟

    用于压力测试，模拟高并发场景
    """

    wait_time = between(0.5, 1.5)  # 请求之间等待更短时间

    @task
    def ai_chat_stress_test(self):
        """
        压力测试：AI 对话端点

        连续快速发送请求，测试服务器在高并发下的表现
        """
        payload = {
            "message": "我有糖尿病，血糖总是不稳定",
            "conversation_id": f"stress_test_{id(self)}",
            "user_id": f"stress_user_{id(self)}",
        }

        self.client.post("/api/v1/ai/chat", json=payload)

    @task
    def rag_retrieval_stress_test(self):
        """
        压力测试：RAG 检索端点

        连续快速发送请求
        """
        payload = {
            "query": "糖尿病管理",
            "top_k": 5,
        }

        self.client.post("/api/v1/rag/retrieve", json=payload)


# 测试配置和结果
PERFORMANCE_EXPECTATIONS = {
    "health_check": {
        "p50": 50,  # 中位数响应时间 50ms
        "p95": 100,  # 95 分位数响应时间 100ms
        "p99": 200,  # 99 分位数响应时间 200ms
    },
    "ai_chat_endpoint": {
        "p50": 500,
        "p95": 1000,
        "p99": 2000,
    },
    "rag_retrieval_endpoint": {
        "p50": 200,
        "p95": 500,
        "p99": 800,
    },
    "diagnosis_endpoint": {
        "p50": 1000,
        "p95": 2000,
        "p99": 3000,
    },
    "metrics_endpoint": {
        "p50": 50,
        "p95": 100,
        "p99": 200,
    },
}

OVERALL_EXPECTATIONS = {
    "error_rate": {
        "max": 1.0,  # 错误率不超过 1%
        "description": "所有请求中失败请求的百分比",
    },
    "response_time_p95": {
        "max": 1000,  # P95 响应时间 < 1 秒
        "description": "95% 的请求响应时间应在此值以下（毫秒）",
    },
    "throughput": {
        "min": 10,  # 吞吐量 >= 10 req/s
        "description": "每秒请求数（req/s）",
    },
}
