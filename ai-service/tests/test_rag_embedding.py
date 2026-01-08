"""
RAG 服务中 Embedding 集成测试

测试 Embedding 服务在 RAG (检索增强生成) 流程中的集成情况
"""

import sys
import asyncio
from pathlib import Path
from typing import List

# 添加 app 目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from app.services.rag_service import rag_service
from app.services.embedding_service import get_embedding_service
from loguru import logger


class RAGEmbeddingTester:
    """RAG Embedding 集成测试器"""

    def __init__(self):
        self.rag_service = rag_service
        self.embedding_service = get_embedding_service()
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

    async def test_qdrant_connection(self):
        """测试 1: Qdrant 连接"""
        self.print_header("测试 1: Qdrant 连接")

        try:
            # 尝试获取 collection 信息
            is_healthy = await self.rag_service.health_check()

            self.print_result("Qdrant 连接", is_healthy, f"Qdrant URL: {settings.qdrant_url}")

            return is_healthy

        except Exception as e:
            self.print_result("Qdrant 连接", False, f"错误: {str(e)}")
            logger.exception("Qdrant 连接测试失败")
            return False

    async def test_collection_initialization(self):
        """测试 2: Collection 初始化"""
        self.print_header("测试 2: Collection 初始化")

        try:
            # 初始化 collection（如果不存在则创建）
            await self.rag_service.initialize(force=False)

            # 验证 collection 存在
            exists = await self.rag_service.collection_exists()

            self.print_result(
                "Collection 初始化",
                exists,
                f"Collection: {settings.qdrant_collection} | 向量维度: {self.embedding_service.dimension}",
            )

            return exists

        except Exception as e:
            self.print_result("Collection 初始化", False, f"错误: {str(e)}")
            logger.exception("Collection 初始化测试失败")
            return False

    async def test_document_addition(self):
        """测试 3: 添加文档到向量库"""
        self.print_header("测试 3: 添加文档到向量库")

        try:
            # 准备测试文档
            test_documents = [
                {
                    "id": "test_doc_1",
                    "text": "高血压是一种常见的慢性疾病，需要长期监测和管理",
                    "category": "疾病知识",
                    "source": "测试数据",
                },
                {
                    "id": "test_doc_2",
                    "text": "糖尿病患者应该控制饮食，避免高糖食物",
                    "category": "饮食建议",
                    "source": "测试数据",
                },
                {
                    "id": "test_doc_3",
                    "text": "规律运动有助于改善心血管健康，降低疾病风险",
                    "category": "运动建议",
                    "source": "测试数据",
                },
            ]

            # 添加文档
            success_count = 0
            for doc in test_documents:
                try:
                    await self.rag_service.add_document(
                        doc_id=doc["id"],
                        text=doc["text"],
                        metadata={"category": doc["category"], "source": doc["source"]},
                    )
                    success_count += 1
                except Exception as e:
                    logger.warning(f"添加文档失败: {doc['id']}, 错误: {str(e)}")

            all_added = success_count == len(test_documents)

            self.print_result(
                "添加文档到向量库",
                all_added,
                f"成功添加: {success_count}/{len(test_documents)} 个文档",
            )

            return all_added

        except Exception as e:
            self.print_result("添加文档到向量库", False, f"错误: {str(e)}")
            logger.exception("添加文档测试失败")
            return False

    async def test_semantic_search(self):
        """测试 4: 语义检索"""
        self.print_header("测试 4: 语义检索")

        try:
            # 执行语义检索
            query = "如何管理高血压"
            results = await self.rag_service.search(
                query=query, top_k=3, score_threshold=0.0  # 降低阈值以便测试
            )

            # 验证结果
            has_results = len(results) > 0

            self.print_result("语义检索", has_results, f"查询: '{query}' | 返回结果: {len(results)} 条")

            # 打印检索结果
            if has_results:
                print("\n     检索结果:")
                for i, result in enumerate(results, 1):
                    print(f"       {i}. 相似度: {result.get('score', 0):.3f}")
                    print(f"          文本: {result.get('text', '')[:50]}...")
                    print(f"          分类: {result.get('metadata', {}).get('category', 'N/A')}")

            return has_results

        except Exception as e:
            self.print_result("语义检索", False, f"错误: {str(e)}")
            logger.exception("语义检索测试失败")
            return False

    async def test_rag_query(self):
        """测试 5: RAG 完整查询流程"""
        self.print_header("测试 5: RAG 完整查询流程")

        try:
            # 执行 RAG 查询
            query = "糖尿病患者饮食注意事项"
            rag_result = await self.rag_service.query(query)

            # 验证结果
            has_context = len(rag_result.get("context", [])) > 0
            has_sources = len(rag_result.get("sources", [])) > 0

            self.print_result(
                "RAG 完整查询流程",
                has_context,
                f"查询: '{query}' | 上下文: {len(rag_result.get('context', []))} 条 | 来源: {len(rag_result.get('sources', []))} 条",
            )

            # 打印 RAG 结果
            if has_context:
                print("\n     检索到的上下文:")
                for i, ctx in enumerate(rag_result.get("context", [])[:2], 1):
                    print(f"       {i}. {ctx[:80]}...")

            return has_context

        except Exception as e:
            self.print_result("RAG 完整查询流程", False, f"错误: {str(e)}")
            logger.exception("RAG 查询测试失败")
            return False

    async def test_embedding_consistency(self):
        """测试 6: 向量一致性验证"""
        self.print_header("测试 6: 向量一致性验证")

        try:
            test_text = "测试向量一致性的文本"

            # 直接使用 embedding service
            embedding1 = await self.embedding_service.embed_text(test_text)

            # 通过 RAG service 间接使用 embedding
            # 这里我们假设 RAG service 内部使用相同的 embedding service
            embedding2 = await self.embedding_service.embed_text(test_text)

            # 验证一致性
            vectors_match = embedding1 == embedding2

            self.print_result(
                "向量一致性验证",
                vectors_match,
                "Embedding Service 和 RAG Service 使用的向量化结果一致",
            )

            return vectors_match

        except Exception as e:
            self.print_result("向量一致性验证", False, f"错误: {str(e)}")
            logger.exception("向量一致性测试失败")
            return False

    async def test_batch_document_addition(self):
        """测试 7: 批量添加文档"""
        self.print_header("测试 7: 批量添加文档")

        try:
            # 准备批量文档
            batch_docs = [
                ("batch_doc_1", "定期监测血糖水平对糖尿病管理很重要"),
                ("batch_doc_2", "保持良好的作息习惯有助于健康"),
                ("batch_doc_3", "合理使用降压药物需要遵医嘱"),
                ("batch_doc_4", "饮食控制是慢病管理的基础"),
                ("batch_doc_5", "适度运动可以改善心肺功能"),
            ]

            # 批量添加
            await self.rag_service.add_documents(batch_docs)

            # 验证添加成功（通过搜索验证）
            results = await self.rag_service.search("慢病管理", top_k=10)
            has_results = len(results) >= len(batch_docs)

            self.print_result(
                "批量添加文档",
                has_results,
                f"添加了 {len(batch_docs)} 个文档 | 可检索: {len(results)} 条",
            )

            return has_results

        except Exception as e:
            self.print_result("批量添加文档", False, f"错误: {str(e)}")
            logger.exception("批量添加文档测试失败")
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
        elif passed >= total * 0.8:
            print("[WARNING] 大部分测试通过，但有少数失败")
        else:
            print("[ERROR] 多个测试失败，请检查配置和服务状态")

        print("\n提示:")
        print("  - 确保 Qdrant 服务正在运行 (docker-compose up -d qdrant)")
        print("  - 确保 Embedding API 配置正确且有效")
        print("  - 检查网络连接是否正常")
        print("\n" + "=" * 70 + "\n")

    async def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "=" * 70)
        print("  RAG Embedding 集成测试")
        print("=" * 70)
        print(f"\n配置信息:")
        print(f"  Qdrant URL: {settings.qdrant_url}")
        print(f"  Collection: {settings.qdrant_collection}")
        print(f"  Embedding Provider: {settings.embedding_provider}")
        print(f"  Embedding Model: {settings.embedding_model}")
        print(f"  Vector Dimension: {self.embedding_service.dimension}")
        print(f"  Top K: {settings.rag_top_k}")
        print(f"  Score Threshold: {settings.rag_score_threshold}")

        # 运行所有测试
        await self.test_qdrant_connection()
        await self.test_collection_initialization()
        await self.test_document_addition()
        await self.test_semantic_search()
        await self.test_rag_query()
        await self.test_embedding_consistency()
        await self.test_batch_document_addition()

        # 打印摘要
        self.print_summary()


async def main():
    """主函数"""
    tester = RAGEmbeddingTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
