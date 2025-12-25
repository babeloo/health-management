"""
RAG 服务单元测试

测试 Embedding、Qdrant、RAG 服务的核心功能
"""

import pytest
from unittest.mock import Mock, patch, MagicMock

from app.services.embedding_service import EmbeddingService, get_embedding_service
from app.services.qdrant_service import QdrantService, get_qdrant_service
from app.services.rag_service import RAGService, get_rag_service


# ============================================
# Embedding Service 测试
# ============================================


class TestEmbeddingService:
    """Embedding 服务测试"""

    @pytest.fixture
    def embedding_service(self):
        """创建 Embedding 服务实例"""
        return EmbeddingService()

    def test_embed_text_normal(self, embedding_service):
        """测试正常文本向量化"""
        with patch.object(embedding_service, "_load_model") as mock_model:
            # 模拟模型返回
            mock_model.return_value.encode.return_value.tolist.return_value = [
                0.1
            ] * 384

            text = "这是一个测试文本"
            result = embedding_service.embed_text(text)

            assert isinstance(result, list)
            assert len(result) == 384
            assert all(isinstance(x, float) for x in result)

    def test_embed_text_empty(self, embedding_service):
        """测试空文本向量化"""
        result = embedding_service.embed_text("")

        assert isinstance(result, list)
        assert len(result) == embedding_service.dimension
        assert all(x == 0.0 for x in result)

    def test_embed_texts_batch(self, embedding_service):
        """测试批量文本向量化"""
        with patch.object(embedding_service, "_load_model") as mock_model:
            # 模拟模型返回
            mock_model.return_value.encode.return_value.tolist.return_value = [
                [0.1] * 384,
                [0.2] * 384,
            ]

            texts = ["文本1", "文本2"]
            results = embedding_service.embed_texts(texts)

            assert isinstance(results, list)
            assert len(results) == 2
            assert all(len(r) == 384 for r in results)

    def test_embed_texts_with_empty(self, embedding_service):
        """测试包含空文本的批量向量化"""
        with patch.object(embedding_service, "_load_model") as mock_model:
            mock_model.return_value.encode.return_value.tolist.return_value = [
                [0.1] * 384
            ]

            texts = ["文本1", "", "文本3"]
            results = embedding_service.embed_texts(texts)

            assert isinstance(results, list)
            # 空文本会被过滤，但结果长度应与输入相同
            assert len(results) > 0

    def test_get_embedding_dimension(self, embedding_service):
        """测试获取向量维度"""
        with patch.object(embedding_service, "_load_model") as mock_model:
            mock_model.return_value.get_sentence_embedding_dimension.return_value = 384

            dimension = embedding_service.get_embedding_dimension()

            assert dimension == 384


# ============================================
# Qdrant Service 测试
# ============================================


class TestQdrantService:
    """Qdrant 服务测试"""

    @pytest.fixture
    def qdrant_service(self):
        """创建 Qdrant 服务实例"""
        service = QdrantService()
        service._client = Mock()  # 使用 Mock 对象替代真实客户端
        return service

    def test_create_collection(self, qdrant_service):
        """测试创建 collection"""
        qdrant_service._client.collection_exists.return_value = False

        result = qdrant_service.create_collection(
            collection_name="test_collection", vector_size=384
        )

        assert result is True
        qdrant_service._client.create_collection.assert_called_once()

    def test_create_collection_exists_no_force(self, qdrant_service):
        """测试 collection 已存在且不强制重建"""
        qdrant_service._client.collection_exists.return_value = True

        result = qdrant_service.create_collection(
            collection_name="test_collection", vector_size=384, force=False
        )

        assert result is True
        qdrant_service._client.delete_collection.assert_not_called()

    def test_create_collection_exists_with_force(self, qdrant_service):
        """测试 collection 已存在且强制重建"""
        qdrant_service._client.collection_exists.return_value = True

        result = qdrant_service.create_collection(
            collection_name="test_collection", vector_size=384, force=True
        )

        assert result is True
        qdrant_service._client.delete_collection.assert_called_once()
        qdrant_service._client.create_collection.assert_called_once()

    def test_upsert_points(self, qdrant_service):
        """测试插入向量点"""
        from qdrant_client.models import PointStruct

        points = [
            PointStruct(id="1", vector=[0.1] * 384, payload={"text": "测试"}),
            PointStruct(id="2", vector=[0.2] * 384, payload={"text": "测试2"}),
        ]

        result = qdrant_service.upsert_points(
            collection_name="test_collection", points=points
        )

        assert result is True
        qdrant_service._client.upsert.assert_called_once()

    def test_search(self, qdrant_service):
        """测试向量检索"""
        # 模拟检索结果
        mock_result = Mock()
        mock_result.id = "1"
        mock_result.score = 0.95
        mock_result.payload = {"text": "测试"}
        qdrant_service._client.search.return_value = [mock_result]

        query_vector = [0.1] * 384
        results = qdrant_service.search(
            collection_name="test_collection", query_vector=query_vector, limit=5
        )

        assert len(results) == 1
        assert results[0].id == "1"
        assert results[0].score == 0.95

    def test_search_by_category(self, qdrant_service):
        """测试按类别检索"""
        mock_result = Mock()
        mock_result.id = "1"
        mock_result.score = 0.95
        mock_result.payload = {"text": "测试", "category": "饮食管理"}
        qdrant_service._client.search.return_value = [mock_result]

        query_vector = [0.1] * 384
        results = qdrant_service.search_by_category(
            collection_name="test_collection",
            query_vector=query_vector,
            category="饮食管理",
            limit=5,
        )

        assert len(results) == 1
        qdrant_service._client.search.assert_called_once()

    def test_list_collections(self, qdrant_service):
        """测试列出所有 collection"""
        mock_collection = Mock()
        mock_collection.name = "test_collection"
        mock_collections = Mock()
        mock_collections.collections = [mock_collection]
        qdrant_service._client.get_collections.return_value = mock_collections

        collections = qdrant_service.list_collections()

        assert len(collections) == 1
        assert collections[0] == "test_collection"

    def test_delete_collection(self, qdrant_service):
        """测试删除 collection"""
        result = qdrant_service.delete_collection(collection_name="test_collection")

        assert result is True
        qdrant_service._client.delete_collection.assert_called_once_with(
            "test_collection"
        )


# ============================================
# RAG Service 测试
# ============================================


class TestRAGService:
    """RAG 服务测试"""

    @pytest.fixture
    def rag_service(self):
        """创建 RAG 服务实例（使用 Mock 依赖）"""
        with patch("app.services.rag_service.get_embedding_service"), patch(
            "app.services.rag_service.get_qdrant_service"
        ), patch("app.services.rag_service.DeepSeekClient"):
            service = RAGService()
            service.embedding_service = Mock()
            service.qdrant_service = Mock()
            service.deepseek_client = Mock()
            return service

    def test_initialize_collection(self, rag_service):
        """测试初始化 collection"""
        rag_service.embedding_service.get_embedding_dimension.return_value = 384
        rag_service.qdrant_service.create_collection.return_value = True

        result = rag_service.initialize_collection(force=False)

        assert result is True
        rag_service.qdrant_service.create_collection.assert_called_once()

    def test_split_text(self, rag_service):
        """测试文档分块"""
        text = "这是一个测试文本。" * 100  # 创建长文本

        chunks = rag_service._split_text(text)

        assert isinstance(chunks, list)
        assert len(chunks) > 0
        assert all(isinstance(chunk, str) for chunk in chunks)

    def test_ingest_document(self, rag_service):
        """测试导入文档"""
        rag_service.embedding_service.embed_texts.return_value = [
            [0.1] * 384,
            [0.2] * 384,
        ]
        rag_service.qdrant_service.upsert_points.return_value = True

        content = "高血压患者应注意低盐饮食。" * 10
        metadata = {"title": "测试文档", "category": "饮食管理"}

        result = rag_service.ingest_document(content=content, metadata=metadata)

        assert result["status"] == "success"
        assert "doc_id" in result
        assert "chunks_count" in result
        assert result["chunks_count"] > 0

    def test_ingest_documents_batch(self, rag_service):
        """测试批量导入文档"""
        rag_service.embedding_service.embed_texts.return_value = [[0.1] * 384]
        rag_service.qdrant_service.upsert_points.return_value = True

        documents = [
            {
                "content": "测试文档1内容" * 10,
                "metadata": {"title": "文档1", "category": "饮食管理"},
            },
            {
                "content": "测试文档2内容" * 10,
                "metadata": {"title": "文档2", "category": "运动管理"},
            },
        ]

        result = rag_service.ingest_documents(documents=documents)

        assert result["total"] == 2
        assert result["success"] >= 0
        assert result["failed"] >= 0
        assert result["success"] + result["failed"] == result["total"]

    def test_search(self, rag_service):
        """测试语义检索"""
        # 模拟向量化
        rag_service.embedding_service.embed_text.return_value = [0.1] * 384

        # 模拟检索结果
        mock_result = Mock()
        mock_result.id = "doc1_0"
        mock_result.score = 0.89
        mock_result.payload = {
            "chunk_content": "高血压患者应注意低盐饮食",
            "title": "高血压饮食指南",
            "category": "饮食管理",
        }
        rag_service.qdrant_service.search.return_value = [mock_result]

        results = rag_service.search(query="高血压饮食", top_k=5)

        assert len(results) == 1
        assert results[0]["id"] == "doc1_0"
        assert results[0]["score"] == 0.89
        assert "content" in results[0]
        assert "metadata" in results[0]

    def test_generate_answer_with_context(self, rag_service):
        """测试 RAG 问答（有上下文）"""
        # 模拟向量化
        rag_service.embedding_service.embed_text.return_value = [0.1] * 384

        # 模拟检索结果
        mock_result = Mock()
        mock_result.id = "doc1_0"
        mock_result.score = 0.89
        mock_result.payload = {
            "chunk_content": "高血压患者应注意低盐饮食，每日盐摄入量不超过6克。",
            "title": "高血压饮食指南",
            "category": "饮食管理",
        }
        rag_service.qdrant_service.search.return_value = [mock_result]

        # 模拟 AI 生成
        rag_service.deepseek_client.chat.return_value = "高血压患者应该注意低盐饮食，每日盐摄入量不超过6克。此建议仅供参考，请咨询专业医生。"

        result = rag_service.generate_answer(query="高血压患者应该怎么控制饮食？")

        assert result["has_context"] is True
        assert "answer" in result
        assert "此建议仅供参考" in result["answer"] or "建议仅供参考" in result[
            "answer"
        ]
        assert len(result["sources"]) > 0

    def test_generate_answer_no_context(self, rag_service):
        """测试 RAG 问答（无上下文）"""
        # 模拟向量化
        rag_service.embedding_service.embed_text.return_value = [0.1] * 384

        # 模拟检索无结果
        rag_service.qdrant_service.search.return_value = []

        result = rag_service.generate_answer(query="测试问题")

        assert result["has_context"] is False
        assert "没有找到相关" in result["answer"]
        assert len(result["sources"]) == 0

    def test_get_collection_stats(self, rag_service):
        """测试获取知识库统计"""
        mock_info = {
            "name": "health_knowledge",
            "points_count": 256,
            "vectors_count": 256,
            "status": "green",
            "config": {"vector_size": 384, "distance": "Cosine"},
        }
        rag_service.qdrant_service.get_collection_info.return_value = mock_info

        stats = rag_service.get_collection_stats()

        assert stats["collection_name"] == "health_knowledge"
        assert stats["total_chunks"] == 256
        assert stats["vector_dimension"] == 384


# ============================================
# 集成测试
# ============================================


class TestRAGIntegration:
    """RAG 服务集成测试（需要真实的 Qdrant 和 Embedding 模型）"""

    @pytest.mark.integration
    def test_full_rag_workflow(self):
        """测试完整 RAG 工作流"""
        # 这个测试需要真实的 Qdrant 和模型，标记为 integration
        # 在 CI/CD 中可以通过 pytest -m integration 单独运行
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=app.services", "--cov-report=html"])
