import { useState, useCallback, useRef } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  latencyMs?: number;
}

interface UseAIAssistantOptions {
  systemContext?: string;
  sessionId?: string;
  userId?: string;
}

// ============================================================
// 功能8：智脑引擎 — 多轮对话 Hook
// 对接 /api/ai/chat 统一调度层，支持上下文、会话管理
// ============================================================

export function useAIAssistant(options: UseAIAssistantOptions = {}) {
  const { systemContext, userId } = options;

  const sessionId = useRef(
    options.sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
  ).current;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: '你好！我是**智脑引擎**助手，专注于职业规划智能咨询。\n\n我可以帮你：\n• 分析岗位匹配度与能力差距\n• 制定个性化职业发展计划\n• 解读行业趋势与薪资行情\n• 优化你的职业生涯报告\n\n有什么想聊的，直接告诉我吧 🚀',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // 清空对话
  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: '对话已重置。有什么需要帮助的吗？',
      },
    ]);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      { id: aiMessageId, role: 'assistant', content: '', isTyping: true },
    ]);

    try {
      // 构建历史消息 (最多保留最近 10 条，避免 token 溢出)
      const historyMessages = [...messages, userMessage]
        .filter(m => !m.isTyping)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyMessages,
          sessionId,
          userId,
          context: systemContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // 打字机效果
      const fullText: string = data.content;
      const latency: number = data.latencyMs;

      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, content: '', isTyping: false }
            : msg
        )
      );

      // 逐字输出
      let i = 0;
      const interval = setInterval(() => {
        i += 3; // 每次输出3个字符，加快速度
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMessageId
              ? { ...msg, content: fullText.slice(0, i), latencyMs: latency }
              : msg
          )
        );
        if (i >= fullText.length) {
          clearInterval(interval);
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: fullText, latencyMs: latency }
                : msg
            )
          );
        }
      }, 20);
    } catch (error: any) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content: `⚠️ 抱歉，出现了一个错误：${error.message || '请稍后重试'}`,
                isTyping: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, sessionId, userId, systemContext]);

  return { messages, sendMessage, isLoading, clearMessages, sessionId };
}
