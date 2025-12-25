"""
Embedding 服务模块

使用 Sentence Transformers 实现文本向量化
"""

from typing import List, Union

from loguru import logger
from sentence_transformers import SentenceTransformer

from app.core.config import settings


class EmbeddingService:
    """
    文本向量化服务

    使用 Sentence Transformers 模型将文本转换为向量
    """

    def __init__(self, model_name: str | None = None):
        """
        初始化 Embedding 服务

        Args:
            model_name: 模型名称，默认使用配置中的模型
        """
        self.model_name = model_name or settings.embedding_model
        self.dimension = settings.embedding_dimension
        self._model: SentenceTransformer | None = None
        logger.info(f"初始化 EmbeddingService，模型: {self.model_name}")

    def _load_model(self) -> SentenceTransformer:
        """
        懒加载模型

        Returns:
            SentenceTransformer: 加载的模型实例
        """
        if self._model is None:
            logger.info(f"加载 Sentence Transformer 模型: {self.model_name}")
            try:
                self._model = SentenceTransformer(self.model_name)
                logger.info(f"模型加载成功，向量维度: {self._model.get_sentence_embedding_dimension()}")
            except Exception as e:
                logger.error(f"模型加载失败: {str(e)}")
                raise RuntimeError(f"无法加载 Embedding 模型: {str(e)}")
        return self._model

    def embed_text(self, text: str) -> List[float]:
        """
        对单个文本进行向量化

        Args:
            text: 输入文本

        Returns:
            List[float]: 文本向量
        """
        if not text or not text.strip():
            logger.warning("输入文本为空，返回零向量")
            return [0.0] * self.dimension

        try:
            model = self._load_model()
            embedding = model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"文本向量化失败: {str(e)}")
            raise RuntimeError(f"文本向量化失败: {str(e)}")

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        对多个文本进行批量向量化

        Args:
            texts: 文本列表

        Returns:
            List[List[float]]: 向量列表
        """
        if not texts:
            logger.warning("输入文本列表为空")
            return []

        # 过滤空文本
        valid_texts = [text for text in texts if text and text.strip()]
        if len(valid_texts) != len(texts):
            logger.warning(f"过滤了 {len(texts) - len(valid_texts)} 个空文本")

        if not valid_texts:
            return [[0.0] * self.dimension] * len(texts)

        try:
            model = self._load_model()
            logger.info(f"批量向量化 {len(valid_texts)} 个文本")
            embeddings = model.encode(valid_texts, convert_to_numpy=True, show_progress_bar=len(valid_texts) > 10)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"批量向量化失败: {str(e)}")
            raise RuntimeError(f"批量向量化失败: {str(e)}")

    def get_embedding_dimension(self) -> int:
        """
        获取向量维度

        Returns:
            int: 向量维度
        """
        model = self._load_model()
        return model.get_sentence_embedding_dimension()


# 全局单例实例
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    """
    获取 Embedding 服务实例（单例模式）

    Returns:
        EmbeddingService: Embedding 服务实例
    """
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
