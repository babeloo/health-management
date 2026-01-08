"""
RAG Embedding 集成测试（简化版）

专注于测试 Embedding 服务在 RAG 流程中的实际集成情况
"""

import sys
import asyncio
from pathlib import Path

# 添加 app 目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.services.rag_service import rag_service
from app.services.embedding_service import get_embedding_service
from loguru import logger


async def test_embedding_rag_integration():
    """测试 Embedding 在 RAG 中的集成"""

    print("\n" + "=" * 70)
    print("  RAG Embedding 集成测试（简化版）")
    print("=" * 70)
    print(f"\n配置信息:")
    print(f"  Qdrant URL: {settings.qdrant_url}")
    print(f"  Collection: {settings.qdrant_collection}")
    print(f"  Embedding Provider: {settings.embedding_provider}")
    print(f"  Embedding Model: {settings.embedding_model}")
    print(f"  Vector Dimension: {settings.embedding_dimension}")

    embedding_service = get_embedding_service()
    test_results = []

    # 测试 1: 初始化知识库
    print("\n" + "=" * 70)
    print("  测试 1: 初始化知识库")
    print("=" * 70)
    try:
        await rag_service.initialize(force=True)
        print("[OK] 知识库初始化成功")
        print(f"     Collection: {settings.qdrant_collection}")
        print(f"     Vector Size: {settings.embedding_dimension}")
        test_results.append(("知识库初始化", True))
    except Exception as e:
        print(f"[FAIL] 知识库初始化失败: {str(e)}")
        test_results.append(("知识库初始化", False))
        logger.exception("知识库初始化失败")

    # 测试 2: 添加文档（测试 Embedding 集成）
    print("\n" + "=" * 70)
    print("  测试 2: 添加文档到向量库")
    print("=" * 70)
    test_documents = [
        {
            "content": "高血压是一种常见的慢性疾病，需要长期监测和管理",
            "metadata": {"category": "疾病知识", "source": "测试数据"},
        },
        {
            "content": "糖尿病患者应该控制饮食，避免高糖食物",
            "metadata": {"category": "饮食建议", "source": "测试数据"},
        },
        {
            "content": "规律运动有助于改善心血管健康，降低疾病风险",
            "metadata": {"category": "运动建议", "source": "测试数据"},
        },
    ]

    try:
        added_docs = []
        for doc in test_documents:
            doc_id = await rag_service.add_document(
                content=doc["content"], metadata=doc["metadata"]
            )
            added_docs.append(doc_id)
            print(f"     已添加文档: {doc_id[:16]}... | {doc['content'][:30]}...")

        print(f"[OK] 成功添加 {len(added_docs)} 个文档")
        test_results.append(("添加文档", True))
    except Exception as e:
        print(f"[FAIL] 添加文档失败: {str(e)}")
        test_results.append(("添加文档", False))
        logger.exception("添加文档失败")

    # 测试 3: 文本语义检索（测试 Embedding + 检索）
    print("\n" + "=" * 70)
    print("  测试 3: 文本语义检索")
    print("=" * 70)
    try:
        query = "如何管理高血压"
        print(f"     查询: '{query}'")

        results = await rag_service.search_by_text(
            query_text=query, top_k=3, score_threshold=0.0  # 降低阈值以便测试
        )

        print(f"[OK] 检索成功，返回 {len(results)} 条结果")
        for i, result in enumerate(results, 1):
            print(f"\n     结果 {i}:")
            print(f"       相似度: {result['score']:.4f}")
            print(f"       内容: {result['content'][:50]}...")
            print(f"       分类: {result['metadata'].get('category', 'N/A')}")

        test_results.append(("语义检索", len(results) > 0))
    except Exception as e:
        print(f"[FAIL] 检索失败: {str(e)}")
        test_results.append(("语义检索", False))
        logger.exception("检索失败")

    # 测试 4: 向量一致性验证
    print("\n" + "=" * 70)
    print("  测试 4: Embedding 向量一致性")
    print("=" * 70)
    try:
        test_text = "测试向量一致性"

        # 直接调用 embedding service
        vector1 = await embedding_service.embed_text(test_text)

        # 通过 RAG service 间接调用（清空缓存后）
        embedding_service.clear_cache()
        vector2 = await embedding_service.embed_text(test_text)

        # 验证向量一致性
        vectors_match = vector1 == vector2

        print(f"[OK] 向量一致性: {'一致' if vectors_match else '不一致'}")
        print(f"     向量维度: {len(vector1)}")
        print(f"     前5维: {vector1[:5]}")
        test_results.append(("向量一致性", vectors_match))
    except Exception as e:
        print(f"[FAIL] 向量一致性测试失败: {str(e)}")
        test_results.append(("向量一致性", False))
        logger.exception("向量一致性测试失败")

    # 测试 5: 批量文本向量化性能
    print("\n" + "=" * 70)
    print("  测试 5: 批量文档添加（测试性能）")
    print("=" * 70)
    try:
        import time

        batch_docs = [
            ("定期监测血糖水平对糖尿病管理很重要", {"source": "批量测试"}),
            ("保持良好的作息习惯有助于健康", {"source": "批量测试"}),
            ("合理使用降压药物需要遵医嘱", {"source": "批量测试"}),
            ("饮食控制是慢病管理的基础", {"source": "批量测试"}),
            ("适度运动可以改善心肺功能", {"source": "批量测试"}),
        ]

        start_time = time.time()
        await rag_service.add_documents_batch(batch_docs)
        elapsed = time.time() - start_time

        print(f"[OK] 批量添加 {len(batch_docs)} 个文档")
        print(f"     总耗时: {elapsed:.3f}s")
        print(f"     平均: {elapsed/len(batch_docs):.3f}s/文档")
        test_results.append(("批量添加", True))
    except Exception as e:
        print(f"[FAIL] 批量添加失败: {str(e)}")
        test_results.append(("批量添加", False))
        logger.exception("批量添加失败")

    # 测试 6: 获取知识库统计
    print("\n" + "=" * 70)
    print("  测试 6: 知识库统计")
    print("=" * 70)
    try:
        stats = await rag_service.get_stats()
        print(f"[OK] 知识库统计:")
        print(f"     Collection: {stats.get('collection_name', 'N/A')}")
        print(f"     文档数量: {stats.get('points_count', 0)}")
        print(f"     向量维度: {stats.get('vector_size', 0)}")
        print(f"     距离度量: {stats.get('distance', 'N/A')}")
        test_results.append(("知识库统计", True))
    except Exception as e:
        print(f"[FAIL] 获取统计失败: {str(e)}")
        test_results.append(("知识库统计", False))
        logger.exception("获取统计失败")

    # 测试 7: 跨语言文本检索
    print("\n" + "=" * 70)
    print("  测试 7: 中文文本检索")
    print("=" * 70)
    try:
        chinese_queries = ["糖尿病饮食注意事项", "高血压如何控制", "运动对健康的好处"]

        all_success = True
        for query in chinese_queries:
            results = await rag_service.search_by_text(query, top_k=2)
            if len(results) == 0:
                all_success = False
            print(f"     查询: '{query}' -> {len(results)} 条结果")

        print(f"[{'OK' if all_success else 'WARN'}] 中文检索测试{'完成' if all_success else '部分失败'}")
        test_results.append(("中文检索", all_success))
    except Exception as e:
        print(f"[FAIL] 中文检索失败: {str(e)}")
        test_results.append(("中文检索", False))
        logger.exception("中文检索失败")

    # 打印测试摘要
    print("\n" + "=" * 70)
    print("  测试摘要")
    print("=" * 70)

    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    pass_rate = (passed / total * 100) if total > 0 else 0

    print(f"\n总计: {total} 个测试")
    print(f"通过: {passed} 个")
    print(f"失败: {total - passed} 个")
    print(f"通过率: {pass_rate:.1f}%\n")

    if passed == total:
        print("[SUCCESS] 所有测试通过! Embedding 集成工作正常!")
    elif passed >= total * 0.7:
        print("[WARNING] 大部分测试通过，但有少数失败")
    else:
        print("[ERROR] 多个测试失败，请检查配置和服务状态")

    print("\n提示:")
    print("  - 确保 Qdrant 服务正在运行")
    print("  - 确保 Embedding API 配置正确")
    print("  - 检查网络连接是否正常")
    print("\n" + "=" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(test_embedding_rag_integration())
