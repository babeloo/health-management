"""
Qdrant 向量数据库服务模块

提供向量存储和检索功能
"""

from typing import Any, Dict, List, Optional

from loguru import logger
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    ScoredPoint,
    VectorParams,
)

from app.core.config import settings


class QdrantService:
    """
    Qdrant 向量数据库服务

    提供 collection 管理、向量存储和检索功能
    """

    def __init__(self):
        """初始化 Qdrant 服务"""
        self.host = settings.qdrant_host
        self.port = settings.qdrant_port
        self.api_key = settings.qdrant_api_key or None
        self.use_https = settings.qdrant_use_https
        self._client: QdrantClient | None = None
        logger.info(f"初始化 QdrantService，地址: {self.host}:{self.port}")

    def _get_client(self) -> QdrantClient:
        """
        获取 Qdrant 客户端（懒加载）

        Returns:
            QdrantClient: Qdrant 客户端实例
        """
        if self._client is None:
            try:
                logger.info("连接 Qdrant 服务器...")
                self._client = QdrantClient(
                    host=self.host,
                    port=self.port,
                    api_key=self.api_key,
                    https=self.use_https,
                    timeout=30,
                )
                # 测试连接
                collections = self._client.get_collections()
                logger.info(f"Qdrant 连接成功，当前 collections: {len(collections.collections)}")
            except Exception as e:
                logger.error(f"Qdrant 连接失败: {str(e)}")
                raise RuntimeError(f"无法连接 Qdrant 服务器: {str(e)}")
        return self._client

    def create_collection(
        self,
        collection_name: str,
        vector_size: int,
        distance: Distance = Distance.COSINE,
        force: bool = False,
    ) -> bool:
        """
        创建 collection

        Args:
            collection_name: Collection 名称
            vector_size: 向量维度
            distance: 距离计算方式（COSINE, EUCLID, DOT）
            force: 是否强制重建（删除已存在的 collection）

        Returns:
            bool: 创建成功返回 True
        """
        client = self._get_client()

        try:
            # 检查 collection 是否存在
            exists = client.collection_exists(collection_name)

            if exists:
                if force:
                    logger.warning(f"Collection {collection_name} 已存在，强制删除并重建")
                    client.delete_collection(collection_name)
                else:
                    logger.info(f"Collection {collection_name} 已存在")
                    return True

            # 创建 collection
            logger.info(f"创建 collection: {collection_name}, 向量维度: {vector_size}")
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=distance),
            )
            logger.info(f"Collection {collection_name} 创建成功")
            return True

        except Exception as e:
            logger.error(f"创建 collection 失败: {str(e)}")
            raise RuntimeError(f"创建 collection 失败: {str(e)}")

    def upsert_points(
        self,
        collection_name: str,
        points: List[PointStruct],
        batch_size: int = 100,
    ) -> bool:
        """
        插入或更新向量点

        Args:
            collection_name: Collection 名称
            points: 向量点列表
            batch_size: 批量插入大小

        Returns:
            bool: 插入成功返回 True
        """
        client = self._get_client()

        if not points:
            logger.warning("没有向量点需要插入")
            return True

        try:
            # 分批插入
            total = len(points)
            logger.info(f"开始插入 {total} 个向量点到 {collection_name}，批次大小: {batch_size}")

            for i in range(0, total, batch_size):
                batch = points[i : i + batch_size]
                client.upsert(collection_name=collection_name, points=batch)
                logger.info(f"已插入 {min(i + batch_size, total)}/{total} 个向量点")

            logger.info(f"成功插入 {total} 个向量点到 {collection_name}")
            return True

        except Exception as e:
            logger.error(f"插入向量点失败: {str(e)}")
            raise RuntimeError(f"插入向量点失败: {str(e)}")

    def search(
        self,
        collection_name: str,
        query_vector: List[float],
        limit: int = 5,
        score_threshold: Optional[float] = None,
        filter_conditions: Optional[Filter] = None,
    ) -> List[ScoredPoint]:
        """
        向量检索

        Args:
            collection_name: Collection 名称
            query_vector: 查询向量
            limit: 返回结果数量
            score_threshold: 相似度阈值（可选）
            filter_conditions: 过滤条件（可选）

        Returns:
            List[ScoredPoint]: 检索结果列表
        """
        client = self._get_client()

        try:
            logger.info(f"在 {collection_name} 中检索，limit={limit}, threshold={score_threshold}")
            results = client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=limit,
                score_threshold=score_threshold,
                query_filter=filter_conditions,
            )

            logger.info(f"检索到 {len(results)} 个结果")
            return results

        except Exception as e:
            logger.error(f"向量检索失败: {str(e)}")
            raise RuntimeError(f"向量检索失败: {str(e)}")

    def search_by_category(
        self,
        collection_name: str,
        query_vector: List[float],
        category: str,
        limit: int = 5,
        score_threshold: Optional[float] = None,
    ) -> List[ScoredPoint]:
        """
        按类别检索

        Args:
            collection_name: Collection 名称
            query_vector: 查询向量
            category: 类别
            limit: 返回结果数量
            score_threshold: 相似度阈值

        Returns:
            List[ScoredPoint]: 检索结果列表
        """
        filter_conditions = Filter(
            must=[FieldCondition(key="category", match=MatchValue(value=category))]
        )
        return self.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=limit,
            score_threshold=score_threshold,
            filter_conditions=filter_conditions,
        )

    def get_collection_info(self, collection_name: str) -> Dict[str, Any]:
        """
        获取 collection 信息

        Args:
            collection_name: Collection 名称

        Returns:
            Dict[str, Any]: Collection 信息
        """
        client = self._get_client()

        try:
            info = client.get_collection(collection_name)
            return {
                "name": collection_name,
                "vectors_count": info.vectors_count,
                "points_count": info.points_count,
                "status": info.status,
                "config": {
                    "vector_size": info.config.params.vectors.size,
                    "distance": info.config.params.vectors.distance,
                },
            }
        except Exception as e:
            logger.error(f"获取 collection 信息失败: {str(e)}")
            raise RuntimeError(f"获取 collection 信息失败: {str(e)}")

    def list_collections(self) -> List[str]:
        """
        列出所有 collection

        Returns:
            List[str]: Collection 名称列表
        """
        client = self._get_client()

        try:
            collections = client.get_collections()
            return [col.name for col in collections.collections]
        except Exception as e:
            logger.error(f"列出 collections 失败: {str(e)}")
            raise RuntimeError(f"列出 collections 失败: {str(e)}")

    def delete_collection(self, collection_name: str) -> bool:
        """
        删除 collection

        Args:
            collection_name: Collection 名称

        Returns:
            bool: 删除成功返回 True
        """
        client = self._get_client()

        try:
            logger.info(f"删除 collection: {collection_name}")
            client.delete_collection(collection_name)
            logger.info(f"Collection {collection_name} 删除成功")
            return True
        except Exception as e:
            logger.error(f"删除 collection 失败: {str(e)}")
            raise RuntimeError(f"删除 collection 失败: {str(e)}")

    def delete_points(self, collection_name: str, point_ids: List[int | str]) -> bool:
        """
        删除指定的向量点

        Args:
            collection_name: Collection 名称
            point_ids: 向量点 ID 列表

        Returns:
            bool: 删除成功返回 True
        """
        client = self._get_client()

        try:
            logger.info(f"删除 {len(point_ids)} 个向量点从 {collection_name}")
            client.delete(collection_name=collection_name, points_selector=point_ids)
            logger.info(f"成功删除 {len(point_ids)} 个向量点")
            return True
        except Exception as e:
            logger.error(f"删除向量点失败: {str(e)}")
            raise RuntimeError(f"删除向量点失败: {str(e)}")


# 全局单例实例
_qdrant_service: QdrantService | None = None


def get_qdrant_service() -> QdrantService:
    """
    获取 Qdrant 服务实例（单例模式）

    Returns:
        QdrantService: Qdrant 服务实例
    """
    global _qdrant_service
    if _qdrant_service is None:
        _qdrant_service = QdrantService()
    return _qdrant_service
