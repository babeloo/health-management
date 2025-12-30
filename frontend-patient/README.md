# 患者端 AI 健康科普 - README

## 项目简介

智慧慢病管理系统患者端 - AI 健康科普模块，基于 Uni-app + Vue 3 + TypeScript 开发，支持微信小程序和 H5。

## 功能特性

### 1. AI 健康问答
- 实时对话界面
- 智能回复（集成 DeepSeek 大模型）
- 对话历史记录
- 免责声明自动添加

### 2. 健康科普
- 文章分类浏览（慢病知识、用药指导、饮食建议）
- 文章详情查看
- 收藏和分享功能
- 分页加载

## 技术栈

- **框架**: Uni-app 3.x
- **UI 框架**: Vue 3 (Composition API)
- **状态管理**: Pinia
- **语言**: TypeScript
- **构建工具**: Vite

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发环境

```bash
# 微信小程序
pnpm dev:mp-weixin

# H5
pnpm dev:h5
```

### 生产构建

```bash
# 微信小程序
pnpm build:mp-weixin

# H5
pnpm build:h5
```

## 项目结构

```
src/
├── pages/              # 页面
│   ├── index/         # 首页
│   ├── ai-chat/       # AI 问答
│   └── education/     # 健康科普
├── api/               # API 接口
├── stores/            # Pinia 状态管理
├── types/             # TypeScript 类型
├── utils/             # 工具函数
├── App.vue            # 根组件
├── main.ts            # 入口文件
├── pages.json         # 页面配置
└── manifest.json      # 应用配置
```

## API 接口

### AI 问答

```typescript
POST /api/v1/ai/chat
{
  "message": "我血压高怎么办？",
  "conversationId": "optional"
}
```

### 科普文章

```typescript
GET /api/v1/education/articles?category=chronic-disease&page=1&limit=10
GET /api/v1/education/articles/:id
POST /api/v1/education/articles/:id/favorite
DELETE /api/v1/education/articles/:id/favorite
```

## 配置说明

### 后端地址配置

修改 `src/utils/request.ts`:

```typescript
const BASE_URL = 'http://localhost:3001/api/v1';
```

### 微信小程序配置

修改 `src/manifest.json` 中的 `appid`。

## 注意事项

1. **跨平台兼容**: 使用 Uni-app 官方组件确保兼容性
2. **响应式设计**: 使用 rpx 单位适配不同屏幕
3. **安全性**: JWT Token 存储在本地，注意安全
4. **性能优化**: 对话历史本地缓存，文章列表分页加载

## 待完成功能

- [ ] Markdown 渲染（需集成 mp-html）
- [ ] 流式响应（AI 回复逐字显示）
- [ ] 语音输入
- [ ] 图片预览
- [ ] 个性化推荐

## 相关文档

- [Uni-app 官方文档](https://uniapp.dcloud.net.cn)
- [Vue 3 文档](https://cn.vuejs.org)
- [Pinia 文档](https://pinia.vuejs.org/zh)

## License

MIT
