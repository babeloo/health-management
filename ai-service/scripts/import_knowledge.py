"""
知识库数据导入脚本

用于将健康知识文档导入到 Qdrant 向量数据库
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from loguru import logger

from app.services.rag_service import get_rag_service
from docs.health_knowledge_data import health_knowledge_documents


async def import_knowledge():
    """导入健康知识到向量数据库"""
    logger.info("开始导入健康知识库...")

    try:
        # 获取 RAG 服务
        rag_service = get_rag_service()

        # 初始化 collection（强制重建）
        logger.info("初始化知识库 collection...")
        rag_service.initialize_collection(force=True)

        # 批量导入文档
        logger.info(f"准备导入 {len(health_knowledge_documents)} 个文档...")
        result = rag_service.ingest_documents(health_knowledge_documents)

        # 输出结果
        logger.info("=" * 60)
        logger.info("导入完成!")
        logger.info(f"总文档数: {result['total']}")
        logger.info(f"成功: {result['success']}")
        logger.info(f"失败: {result['failed']}")

        if result["failed"] > 0:
            logger.warning("失败的文档:")
            for failed_doc in result["failed_docs"]:
                logger.warning(f"  - 索引 {failed_doc['index']}: {failed_doc['error']}")

        # 获取统计信息
        stats = rag_service.get_collection_stats()
        logger.info("=" * 60)
        logger.info("知识库统计:")
        logger.info(f"Collection: {stats['collection_name']}")
        logger.info(f"总分块数: {stats['total_chunks']}")
        logger.info(f"向量维度: {stats['vector_dimension']}")
        logger.info(f"距离度量: {stats['distance_metric']}")
        logger.info("=" * 60)

        return result

    except Exception as e:
        logger.error(f"导入失败: {str(e)}")
        raise


async def test_search():
    """测试检索功能"""
    logger.info("\n开始测试检索功能...")

    try:
        rag_service = get_rag_service()

        # 测试查询
        test_queries = [
            "高血压患者应该注意什么？",
            "糖尿病饮食有哪些要求？",
            "如何预防心脏病？",
        ]

        for query in test_queries:
            logger.info(f"\n查询: {query}")
            results = rag_service.search(query=query, top_k=3)

            logger.info(f"找到 {len(results)} 个相关结果:")
            for idx, result in enumerate(results):
                logger.info(f"  [{idx + 1}] 分数: {result['score']:.3f}")
                logger.info(f"      标题: {result['metadata'].get('title')}")
                logger.info(f"      类别: {result['metadata'].get('category')}")
                logger.info(f"      内容: {result['content'][:100]}...")

    except Exception as e:
        logger.error(f"检索测试失败: {str(e)}")
        raise


async def test_rag_query():
    """测试 RAG 问答功能"""
    logger.info("\n开始测试 RAG 问答功能...")

    try:
        rag_service = get_rag_service()

        # 测试问答
        test_questions = [
            "高血压患者应该怎么控制饮食？",
            "糖尿病患者运动需要注意什么？",
        ]

        for question in test_questions:
            logger.info(f"\n问题: {question}")
            result = rag_service.generate_answer(query=question, top_k=3)

            logger.info(f"回答:\n{result['answer']}\n")
            logger.info(f"使用了 {result['context_count']} 个参考来源")

    except Exception as e:
        logger.error(f"RAG 问答测试失败: {str(e)}")
        raise


async def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("知识库数据导入和测试")
    logger.info("=" * 60)

    try:
        # 1. 导入数据
        await import_knowledge()

        # 2. 测试检索
        await test_search()

        # 3. 测试 RAG 问答
        await test_rag_query()

        logger.info("\n" + "=" * 60)
        logger.info("所有测试完成!")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"执行失败: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
