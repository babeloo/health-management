# AI Service

智慧慢病管理系统 - AI 服务模块

## 功能

- 🤖 RAG 知识库检索
- 💬 AI 对话服务
- 🏥 辅助诊断建议
- 📊 健康数据分析

## 技术栈

- **框架**: FastAPI
- **LLM**: DeepSeek API
- **向量数据库**: Qdrant
- **RAG 框架**: LangChain + LlamaIndex

## 开发

```bash
# 安装依赖
uv pip install -r requirements.txt

# 运行开发服务器
uvicorn app.main:app --reload --port 8000

# 运行测试
pytest

# 代码检查
black .
flake8 .
mypy .
```

## API 文档

启动服务后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 环境变量

创建 `.env` 文件：

```env
# DeepSeek API
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_BASE=https://api.deepseek.com/v1

# Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=health_knowledge

# 应用配置
LOG_LEVEL=INFO
```

## 状态

🚧 **开发中** - 基础框架已搭建，核心功能待实现
