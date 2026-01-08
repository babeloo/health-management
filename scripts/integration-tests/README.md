# 集成测试脚本

本目录包含用于测试后端与 AI 服务集成的自动化测试脚本。

## 📋 脚本列表

### 1. ai-integration-test.py

**用途**: Python 集成测试脚本，测试后端与 AI 服务的完整集成流程

**测试覆盖**:

- 用户认证（登录/注册）
- AI 聊天对话
- 多轮对话上下文保持
- 对话历史获取
- 科普文章列表
- AI 服务健康检查

**使用方法**:

```bash
# 确保服务已启动
cd scripts/integration-tests
python ai-integration-test.py
```

**前置条件**:

- 后端服务运行在 `http://localhost:5000`
- AI 服务运行在 `http://localhost:8001`
- Python 3.11+ 已安装
- 安装依赖: `pip install requests`

### 2. ai-integration-test.sh

**用途**: Shell 脚本版本的集成测试，使用 curl 进行测试

**测试覆盖**:

- 用户登录获取 Token
- AI 聊天对话（通过后端代理）
- 获取对话历史
- 科普文章列表
- AI 服务健康检查

**使用方法**:

```bash
# 确保服务已启动
cd scripts/integration-tests
chmod +x ai-integration-test.sh
./ai-integration-test.sh
```

**前置条件**:

- 后端服务运行在 `http://localhost:5000`
- AI 服务运行在 `http://localhost:8001`
- Bash shell 环境
- curl 已安装

## 🔍 测试结果

测试结果会实时输出到控制台，格式为：

- ✅ PASS - 测试通过
- ❌ FAIL - 测试失败
- ⏭️ SKIP - 测试跳过

Python 脚本还会生成详细的 JSON 格式测试报告。

## 📝 相关文档

- **集成测试报告**: `docs/reports/integration-test-report-2026-01-06.md`
- **AI 服务监控指南**: `docs/guides/ai-service-monitoring.md`
- **快速启动脚本**: `scripts/quick-start.sh`

## ⚠️ 注意事项

1. 测试前确保所有必需服务已启动（使用 `scripts/quick-start.sh`）
2. 如果登录失败，脚本会自动尝试注册新用户
3. 测试会创建临时数据（用户、对话等），可在测试后手动清理
4. 确保测试环境的 API Key 配置正确（`ai-service/.env`）
