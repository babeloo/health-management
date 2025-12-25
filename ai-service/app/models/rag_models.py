"""
RAG 知识库 API 数据模型

定义 RAG 相关 API 的请求和响应模型
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


# ============================================
# RAG 知识库相关模型
# ============================================


class DocumentMetadata(BaseModel):
    """文档元数据模型"""

    title: str = Field(..., description="文档标题")
    category: str = Field(..., description="文档类别")
    source: Optional[str] = Field(None, description="文档来源")
    tags: Optional[List[str]] = Field(default=None, description="标签列表")
    disease_type: Optional[str] = Field(None, description="疾病类型")
    author: Optional[str] = Field(None, description="作者")
    created_at: Optional[str] = Field(None, description="创建时间")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "高血压患者饮食指南",
                "category": "饮食管理",
                "source": "中国高血压防治指南2023",
                "tags": ["高血压", "饮食", "健康管理"],
                "disease_type": "高血压",
            }
        }


class IngestDocumentRequest(BaseModel):
    """导入文档请求模型"""

    content: str = Field(..., min_length=10, max_length=10000, description="文档内容")
    metadata: DocumentMetadata = Field(..., description="文档元数据")
    doc_id: Optional[str] = Field(None, description="文档 ID（可选，不提供则自动生成）")

    class Config:
        json_schema_extra = {
            "example": {
                "content": "高血压患者应注意低盐饮食，每日盐摄入量不超过6克...",
                "metadata": {
                    "title": "高血压饮食指南",
                    "category": "饮食管理",
                    "source": "中国高血压防治指南",
                    "tags": ["高血压", "饮食"],
                },
            }
        }


class IngestDocumentsRequest(BaseModel):
    """批量导入文档请求模型"""

    documents: List[IngestDocumentRequest] = Field(..., description="文档列表")

    @validator("documents")
    def validate_documents_count(cls, v):
        if len(v) > 100:
            raise ValueError("单次最多导入 100 个文档")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "documents": [
                    {
                        "content": "高血压患者应注意低盐饮食...",
                        "metadata": {"title": "高血压饮食指南", "category": "饮食管理"},
                    }
                ]
            }
        }


class IngestDocumentResponse(BaseModel):
    """导入文档响应模型"""

    doc_id: str = Field(..., description="文档 ID")
    chunks_count: int = Field(..., description="分块数量")
    status: str = Field(..., description="状态")
    message: str = Field(..., description="消息")


class IngestDocumentsResponse(BaseModel):
    """批量导入文档响应模型"""

    total: int = Field(..., description="总文档数")
    success: int = Field(..., description="成功导入数")
    failed: int = Field(..., description="失败数")
    failed_docs: List[Dict[str, Any]] = Field(..., description="失败文档列表")


class RAGSearchRequest(BaseModel):
    """RAG 检索请求模型"""

    query: str = Field(..., min_length=1, max_length=500, description="查询文本")
    category: Optional[str] = Field(None, description="类别过滤")
    top_k: Optional[int] = Field(5, ge=1, le=20, description="返回结果数量")
    score_threshold: Optional[float] = Field(0.7, ge=0.0, le=1.0, description="相似度阈值")

    class Config:
        json_schema_extra = {
            "example": {
                "query": "高血压患者应该注意什么？",
                "category": "饮食管理",
                "top_k": 5,
                "score_threshold": 0.7,
            }
        }


class RAGSearchResult(BaseModel):
    """RAG 检索结果模型"""

    id: str = Field(..., description="结果 ID")
    score: float = Field(..., description="相似度分数")
    content: str = Field(..., description="内容")
    metadata: Dict[str, Any] = Field(..., description="元数据")


class RAGSearchResponse(BaseModel):
    """RAG 检索响应模型"""

    results: List[RAGSearchResult] = Field(..., description="检索结果列表")
    total: int = Field(..., description="结果总数")

    class Config:
        json_schema_extra = {
            "example": {
                "results": [
                    {
                        "id": "doc1_0",
                        "score": 0.89,
                        "content": "高血压患者应注意低盐饮食...",
                        "metadata": {"title": "高血压饮食指南", "category": "饮食管理"},
                    }
                ],
                "total": 1,
            }
        }


class RAGQueryRequest(BaseModel):
    """RAG 问答请求模型"""

    query: str = Field(..., min_length=1, max_length=500, description="用户问题")
    category: Optional[str] = Field(None, description="类别过滤")
    top_k: Optional[int] = Field(5, ge=1, le=20, description="检索结果数量")
    include_sources: bool = Field(True, description="是否包含来源信息")

    class Config:
        json_schema_extra = {
            "example": {
                "query": "高血压患者应该怎么控制饮食？",
                "category": "饮食管理",
                "top_k": 5,
                "include_sources": True,
            }
        }


class RAGQueryResponse(BaseModel):
    """RAG 问答响应模型"""

    answer: str = Field(..., description="生成的答案")
    sources: List[RAGSearchResult] = Field(..., description="来源列表")
    has_context: bool = Field(..., description="是否找到相关上下文")
    context_count: int = Field(..., description="上下文数量")

    class Config:
        json_schema_extra = {
            "example": {
                "answer": "高血压患者应该注意低盐饮食，每日盐摄入量不超过6克...\n\n此建议仅供参考，请咨询专业医生。",
                "sources": [
                    {
                        "id": "doc1_0",
                        "score": 0.89,
                        "content": "高血压患者应注意低盐饮食...",
                        "metadata": {"title": "高血压饮食指南"},
                    }
                ],
                "has_context": True,
                "context_count": 5,
            }
        }


class CollectionStatsResponse(BaseModel):
    """知识库统计响应模型"""

    collection_name: str = Field(..., description="Collection 名称")
    total_chunks: int = Field(..., description="总分块数")
    vector_dimension: int = Field(..., description="向量维度")
    distance_metric: str = Field(..., description="距离度量")
    status: str = Field(..., description="状态")

    class Config:
        json_schema_extra = {
            "example": {
                "collection_name": "health_knowledge",
                "total_chunks": 256,
                "vector_dimension": 384,
                "distance_metric": "Cosine",
                "status": "green",
            }
        }


class InitializeCollectionRequest(BaseModel):
    """初始化知识库请求模型"""

    force: bool = Field(False, description="是否强制重建（删除已存在的 collection）")

    class Config:
        json_schema_extra = {"example": {"force": False}}


class InitializeCollectionResponse(BaseModel):
    """初始化知识库响应模型"""

    status: str = Field(..., description="状态")
    message: str = Field(..., description="消息")
    collection_name: str = Field(..., description="Collection 名称")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "message": "知识库初始化成功",
                "collection_name": "health_knowledge",
            }
        }
