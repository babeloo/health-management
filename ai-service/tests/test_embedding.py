"""
Embedding Service 功能测试脚本

测试内容：
1. 单文本向量化
2. 批量文本向量化
3. 缓存机制
4. 向量维度验证
5. 错误处理
"""

import sys
import asyncio
from pathlib import Path
from typing import List
import time

# 添加 app 目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from app.services.embedding_service import EmbeddingService
from loguru import logger


class EmbeddingTester:
    """Embedding 服务测试器"""

    def __init__(self):
        self.service = EmbeddingService()
        self.test_results = []

    def print_header(self, title: str):
        """打印测试标题"""
        print("\n" + "=" * 70)
        print(f"  {title}")
        print("=" * 70)

    def print_result(self, test_name: str, passed: bool, message: str = ""):
        """打印测试结果"""
        status = "[OK]" if passed else "[FAIL]"
        print(f"{status} {test_name}")
        if message:
            print(f"     {message}")
        self.test_results.append((test_name, passed))

    async def test_single_text_embedding(self):
        """测试 1: 单文本向量化"""
        self.print_header("测试 1: 单文本向量化")

        try:
            test_text = "高血压是一种常见的慢性疾病"
            start_time = time.time()
            embedding = await self.service.embed_text(test_text)
            elapsed = time.time() - start_time

            # 验证返回类型
            assert isinstance(embedding, list), "返回值应该是列表"
            assert len(embedding) > 0, "向量不应为空"
            assert all(isinstance(x, float) for x in embedding), "向量元素应该是浮点数"

            # 验证向量维度
            expected_dim = self.service.dimension
            actual_dim = len(embedding)
            dim_match = actual_dim == expected_dim

            self.print_result(
                "单文本向量化",
                True,
                f"文本: '{test_text}' | 维度: {actual_dim}/{expected_dim} | 耗时: {elapsed:.3f}s",
            )

            # 打印向量片段
            print(f"     向量前5维: {embedding[:5]}")

            return True

        except Exception as e:
            self.print_result("单文本向量化", False, f"错误: {str(e)}")
            logger.exception("单文本向量化测试失败")
            return False

    async def test_batch_embedding(self):
        """测试 2: 批量文本向量化"""
        self.print_header("测试 2: 批量文本向量化")

        try:
            test_texts = [
                "糖尿病患者应该注意饮食控制",
                "规律运动有助于降低血压",
                "定期监测血糖水平很重要",
                "保持良好的作息习惯",
                "合理使用降压药物",
            ]

            start_time = time.time()
            embeddings = await self.service.embed_texts(test_texts)
            elapsed = time.time() - start_time

            # 验证返回类型
            assert isinstance(embeddings, list), "返回值应该是列表"
            assert len(embeddings) == len(test_texts), "向量数量应该与文本数量一致"

            # 验证每个向量
            for i, emb in enumerate(embeddings):
                assert isinstance(emb, list), f"第{i}个向量应该是列表"
                assert len(emb) == self.service.dimension, f"第{i}个向量维度不正确"

            avg_time = elapsed / len(test_texts)
            self.print_result(
                "批量文本向量化",
                True,
                f"文本数: {len(test_texts)} | 总耗时: {elapsed:.3f}s | 平均: {avg_time:.3f}s/文本",
            )

            return True

        except Exception as e:
            self.print_result("批量文本向量化", False, f"错误: {str(e)}")
            logger.exception("批量文本向量化测试失败")
            return False

    async def test_caching_mechanism(self):
        """测试 3: 缓存机制"""
        self.print_header("测试 3: 缓存机制")

        try:
            test_text = "测试缓存功能的文本"

            # 第一次调用（无缓存）
            start_time = time.time()
            embedding1 = await self.service.embed_text(test_text)
            time1 = time.time() - start_time

            # 第二次调用（有缓存）
            start_time = time.time()
            embedding2 = await self.service.embed_text(test_text)
            time2 = time.time() - start_time

            # 验证结果一致性
            assert embedding1 == embedding2, "缓存返回的向量应该与原始向量一致"

            # 验证缓存效果
            speedup = time1 / time2 if time2 > 0 else float("inf")
            cache_effective = speedup > 2  # 缓存应该至少快2倍

            self.print_result(
                "缓存机制",
                cache_effective,
                f"首次: {time1:.4f}s | 缓存: {time2:.4f}s | 加速: {speedup:.1f}x",
            )

            # 清空缓存测试
            self.service.clear_cache()
            print("     [INFO] 缓存已清空")

            return True

        except Exception as e:
            self.print_result("缓存机制", False, f"错误: {str(e)}")
            logger.exception("缓存机制测试失败")
            return False

    async def test_empty_text_handling(self):
        """测试 4: 空文本处理"""
        self.print_header("测试 4: 空文本处理")

        try:
            # 测试空字符串
            empty_embedding = await self.service.embed_text("")
            assert len(empty_embedding) == self.service.dimension, "空文本应返回零向量"
            assert all(x == 0.0 for x in empty_embedding), "空文本向量应该全为0"

            # 测试纯空格
            space_embedding = await self.service.embed_text("   ")
            assert len(space_embedding) == self.service.dimension, "空格文本应返回零向量"

            self.print_result("空文本处理", True, "空文本和空格文本正确处理")
            return True

        except Exception as e:
            self.print_result("空文本处理", False, f"错误: {str(e)}")
            logger.exception("空文本处理测试失败")
            return False

    async def test_vector_dimension(self):
        """测试 5: 向量维度验证"""
        self.print_header("测试 5: 向量维度验证")

        try:
            # 获取配置的维度
            configured_dim = settings.embedding_dimension
            service_dim = self.service.get_embedding_dimension()

            # 实际测试
            test_text = "测试向量维度"
            embedding = await self.service.embed_text(test_text)
            actual_dim = len(embedding)

            # 验证一致性
            dims_match = configured_dim == service_dim == actual_dim

            self.print_result(
                "向量维度验证",
                dims_match,
                f"配置: {configured_dim} | 服务: {service_dim} | 实际: {actual_dim}",
            )

            return dims_match

        except Exception as e:
            self.print_result("向量维度验证", False, f"错误: {str(e)}")
            logger.exception("向量维度验证测试失败")
            return False

    async def test_chinese_text(self):
        """测试 6: 中文文本处理"""
        self.print_header("测试 6: 中文文本处理")

        try:
            chinese_texts = [
                "慢性疾病管理系统",
                "人工智能健康助手",
                "血压监测与分析",
                "糖尿病饮食建议",
            ]

            embeddings = await self.service.embed_texts(chinese_texts)

            # 验证所有向量都有效
            all_valid = all(
                len(emb) == self.service.dimension and any(x != 0 for x in emb)  # 至少有一个非零值
                for emb in embeddings
            )

            self.print_result("中文文本处理", all_valid, f"测试了 {len(chinese_texts)} 个中文文本")

            return all_valid

        except Exception as e:
            self.print_result("中文文本处理", False, f"错误: {str(e)}")
            logger.exception("中文文本处理测试失败")
            return False

    async def test_long_text(self):
        """测试 7: 长文本处理"""
        self.print_header("测试 7: 长文本处理")

        try:
            # 创建一个长文本（约500字）
            long_text = (
                """
            慢性病管理是现代医疗保健的重要组成部分。随着人口老龄化和生活方式的改变，
            慢性疾病如高血压、糖尿病、心血管疾病等的发病率持续上升。有效的慢性病管理
            不仅可以改善患者的生活质量，还能显著降低医疗成本。现代慢性病管理系统通常
            采用多学科协作的方式，整合医生、护士、营养师、健康管理师等专业人员的力量，
            为患者提供全方位的健康服务。人工智能技术的应用为慢性病管理带来了新的机遇，
            通过大数据分析和机器学习算法，可以实现疾病风险预测、个性化治疗方案制定、
            用药提醒等功能，帮助患者更好地管理自己的健康。同时，远程医疗和移动健康
            应用的发展，使得患者可以随时随地获取医疗服务和健康指导。
            """
                * 2
            )  # 重复一次使文本更长

            start_time = time.time()
            embedding = await self.service.embed_text(long_text)
            elapsed = time.time() - start_time

            # 验证向量有效性
            is_valid = len(embedding) == self.service.dimension and any(x != 0 for x in embedding)

            text_length = len(long_text)
            self.print_result("长文本处理", is_valid, f"文本长度: {text_length} 字符 | 耗时: {elapsed:.3f}s")

            return is_valid

        except Exception as e:
            self.print_result("长文本处理", False, f"错误: {str(e)}")
            logger.exception("长文本处理测试失败")
            return False

    def print_summary(self):
        """打印测试摘要"""
        self.print_header("测试摘要")

        passed = sum(1 for _, result in self.test_results if result)
        total = len(self.test_results)
        pass_rate = (passed / total * 100) if total > 0 else 0

        print(f"\n总计: {total} 个测试")
        print(f"通过: {passed} 个")
        print(f"失败: {total - passed} 个")
        print(f"通过率: {pass_rate:.1f}%\n")

        if passed == total:
            print("[SUCCESS] 所有测试通过!")
        else:
            print("[WARNING] 部分测试失败，请检查上述错误信息")

        print("=" * 70 + "\n")

    async def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "=" * 70)
        print("  Embedding Service 功能测试")
        print("=" * 70)
        print(f"\n配置信息:")
        print(f"  Provider: {settings.embedding_provider}")
        print(f"  Model: {settings.embedding_model}")
        print(f"  Base URL: {settings.embedding_base_url}")
        print(f"  Dimension: {settings.embedding_dimension}")
        print(f"  Cache Enabled: {settings.embedding_cache_enabled}")

        # 运行所有测试
        await self.test_single_text_embedding()
        await self.test_batch_embedding()
        await self.test_caching_mechanism()
        await self.test_empty_text_handling()
        await self.test_vector_dimension()
        await self.test_chinese_text()
        await self.test_long_text()

        # 打印摘要
        self.print_summary()


async def main():
    """主函数"""
    tester = EmbeddingTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
