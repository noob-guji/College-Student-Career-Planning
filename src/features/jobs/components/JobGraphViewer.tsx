'use client';

/**
 * 岗位图谱可视化 + 右侧岗位画像面板
 * 右侧面板包含：岗位基本描述、12维雷达图、各维度说明
 */

import { useEffect, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp, ArrowRight, Loader2, RefreshCw,
  Database, Zap, X, Info,
  Briefcase, Award, Lightbulb, BookOpen, Flame,
  MessageCircle, Crown, Puzzle, TrendingUp, Heart,
  ChevronRight, BarChart2, Search,
} from 'lucide-react';

// ─── 类型 ────────────────────────────────────────────────────
interface NodeDetail {
  type: 'vertical' | 'lateral';
  label: string;
  levelIndex?: number;
  isTop?: boolean;
  similarity?: number;
  difficulty?: string;
  skills?: string[];
  period?: string;
  action?: string;
  salary?: string;
}

interface DimScore { score: number; tags: string[]; reason?: string; }
interface JobPortrait {
  job_title: string;
  dimensions: {
    professional_skills: DimScore; certificate: DimScore;
    innovation: DimScore; learning: DimScore; stress_tolerance: DimScore;
    communication: DimScore; internship: DimScore; leadership: DimScore;
    problem_solving: DimScore; business_acumen: DimScore;
    execution: DimScore; values_fit: DimScore;
  };
}

// ─── 12维度定义 ───────────────────────────────────────────────
const DIM_MAP = [
  { key: 'professional_skills', label: '专业技能',   color: '#F97316', icon: Briefcase,     desc: '岗位核心技术能力与知识体系的掌握程度' },
  { key: 'certificate',         label: '证书要求',   color: '#BA7517', icon: Award,          desc: '行业认证、资质证书对竞争力的加成权重' },
  { key: 'innovation',          label: '创新能力',   color: '#7F77DD', icon: Lightbulb,      desc: '解决新问题、提出创新方案的思维能力' },
  { key: 'learning',            label: '学习能力',   color: '#1D9E75', icon: BookOpen,       desc: '快速习得新知识、适应新技术的能力' },
  { key: 'stress_tolerance',    label: '抗压能力',   color: '#D85A30', icon: Flame,          desc: '面对高强度工作与压力时的稳定性' },
  { key: 'communication',       label: '沟通能力',   color: '#D4537E', icon: MessageCircle,  desc: '跨团队协作、表达与信息传递的效率' },
  { key: 'internship',          label: '实习经历',   color: '#378ADD', icon: Briefcase,      desc: '相关实习背景对岗位竞争力的影响权重' },
  { key: 'leadership',          label: '领导力',     color: '#888780', icon: Crown,          desc: '带领团队、统筹资源与推动目标达成的能力' },
  { key: 'problem_solving',     label: '解决问题',   color: '#0F6E56', icon: Puzzle,         desc: '系统性分析与处理复杂业务问题的能力' },
  { key: 'business_acumen',     label: '商业敏感度', color: '#E9A830', icon: TrendingUp,     desc: '理解商业逻辑、市场动态与价值创造的视角' },
  { key: 'execution',           label: '执行力',     color: '#C2410C', icon: Zap,            desc: '将计划转化为结果、高效完成任务的能力' },
  { key: 'values_fit',          label: '价值观匹配', color: '#534AB7', icon: Heart,          desc: '个人价值观与岗位/企业文化的契合程度' },
] as const;

type DimKey = typeof DIM_MAP[number]['key'];

function scoreColor(s: number) {
  if (s >= 80) return '#16a34a';
  if (s >= 60) return '#ca8a04';
  return '#dc2626';
}
function scoreBg(s: number) {
  if (s >= 80) return 'bg-green-50 text-green-700 border-green-200';
  if (s >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-600 border-red-200';
}

// ─── 50个唯一岗位 · 二级分类（你去重后的最终列表）────────────────────
const JOB_CATEGORIES = [
  {
    name: '技术开发',
    color: '#F97316',
    jobs: [
      'Java开发', 'Python开发', 'C/C++开发', '前端开发', '后端开发',
      '全栈开发', 'Android开发', 'iOS开发', '嵌入式开发', '算法工程师',
      'AI/机器学习', '大数据开发', '运维工程师', '信息安全', '网络工程师',
      '硬件工程师', '测试工程师', 'Java开发工程师', '前端开发工程师', '软件测试工程师'
    ]
  },
  {
    name: '产品设计',
    color: '#1D9E75',
    jobs: ['产品经理', 'UI/UX设计师', '平面设计师', '视觉设计师']
  },
  {
    name: '数据与分析',
    color: '#7F77DD',
    jobs: ['数据分析师', 'BI工程师', '商业分析师']
  },
  {
    name: '运营与市场',
    color: '#D4537E',
    jobs: [
      '运营专员', '市场专员', '品牌专员', '新媒体运营', '内容运营',
      '社区运营', '电商运营'
    ]
  },
  {
    name: '销售与商务',
    color: '#E9A830',
    jobs: ['销售', '销售经理', '商务拓展', '客户经理', '大客户销售', '广告销售']
  },
  {
    name: '职能管理',
    color: '#888780',
    jobs: ['HR', '招聘专员', '财务', '会计', '法务', '行政', '供应链', '项目经理', '实施工程师', '技术支持工程师']
  }
];

// ─── 自定义雷达 Tooltip ───────────────────────────────────────
const CustomRadarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 max-w-[200px] z-50">
      <p className="text-xs font-bold text-slate-900 mb-1">{d.subject}</p>
      <p className="text-base font-bold text-amber-500 mb-1">{d.A} 分</p>
      {d.reason && <p className="text-xs text-slate-500 leading-relaxed">{d.reason}</p>}
    </div>
  );
};

// ─── 节点详情面板 ──────────────────────────────────────────────
function NodeDetailPanel({ detail, onClose }: { detail: NodeDetail; onClose: () => void }) {
  const diffCls =
    detail.difficulty === '低' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : detail.difficulty === '高' ? 'text-red-700 bg-red-50 border-red-200'
    : 'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-4 right-4 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 pointer-events-auto"
    >
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <span className="font-bold text-slate-900 text-sm">
          {detail.type === 'vertical' ? '晋升节点' : '转岗目标'}
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <p className="font-semibold text-slate-900">{detail.label}</p>
        {detail.type === 'vertical' && detail.levelIndex !== undefined && (
          <p className="text-xs text-slate-500">
            职级层级：L{detail.levelIndex}
            {detail.isTop && (
              <span className="ml-2 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">终点</span>
            )}
          </p>
        )}
        {detail.type === 'lateral' && (
          <>
            {detail.similarity !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 shrink-0">相似度</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all" style={{ width: `${Math.round(detail.similarity * 100)}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-700 shrink-0">{Math.round(detail.similarity * 100)}%</span>
              </div>
            )}
            {detail.difficulty && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${diffCls}`}>
                转岗难度：{detail.difficulty}
              </span>
            )}
            {detail.period && <p className="text-xs text-slate-600">⏱ 预计周期：{detail.period}</p>}
            {detail.skills && detail.skills.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1.5">需补充技能</p>
                <div className="flex flex-wrap gap-1">
                  {detail.skills.map((s, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {detail.action && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-800 leading-relaxed">💡 {detail.action}</div>
            )}
            {detail.salary && <p className="text-xs text-slate-500">💰 薪资变化：{detail.salary}</p>}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── 单图谱面板 ───────────────────────────────────────────────
function GraphPanel({ title, nodes: initNodes, edges: initEdges, badge, onNodeClick }: {
  title: string; nodes: any[]; edges: any[]; badge?: string;
  onNodeClick: (d: NodeDetail) => void;
}) {
  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
        <span className="font-semibold text-slate-900 text-sm">{title}</span>
        {badge && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{badge}</span>}
      </div>
      <div className="flex-1" style={{ minHeight: 360 }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => {
            const d = node.data as any;
            if (d.isSource) return;
            onNodeClick({
              type: d.similarity !== undefined ? 'lateral' : 'vertical',
              label: String(d.label),
              levelIndex: d.levelIndex, isTop: d.isTop,
              similarity: d.similarity, difficulty: d.difficulty,
              skills: d.skills, period: d.period, action: d.action, salary: d.salary,
            });
          }}
          fitView fitViewOptions={{ padding: 0.25 }}
          nodesDraggable proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="#f1f5f9" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => (n.style as any)?.background || '#e2e8f0'}
            maskColor="rgba(248,250,252,0.7)"
            style={{ borderRadius: 8 }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

// ─── 右侧岗位画像面板（已修改：前端直接读取 public 里的 JSON）─────────────
function PortraitPanel({ jobName, lateralInfo }: { jobName: string; lateralInfo?: any }) {
  const [portrait, setPortrait] = useState<JobPortrait | null>(null);
  const [loading, setLoading]   = useState(false);
  const [tab, setTab]           = useState<'radar' | 'dims'>('radar');

  useEffect(() => {
    if (!jobName) return;
    setPortrait(null);
    setLoading(true);

    // 🔥 从 public 读取你们生成的雷达图（100% 不报错）
    fetch('/data/job_portraits_generated.json')
      .then(res => res.json())
      .then(localData => {
        if (localData[jobName]) {
          setPortrait(localData[jobName]);
        } else {
          // 没有就用原来的接口兜底
          return fetch(`${process.env.NEXT_PUBLIC_PYTHON_API || 'http://localhost:8000'}/api/portraits?title=${encodeURIComponent(jobName)}&limit=1`)
            .then(r => r.json())
            .then(data => {
              if (Array.isArray(data) && data.length > 0) setPortrait(data[0]);
              else setPortrait(null);
            });
        }
      })
      .catch(() => setPortrait(null))
      .finally(() => setLoading(false));
  }, [jobName]);

  const radarData = portrait
    ? DIM_MAP.map(d => ({
        subject: d.label,
        A: portrait.dimensions[d.key as DimKey]?.score ?? 0,
        reason: portrait.dimensions[d.key as DimKey]?.reason ?? '',
        fullMark: 100,
      }))
    : [];

  // 从 lateral_paths 提取岗位基本信息
  const paths     = lateralInfo?.paths ?? [];
  const diffCount = paths.reduce((acc: Record<string, number>, p: any) => {
    const d = p['难度'] ?? '中';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const targets = paths.map((p: any) => p['目标岗位']).slice(0, 4);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 岗位基本描述 */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1 h-4 bg-amber-400 rounded-full" />
          <h3 className="text-sm font-semibold text-slate-800">岗位概览</h3>
        </div>
        <p className="text-lg font-bold text-slate-900 mb-2">{jobName}</p>

        {paths.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(diffCount).map(([diff, cnt]) => (
                <span key={diff} className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                  diff === '低' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : diff === '高' ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {diff}难度转岗 ×{cnt as number}
                </span>
              ))}
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                共 {paths.length} 条转岗路径
              </span>
            </div>

            <div className="mb-1">
              <p className="text-[10px] text-slate-400 mb-1.5">可转岗方向</p>
              <div className="flex flex-wrap gap-1">
                {targets.map((t: string) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md">{t}</span>
                ))}
                {paths.length > 4 && (
                  <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">+{paths.length - 4} 更多</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400">暂无转岗路径数据</p>
        )}
      </div>

      {/* 标签切换 */}
      <div className="shrink-0 flex border-b border-slate-100 bg-slate-50">
        {([
          { id: 'radar', label: '雷达图', icon: BarChart2 },
          { id: 'dims',  label: '维度详情', icon: ChevronRight },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
              tab === t.id
                ? 'text-amber-600 border-b-2 border-amber-400 bg-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">加载画像数据…</span>
          </div>
        ) : !portrait ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400 px-4">
            <Info className="w-6 h-6 opacity-40" />
            <p className="text-xs text-center">暂无「{jobName}」的12维能力数据</p>
            <p className="text-[10px] text-slate-300 text-center">运行 generate_job_portraits.py 后可查看</p>
          </div>
        ) : tab === 'radar' ? (
          <div className="px-2 pt-2 pb-4">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData} margin={{ top: 12, right: 32, bottom: 12, left: 32 }}>
                  <PolarGrid stroke="#f1f5f9" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="能力得分" dataKey="A" stroke="#F59E0B" strokeWidth={2} fill="#F59E0B" fillOpacity={0.22} />
                  <Tooltip content={<CustomRadarTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Top 3 维度 */}
            <div className="mt-2 px-2">
              <p className="text-[10px] text-slate-400 mb-2">核心优势维度</p>
              {DIM_MAP
                .map(d => ({ ...d, score: portrait.dimensions[d.key as DimKey]?.score ?? 0 }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map((d, i) => (
                  <div key={d.key} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-amber-400 w-5 shrink-0">#{i + 1}</span>
                    <span className="text-xs text-slate-600 w-16 shrink-0 truncate">{d.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: d.color }} />
                    </div>
                    <span className="text-xs font-bold w-7 text-right shrink-0" style={{ color: scoreColor(d.score) }}>{d.score}</span>
                  </div>
                ))
              }
            </div>
          </div>
        ) : (
          /* 维度详情列表 */
          <div className="px-3 py-3 space-y-2">
            {DIM_MAP.map(dim => {
              const d = portrait.dimensions[dim.key as DimKey];
              const s = d?.score ?? 0;
              const Icon = dim.icon;
              return (
                <div key={dim.key} className="bg-white rounded-lg border border-slate-100 p-2.5 hover:border-amber-200 transition-colors">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: dim.color }} />
                      <span className="text-xs font-medium text-slate-700">{dim.label}</span>
                    </div>
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${scoreBg(s)}`}>{s}</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-100 overflow-hidden mb-1.5">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s}%`, background: dim.color }} />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {d?.reason || dim.desc}
                  </p>
                  {d?.tags && d.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {d.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 rounded">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────
export default function JobGraphViewer() {
  const [availList, setAvailList] = useState<{
    categories: string[]; coreJobs: string[]; dataSource: string;
  } | null>(null);

  const [activeJob,  setActiveJob]  = useState('Java开发');
  const [activeMode, setActiveMode] = useState<'both' | 'vertical' | 'lateral'>('both');
  const [graphData,  setGraphData]  = useState<any>(null);
  const [loading,    setLoading]    = useState(false);
  const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['技术开发']));

  useEffect(() => {
    fetch('/api/knowledge-graph?list=1')
      .then(r => r.json())
      .then(d => {
        setAvailList(d);
      })
      .catch(console.error);
  }, []);

  const loadGraph = useCallback(async (job: string) => {
    if (!job) return;
    setLoading(true);
    setNodeDetail(null);
    try {
      const res  = await fetch(`/api/knowledge-graph?job=${encodeURIComponent(job)}`);
      const data = await res.json();
      setGraphData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeJob) loadGraph(activeJob);
  }, [activeJob, loadGraph]);

  const showV = (activeMode === 'both' || activeMode === 'vertical') && graphData?.vertical;
  const showL = (activeMode === 'both' || activeMode === 'lateral')  && graphData?.lateral;

  // 搜索过滤岗位
  const filteredCategories = JOB_CATEGORIES.map(cat => ({
    ...cat,
    jobs: cat.jobs.filter(j => j.includes(search.trim()))
  })).filter(cat => cat.jobs.length > 0);

  return (
    <div className="flex flex-col h-full gap-4 relative">

      {/* ── 工具栏 */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
          graphData?.dataSource === 'real'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <Database className="w-3 h-3" />
          {graphData?.dataSource === 'real' ? '数据驱动（真实数据）' : '内置示例数据'}
        </div>

        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {([
            { id: 'both',     icon: Zap,       label: '全览' },
            { id: 'vertical', icon: ArrowUp,    label: '晋升路径' },
            { id: 'lateral',  icon: ArrowRight, label: '转岗路径' },
          ] as const).map(m => (
            <button
              key={m.id}
              onClick={() => setActiveMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === m.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => loadGraph(activeJob)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* ── 内容区（三列：岗位列表 | 图谱 | 画像面板）*/}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ========== 左侧：二级分类目录（可搜索 + 展开） ========== */}
        <div className="w-44 shrink-0 flex flex-col gap-2 overflow-hidden bg-white rounded-xl border border-slate-200">
          <div className="p-3 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索岗位..."
                className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg bg-slate-100 border border-slate-200 placeholder-slate-500 outline-none focus:border-amber-400"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-1">
            {filteredCategories.map(cat => (
              <div key={cat.name}>
                <button
                  onClick={() => {
                    const s = new Set(openCategories);
                    s.has(cat.name) ? s.delete(cat.name) : s.add(cat.name);
                    setOpenCategories(s);
                  }}
                  className="w-full flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 rounded-lg text-xs font-medium"
                >
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-400 ${openCategories.has(cat.name) ? 'rotate-90' : ''}`} />
                  <span className="w-2 h-2 rounded-full" style={{ background: cat.color }}></span>
                  <span className="flex-1 text-left">{cat.name}</span>
                  <span className="text-[10px] bg-slate-100 px-1 py-0.5 rounded-full">{cat.jobs.length}</span>
                </button>

                {openCategories.has(cat.name) && cat.jobs.map(job => (
                  <button
                    key={job}
                    onClick={() => setActiveJob(job)}
                    className={`w-full text-left px-5 py-1.5 text-xs rounded-lg ${
                      activeJob === job
                        ? 'bg-[#111827] text-amber-400'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {job}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 中间图谱区 */}
        <div className="flex-1 min-w-0 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">图谱加载中…</span>
            </div>
          ) : !graphData ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">请在左侧选择岗位</div>
          ) : (
            <div className={`grid gap-4 h-full ${showV && showL ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {showV && (
                <GraphPanel
                  title={`${graphData.vertical?.category ?? activeJob} · 晋升路径`}
                  nodes={graphData.vertical.nodes}
                  edges={graphData.vertical.edges}
                  badge={graphData.vertical.dataFlag ? '数据驱动' : undefined}
                  onNodeClick={setNodeDetail}
                />
              )}
              {showL && (
                <GraphPanel
                  title={`${activeJob} · 转岗路径`}
                  nodes={graphData.lateral.nodes}
                  edges={graphData.lateral.edges}
                  onNodeClick={setNodeDetail}
                />
              )}
              {activeMode !== 'vertical' && !graphData.lateral && (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm">
                  <div className="text-center p-6">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>「{activeJob}」暂无转岗路径数据</p>
                    <p className="text-xs mt-1 opacity-70">在 generate_lateral_paths.py 中补充后重新运行</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 节点详情浮层 */}
          <AnimatePresence>
            {nodeDetail && (
              <NodeDetailPanel detail={nodeDetail} onClose={() => setNodeDetail(null)} />
            )}
          </AnimatePresence>
        </div>

        {/* 右侧画像面板 */}
        <div className="w-[300px] xl:w-[320px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {activeJob ? (
            <PortraitPanel
              jobName={activeJob}
              lateralInfo={graphData?.lateral
                ? { paths: (graphData.lateral.nodes as any[])
                    .filter(n => n.id !== 'src')
                    .map(n => ({
                      '目标岗位': n.data?.label,
                      '难度':     n.data?.difficulty,
                    }))
                  }
                : undefined
              }
            />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">选择岗位后查看画像</div>
          )}
        </div>
      </div>

      {/* ── 图例 */}
      <div className="shrink-0 flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span className="font-semibold text-slate-700">图例：</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-blue-300" style={{ borderStyle: 'dashed' }} />
          动画连线 = 晋升关系
        </span>
        {[['emerald', '低难度'], ['amber', '中难度'], ['red', '高难度']].map(([c, l]) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded bg-${c}-50 border border-${c}-300 inline-block`} />
            {l}转岗
          </span>
        ))}
        <span className="ml-auto opacity-70">点击节点查看详情 · 可拖拽节点</span>
      </div>
    </div>
  );
}