"""
RAG 数据模型

定义 RAG 相关的请求和响应模型
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class IngestDocumentRequest(BaseModel):
    """文档导入请求"""

    content: str = Field(..., description="文档内容")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="文档元数据")


class IngestDocumentResponse(BaseModel):
    """文档导入响应"""

    doc_id: str = Field(..., description="文档 ID")
    message: str = Field(default="Document ingested successfully")


class BatchIngestRequest(BaseModel):
    """批量文档导入请求"""

    documents: List[IngestDocumentRequest] = Field(..., description="文档列表")
    batch_size: int = Field(default=100, description="批量处理大小")


class BatchIngestResponse(BaseModel):
    """批量文档导入响应"""

    doc_ids: List[str] = Field(..., description="文档 ID 列表")
    count: int = Field(..., description="成功导入的文档数量")
    message: str = Field(default="Documents ingested successfully")


class RAGSearchRequest(BaseModel):
    """语义检索请求"""

    query: str = Field(..., description="查询文本")
    top_k: Optional[int] = Field(default=5, description="返回结果数量")
    score_threshold: Optional[float] = Field(default=0.7, description="相似度阈值")


class RAGSearchResult(BaseModel):
    """检索结果"""

    id: str = Field(..., description="文档 ID")
    score: float = Field(..., description="相似度分数")
    content: str = Field(..., description="文档内容")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="文档元数据")


class RAGSearchResponse(BaseModel):
    """语义检索响应"""

    results: List[RAGSearchResult] = Field(..., description="检索结果列表")
    count: int = Field(..., description="结果数量")


class RAGQueryRequest(BaseModel):
    """RAG 问答请求"""

    question: str = Field(..., description="用户问题")
    top_k: Optional[int] = Field(default=3, description="检索文档数量")
    temperature: Optional[float] = Field(default=0.7, description="生成温度")


class RAGQueryResponse(BaseModel):
    """RAG 问答响应"""

    answer: str = Field(..., description="AI 回答")
    sources: List[RAGSearchResult] = Field(..., description="参考来源")
    disclaimer: str = Field(..., description="免责声明")


class RAGStatsResponse(BaseModel):
    """知识库统计响应"""

    collection_name: str = Field(..., description="Collection 名称")
    documents_count: int = Field(..., description="文档数量")
    vectors_count: int = Field(..., description="向量数量")
    vector_size: int = Field(..., description="向量维度")
    distance_metric: str = Field(..., description="距离度量")
    status: str = Field(..., description="状态")


class InitializeRequest(BaseModel):
    """初始化请求"""

    force: bool = Field(default=False, description="是否强制重建")


class InitializeResponse(BaseModel):
    """初始化响应"""

    message: str = Field(default="Knowledge base initialized successfully")
    collection_name: str = Field(..., description="Collection 名称")
