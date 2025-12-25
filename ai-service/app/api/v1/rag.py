"""
RAG 知识库 API 端点

提供 RAG 文档导入、检索、问答等功能
"""

from typing import Any, Dict

from fastapi import APIRouter, HTTPException, status
from loguru import logger

from app.models.rag_models import (
    CollectionStatsResponse,
    InitializeCollectionRequest,
    InitializeCollectionResponse,
    IngestDocumentRequest,
    IngestDocumentResponse,
    IngestDocumentsRequest,
    IngestDocumentsResponse,
    RAGQueryRequest,
    RAGQueryResponse,
    RAGSearchRequest,
    RAGSearchResponse,
    RAGSearchResult,
)
from app.services.rag_service import get_rag_service

# 创建路由
router = APIRouter(prefix="/rag", tags=["RAG 知识库"])


@router.post("/initialize", response_model=InitializeCollectionResponse)
async def initialize_collection(request: InitializeCollectionRequest):
    """
    初始化知识库 Collection

    - **force**: 是否强制重建（删除已存在的 collection）
    """
    try:
        rag_service = get_rag_service()
        success = rag_service.initialize_collection(force=request.force)

        if success:
            return InitializeCollectionResponse(
                status="success",
                message="知识库初始化成功",
                collection_name=rag_service.collection_name,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="知识库初始化失败",
            )

    except Exception as e:
        logger.error(f"初始化知识库失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"初始化知识库失败: {str(e)}",
        )


@router.post("/ingest", response_model=IngestDocumentResponse)
async def ingest_document(request: IngestDocumentRequest):
    """
    导入单个文档到知识库

    - **content**: 文档内容（10-10000字）
    - **metadata**: 文档元数据（标题、类别、来源等）
    - **doc_id**: 文档 ID（可选，不提供则自动生成）
    """
    try:
        rag_service = get_rag_service()
        result = rag_service.ingest_document(
            content=request.content,
            metadata=request.metadata.model_dump(),
            doc_id=request.doc_id,
        )

        return IngestDocumentResponse(**result)

    except Exception as e:
        logger.error(f"导入文档失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导入文档失败: {str(e)}",
        )


@router.post("/ingest/batch", response_model=IngestDocumentsResponse)
async def ingest_documents(request: IngestDocumentsRequest):
    """
    批量导入文档到知识库

    - **documents**: 文档列表（最多100个）

    每个文档包含：
    - content: 文档内容
    - metadata: 文档元数据
    - doc_id: 文档 ID（可选）
    """
    try:
        rag_service = get_rag_service()

        # 转换文档格式
        documents = [
            {
                "content": doc.content,
                "metadata": doc.metadata.model_dump(),
                "doc_id": doc.doc_id,
            }
            for doc in request.documents
        ]

        result = rag_service.ingest_documents(documents=documents)
        return IngestDocumentsResponse(**result)

    except Exception as e:
        logger.error(f"批量导入文档失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量导入文档失败: {str(e)}",
        )


@router.post("/search", response_model=RAGSearchResponse)
async def search_knowledge(request: RAGSearchRequest):
    """
    语义检索

    在知识库中检索与查询文本相关的内容

    - **query**: 查询文本
    - **category**: 类别过滤（可选）
    - **top_k**: 返回结果数量（1-20，默认5）
    - **score_threshold**: 相似度阈值（0.0-1.0，默认0.7）
    """
    try:
        rag_service = get_rag_service()
        results = rag_service.search(
            query=request.query,
            category=request.category,
            top_k=request.top_k,
            score_threshold=request.score_threshold,
        )

        # 转换为响应格式
        search_results = [RAGSearchResult(**result) for result in results]

        return RAGSearchResponse(results=search_results, total=len(search_results))

    except Exception as e:
        logger.error(f"检索失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"检索失败: {str(e)}",
        )


@router.post("/query", response_model=RAGQueryResponse)
async def query_with_rag(request: RAGQueryRequest):
    """
    RAG 问答

    基于知识库检索和大模型生成回答用户问题

    - **query**: 用户问题
    - **category**: 类别过滤（可选）
    - **top_k**: 检索结果数量（1-20，默认5）
    - **include_sources**: 是否包含来源信息（默认True）

    注意：所有生成的答案都包含免责声明
    """
    try:
        rag_service = get_rag_service()
        result = rag_service.generate_answer(
            query=request.query,
            category=request.category,
            top_k=request.top_k,
            include_sources=request.include_sources,
        )

        # 转换来源格式
        sources = [RAGSearchResult(**source) for source in result.get("sources", [])]

        return RAGQueryResponse(
            answer=result["answer"],
            sources=sources,
            has_context=result["has_context"],
            context_count=result["context_count"],
        )

    except Exception as e:
        logger.error(f"RAG 问答失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG 问答失败: {str(e)}",
        )


@router.get("/collections/stats", response_model=CollectionStatsResponse)
async def get_collection_stats():
    """
    获取知识库统计信息

    返回：
    - collection_name: Collection 名称
    - total_chunks: 总分块数
    - vector_dimension: 向量维度
    - distance_metric: 距离度量方式
    - status: 状态
    """
    try:
        rag_service = get_rag_service()
        stats = rag_service.get_collection_stats()
        return CollectionStatsResponse(**stats)

    except Exception as e:
        logger.error(f"获取知识库统计失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取知识库统计失败: {str(e)}",
        )


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    健康检查

    检查 RAG 服务是否正常运行
    """
    try:
        rag_service = get_rag_service()

        # 检查 Qdrant 连接
        collections = rag_service.qdrant_service.list_collections()

        # 检查 Embedding 服务
        dimension = rag_service.embedding_service.get_embedding_dimension()

        return {
            "status": "healthy",
            "qdrant_connected": True,
            "collections_count": len(collections),
            "embedding_dimension": dimension,
            "collection_name": rag_service.collection_name,
        }

    except Exception as e:
        logger.error(f"RAG 服务健康检查失败: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "qdrant_connected": False,
        }
