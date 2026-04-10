'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Search, BookOpen, TrendingUp, Users,
  Layers, FileText, Tag, RefreshCw, ChevronRight,
  ArrowRight, AlertCircle
} from 'lucide-react';

// ─────────────────────────────────────────────
// 分类配置
// ─────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',          label: '全部',         icon: Database,   color: 'text-slate-600',   bg: 'bg-slate-50'   },
  { id: 'job_profile',  label: '岗位画像知识库', icon: Users,      color: 'text-amber-600',   bg: 'bg-amber-50'   },
  { id: 'lateral_path', label: '转岗路径知识库', icon: TrendingUp, color: 'text-blue-600',    bg: 'bg-blue-50'    },
];

// ─────────────────────────────────────────────
// 条目卡片
// ─────────────────────────────────────────────
function EntryCard({ entry, onView }: { entry: any; onView: (e: any) => void }) {
  const cat = CATEGORIES.find(c => c.id === entry.category);
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={() => onView(entry)}
      className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-amber-600 transition-colors">
          {entry.title}
        </h4>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${cat?.bg} ${cat?.color}`}>
          {cat?.label?.replace('知识库', '')}
        </span>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{entry.content}</p>

      {/* 晋升阶梯预览 */}
      {entry.ladder && (
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {entry.ladder.slice(0, 4).map((l: string, i: number, arr: string[]) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded">
                {l}
              </span>
              {i < arr.length - 1 && <ChevronRight className="w-2.5 h-2.5 text-slate-300" />}
            </span>
          ))}
          {entry.ladder.length > 4 && (
            <span className="text-[10px] text-slate-400">+{entry.ladder.length - 4}级</span>
          )}
        </div>
      )}

      {/* 转岗路径预览 */}
      {entry.paths && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {entry.paths.map((p: any, i: number) => {
            const diffCls = p.difficulty === '低' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : p.difficulty === '高' ? 'bg-red-50 text-red-700 border-red-100'
              : 'bg-amber-50 text-amber-700 border-amber-100';
            return (
              <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${diffCls}`}>
                <ArrowRight className="w-2.5 h-2.5 inline mr-0.5" />
                {p.target}
                <span className="ml-1 opacity-70">{Math.round(p.similarity * 100)}%</span>
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {entry.tags.slice(0, 3).map((tag: string) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <RefreshCw className="w-2.5 h-2.5" />
          {entry.updatedAt}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// 详情弹窗
// ─────────────────────────────────────────────
function DetailModal({ entry, onClose }: { entry: any; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-slate-900 text-base">{entry.title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl shrink-0">×</button>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
            <span className="bg-slate-100 px-2 py-0.5 rounded-full">{entry.source}</span>
            <span>更新于 {entry.updatedAt}</span>
            {entry.dataFlag && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">数据驱动</span>}
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-700 leading-relaxed">{entry.content}</p>

          {/* 完整晋升阶梯 */}
          {entry.ladder && (
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">完整晋升阶梯（{entry.levelCount} 级）</p>
              <div className="flex flex-col gap-2">
                {entry.ladder.map((l: string, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <span className={`text-sm ${i === entry.ladder.length - 1 ? 'font-bold text-amber-700' : 'text-slate-700'}`}>
                      {l}
                    </span>
                    {i === entry.ladder.length - 1 && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">终点</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 转岗详情 */}
          {entry.paths && (
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">转岗路径详情</p>
              <div className="space-y-2">
                {entry.paths.map((p: any, i: number) => {
                  const diffCls = p.difficulty === '低' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : p.difficulty === '高' ? 'text-red-700 bg-red-50 border-red-200'
                    : 'text-amber-700 bg-amber-50 border-amber-200';
                  return (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900 text-sm">{p.target}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${diffCls}`}>
                            {p.difficulty}难度
                          </span>
                          <span className="text-xs text-slate-500">{Math.round(p.similarity * 100)}% 相似</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">⏱ {p.period}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((tag: string) => (
              <span key={tag} className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 font-medium">
                <Tag className="w-2.5 h-2.5 inline mr-1" />{tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// 主页面
// ─────────────────────────────────────────────
export default function KnowledgeHubPage() {
  const [entries, setEntries]         = useState<any[]>([]);
  const [stats, setStats]             = useState<any>(null);
  const [activeCategory, setActiveCat] = useState('all');
  const [search, setSearch]           = useState('');
  const [viewEntry, setViewEntry]     = useState<any>(null);
  const [loading, setLoading]         = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category: activeCategory });
      if (search) params.set('search', search);
      const res  = await fetch(`/api/knowledge-hub?${params}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
      setStats(data.stats ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeCategory, search]);

  const statCards = [
    { label: '岗位画像条目', value: stats?.job_profile  ?? '-', icon: Users,      color: 'text-amber-600',  bg: 'bg-amber-50'  },
    { label: '转岗路径条目', value: stats?.lateral_path ?? '-', icon: TrendingUp, color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: '总条目数',     value: stats?.total        ?? '-', icon: Database,   color: 'text-slate-600',  bg: 'bg-slate-50'  },
    { label: '大类数量',     value: stats?.vpMeta?.total_categories ?? '-', icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">知识中枢</h2>
          <p className="text-sm text-slate-500 mt-1">岗位数据与领域知识的存储管理中心</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
          stats?.dataSource === 'real'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <Database className="w-3 h-3" />
          {stats?.dataSource === 'real' ? '真实数据已接入' : '示例数据'}
        </div>
      </div>

      {/* 未接入真实数据提示 */}
      {stats?.dataSource === 'fallback' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>当前展示示例数据。</strong>请将 <code className="bg-amber-100 px-1 rounded">vertical_paths.json</code> 和{' '}
            <code className="bg-amber-100 px-1 rounded">lateral_paths.json</code> 放入项目根目录的{' '}
            <code className="bg-amber-100 px-1 rounded">data/knowledge_graph/</code> 目录，重启后自动接入真实数据。
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="text-2xl font-black text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-5">
        {/* 分类侧边栏 */}
        <div className="w-52 shrink-0 space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1 mb-3">知识分类</p>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            const count = cat.id === 'all' ? (stats?.total ?? 0)
              : cat.id === 'job_profile' ? (stats?.job_profile ?? 0)
              : (stats?.lateral_path ?? 0);
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive ? 'bg-[#111827] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : cat.color}`} />
                  <span className="font-medium text-xs">{cat.label}</span>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 内容区 */}
        <div className="flex-1 min-w-0">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索岗位、标签…"
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">加载知识库数据…</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>暂无匹配的知识条目</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {entries.map(entry => (
                <EntryCard key={entry.id} entry={entry} onView={setViewEntry} />
              ))}
            </div>
          )}

          <div className="mt-4 text-center text-xs text-slate-400">
            显示 {entries.length} 条 ·
            {stats?.dataSource === 'real'
              ? ` 数据来源：${stats.lpMeta?.vector_source ?? 'JSON文件'}`
              : ' 示例数据'}
          </div>
        </div>
      </div>

      {/* 详情弹窗 */}
      <AnimatePresence>
        {viewEntry && <DetailModal entry={viewEntry} onClose={() => setViewEntry(null)} />}
      </AnimatePresence>
    </div>
  );
}
