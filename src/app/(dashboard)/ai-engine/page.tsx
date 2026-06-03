'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu, Zap, MessageSquare, BarChart3, Settings2,
  CheckCircle2, Clock, AlertTriangle, RefreshCw, BookOpen,
} from 'lucide-react';
import AIAssistantWidget from '@/features/dashboard-core/components/AIAssistantWidget';

const PROVIDERS = [
  { id: 'mock',    name: 'Mock 模式',   desc: '本地模拟，无需API Key', status: 'active',        latency: '~1s',  tag: '默认' },
  { id: 'tongyi',  name: '通义千问',    desc: '阿里云 DashScope API',  status: 'configured',    latency: '-',    tag: 'qwen-plus',       env: 'DASHSCOPE_API_KEY' },
  { id: 'wenxin',  name: '文心一言',    desc: '百度智能云 ERNIE Bot',  status: 'unconfigured',  latency: '-',    tag: 'ernie-speed',     env: 'WENXIN_API_KEY' },
  { id: 'chatglm', name: 'ChatGLM',    desc: '智谱 AI 开放平台',      status: 'unconfigured',  latency: '-',    tag: 'GLM-4',           env: 'ZHIPU_API_KEY' },
  { id: 'xunfei',  name: '讯飞星火',   desc: '科大讯飞星火认知大模型', status: 'unconfigured', latency: '-',    tag: 'Spark v3.5',      env: 'XUNFEI_API_KEY' },
];

const PROMPT_TEMPLATES = [
  { id: 'report_gen',  name: '生涯报告生成', category: 'report', desc: '根据能力画像与匹配结果生成完整职业规划报告', variables: ['targetRole','matchScore','capabilities','skills'], usageCount: 0 },
  { id: 'chat_career', name: '职业咨询对话', category: 'chat',   desc: '多轮对话澄清学生职业发展需求',               variables: ['context','history'],                               usageCount: 0 },
  { id: 'polish',      name: '报告智能润色', category: 'chat',   desc: '优化报告各模块的专业表达',                   variables: ['sectionTitle','content'],                          usageCount: 0 },
  { id: 'trend',       name: '行业趋势分析', category: 'analysis',desc: '基于岗位数据分析行业发展趋势',               variables: ['role','industry'],                                 usageCount: 0 },
];

type TabType = 'overview' | 'prompts' | 'chat' | 'settings';

interface Stats {
  todayCalls:   number;
  totalRounds:  number;
  avgLatencyMs: number;
  cacheHitRate: number;
}

export default function AIEnginePage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res  = await fetch('/api/ai/stats');
      const data = await res.json();
      setStats(data);
    } catch { /* keep null */ }
    finally { setStatsLoading(false); }
  };

  useEffect(() => { loadStats(); }, []);

  const provider = (() => {
    // 仅客户端展示，无法直接读 env，展示当前 provider 名称
    return PROVIDERS.find(p => p.status === 'active') ?? PROVIDERS[0];
  })();

  const statCards = [
    { label: '今日调用', value: stats ? stats.todayCalls.toLocaleString() : '…', icon: Zap,            color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: '平均延迟', value: stats ? `${(stats.avgLatencyMs/1000).toFixed(2)}s` : '…', icon: Clock,  color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: '总对话轮次', value: stats ? stats.totalRounds.toLocaleString() : '…', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: '缓存命中率', value: stats ? `${stats.cacheHitRate}%` : '…', icon: CheckCircle2,            color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'overview', label: '运行概览',    icon: BarChart3 },
    { id: 'prompts',  label: 'Prompt 管理', icon: BookOpen },
    { id: 'chat',     label: '多轮对话测试', icon: MessageSquare },
    { id: 'settings', label: '模型配置',    icon: Settings2 },
  ];

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">智脑引擎</h2>
          <p className="text-sm text-slate-500 mt-1">大模型核心调度层 · 统一管理 Prompt 与模型接入</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-700">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          引擎运行中
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 运行概览 */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* 统计卡片 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500">真实数据来自 ChatLog 表</span>
            <button onClick={loadStats} disabled={statsLoading}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-600 transition-colors">
              <RefreshCw className={`w-3 h-3 ${statsLoading ? 'animate-spin' : ''}`} /> 刷新
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {statsLoading ? <span className="animate-pulse text-slate-300">—</span> : s.value}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Provider 状态 */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">已接入模型</span>
              <span className="text-xs text-slate-400">通过 .env 的 AI_PROVIDER 切换</span>
            </div>
            <div className="divide-y divide-slate-50">
              {PROVIDERS.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      p.status==='active' ? 'bg-emerald-100' : p.status==='configured' ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      <Cpu className={`w-4 h-4 ${
                        p.status==='active' ? 'text-emerald-600' : p.status==='configured' ? 'text-blue-600' : 'text-slate-400'
                      }`} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                        {p.name}
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{p.tag}</span>
                      </div>
                      <div className="text-xs text-slate-500">{p.desc}</div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    p.status==='active' ? 'bg-emerald-100 text-emerald-700' : p.status==='configured' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {p.status==='active' ? <><CheckCircle2 className="w-3 h-3" />运行中</> :
                     p.status==='configured' ? <><CheckCircle2 className="w-3 h-3" />已配置</> :
                     <><AlertTriangle className="w-3 h-3" />待配置</>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Prompt 管理 */}
      {activeTab === 'prompts' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROMPT_TEMPLATES.map(tpl => (
            <div key={tpl.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-bold text-slate-900 text-sm">{tpl.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  tpl.category==='report' ? 'bg-amber-100 text-amber-700' :
                  tpl.category==='chat'   ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>{tpl.category}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{tpl.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {tpl.variables.map(v => (
                  <span key={v} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-mono border border-indigo-100">
                    {'{' + v + '}'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── 多轮对话测试 */}
      {activeTab === 'chat' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[620px] flex flex-col">
          <p className="text-sm text-slate-500 mb-4">在此测试智脑引擎的多轮对话能力</p>
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <AIAssistantWidget variant="static" />
          </div>
        </motion.div>
      )}

      {/* ── 模型配置 */}
      {activeTab === 'settings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-2xl">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            在 <code className="bg-amber-100 px-1 rounded">.env</code> 中设置{' '}
            <code className="bg-amber-100 px-1 rounded">AI_PROVIDER</code> 切换模型，修改后重启生效。
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-50 border-b font-bold text-slate-900 text-sm">环境变量配置参考</div>
            <div className="p-5">
              <pre className="text-xs bg-[#1e1e2e] text-[#cdd6f4] p-4 rounded-xl overflow-x-auto leading-relaxed font-mono whitespace-pre">{`# 选择模型提供商
AI_PROVIDER=tongyi   # tongyi/wenxin/chatglm/xunfei/openai/mock

# 通义千问（当前推荐）
DASHSCOPE_API_KEY=sk-xxxx
AI_MODEL=qwen-plus

# 文心一言
# AI_PROVIDER=wenxin
# WENXIN_API_KEY=xxxx
# WENXIN_SECRET_KEY=xxxx
# AI_MODEL=ernie-speed   # 免费版

# ChatGLM
# AI_PROVIDER=chatglm
# ZHIPU_API_KEY=xxxx.xxxx
# AI_MODEL=glm-4

# DeepSeek（极低价）
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-xxxx
# OPENAI_BASE_URL=https://api.deepseek.com/v1
# AI_MODEL=deepseek-chat`}</pre>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="font-bold text-slate-900 text-sm mb-3">运行参数</h4>
            <div className="space-y-2">
              {[
                ['响应缓存',      '相同请求复用结果，有效期5分钟', '已开启'],
                ['上下文窗口',    '每次请求携带的历史消息条数',    '最近10条'],
                ['最大 Token',   '单次回复最大输出长度',          '2,000 tokens'],
                ['失败降级',      '主模型失败时自动切换至 Mock',   '已开启'],
              ].map(([l,d,v]) => (
                <div key={l} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{l}</div>
                    <div className="text-xs text-slate-500">{d}</div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
