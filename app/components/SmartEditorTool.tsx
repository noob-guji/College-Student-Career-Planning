'use client';

import { Sparkles, FileCheck, Edit3, Download, Minimize2, Maximize2 } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

export default function SmartEditorTool() {
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);

    const triggerAction = (actionName: string) => {
        setActiveAction(actionName);
        // Simulate an async AI action
        setTimeout(() => {
            setActiveAction(null);
        }, 1500);
    };

    const tools = [
        { id: 'polish', icon: Sparkles, label: '智能润色', color: 'text-indigo-600', bg: 'hover:bg-indigo-50' },
        { id: 'check', icon: FileCheck, label: '完整性检查', color: 'text-emerald-600', bg: 'hover:bg-emerald-50' },
        { id: 'edit', icon: Edit3, label: '手动编辑', color: 'text-blue-600', bg: 'hover:bg-blue-50' },
        { id: 'export', icon: Download, label: '一键导出', color: 'text-slate-700', bg: 'hover:bg-slate-100' },
    ];

    return (
        <div className="fixed right-6 top-24 z-50 flex flex-col items-end gap-2">
            <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-8 h-8 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
            >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>

            <div
                className={clsx(
                    "bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden transition-all duration-300 origin-top-right",
                    isMinimized ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
                )}
            >
                <div className="p-3 bg-slate-50 border-b border-slate-100 font-medium text-xs text-slate-500 uppercase tracking-widest">
                    AI 助手菜单
                </div>
                <div className="flex flex-col w-48 p-2">
                    {tools.map((tool) => {
                        const Icon = tool.icon;
                        const isActing = activeAction === tool.id;
                        return (
                            <button
                                key={tool.id}
                                onClick={() => triggerAction(tool.id)}
                                disabled={activeAction !== null}
                                className={clsx(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                                    tool.bg,
                                    isActing ? "animate-pulse" : "",
                                    activeAction !== null && !isActing ? "opacity-50 cursor-not-allowed" : ""
                                )}
                            >
                                <Icon className={clsx("w-4 h-4", tool.color)} />
                                <span className="font-medium text-slate-700">
                                    {isActing ? `${tool.label}中...` : tool.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
