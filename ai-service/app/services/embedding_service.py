"""
Embedding 服务模块

支持两种向量化方式:
1. OpenAI API (text-embedding-ada-002) - 推荐
2. 本地 Sentence Transformers 模型 - 可选
"""

from typing import List, Optional
from loguru import logger
from openai import AsyncOpenAI

from app.config import settings


class EmbeddingService:
    """
    文本向量化服务

    支持 OpenAI API 和本地模型两种方式
    """

    def __init__(self):
        """初始化 Embedding 服务"""
        self.provider = settings.embedding_provider
        self.dimension = settings.embedding_dimension
        self.cache_enabled = settings.embedding_cache_enabled
        self._cache: dict = {}  # 简单的内存缓存

        if self.provider == "openai":
            self.client = AsyncOpenAI(
                api_key=settings.deepseek_api_key,
                base_url=settings.deepseek_base_url,
                timeout=settings.deepseek_timeout,
            )
            self.model = settings.embedding_model
            logger.info(f"Embedding service initialized with OpenAI: {self.model}")
        else:
            # 本地模型懒加载
            self._local_model = None
            self.model = settings.embedding_local_model
            logger.info(f"Embedding service initialized with local model: {self.model}")

    def _load_local_model(self):
        """懒加载本地模型"""
        if self._local_model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading local embedding model: {self.model}")
                self._local_model = SentenceTransformer(self.model)
                logger.info(f"Local model loaded, dimension: {self._local_model.get_sentence_embedding_dimension()}")
            except ImportError:
                raise RuntimeError(
                    "sentence-transformers not installed. "
                    "Install it with: pip install sentence-transformers"
                )
            except Exception as e:
                logger.error(f"Failed to load local model: {str(e)}")
                raise RuntimeError(f"Failed to load embedding model: {str(e)}")
        return self._local_model

    async def embed_text(self, text: str) -> List[float]:
        """
        对单个文本进行向量化

        Args:
            text: 输入文本

        Returns:
            文本向量
        """
        if not text or not text.strip():
            logger.warning("Empty text input, returning zero vector")
            return [0.0] * self.dimension

        # 检查缓存
        if self.cache_enabled and text in self._cache:
            logger.debug("Returning cached embedding")
            return self._cache[text]

        try:
            if self.provider == "openai":
                embedding = await self._embed_with_openai([text])
                result = embedding[0]
            else:
                result = self._embed_with_local([text])[0]

            # 缓存结果
            if self.cache_enabled:
                self._cache[text] = result

            return result

        except Exception as e:
            logger.error(f"Text embedding failed: {str(e)}")
            raise RuntimeError(f"Text embedding failed: {str(e)}")

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        对多个文本进行批量向量化

        Args:
            texts: 文本列表

        Returns:
            向量列表
        """
        if not texts:
            logger.warning("Empty text list")
            return []

        # 过滤空文本
        valid_texts = [text for text in texts if text and text.strip()]
        if len(valid_texts) != len(texts):
            logger.warning(f"Filtered {len(texts) - len(valid_texts)} empty texts")

        if not valid_texts:
            return [[0.0] * self.dimension] * len(texts)

        try:
            logger.info(f"Batch embedding {len(valid_texts)} texts")

            if self.provider == "openai":
                return await self._embed_with_openai(valid_texts)
            else:
                return self._embed_with_local(valid_texts)

        except Exception as e:
            logger.error(f"Batch embedding failed: {str(e)}")
            raise RuntimeError(f"Batch embedding failed: {str(e)}")

    async def _embed_with_openai(self, texts: List[str]) -> List[List[float]]:
        """使用 OpenAI API 进行向量化"""
        response = await self.client.embeddings.create(
            model=self.model,
            input=texts,
        )
        return [item.embedding for item in response.data]

    def _embed_with_local(self, texts: List[str]) -> List[List[float]]:
        """使用本地模型进行向量化"""
        model = self._load_local_model()
        embeddings = model.encode(
            texts,
            convert_to_numpy=True,
            show_progress_bar=len(texts) > 10
        )
        return embeddings.tolist()

    def get_embedding_dimension(self) -> int:
        """
        获取向量维度

        Returns:
            向量维度
        """
        if self.provider == "openai":
            return self.dimension
        else:
            model = self._load_local_model()
            return model.get_sentence_embedding_dimension()

    def clear_cache(self):
        """清空缓存"""
        self._cache.clear()
        logger.info("Embedding cache cleared")


# 全局单例
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """
    获取 Embedding 服务实例（单例模式）

    Returns:
        Embedding 服务实例
    """
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
