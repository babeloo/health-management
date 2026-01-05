"""
DeepSeek AI Chat Service
"""

from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from app.config import settings
from app.models import ChatMessage
from app.services.rag_service import rag_service


class AIService:
    """AI对话服务"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
            timeout=settings.deepseek_timeout,
            max_retries=settings.deepseek_max_retries,
        )
        self.model = settings.deepseek_model
        self.disclaimer = settings.disclaimer_text

    async def get_embedding(self, text: str) -> List[float]:
        """获取文本向量"""
        response = await self.client.embeddings.create(
            model="text-embedding-ada-002",
            input=text,
        )
        return response.data[0].embedding

    async def chat(
        self,
        messages: List[ChatMessage],
        use_rag: bool = True,
        temperature: float = 0.7,
    ) -> tuple[str, Optional[List[Dict[str, Any]]]]:
        """
        AI对话

        Args:
            messages: 对话历史
            use_rag: 是否使用RAG检索
            temperature: 温度参数

        Returns:
            (AI回复, RAG检索来源)
        """
        sources = None

        # RAG检索增强
        if use_rag and messages:
            last_message = messages[-1].content
            try:
                # 获取查询向量
                query_vector = await self.get_embedding(last_message)

                # 检索相关知识
                sources = await rag_service.search(query_vector)

                # 将检索结果添加到上下文
                if sources:
                    context = "\n\n".join([s["content"] for s in sources[:3]])
                    system_message = ChatMessage(
                        role="system",
                        content=f"参考以下健康知识回答用户问题：\n\n{context}\n\n注意：必须在回答末尾添加免责声明。",
                    )
                    messages = [system_message] + messages
            except Exception as e:
                print(f"RAG检索失败: {e}")

        # 调用DeepSeek API
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=temperature,
        )

        reply = response.choices[0].message.content

        # 强制添加免责声明
        if self.disclaimer not in reply:
            reply = f"{reply}\n\n{self.disclaimer}"

        return reply, sources

    async def chat_stream(
        self,
        messages: List[ChatMessage],
        use_rag: bool = True,
    ):
        """流式对话（暂不实现）"""
        pass


# 全局实例
ai_service = AIService()
