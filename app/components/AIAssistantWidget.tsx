'use client';

import { useState, useRef, useEffect } from 'react';
import { useAIAssistant } from '@/app/hooks/useAIAssistant';
import { Bot, Send, User, ChevronDown, MessageSquareMore } from 'lucide-react';

export default function AIAssistantWidget({ variant = 'floating' }: { variant?: 'floating' | 'static' }) {
    const [isOpen, setIsOpen] = useState(false);
    const { messages, sendMessage, isLoading } = useAIAssistant();
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = () => {
        if (inputValue.trim()) {
            sendMessage(inputValue);
            setInputValue('');
        }
    };

    useEffect(() => {
        if (variant === 'static') {
            setIsOpen(true);
        }
    }, [variant]);

    return (
        <div className={variant === 'floating' ? "fixed bottom-6 right-6 z-50 flex flex-col items-end" : "w-full h-full flex flex-col"}>
            {isOpen && (
                <div className={variant === 'floating' 
                    ? "w-[380px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 mb-4 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right"
                    : "w-full h-full bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm"}>
                    {/* Header */}
                    <div className="bg-[#111827] p-4 flex justify-between items-center text-white shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-lg shadow-inner">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm tracking-wide">智脑引擎助手</h3>
                                <p className="text-xs text-indigo-100 flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_4px_rgba(74,222,128,0.8)] animate-pulse"></span>
                                    在线咨询
                                </p>
                            </div>
                        </div>
                        {variant === 'floating' && (
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                                aria-label="最小化聊天窗口"
                            >
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-4 overflow-y-auto bg-slate-50/80 space-y-5">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-[#F2F2F2] text-[#F59E0B]' : 'bg-[#111827] text-[#F59E0B]'
                                        }`}>
                                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>

                                    {/* Bubble */}
                                    <div className={`p-3.5 rounded-2xl text-[14px] leading-relaxed relative ${msg.role === 'user'
                                        ? 'bg-[#111827] text-white rounded-tr-sm shadow-md'
                                        : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-sm'
                                        }`}>
                                        {msg.isTyping ? (
                                            <div className="flex gap-1.5 items-center h-5 px-1 py-0.5">
                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-[bounce_1s_infinite_0ms]"></span>
                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-[bounce_1s_infinite_150ms]"></span>
                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-[bounce_1s_infinite_300ms]"></span>
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap word-break-words">{msg.content}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} className="h-2" />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-slate-100 shrink-0 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)] z-10">
                        <div className="flex items-end gap-2 bg-slate-50 rounded-xl border border-slate-200 p-1 focus-within:border-[#F59E0B] focus-within:ring-4 focus-within:ring-[#F59E0B]/20 transition-all duration-200">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="发送消息深入澄清需求..."
                                className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none text-sm p-2.5 text-slate-700 placeholder:text-slate-400"
                                rows={1}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isLoading}
                                className="h-[36px] w-[36px] mb-1 mr-1 bg-[#111827] hover:bg-[#1a2333] active:bg-black text-[#F59E0B] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center shadow-sm"
                                aria-label="发送消息"
                            >
                                <Send className="w-4 h-4 ml-0.5" />
                            </button>
                        </div>
                        <div className="flex justify-between items-center mt-2 px-1 text-[10px] text-slate-400 font-medium">
                            <span>Shift + Enter 换行，Enter 发送</span>
                            <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> 智脑引擎强力驱动</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && variant === 'floating' && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="group flex items-center justify-center w-14 h-14 bg-[#111827] hover:bg-[#1a2333] active:bg-black text-[#F59E0B] rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 z-50 focus:outline-none focus:ring-4 focus:ring-[#F59E0B]/30"
                    aria-label="打开智脑引擎助手"
                >
                    <MessageSquareMore className="w-6 h-6 group-hover:animate-pulse" />

                    {/* Notification badge mock */}
                    <span className="absolute top-0 right-0 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                    </span>
                </button>
            )}
        </div>
    );
}
