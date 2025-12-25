# RAG 知识库功能使用指南

## 概述

本文档介绍 AI 服务中 RAG（检索增强生成）知识库功能的使用方法。

## 功能特性

- **文档向量化**: 使用 Sentence Transformers 将文档转换为向量
- **语义检索**: 基于 Qdrant 向量数据库的高效相似度检索
- **智能问答**: 结合检索结果和 DeepSeek 大模型生成准确回答
- **文档管理**: 支持单个和批量文档导入、分类管理
- **免责声明**: 所有 AI 生成的答案自动包含"此建议仅供参考，请咨询专业医生"

## 技术栈

- **向量数据库**: Qdrant 1.16.2
- **Embedding 模型**: Sentence Transformers (paraphrase-multilingual-MiniLM-L12-v2, 384维)
- **文本分块**: LangChain Text Splitters (chunk_size=1000, overlap=200)
- **大模型**: DeepSeek API (通过 OpenAI SDK)

## API 端点

### 1. 初始化知识库

**POST** `/api/v1/rag/initialize`

初始化 Qdrant collection，首次使用前必须调用。

**请求体**:
```json
{
  "force": false  // 是否强制重建（删除已存在的 collection）
}
```

**响应**:
```json
{
  "status": "success",
  "message": "知识库初始化成功",
  "collection_name": "health_knowledge"
}
```

**示例**:
```bash
curl -X POST "http://localhost:8000/api/v1/rag/initialize" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'
```

### 2. 导入单个文档

**POST** `/api/v1/rag/ingest`

将单个健康知识文档导入向量库。

**请求体**:
```json
{
  "content": "高血压患者应注意低盐饮食，每日盐摄入量不超过6克...",
  "metadata": {
    "title": "高血压饮食指南",
    "category": "饮食管理",
    "source": "中国高血压防治指南2023",
    "tags": ["高血压", "饮食"],
    "disease_type": "高血压"
  },
  "doc_id": "optional-custom-id"  // 可选
}
```

**响应**:
```json
{
  "doc_id": "abc123def456",
  "chunks_count": 5,
  "status": "success",
  "message": "成功导入文档，共 5 个分块"
}
```

### 3. 批量导入文档

**POST** `/api/v1/rag/ingest/batch`

批量导入多个文档（最多100个）。

**请求体**:
```json
{
  "documents": [
    {
      "content": "文档内容1...",
      "metadata": {
        "title": "文档1",
        "category": "饮食管理"
      }
    },
    {
      "content": "文档内容2...",
      "metadata": {
        "title": "文档2",
        "category": "运动管理"
      }
    }
  ]
}
```

**响应**:
```json
{
  "total": 2,
  "success": 2,
  "failed": 0,
  "failed_docs": []
}
```

### 4. 语义检索

**POST** `/api/v1/rag/search`

在知识库中检索与查询文本相关的内容。

**请求体**:
```json
{
  "query": "高血压患者应该注意什么？",
  "category": "饮食管理",  // 可选，按类别过滤
  "top_k": 5,  // 可选，返回结果数量（1-20）
  "score_threshold": 0.7  // 可选，相似度阈值（0.0-1.0）
}
```

**响应**:
```json
{
  "results": [
    {
      "id": "doc1_0",
      "score": 0.89,
      "content": "高血压患者应注意低盐饮食...",
      "metadata": {
        "title": "高血压饮食指南",
        "category": "饮食管理",
        "doc_id": "doc1",
        "chunk_index": 0
      }
    }
  ],
  "total": 1
}
```

### 5. RAG 问答

**POST** `/api/v1/rag/query`

基于知识库检索和大模型生成回答用户问题。

**请求体**:
```json
{
  "query": "高血压患者应该怎么控制饮食？",
  "category": null,  // 可选，按类别过滤
  "top_k": 5,  // 可选，检索结果数量
  "include_sources": true  // 可选，是否包含来源信息
}
```

**响应**:
```json
{
  "answer": "高血压患者应该注意低盐饮食，每日盐摄入量不超过6克。同时要增加钾的摄入，多吃富含钾的食物如香蕉、橙子、土豆等。低脂饮食也很重要，减少动物脂肪摄入...\n\n此建议仅供参考，请咨询专业医生。",
  "sources": [
    {
      "id": "doc1_0",
      "score": 0.89,
      "content": "高血压患者应注意低盐饮食...",
      "metadata": {
        "title": "高血压饮食指南",
        "category": "饮食管理"
      }
    }
  ],
  "has_context": true,
  "context_count": 5
}
```

### 6. 获取知识库统计

**GET** `/api/v1/rag/collections/stats`

获取知识库的统计信息。

**响应**:
```json
{
  "collection_name": "health_knowledge",
  "total_chunks": 256,
  "vector_dimension": 384,
  "distance_metric": "Cosine",
  "status": "green"
}
```

### 7. 健康检查

**GET** `/api/v1/rag/health`

检查 RAG 服务是否正常运行。

**响应**:
```json
{
  "status": "healthy",
  "qdrant_connected": true,
  "collections_count": 1,
  "embedding_dimension": 384,
  "collection_name": "health_knowledge"
}
```

## Python SDK 使用示例

### 初始化服务

```python
from app.services.rag_service import get_rag_service

rag_service = get_rag_service()

# 初始化 collection
rag_service.initialize_collection(force=False)
```

### 导入文档

```python
# 单个文档
result = rag_service.ingest_document(
    content="高血压患者应注意低盐饮食...",
    metadata={
        "title": "高血压饮食指南",
        "category": "饮食管理",
        "source": "中国高血压防治指南",
        "tags": ["高血压", "饮食"]
    }
)
print(f"导入成功，文档ID: {result['doc_id']}, 分块数: {result['chunks_count']}")

# 批量导入
documents = [
    {
        "content": "文档内容1...",
        "metadata": {"title": "文档1", "category": "饮食管理"}
    },
    {
        "content": "文档内容2...",
        "metadata": {"title": "文档2", "category": "运动管理"}
    }
]
result = rag_service.ingest_documents(documents=documents)
print(f"成功: {result['success']}, 失败: {result['failed']}")
```

### 语义检索

```python
results = rag_service.search(
    query="高血压饮食注意事项",
    category="饮食管理",  # 可选
    top_k=5,
    score_threshold=0.7
)

for result in results:
    print(f"分数: {result['score']:.3f}")
    print(f"标题: {result['metadata']['title']}")
    print(f"内容: {result['content'][:100]}...\n")
```

### RAG 问答

```python
result = rag_service.generate_answer(
    query="高血压患者应该怎么控制饮食？",
    category="饮食管理",  # 可选
    top_k=5
)

print(f"回答: {result['answer']}\n")
print(f"使用了 {result['context_count']} 个参考来源")
print(f"是否找到相关上下文: {result['has_context']}")

if result['sources']:
    print("\n参考来源:")
    for idx, source in enumerate(result['sources']):
        print(f"  [{idx + 1}] {source['metadata']['title']} (分数: {source['score']:.3f})")
```

### 获取统计信息

```python
stats = rag_service.get_collection_stats()
print(f"Collection: {stats['collection_name']}")
print(f"总分块数: {stats['total_chunks']}")
print(f"向量维度: {stats['vector_dimension']}")
```

## 数据导入脚本

使用提供的脚本导入初始健康知识库数据:

```bash
cd ai-service
python scripts/import_knowledge.py
```

该脚本将:
1. 初始化 Qdrant collection（强制重建）
2. 导入 `docs/health_knowledge_data.py` 中的所有文档
3. 测试检索功能
4. 测试 RAG 问答功能
5. 输出统计信息和测试结果

## 配置参数

在 `.env` 文件中配置以下参数:

```env
# Qdrant 配置
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=health_knowledge

# RAG 配置
RAG_CHUNK_SIZE=1000  # 文档分块大小
RAG_CHUNK_OVERLAP=200  # 分块重叠大小
RAG_TOP_K=5  # 检索返回的 top-k 结果
RAG_SIMILARITY_THRESHOLD=0.7  # 相似度阈值

# Embedding 配置
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
EMBEDDING_DIMENSION=384

# DeepSeek API 配置
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_API_BASE=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

## 测试

运行 RAG 功能的单元测试:

```bash
# 运行所有测试
pytest tests/test_rag.py -v

# 运行测试并查看覆盖率
pytest tests/test_rag.py --cov=app.services.rag_service --cov=app.services.embedding_service --cov=app.services.qdrant_service --cov-report=html

# 查看覆盖率报告
open htmlcov/index.html  # macOS
start htmlcov/index.html  # Windows
```

## 性能优化建议

1. **批量导入**: 使用批量导入接口而非逐个导入，提高效率
2. **文档分块**: 根据内容类型调整 `RAG_CHUNK_SIZE` 和 `RAG_CHUNK_OVERLAP`
3. **相似度阈值**: 根据实际效果调整 `RAG_SIMILARITY_THRESHOLD`，过低会返回不相关结果，过高可能错过相关内容
4. **Top-K 参数**: 增加 `RAG_TOP_K` 可能提高召回率，但会增加生成时间和 token 消耗
5. **缓存策略**: 对高频查询可以考虑缓存结果

## 常见问题

### 1. Qdrant 连接失败

**问题**: `RuntimeError: 无法连接 Qdrant 服务器`

**解决**:
- 确保 Qdrant 服务已启动：`docker-compose up -d qdrant`
- 检查配置：`QDRANT_HOST` 和 `QDRANT_PORT`
- 检查防火墙设置

### 2. Embedding 模型加载慢

**问题**: 首次调用时 Sentence Transformers 模型加载需要较长时间

**解决**:
- 模型首次使用时会自动下载，需要网络连接
- 下载后会缓存在 `~/.cache/torch/sentence_transformers/`
- 可以预先下载模型：
  ```python
  from sentence_transformers import SentenceTransformer
  model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
  ```

### 3. 检索结果不准确

**问题**: 返回的检索结果不相关

**解决**:
- 降低 `score_threshold`，例如从 0.7 降至 0.6
- 增加 `top_k`，例如从 5 增加到 10
- 检查文档质量和分类是否正确
- 使用 `category` 参数进行分类过滤

### 4. RAG 答案不包含免责声明

**问题**: 生成的答案缺少"此建议仅供参考"

**解决**:
- RAG 服务会自动检查并添加免责声明
- 如果 DeepSeek 返回的内容已包含，不会重复添加
- 检查 `app/services/rag_service.py` 中的 `generate_answer` 方法

## 最佳实践

1. **文档质量**: 确保导入的文档内容准确、格式规范、分类明确
2. **元数据丰富**: 提供完整的 metadata（标题、类别、来源、标签等）方便检索和过滤
3. **定期更新**: 医疗知识更新时及时更新知识库
4. **监控指标**: 关注检索相似度分数、RAG 答案质量、用户反馈
5. **用户反馈**: 收集用户对 RAG 答案的反馈，持续优化

## 相关文档

- [API 文档](http://localhost:8000/docs) - FastAPI 自动生成的交互式 API 文档
- [Qdrant 文档](https://qdrant.tech/documentation/)
- [Sentence Transformers 文档](https://www.sbert.net/)
- [DeepSeek API 文档](https://platform.deepseek.com/docs)
