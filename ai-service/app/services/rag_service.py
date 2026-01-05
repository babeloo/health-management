"""
RAG Knowledge Base Service

增强版 RAG 服务，支持：
- 批量文档导入
- 知识库统计
- 文档管理
- 语义检索
"""

from typing import List, Dict, Any, Optional
import hashlib
import uuid
from loguru import logger

from app.config import settings
from app.services.qdrant_service import get_qdrant_service
from app.services.embedding_service import get_embedding_service
from qdrant_client.models import Distance, PointStruct


class RAGService:
    """RAG 检索增强生成服务"""

    def __init__(self):
        self.qdrant = get_qdrant_service()
        self.embedding = get_embedding_service()
        self.collection_name = settings.qdrant_collection
        self.vector_size = settings.embedding_dimension
        logger.info(f"RAG service initialized: collection={self.collection_name}")

    async def initialize(self, force: bool = False) -> bool:
        """
        初始化知识库

        Args:
            force: 是否强制重建

        Returns:
            初始化成功返回 True
        """
        try:
            logger.info(f"Initializing RAG knowledge base: {self.collection_name}")
            self.qdrant.create_collection(
                collection_name=self.collection_name,
                vector_size=self.vector_size,
                distance=Distance.COSINE,
                force=force,
            )
            logger.info("RAG knowledge base initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize RAG knowledge base: {str(e)}")
            raise

    async def search(
        self,
        query_vector: List[float],
        top_k: int = None,
        score_threshold: float = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        向量检索

        Args:
            query_vector: 查询向量
            top_k: 返回结果数量
            score_threshold: 相似度阈值
            filters: 过滤条件

        Returns:
            检索结果列表
        """
        top_k = top_k or settings.rag_top_k
        score_threshold = score_threshold or settings.rag_score_threshold

        try:
            results = self.qdrant.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=top_k,
                score_threshold=score_threshold,
            )

            return [
                {
                    "id": str(result.id),
                    "score": result.score,
                    "content": result.payload.get("content", ""),
                    "metadata": result.payload.get("metadata", {}),
                }
                for result in results
            ]
        except Exception as e:
            logger.error(f"Search failed: {str(e)}")
            raise

    async def search_by_text(
        self,
        query_text: str,
        top_k: int = None,
        score_threshold: float = None,
    ) -> List[Dict[str, Any]]:
        """
        文本语义检索

        Args:
            query_text: 查询文本
            top_k: 返回结果数量
            score_threshold: 相似度阈值

        Returns:
            检索结果列表
        """
        # 将文本转换为向量
        query_vector = await self.embedding.embed_text(query_text)
        return await self.search(query_vector, top_k, score_threshold)

    async def add_document(
        self,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        添加文档到知识库

        Args:
            content: 文档内容
            metadata: 元数据

        Returns:
            文档ID
        """
        try:
            # 生成文档 ID
            doc_id = hashlib.md5(content.encode()).hexdigest()

            # 生成向量
            vector = await self.embedding.embed_text(content)

            # 创建点
            point = PointStruct(
                id=doc_id,
                vector=vector,
                payload={
                    "content": content,
                    "metadata": metadata or {},
                },
            )

            # 插入到 Qdrant
            self.qdrant.upsert_points(
                collection_name=self.collection_name,
                points=[point],
            )

            logger.info(f"Document added: {doc_id}")
            return doc_id

        except Exception as e:
            logger.error(f"Failed to add document: {str(e)}")
            raise

    async def add_documents_batch(
        self,
        documents: List[Dict[str, Any]],
        batch_size: int = 100,
    ) -> List[str]:
        """
        批量添加文档

        Args:
            documents: 文档列表，每个文档包含 content 和 metadata
            batch_size: 批量处理大小

        Returns:
            文档 ID 列表
        """
        try:
            logger.info(f"Batch adding {len(documents)} documents")
            doc_ids = []
            points = []

            # 提取所有文本
            texts = [doc["content"] for doc in documents]

            # 批量生成向量
            vectors = await self.embedding.embed_texts(texts)

            # 创建点
            for doc, vector in zip(documents, vectors):
                doc_id = hashlib.md5(doc["content"].encode()).hexdigest()
                doc_ids.append(doc_id)

                point = PointStruct(
                    id=doc_id,
                    vector=vector,
                    payload={
                        "content": doc["content"],
                        "metadata": doc.get("metadata", {}),
                    },
                )
                points.append(point)

            # 批量插入
            self.qdrant.upsert_points(
                collection_name=self.collection_name,
                points=points,
                batch_size=batch_size,
            )

            logger.info(f"Successfully added {len(doc_ids)} documents")
            return doc_ids

        except Exception as e:
            logger.error(f"Batch add failed: {str(e)}")
            raise

    async def delete_document(self, doc_id: str) -> bool:
        """
        删除文档

        Args:
            doc_id: 文档 ID

        Returns:
            删除成功返回 True
        """
        try:
            self.qdrant.delete_points(
                collection_name=self.collection_name,
                point_ids=[doc_id],
            )
            logger.info(f"Document deleted: {doc_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document: {str(e)}")
            raise

    async def get_stats(self) -> Dict[str, Any]:
        """
        获取知识库统计信息

        Returns:
            统计信息字典
        """
        try:
            info = self.qdrant.get_collection_info(self.collection_name)
            return {
                "collection_name": info["name"],
                "documents_count": info["points_count"],
                "vectors_count": info["vectors_count"],
                "vector_size": info["config"]["vector_size"],
                "distance_metric": info["config"]["distance"],
                "status": info["status"],
            }
        except Exception as e:
            logger.error(f"Failed to get stats: {str(e)}")
            raise


# 全局实例
rag_service = RAGService()
