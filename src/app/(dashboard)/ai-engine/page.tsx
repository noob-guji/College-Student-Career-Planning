'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Cpu, Zap, MessageSquare, BarChart3, Settings2,
    CheckCircle2, Clock, AlertTriangle, RefreshCw,
    Send, Bot, ChevronDown, Layers, BookOpen
} from 'lucide-react';
import AIAssistantWidget from '@/features/dashboard-core/components/AIAssistantWidget';

// ============================================================
// 功能8：智脑引擎 — 大模型核心调度管理面板
// 包含：模型状态、Prompt管理、使用统计、多轮对话
// ============================================================

const PROVIDERS = [
    { id: 'mock', name: 'Mock 模式', desc: '本地模拟，无需API Key', status: 'active', latency: '~1.2s', tag: '默认' },
    { id: 'tongyi', name: '通义千问', desc: '阿里云 DashScope API', status: 'configured', latency: '-', tag: 'qwen-plus', env: 'DASHSCOPE_API_KEY' },
    { id: 'wenxin', name: '文心一言', desc: '百度智能云 ERNIE Bot', status: 'unconfigured', latency: '-', tag: 'ERNIE-4.0', env: 'WENXIN_API_KEY' },
    { id: 'chatglm', name: 'ChatGLM', desc: '智谱 AI 开放平台', status: 'unconfigured', latency: '-', tag: 'GLM-4', env: 'ZHIPU_API_KEY' },
    { id: 'xunfei', name: '讯飞星火', desc: '科大讯飞星火认知大模型', status: 'unconfigured', latency: '-', tag: 'Spark v3.5', env: 'XUNFEI_API_KEY' },
];

const PROMPT_TEMPLATES = [
    {
        id: 'report_gen', name: '生涯报告生成', category: 'report',
        desc: '根据能力画像与匹配结果生成完整职业规划报告',
        preview: '你是一名专业的职业规划顾问，请为以下学生生成...',
        variables: ['targetRole', 'matchScore', 'capabilities', 'skills'],
        usageCount: 128,
    },
    {
        id: 'chat_career', name: '职业咨询对话', category: 'chat',
        desc: '多轮对话澄清学生职业发展需求',
        preview: '你是智脑引擎助手，专注于职业规划方向的智能咨询...',
        variables: ['context', 'history'],
        usageCount: 892,
    },
    {
        id: 'polish', name: '报告智能润色', category: 'chat',
        desc: '优化报告各模块的专业表达',
        preview: '请对以下职业规划报告中的"{sectionTitle}"模块进行专业润色...',
        variables: ['sectionTitle', 'content'],
        usageCount: 64,
    },
    {
        id: 'trend_analysis', name: '行业趋势分析', category: 'analysis',
        desc: '基于岗位数据分析行业发展趋势',
        preview: '分析以下岗位数据，输出行业趋势洞察报告...',
        variables: ['role', 'industry', 'data'],
        usageCount: 43,
    },
];

const STATS = [
    { label: '今日调用', value: '1,284', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', delta: '+12%' },
    { label: '平均延迟', value: '1.24s', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', delta: '-8%' },
    { label: '对话轮次', value: '3,891', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50', delta: '+23%' },
    { label: '缓存命中率', value: '67%', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', delta: '+5%' },
];

type TabType = 'overview' | 'prompts' | 'chat' | 'settings';

export default function AIEnginePage() {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [activeProvider, setActiveProvider] = useState('mock');

    const tabs: { id: TabType; label: string; icon: any }[] = [
        { id: 'overview', label: '运行概览', icon: BarChart3 },
        { id: 'prompts', label: 'Prompt 管理', icon: BookOpen },
        { id: 'chat', label: '多轮对话测试', icon: MessageSquare },
        { id: 'settings', label: '模型配置', icon: Settings2 },
    ];

    return (
        <div className="max-w-[1400px] mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Cpu className="w-6 h-6 text-amber-500" /> 智脑引擎
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">大模型核心调度层 · 统一管理 Prompt 与模型接入</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-700">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    引擎运行中 · {PROVIDERS.find(p => p.id === activeProvider)?.name}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {STATS.map((s, i) => {
                            const Icon = s.icon;
                            const isPos = s.delta.startsWith('+');
                            return (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center`}>
                                            <Icon className={`w-4.5 h-4.5 ${s.color}`} />
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPos ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                                            {s.delta}
                                        </span>
                                    </div>
                                    <div className="text-2xl font-black text-slate-900">{s.value}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Provider Status */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">已接入模型</span>
                            <span className="text-xs text-slate-400">支持切换 · 通过环境变量 AI_PROVIDER 配置</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {PROVIDERS.map(p => (
                                <div
                                    key={p.id}
                                    className={`flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors ${activeProvider === p.id ? 'bg-amber-50/60' : ''}`}
                                    onClick={() => setActiveProvider(p.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                            p.status === 'active' ? 'bg-emerald-100' :
                                            p.status === 'configured' ? 'bg-blue-100' : 'bg-slate-100'
                                        }`}>
                                            <Cpu className={`w-4 h-4 ${
                                                p.status === 'active' ? 'text-emerald-600' :
                                                p.status === 'configured' ? 'text-blue-600' : 'text-slate-400'
                                            }`} />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                                {p.name}
                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{p.tag}</span>
                                                {activeProvider === p.id && (
                                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">当前</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500">{p.desc}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400">延迟: {p.latency}</span>
                                        <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                                            p.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                            p.status === 'configured' ? 'bg-blue-100 text-blue-700' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                            {p.status === 'active' ? <><CheckCircle2 className="w-3 h-3" />运行中</> :
                                             p.status === 'configured' ? <><CheckCircle2 className="w-3 h-3" />已配置</> :
                                             <><AlertTriangle className="w-3 h-3" />待配置</>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {activeTab === 'prompts' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">管理系统中所有 Prompt 模板，支持变量注入与版本控制</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PROMPT_TEMPLATES.map(tpl => (
                            <div key={tpl.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                        <span className="font-bold text-slate-900 text-sm">{tpl.name}</span>
                                        <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                            tpl.category === 'report' ? 'bg-amber-100 text-amber-700' :
                                            tpl.category === 'chat' ? 'bg-blue-100 text-blue-700' :
                                            'bg-purple-100 text-purple-700'
                                        }`}>
                                            {tpl.category}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-400 shrink-0">调用 {tpl.usageCount}次</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-3">{tpl.desc}</p>
                                <div className="bg-slate-50 rounded-lg p-2.5 font-mono text-[11px] text-slate-600 mb-3 line-clamp-2">
                                    {tpl.preview}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {tpl.variables.map(v => (
                                        <span key={v} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-mono border border-indigo-100">
                                            {'{' + v + '}'}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {activeTab === 'chat' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[620px] flex flex-col">
                    <p className="text-sm text-slate-500 mb-4">
                        在此测试智脑引擎的多轮对话能力，当前使用：
                        <strong className="text-slate-900 ml-1">{PROVIDERS.find(p => p.id === activeProvider)?.name}</strong>
                    </p>
                    <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <AIAssistantWidget variant="static" />
                    </div>
                </motion.div>
            )}

            {activeTab === 'settings' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-2xl">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                        <strong>配置说明：</strong>在项目根目录的 <code className="bg-amber-100 px-1 rounded">.env</code> 文件中添加对应环境变量，并设置 <code className="bg-amber-100 px-1 rounded">AI_PROVIDER</code> 指定使用的模型。
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-900 text-sm">
                            环境变量配置参考
                        </div>
                        <div className="p-5">
                            <pre className="text-xs bg-[#1e1e2e] text-[#cdd6f4] p-4 rounded-xl overflow-x-auto leading-relaxed font-mono">
{`# 选择模型提供商 (tongyi/wenxin/chatglm/xunfei/openai/mock)
AI_PROVIDER=mock

# 通义千问 (阿里云 DashScope)
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxx
AI_MODEL=qwen-plus

# 文心一言 (百度)
WENXIN_API_KEY=xxxxxxxxxxxx
WENXIN_SECRET_KEY=xxxxxxxxxxxx

# ChatGLM (智谱)
ZHIPU_API_KEY=xxxxxxxxxxxx.xxxxxxxxxxxx
# AI_MODEL=glm-4

# 讯飞星火
XUNFEI_API_KEY=Bearer xxxxxxxxxxxx
# AI_MODEL=generalv3.5

# OpenAI 兼容接口 (DeepSeek等)
OPENAI_API_KEY=sk-xxxxxxxxxxxx
OPENAI_BASE_URL=https://api.deepseek.com/v1
# AI_MODEL=deepseek-chat`}
                            </pre>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <h4 className="font-bold text-slate-900 text-sm mb-3">缓存与优化配置</h4>
                        <div className="space-y-3">
                            {[
                                { label: '响应缓存', desc: '相同请求复用结果，有效期5分钟', value: '已开启' },
                                { label: '历史上下文窗口', desc: '每次请求携带的历史消息条数', value: '最近10条' },
                                { label: '最大 Token 数', desc: '单次回复最大输出长度', value: '2,000 tokens' },
                                { label: '降级策略', desc: '主模型失败时自动切换至 Mock 模式', value: '已开启' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">{item.label}</div>
                                        <div className="text-xs text-slate-500">{item.desc}</div>
                                    </div>
                                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
