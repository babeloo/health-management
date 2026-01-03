"""
RAG Knowledge Base Service
"""

from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
import hashlib
from app.config import settings


class RAGService:
    """RAG检索服务"""

    def __init__(self):
        self.client = QdrantClient(url=settings.qdrant_url)
        self.collection_name = settings.qdrant_collection
        self._ensure_collection()

    def _ensure_collection(self):
        """确保collection存在"""
        collections = self.client.get_collections().collections
        if not any(c.name == self.collection_name for c in collections):
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
            )

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
        top_k = top_k or settings.RAG_TOP_K
        score_threshold = score_threshold or settings.RAG_SCORE_THRESHOLD

        query_filter = None
        if filters:
            conditions = [
                FieldCondition(key=k, match=MatchValue(value=v)) for k, v in filters.items()
            ]
            query_filter = Filter(must=conditions)

        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=top_k,
            score_threshold=score_threshold,
            query_filter=query_filter,
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

    async def add_document(
        self,
        content: str,
        vector: List[float],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        添加文档到知识库

        Args:
            content: 文档内容
            vector: 文档向量
            metadata: 元数据

        Returns:
            文档ID
        """
        doc_id = hashlib.md5(content.encode()).hexdigest()

        point = PointStruct(
            id=doc_id,
            vector=vector,
            payload={
                "content": content,
                "metadata": metadata or {},
            },
        )

        self.client.upsert(
            collection_name=self.collection_name,
            points=[point],
        )

        return doc_id


# 全局实例
rag_service = RAGService()
