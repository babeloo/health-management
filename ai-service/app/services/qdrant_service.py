"""
Qdrant 向量数据库服务模块

提供向量存储和检索功能
"""

from typing import Any, Dict, List, Optional
from loguru import logger
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    PointStruct,
    ScoredPoint,
    VectorParams,
    Filter,
)

from app.config import settings


class QdrantService:
    """
    Qdrant 向量数据库服务

    提供 collection 管理、向量存储和检索功能
    """

    def __init__(self):
        """初始化 Qdrant 服务"""
        self.url = settings.qdrant_url
        self._client: Optional[QdrantClient] = None
        logger.info(f"Qdrant service initialized: {self.url}")

    def _get_client(self) -> QdrantClient:
        """
        获取 Qdrant 客户端（懒加载）

        Returns:
            Qdrant 客户端实例
        """
        if self._client is None:
            try:
                logger.info("Connecting to Qdrant server...")
                self._client = QdrantClient(url=self.url, timeout=30)
                # 测试连接
                collections = self._client.get_collections()
                logger.info(f"Qdrant connected, collections: {len(collections.collections)}")
            except Exception as e:
                logger.error(f"Failed to connect to Qdrant: {str(e)}")
                raise RuntimeError(f"Cannot connect to Qdrant server: {str(e)}")
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
            创建成功返回 True
        """
        client = self._get_client()

        try:
            # 检查 collection 是否存在
            exists = client.collection_exists(collection_name)

            if exists:
                if force:
                    logger.warning(f"Collection {collection_name} exists, force recreating")
                    client.delete_collection(collection_name)
                else:
                    logger.info(f"Collection {collection_name} already exists")
                    return True

            # 创建 collection
            logger.info(f"Creating collection: {collection_name}, vector_size: {vector_size}")
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=distance),
            )
            logger.info(f"Collection {collection_name} created successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to create collection: {str(e)}")
            raise RuntimeError(f"Failed to create collection: {str(e)}")

    def delete_collection(self, collection_name: str) -> bool:
        """
        删除 collection

        Args:
            collection_name: Collection 名称

        Returns:
            删除成功返回 True
        """
        client = self._get_client()

        try:
            if client.collection_exists(collection_name):
                client.delete_collection(collection_name)
                logger.info(f"Collection {collection_name} deleted")
                return True
            else:
                logger.warning(f"Collection {collection_name} does not exist")
                return False
        except Exception as e:
            logger.error(f"Failed to delete collection: {str(e)}")
            raise RuntimeError(f"Failed to delete collection: {str(e)}")

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
            插入成功返回 True
        """
        client = self._get_client()

        if not points:
            logger.warning("No points to upsert")
            return True

        try:
            # 分批插入
            total = len(points)
            logger.info(f"Upserting {total} points to {collection_name}, batch_size: {batch_size}")

            for i in range(0, total, batch_size):
                batch = points[i : i + batch_size]
                client.upsert(collection_name=collection_name, points=batch)
                logger.debug(f"Upserted {min(i + batch_size, total)}/{total} points")

            logger.info(f"Successfully upserted {total} points to {collection_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to upsert points: {str(e)}")
            raise RuntimeError(f"Failed to upsert points: {str(e)}")

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
            检索结果列表
        """
        client = self._get_client()

        try:
            logger.debug(
                f"Searching in {collection_name}, limit={limit}, threshold={score_threshold}"
            )
            # 新版本使用 query_points 替代 search
            response = client.query_points(
                collection_name=collection_name,
                query=query_vector,
                limit=limit,
                score_threshold=score_threshold,
                query_filter=filter_conditions,
            )

            results = response.points if hasattr(response, "points") else []
            logger.info(f"Found {len(results)} results")
            return results

        except Exception as e:
            logger.error(f"Search failed: {str(e)}")
            raise RuntimeError(f"Search failed: {str(e)}")

    def get_collection_info(self, collection_name: str) -> Dict[str, Any]:
        """
        获取 collection 信息

        Args:
            collection_name: Collection 名称

        Returns:
            Collection 信息字典
        """
        client = self._get_client()

        try:
            if not client.collection_exists(collection_name):
                raise ValueError(f"Collection {collection_name} does not exist")

            info = client.get_collection(collection_name)

            # 获取向量配置
            vectors_config = info.config.params.vectors
            # 处理 dict 或单个向量配置
            if isinstance(vectors_config, dict):
                # 多向量配置（新版本可能支持）
                first_vector = next(iter(vectors_config.values()))
                vector_size = first_vector.size
                distance = str(first_vector.distance)
            else:
                # 单向量配置
                vector_size = vectors_config.size
                distance = str(vectors_config.distance)

            return {
                "name": collection_name,
                "vectors_count": info.indexed_vectors_count or 0,
                "points_count": info.points_count,
                "status": str(info.status),
                "config": {
                    "vector_size": vector_size,
                    "distance": distance,
                },
            }
        except Exception as e:
            logger.error(f"Failed to get collection info: {str(e)}")
            raise RuntimeError(f"Failed to get collection info: {str(e)}")

    def list_collections(self) -> List[str]:
        """
        列出所有 collections

        Returns:
            Collection 名称列表
        """
        client = self._get_client()

        try:
            collections = client.get_collections()
            return [col.name for col in collections.collections]
        except Exception as e:
            logger.error(f"Failed to list collections: {str(e)}")
            raise RuntimeError(f"Failed to list collections: {str(e)}")

    def delete_points(
        self,
        collection_name: str,
        point_ids: List[str],
    ) -> bool:
        """
        删除指定的向量点

        Args:
            collection_name: Collection 名称
            point_ids: 要删除的点 ID 列表

        Returns:
            删除成功返回 True
        """
        client = self._get_client()

        try:
            logger.info(f"Deleting {len(point_ids)} points from {collection_name}")
            client.delete(
                collection_name=collection_name,
                points_selector=point_ids,
            )
            logger.info(f"Successfully deleted {len(point_ids)} points")
            return True
        except Exception as e:
            logger.error(f"Failed to delete points: {str(e)}")
            raise RuntimeError(f"Failed to delete points: {str(e)}")


# 全局单例
_qdrant_service: Optional[QdrantService] = None


def get_qdrant_service() -> QdrantService:
    """
    获取 Qdrant 服务实例（单例模式）

    Returns:
        Qdrant 服务实例
    """
    global _qdrant_service
    if _qdrant_service is None:
        _qdrant_service = QdrantService()
    return _qdrant_service
