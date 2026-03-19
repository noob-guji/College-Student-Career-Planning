import { useState, useCallback } from 'react';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isTyping?: boolean;
}

export function useAIAssistant() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome-1',
            role: 'assistant',
            content: '你好！我是智脑引擎导师，很高兴为你提供职业规划服务。有什么关于职业发展、岗位要求或者能力提升的问题想咨询我吗？'
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return;

        const userMessage: Message = { id: Date.now().toString(), role: 'user', content };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        const aiMessageId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: aiMessageId, role: 'assistant', content: '', isTyping: true }]);

        try {
            // TODO: 预留接口调用逻辑 (API hooking logic reserved here)
            // 例如接入文心一言或通义千问：
            // const res = await fetch('/api/chat', { 
            //    method: 'POST', 
            //    body: JSON.stringify({ messages: [...messages, userMessage] }) 
            // });
            // const data = await res.json();

            // 模拟大模型响应延迟和流式打字效果体验
            await new Promise(resolve => setTimeout(resolve, 1500));
            const mockResponse = '这是一个模拟的回复。在实际接入文心一言或通义千问等大模型服务时，这里会被替换为真实的流式或阻塞接口返回内容，进一步帮助你进行需求澄清和职业分析。';

            setMessages(prev => prev.map(msg =>
                msg.id === aiMessageId ? { ...msg, content: mockResponse, isTyping: false } : msg
            ));
        } catch (error) {
            setMessages(prev => prev.map(msg =>
                msg.id === aiMessageId ? { ...msg, content: '抱歉，系统出现异常，请稍后再试。', isTyping: false } : msg
            ));
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    return { messages, sendMessage, isLoading };
}
