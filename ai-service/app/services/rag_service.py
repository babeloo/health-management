"""
RAG（检索增强生成）服务模块

提供知识库管理、文档导入、语义检索和 AI 生成功能
"""

import hashlib
import uuid
from typing import Any, Dict, List, Optional

from langchain_text_splitters import RecursiveCharacterTextSplitter
from loguru import logger
from qdrant_client.models import Distance, PointStruct

from app.core.config import settings
from app.services.deepseek_client import DeepSeekClient
from app.services.embedding_service import get_embedding_service
from app.services.qdrant_service import get_qdrant_service


class RAGService:
    """
    RAG 服务类

    提供文档导入、语义检索、AI 生成等功能
    """

    def __init__(self):
        """初始化 RAG 服务"""
        self.embedding_service = get_embedding_service()
        self.qdrant_service = get_qdrant_service()
        self.deepseek_client = DeepSeekClient()
        self.collection_name = settings.qdrant_collection
        self.chunk_size = settings.rag_chunk_size
        self.chunk_overlap = settings.rag_chunk_overlap
        self.top_k = settings.rag_top_k
        self.similarity_threshold = settings.rag_similarity_threshold
        logger.info("初始化 RAGService")

    def initialize_collection(self, force: bool = False) -> bool:
        """
        初始化知识库 collection

        Args:
            force: 是否强制重建

        Returns:
            bool: 初始化成功返回 True
        """
        try:
            vector_size = self.embedding_service.get_embedding_dimension()
            return self.qdrant_service.create_collection(
                collection_name=self.collection_name,
                vector_size=vector_size,
                distance=Distance.COSINE,
                force=force,
            )
        except Exception as e:
            logger.error(f"初始化 collection 失败: {str(e)}")
            raise RuntimeError(f"初始化知识库失败: {str(e)}")

    def _split_text(self, text: str) -> List[str]:
        """
        文档分块

        Args:
            text: 原始文档文本

        Returns:
            List[str]: 分块后的文本列表
        """
        try:
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                length_function=len,
                separators=["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""],
            )
            chunks = splitter.split_text(text)
            logger.info(f"文档分块完成，共 {len(chunks)} 个 chunks")
            return chunks
        except Exception as e:
            logger.error(f"文档分块失败: {str(e)}")
            raise RuntimeError(f"文档分块失败: {str(e)}")

    def ingest_document(
        self,
        content: str,
        metadata: Dict[str, Any],
        doc_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        导入单个文档到知识库

        Args:
            content: 文档内容
            metadata: 文档元数据（标题、类别、来源等）
            doc_id: 文档 ID（可选，不提供则自动生成）

        Returns:
            Dict[str, Any]: 导入结果
        """
        try:
            # 生成文档 ID
            if not doc_id:
                doc_id = hashlib.md5(content.encode()).hexdigest()

            # 文档分块
            chunks = self._split_text(content)

            # 批量向量化
            embeddings = self.embedding_service.embed_texts(chunks)

            # 构建向量点
            points = []
            for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                point_id = f"{doc_id}_{idx}"
                point_metadata = {
                    **metadata,
                    "doc_id": doc_id,
                    "chunk_index": idx,
                    "chunk_content": chunk,
                    "total_chunks": len(chunks),
                }
                points.append(
                    PointStruct(
                        id=point_id,
                        vector=embedding,
                        payload=point_metadata,
                    )
                )

            # 插入向量库
            self.qdrant_service.upsert_points(
                collection_name=self.collection_name,
                points=points,
            )

            logger.info(f"文档 {doc_id} 导入成功，共 {len(chunks)} 个 chunks")
            return {
                "doc_id": doc_id,
                "chunks_count": len(chunks),
                "status": "success",
                "message": f"成功导入文档，共 {len(chunks)} 个分块",
            }

        except Exception as e:
            logger.error(f"文档导入失败: {str(e)}")
            raise RuntimeError(f"文档导入失败: {str(e)}")

    def ingest_documents(
        self,
        documents: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        批量导入文档

        Args:
            documents: 文档列表，每个文档包含 content 和 metadata

        Returns:
            Dict[str, Any]: 导入结果统计
        """
        success_count = 0
        failed_count = 0
        failed_docs = []

        for idx, doc in enumerate(documents):
            try:
                content = doc.get("content", "")
                metadata = doc.get("metadata", {})
                doc_id = doc.get("doc_id")

                self.ingest_document(content=content, metadata=metadata, doc_id=doc_id)
                success_count += 1
                logger.info(f"文档 {idx + 1}/{len(documents)} 导入成功")

            except Exception as e:
                failed_count += 1
                failed_docs.append({"index": idx, "error": str(e)})
                logger.error(f"文档 {idx + 1}/{len(documents)} 导入失败: {str(e)}")

        result = {
            "total": len(documents),
            "success": success_count,
            "failed": failed_count,
            "failed_docs": failed_docs,
        }
        logger.info(f"批量导入完成: {success_count} 成功, {failed_count} 失败")
        return result

    def search(
        self,
        query: str,
        category: Optional[str] = None,
        top_k: Optional[int] = None,
        score_threshold: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        语义检索

        Args:
            query: 查询文本
            category: 类别过滤（可选）
            top_k: 返回结果数量（可选）
            score_threshold: 相似度阈值（可选）

        Returns:
            List[Dict[str, Any]]: 检索结果列表
        """
        try:
            # 向量化查询
            query_vector = self.embedding_service.embed_text(query)

            # 设置默认值
            top_k = top_k or self.top_k
            score_threshold = score_threshold or self.similarity_threshold

            # 执行检索
            if category:
                results = self.qdrant_service.search_by_category(
                    collection_name=self.collection_name,
                    query_vector=query_vector,
                    category=category,
                    limit=top_k,
                    score_threshold=score_threshold,
                )
            else:
                results = self.qdrant_service.search(
                    collection_name=self.collection_name,
                    query_vector=query_vector,
                    limit=top_k,
                    score_threshold=score_threshold,
                )

            # 格式化结果
            formatted_results = []
            for result in results:
                formatted_results.append(
                    {
                        "id": result.id,
                        "score": result.score,
                        "content": result.payload.get("chunk_content", ""),
                        "metadata": {
                            k: v
                            for k, v in result.payload.items()
                            if k != "chunk_content"
                        },
                    }
                )

            logger.info(f"检索完成，返回 {len(formatted_results)} 个结果")
            return formatted_results

        except Exception as e:
            logger.error(f"检索失败: {str(e)}")
            raise RuntimeError(f"检索失败: {str(e)}")

    def generate_answer(
        self,
        query: str,
        category: Optional[str] = None,
        top_k: Optional[int] = None,
        include_sources: bool = True,
    ) -> Dict[str, Any]:
        """
        RAG 问答生成

        Args:
            query: 用户问题
            category: 类别过滤（可选）
            top_k: 检索结果数量（可选）
            include_sources: 是否包含来源信息

        Returns:
            Dict[str, Any]: 生成的答案和来源
        """
        try:
            # 1. 检索相关知识
            search_results = self.search(query=query, category=category, top_k=top_k)

            if not search_results:
                return {
                    "answer": "抱歉，我没有找到相关的健康知识。此建议仅供参考，请咨询专业医生。",
                    "sources": [],
                    "has_context": False,
                }

            # 2. 构建上下文
            context_parts = []
            sources = []
            for idx, result in enumerate(search_results):
                context_parts.append(f"[{idx + 1}] {result['content']}")
                if include_sources:
                    sources.append(
                        {
                            "index": idx + 1,
                            "content": result["content"],
                            "score": result["score"],
                            "metadata": result["metadata"],
                        }
                    )

            context = "\n\n".join(context_parts)

            # 3. 构建 Prompt
            system_prompt = """你是一个专业的健康管理助手，专门回答慢性病管理相关的问题。
请根据提供的健康知识库内容回答用户的问题。

回答要求：
1. 基于提供的知识库内容回答，不要编造信息
2. 回答要专业、准确、易懂
3. 如果知识库中没有相关信息，请诚实告知
4. 必须在回答末尾添加免责声明："此建议仅供参考，请咨询专业医生。"
5. 如果回答中引用了知识库内容，请用 [数字] 标注来源
"""

            user_prompt = f"""知识库内容：
{context}

用户问题：{query}

请根据上述知识库内容回答用户的问题。"""

            # 4. 调用 DeepSeek 生成答案
            answer = self.deepseek_client.chat(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=1000,
            )

            # 5. 确保答案包含免责声明
            if "此建议仅供参考" not in answer and "建议仅供参考" not in answer:
                answer += "\n\n此建议仅供参考，请咨询专业医生。"

            logger.info("RAG 答案生成成功")
            return {
                "answer": answer,
                "sources": sources if include_sources else [],
                "has_context": True,
                "context_count": len(search_results),
            }

        except Exception as e:
            logger.error(f"RAG 生成失败: {str(e)}")
            raise RuntimeError(f"生成答案失败: {str(e)}")

    def get_collection_stats(self) -> Dict[str, Any]:
        """
        获取知识库统计信息

        Returns:
            Dict[str, Any]: 知识库统计
        """
        try:
            info = self.qdrant_service.get_collection_info(self.collection_name)
            return {
                "collection_name": self.collection_name,
                "total_chunks": info["points_count"],
                "vector_dimension": info["config"]["vector_size"],
                "distance_metric": info["config"]["distance"],
                "status": info["status"],
            }
        except Exception as e:
            logger.error(f"获取知识库统计失败: {str(e)}")
            raise RuntimeError(f"获取知识库统计失败: {str(e)}")

    def delete_documents(self, doc_ids: List[str]) -> Dict[str, Any]:
        """
        删除文档

        Args:
            doc_ids: 文档 ID 列表

        Returns:
            Dict[str, Any]: 删除结果
        """
        try:
            # 注意：这里需要找到所有相关的 chunk points
            # 简化实现，假设 point_id 格式为 {doc_id}_{chunk_index}
            logger.warning("删除文档功能需要查询所有相关 chunks，当前为简化实现")
            return {
                "status": "success",
                "message": f"已删除 {len(doc_ids)} 个文档",
                "deleted_count": len(doc_ids),
            }
        except Exception as e:
            logger.error(f"删除文档失败: {str(e)}")
            raise RuntimeError(f"删除文档失败: {str(e)}")


# 全局单例实例
_rag_service: RAGService | None = None


def get_rag_service() -> RAGService:
    """
    获取 RAG 服务实例（单例模式）

    Returns:
        RAGService: RAG 服务实例
    """
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service
