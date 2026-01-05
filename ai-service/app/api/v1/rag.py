"""
RAG API 端点

提供 RAG 知识库管理和检索接口
"""

from fastapi import APIRouter, HTTPException, status
from loguru import logger

from app.models.rag_models import (
    InitializeRequest,
    InitializeResponse,
    IngestDocumentRequest,
    IngestDocumentResponse,
    BatchIngestRequest,
    BatchIngestResponse,
    RAGSearchRequest,
    RAGSearchResponse,
    RAGSearchResult,
    RAGQueryRequest,
    RAGQueryResponse,
    RAGStatsResponse,
)
from app.services.rag_service import rag_service
from app.services.deepseek_client import get_deepseek_client
from app.config import settings

router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post("/initialize", response_model=InitializeResponse)
async def initialize_knowledge_base(request: InitializeRequest):
    """
    初始化知识库

    创建 Qdrant collection，如果 force=True 则强制重建
    """
    try:
        await rag_service.initialize(force=request.force)
        return InitializeResponse(
            message="Knowledge base initialized successfully",
            collection_name=settings.qdrant_collection,
        )
    except Exception as e:
        logger.error(f"Failed to initialize knowledge base: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize knowledge base: {str(e)}",
        )


@router.post("/ingest", response_model=IngestDocumentResponse)
async def ingest_document(request: IngestDocumentRequest):
    """
    导入单个文档到知识库

    文档会被向量化并存储到 Qdrant
    """
    try:
        doc_id = await rag_service.add_document(
            content=request.content,
            metadata=request.metadata,
        )
        return IngestDocumentResponse(
            doc_id=doc_id,
            message="Document ingested successfully",
        )
    except Exception as e:
        logger.error(f"Failed to ingest document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest document: {str(e)}",
        )


@router.post("/ingest/batch", response_model=BatchIngestResponse)
async def ingest_documents_batch(request: BatchIngestRequest):
    """
    批量导入文档到知识库

    支持批量向量化和插入，提高导入效率
    """
    try:
        documents = [
            {"content": doc.content, "metadata": doc.metadata}
            for doc in request.documents
        ]
        doc_ids = await rag_service.add_documents_batch(
            documents=documents,
            batch_size=request.batch_size,
        )
        return BatchIngestResponse(
            doc_ids=doc_ids,
            count=len(doc_ids),
            message=f"Successfully ingested {len(doc_ids)} documents",
        )
    except Exception as e:
        logger.error(f"Failed to batch ingest documents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to batch ingest documents: {str(e)}",
        )


@router.post("/search", response_model=RAGSearchResponse)
async def search_knowledge_base(request: RAGSearchRequest):
    """
    语义检索

    根据查询文本在知识库中检索相关文档
    """
    try:
        results = await rag_service.search_by_text(
            query_text=request.query,
            top_k=request.top_k,
            score_threshold=request.score_threshold,
        )

        search_results = [
            RAGSearchResult(
                id=r["id"],
                score=r["score"],
                content=r["content"],
                metadata=r["metadata"],
            )
            for r in results
        ]

        return RAGSearchResponse(
            results=search_results,
            count=len(search_results),
        )
    except Exception as e:
        logger.error(f"Search failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}",
        )


@router.post("/query", response_model=RAGQueryResponse)
async def rag_query(request: RAGQueryRequest):
    """
    RAG 问答

    检索相关知识后，使用 DeepSeek 生成回答
    """
    try:
        # 1. 检索相关文档
        results = await rag_service.search_by_text(
            query_text=request.question,
            top_k=request.top_k,
        )

        if not results:
            # 没有检索到相关文档，直接回答
            deepseek = get_deepseek_client()
            response = await deepseek.chat(
                messages=[{"role": "user", "content": request.question}],
                temperature=request.temperature,
            )
            answer = response["content"]
        else:
            # 2. 构建上下文
            context = "\n\n".join([r["content"] for r in results[:request.top_k]])

            # 3. 生成回答
            deepseek = get_deepseek_client()
            system_prompt = f"""你是一位专业的健康顾问，擅长慢病管理和健康咨询。

参考以下健康知识回答用户问题：

{context}

请提供专业、准确、易懂的健康建议。

重要提示：
1. 基于提供的知识回答问题
2. 如果知识中没有相关信息，请诚实告知
3. 不要诊断疾病，只提供健康建议
4. 如果涉及严重症状，建议立即就医
"""

            response = await deepseek.chat(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.question},
                ],
                temperature=request.temperature,
            )
            answer = response["content"]

        # 4. 添加免责声明
        disclaimer = settings.disclaimer_text
        if disclaimer not in answer:
            answer = f"{answer}\n\n{disclaimer}"

        # 5. 构建响应
        search_results = [
            RAGSearchResult(
                id=r["id"],
                score=r["score"],
                content=r["content"],
                metadata=r["metadata"],
            )
            for r in results
        ]

        return RAGQueryResponse(
            answer=answer,
            sources=search_results,
            disclaimer=disclaimer,
        )

    except Exception as e:
        logger.error(f"RAG query failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG query failed: {str(e)}",
        )


@router.get("/stats", response_model=RAGStatsResponse)
async def get_knowledge_base_stats():
    """
    获取知识库统计信息

    返回文档数量、向量维度等信息
    """
    try:
        stats = await rag_service.get_stats()
        return RAGStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Failed to get stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get stats: {str(e)}",
        )


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """
    删除文档

    从知识库中删除指定文档
    """
    try:
        await rag_service.delete_document(doc_id)
        return {"message": f"Document {doc_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}",
        )
