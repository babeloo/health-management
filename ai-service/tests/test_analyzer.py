"""
性能测试分析脚本

分析性能测试结果，生成报告
"""

import json
import time
from datetime import datetime
from typing import Dict, List, Any

from loguru import logger


class PerformanceTestAnalyzer:
    """
    性能测试分析器

    分析测试结果，生成性能报告
    """

    def __init__(self):
        """初始化分析器"""
        self.test_results: Dict[str, Any] = {}
        self.test_start_time: float = 0
        self.test_end_time: float = 0

    def start_test(self):
        """开始测试计时"""
        self.test_start_time = time.time()
        logger.info("Performance test started")

    def end_test(self):
        """结束测试计时"""
        self.test_end_time = time.time()
        duration = self.test_end_time - self.test_start_time
        logger.info(f"Performance test ended. Duration: {duration:.2f}s")

    def record_endpoint_performance(
        self,
        endpoint_name: str,
        response_times: List[float],
        error_count: int,
        success_count: int,
    ) -> Dict[str, Any]:
        """
        记录端点性能数据

        Args:
            endpoint_name: 端点名称
            response_times: 响应时间列表（毫秒）
            error_count: 错误请求数
            success_count: 成功请求数

        Returns:
            dict: 端点性能指标
        """
        if not response_times:
            logger.warning(f"No response times recorded for {endpoint_name}")
            return {}

        # 计算统计指标
        response_times_sorted = sorted(response_times)
        metrics = {
            "endpoint": endpoint_name,
            "total_requests": len(response_times) + error_count,
            "successful_requests": success_count,
            "failed_requests": error_count,
            "error_rate": (error_count / (success_count + error_count) * 100)
            if (success_count + error_count) > 0
            else 0,
            "response_time_stats": {
                "min": min(response_times),
                "max": max(response_times),
                "mean": sum(response_times) / len(response_times),
                "median": self._percentile(response_times_sorted, 50),
                "p75": self._percentile(response_times_sorted, 75),
                "p95": self._percentile(response_times_sorted, 95),
                "p99": self._percentile(response_times_sorted, 99),
            },
        }

        self.test_results[endpoint_name] = metrics
        return metrics

    def _percentile(self, data: List[float], percentile: int) -> float:
        """
        计算百分位数

        Args:
            data: 排序后的数据列表
            percentile: 百分位数（0-100）

        Returns:
            float: 百分位数值
        """
        if not data:
            return 0
        index = int((percentile / 100) * len(data))
        return data[min(index, len(data) - 1)]

    def generate_report(self) -> str:
        """
        生成性能测试报告

        Returns:
            str: 性能报告文本
        """
        report_lines = []

        # 报告头
        report_lines.append("=" * 80)
        report_lines.append("AI SERVICE PERFORMANCE TEST REPORT")
        report_lines.append("=" * 80)
        report_lines.append(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append(f"Test duration: {self.test_end_time - self.test_start_time:.2f}s")
        report_lines.append("")

        # 总体统计
        total_requests = 0
        total_errors = 0
        overall_error_rate = 0

        for endpoint_metrics in self.test_results.values():
            total_requests += endpoint_metrics["total_requests"]
            total_errors += endpoint_metrics["failed_requests"]

        if total_requests > 0:
            overall_error_rate = (total_errors / total_requests) * 100

        report_lines.append("OVERALL STATISTICS")
        report_lines.append("-" * 80)
        report_lines.append(f"Total Requests: {total_requests}")
        report_lines.append(f"Total Errors: {total_errors}")
        report_lines.append(f"Overall Error Rate: {overall_error_rate:.2f}%")
        report_lines.append("")

        # 各端点详细统计
        report_lines.append("ENDPOINT PERFORMANCE DETAILS")
        report_lines.append("-" * 80)

        for endpoint_name, metrics in self.test_results.items():
            report_lines.append(f"\nEndpoint: {endpoint_name}")
            report_lines.append(f"  Total Requests: {metrics['total_requests']}")
            report_lines.append(f"  Successful: {metrics['successful_requests']}")
            report_lines.append(f"  Failed: {metrics['failed_requests']}")
            report_lines.append(f"  Error Rate: {metrics['error_rate']:.2f}%")
            report_lines.append("  Response Time (ms):")
            report_lines.append(
                f"    Min: {metrics['response_time_stats']['min']:.2f}"
            )
            report_lines.append(
                f"    Max: {metrics['response_time_stats']['max']:.2f}"
            )
            report_lines.append(
                f"    Mean: {metrics['response_time_stats']['mean']:.2f}"
            )
            report_lines.append(
                f"    Median (P50): {metrics['response_time_stats']['median']:.2f}"
            )
            report_lines.append(
                f"    P75: {metrics['response_time_stats']['p75']:.2f}"
            )
            report_lines.append(
                f"    P95: {metrics['response_time_stats']['p95']:.2f}"
            )
            report_lines.append(
                f"    P99: {metrics['response_time_stats']['p99']:.2f}"
            )

        # 缓存命中率分析（如果有的话）
        report_lines.append("")
        report_lines.append("CACHE PERFORMANCE")
        report_lines.append("-" * 80)
        report_lines.append("Note: Cache hit ratio can be extracted from Prometheus metrics")
        report_lines.append("Expected cache hit rate: > 60% for frequently accessed data")

        # 建议
        report_lines.append("")
        report_lines.append("PERFORMANCE RECOMMENDATIONS")
        report_lines.append("-" * 80)

        if overall_error_rate > 1.0:
            report_lines.append(
                f"WARNING: Error rate ({overall_error_rate:.2f}%) exceeds threshold (1%)"
            )

        # 检查 P95 响应时间
        for endpoint_name, metrics in self.test_results.items():
            p95 = metrics["response_time_stats"]["p95"]
            if p95 > 1000:
                report_lines.append(
                    f"WARNING: {endpoint_name} P95 response time ({p95:.2f}ms) exceeds 1000ms"
                )

        report_lines.append("")
        report_lines.append("=" * 80)

        return "\n".join(report_lines)

    def export_results(self, filename: str) -> None:
        """
        导出测试结果为 JSON

        Args:
            filename: 输出文件名
        """
        export_data = {
            "test_timestamp": datetime.now().isoformat(),
            "test_duration": self.test_end_time - self.test_start_time,
            "results": self.test_results,
        }

        try:
            with open(filename, "w") as f:
                json.dump(export_data, f, indent=2)
            logger.info(f"Test results exported to {filename}")
        except Exception as e:
            logger.error(f"Failed to export test results: {str(e)}")


# 使用示例
if __name__ == "__main__":
    analyzer = PerformanceTestAnalyzer()
    analyzer.start_test()

    # 模拟测试数据
    analyzer.record_endpoint_performance(
        endpoint_name="health_check",
        response_times=[30, 35, 40, 45, 50, 55, 60, 65, 70],
        error_count=1,
        success_count=9,
    )

    analyzer.record_endpoint_performance(
        endpoint_name="ai_chat",
        response_times=[400, 450, 500, 550, 600, 700, 800, 900, 1000],
        error_count=0,
        success_count=9,
    )

    analyzer.record_endpoint_performance(
        endpoint_name="rag_retrieval",
        response_times=[100, 150, 200, 250, 300, 350, 400, 450, 500],
        error_count=0,
        success_count=9,
    )

    analyzer.end_test()

    # 生成和打印报告
    report = analyzer.generate_report()
    print(report)

    # 导出结果
    analyzer.export_results("test_results.json")
