'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Search, ChevronRight, Award, Lightbulb, BookOpen, Flame, MessageCircle, Briefcase, Crown, Puzzle, TrendingUp, Zap, Heart, Building2 } from 'lucide-react';

// ─── 类型 ────────────────────────────────────────────────────
interface DimScore { score: number; tags: string[]; reason?: string; }
interface JobPortrait {
  job_code: string; job_title: string; company: string;
  city?: string; salary?: string; min_salary?: number; max_salary?: number;
  level?: string; type?: string; desc?: string;
  dimensions: {
    professional_skills: DimScore; certificate: DimScore;
    innovation: DimScore; learning: DimScore; stress_tolerance: DimScore;
    communication: DimScore; internship: DimScore; leadership: DimScore;
    problem_solving: DimScore; business_acumen: DimScore;
    execution: DimScore; values_fit: DimScore;
  };
}
interface CatalogCategory { name: string; color: string; jobs: JobPortrait[]; }

// ─── 常量 ────────────────────────────────────────────────────
const DIM_MAP = [
  { key: 'professional_skills', label: '专业技能',   color: '#F97316', icon: Briefcase },
  { key: 'certificate',         label: '证书要求',   color: '#BA7517', icon: Award },
  { key: 'innovation',          label: '创新能力',   color: '#7F77DD', icon: Lightbulb },
  { key: 'learning',            label: '学习能力',   color: '#1D9E75', icon: BookOpen },
  { key: 'stress_tolerance',    label: '抗压能力',   color: '#D85A30', icon: Flame },
  { key: 'communication',       label: '沟通能力',   color: '#D4537E', icon: MessageCircle },
  { key: 'internship',          label: '实习能力',   color: '#378ADD', icon: Briefcase },
  { key: 'leadership',          label: '领导力',     color: '#888780', icon: Crown },
  { key: 'problem_solving',     label: '解决问题',   color: '#0F6E56', icon: Puzzle },
  { key: 'business_acumen',     label: '商业敏感度', color: '#E9A830', icon: TrendingUp },
  { key: 'execution',           label: '执行力',     color: '#C2410C', icon: Zap },
  { key: 'values_fit',          label: '价值观匹配', color: '#534AB7', icon: Heart },
] as const;

type DimKey = typeof DIM_MAP[number]['key'];

const CATEGORY_KEYWORDS = [
  { name: '技术开发', color: '#F97316', keywords: ['工程师','开发','程序员','架构','运维','测试','前端','后端','全栈'] },
  { name: '数据与AI', color: '#7F77DD', keywords: ['数据','算法','AI','机器学习','分析','挖掘','研究'] },
  { name: '产品运营', color: '#1D9E75', keywords: ['产品','运营','策划','增长','内容','用户'] },
  { name: '金融财务', color: '#BA7517', keywords: ['财务','金融','会计','审计','投资','风控','基金'] },
  { name: '市场销售', color: '#D4537E', keywords: ['市场','销售','营销','品牌','商务','推广'] },
  { name: '其他',     color: '#888780', keywords: [] },
];

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

function categorizeJobs(jobs: JobPortrait[], sortType: 'alpha' | 'salary'): CatalogCategory[] {
    const cats: CatalogCategory[] = CATEGORY_KEYWORDS.map(c => ({ ...c, jobs: [] }));
    jobs.forEach(job => {
      const matched = CATEGORY_KEYWORDS.find(c => c.keywords.some(kw => job.job_title.includes(kw)));
      const name = matched?.name ?? '其他';
      cats.find(c => c.name === name)!.jobs.push(job);
    });
  
    // 排序
    cats.forEach(c => {
      if (sortType === 'alpha') {
        c.jobs.sort((a, b) => a.job_title.localeCompare(b.job_title, 'zh-CN'));
      } else {
        c.jobs.sort((a, b) => {
          const sa = a.max_salary ?? 0;
          const sb = b.max_salary ?? 0;
          return sb - sa;
        });
      }
    });
  
    return cats.filter(c => c.jobs.length > 0);
}

// ─── 自定义雷达 Tooltip ───────────────────────────────────────
const CustomRadarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 max-w-[200px]">
      <p className="text-sm font-bold text-slate-900 mb-1">{d.subject}</p>
      <p className="text-lg font-bold text-amber-500 mb-1">{d.A} 分</p>
      {d.reason && <p className="text-xs text-slate-500 leading-relaxed">{d.reason}</p>}
    </div>
  );
};

// ─── 主组件 ──────────────────────────────────────────────────
export default function JobPortraitPage() {
  const [portraits, setPortraits] = useState<JobPortrait[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [openCats, setOpenCats] = useState<Set<number>>(new Set([0]));
  const [selected, setSelected] = useState<JobPortrait | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [sortType, setSortType] = useState<'alpha' | 'salary'>('alpha'); // alpha=字母，salary=薪资

  const [loading, setLoading] = useState(true);

  // 左侧栏宽度拖拽
  const [sidebarW, setSidebarW] = useState(260);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = sidebarW;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarW]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      setSidebarW(Math.min(420, Math.max(200, startW.current + delta)));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  useEffect(() => {
    setLoading(true);

    fetch(`${process.env.NEXT_PUBLIC_PYTHON_API}/api/portraits?limit=2000`)
      .then(r => r.json())
      .then((data: JobPortrait[]) => {
        setPortraits(data);
        setCategories(categorizeJobs(data, sortType));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sortType]);

  const filtered = searchQ.trim()
    ? categories.map(c => ({
        ...c,
        jobs: c.jobs.filter(j => j.job_title.includes(searchQ) || j.company?.includes(searchQ)),
      })).filter(c => c.jobs.length > 0)
    : categories;

  // 雷达图数据
  const radarData = selected
    ? DIM_MAP.map(d => ({
        subject: d.label,
        A: selected.dimensions[d.key as DimKey]?.score ?? 0,
        reason: selected.dimensions[d.key as DimKey]?.reason ?? '',
        fullMark: 100,
      }))
    : [];

  // 右侧 Top4 维度
  const topDims = selected
    ? DIM_MAP.map(d => ({ ...d, score: selected.dimensions[d.key as DimKey]?.score ?? 0 }))
        .sort((a, b) => b.score - a.score).slice(0, 4)
    : [];

  return (
    <div className="max-w-[1600px] w-full mx-auto p-6 flex flex-col gap-6 h-full">
      {/* 顶部标题区（新增！）*/}
      <div className="shrink-0">
        <h2 className="text-2xl font-bold text-slate-900">岗位智绘</h2>
        <p className="text-sm text-slate-500 mt-1">
          基于真实招聘数据构建，全方位展示岗位能力模型、核心要求与成长画像
        </p>
      </div>

      <div className="flex-1 min-h-0 flex bg-slate-50 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        {/* ══ 左侧可拖拽目录 ══ */}
        <div
          className="flex-shrink-0 flex flex-col bg-white h-full overflow-hidden"
          style={{ width: sidebarW }}
        >
          {/* 搜索头 */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-200 flex-shrink-0">
            <h2 className="text-sm font-bold text-slate-900 mb-3 tracking-wide">岗位目录</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text" value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setOpenCats(new Set(filtered.map((_, i) => i))); }}
                placeholder="搜索岗位或公司..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-slate-100 border border-slate-200 text-slate-800 placeholder-slate-500 outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          {/* 排序切换栏 */}
          <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between flex-shrink-0 bg-slate-50">
            <div className="text-[10px] text-slate-500">
              {sortType === 'alpha' ? 'A-Z 字母排序' : '薪资从高到低'}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setSortType('alpha')}
                className={`text-[10px] px-2 py-0.5 rounded ${sortType === 'alpha' ? 'bg-amber-400 text-white' : 'text-slate-500 bg-white border border-slate-200'}`}
              >
                字母
              </button>
              <button
                onClick={() => setSortType('salary')}
                className={`text-[10px] px-2 py-0.5 rounded ${sortType === 'salary' ? 'bg-amber-400 text-white' : 'text-slate-500 bg-white border border-slate-200'}`}
              >
                薪资
              </button>
            </div>
          </div>

          {/* 目录树 */}
          <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {filtered.map((cat, ci) => (
              <div key={cat.name}>
                {/* 一级分类 */}
                <button
                  onClick={() => {
                    setOpenCats(prev => {
                      const next = new Set(prev);
                      next.has(ci) ? next.delete(ci) : next.add(ci);
                      return next;
                    });
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors group"
                >
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${openCats.has(ci) ? 'rotate-90' : ''}`}
                  />
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <span className="text-xs font-semibold text-slate-800 flex-1 text-left truncate">{cat.name}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-100 rounded-full px-1.5 py-0.5 flex-shrink-0">{cat.jobs.length}</span>
                </button>

                {/* 二级岗位列表 */}
                {openCats.has(ci) && cat.jobs.map(job => (
                  <button
                    key={job.job_code}
                    onClick={() => setSelected(job)}
                    className={`w-full flex items-start gap-2 px-4 py-2.5 pl-9 text-left transition-colors border-l-4 ${selected?.job_code === job.job_code
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-white border-transparent hover:bg-slate-50'}
                      `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate font-medium ${selected?.job_code === job.job_code ? 'text-amber-700' : 'text-slate-800'}`}>
                        {job.job_title}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{job.company}</div>
                    </div>
                    {job.salary && (
                      <span className="text-xs text-slate-600 flex-shrink-0 mt-0.5">{job.salary}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* 底部统计 */}
          <div className="px-4 py-3 border-t border-slate-200 flex-shrink-0">
            <p className="text-[10px] text-slate-500 text-center">共 {portraits.length} 个岗位画像</p>
          </div>
        </div>

        {/* 拖拽分隔条 */}
        <div
          onMouseDown={onMouseDown}
          className="w-1 flex-shrink-0 bg-slate-200 hover:bg-amber-400 cursor-col-resize transition-colors active:bg-amber-400"
        />

        {/* ══ 中间主区 ══ */}
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-slate-500 text-sm">从左侧目录选择一个岗位</p>
              <p className="text-slate-400 text-xs mt-1">查看12维度能力画像</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0 flex flex-col">

            {/* 岗位信息头 */}
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-slate-900">{selected.job_title}</h1>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selected.company && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        <Building2 className="w-3 h-3" />{selected.company}
                      </span>
                    )}
                    {selected.city && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">{selected.city}</span>
                    )}
                    {selected.level && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">{selected.level}</span>
                    )}
                    {selected.type && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">{selected.type}</span>
                    )}
                  </div>
                </div>
                {selected.salary && (
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xl font-bold text-amber-500">{selected.salary}</div>
                    <div className="text-xs text-slate-400 mt-0.5">月薪范围</div>
                  </div>
                )}
              </div>
              {selected.desc && (
                <p className="text-sm text-slate-500 mt-3 leading-relaxed line-clamp-2">{selected.desc}</p>
              )}
            </div>

            {/* 雷达图 */}
            <div className="bg-white mx-4 mt-4 rounded-xl border border-slate-100 shadow-sm flex-shrink-0">
              <div className="px-5 pt-4 pb-1 flex items-center gap-2">
                <span className="w-1 h-4 bg-amber-400 rounded-full" />
                <h3 className="text-sm font-semibold text-slate-800">能力雷达图</h3>
                <span className="text-xs text-slate-400 ml-1">· 悬停节点查看得分与解读</span>
              </div>
              <div className="h-[300px] px-2 pb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData} margin={{ top: 16, right: 40, bottom: 16, left: 40 }}>
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="能力得分"
                      dataKey="A"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      fill="#F59E0B"
                      fillOpacity={0.25}
                    />
                    <Tooltip content={<CustomRadarTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 12维度能力画像 */}
            <div className="mx-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 bg-amber-400 rounded-full" />
                <h3 className="text-sm font-semibold text-slate-800">12维度能力画像</h3>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {DIM_MAP.map(dim => {
                  const d = selected.dimensions[dim.key as DimKey];
                  const s = d?.score ?? 0;
                  const Icon = dim.icon;
                  return (
                    <div key={dim.key}
                      className="bg-white rounded-lg border border-slate-200 p-2.5 hover:border-amber-200 transition-all"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1">
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: dim.color }} />
                          <span className="text-xs font-medium text-slate-700 truncate">{dim.label}</span>
                        </div>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${scoreBg(s)}`}>{s}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-1.5">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s}%`, background: dim.color }} />
                      </div>
                      {d?.reason && (
                        <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                          {d.reason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ 右侧面板 ══ */}
        <div className="w-[270px] xl:w-[300px] flex-shrink-0 border-l border-slate-200 bg-white overflow-y-auto flex flex-col">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">选择岗位后查看详情</div>
          ) : (
            <>
              {/* 岗位概况 */}
              <div className="px-4 py-4 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-4 bg-amber-400 rounded-full" />
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">岗位概况</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: '薪资范围', val: selected.salary, highlight: true },
                    { label: '工作城市', val: selected.city },
                    { label: '招聘性质', val: selected.type },
                    { label: '经验要求', val: selected.level },
                  ].filter(r => r.val).map(r => (
                    <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-sm text-slate-500">{r.label}</span>
                      <span className={`text-sm font-semibold ${r.highlight ? 'text-amber-500' : 'text-slate-800'}`}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 核心优势维度 */}
              <div className="px-4 py-4 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-4 bg-amber-400 rounded-full" />
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">核心优势维度</h3>
                </div>
                <div className="space-y-2.5">
                  {topDims.map((d, i) => (
                    <div key={d.key} className="flex items-center gap-2">
                      <span className="text-sm font-bold text-amber-400 w-5 flex-shrink-0">#{i + 1}</span>
                      <span className="text-sm text-slate-600 w-20 flex-shrink-0 truncate">{d.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: d.color }} />
                      </div>
                      <span className="text-sm font-bold w-7 text-right flex-shrink-0" style={{ color: scoreColor(d.score) }}>{d.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 关键标签提取 */}
              <div className="px-4 py-4 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-4 bg-amber-400 rounded-full" />
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">关键标签提取</h3>
                </div>
                {[
                  { name: '专业技能', tags: selected.dimensions.professional_skills?.tags ?? [], cls: 'bg-orange-50 text-orange-700 border-orange-200' },
                  { name: '证书要求', tags: selected.dimensions.certificate?.tags ?? [],         cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { name: '实习背景', tags: selected.dimensions.internship?.tags ?? [],          cls: 'bg-teal-50 text-teal-700 border-teal-200' },
                  { name: '软性能力', tags: [
                      ...(selected.dimensions.communication?.tags ?? []),
                      ...(selected.dimensions.learning?.tags ?? [])
                    ].slice(0, 4),
                    cls: 'bg-slate-100 text-slate-600 border-slate-200' },
                ].filter(g => g.tags.length > 0).map(g => (
                  <div key={g.name} className="mb-3 last:mb-0">
                    <p className="text-[10px] text-slate-400 font-medium mb-1.5">{g.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.tags.map(t => (
                        <span key={t} className={`text-xs px-2 py-0.5 rounded-md border font-medium ${g.cls}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 备考建议 */}
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-4 bg-amber-400 rounded-full" />
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">备考建议</h3>
                </div>
                <div className="space-y-2">
                  {topDims[0]?.score >= 80 && (
                    <div className="flex gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <span className="text-amber-400 flex-shrink-0 text-sm mt-0.5">▸</span>
                      <p className="text-sm text-amber-800 leading-relaxed">
                        <span className="font-semibold">{topDims[0].label}</span> 是本岗位最核心能力，建议重点准备。
                      </p>
                    </div>
                  )}
                  {(selected.dimensions.certificate?.tags?.length ?? 0) > 0 && (
                    <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <span className="text-blue-400 flex-shrink-0 text-sm mt-0.5">▸</span>
                      <p className="text-sm text-blue-800 leading-relaxed">
                        持有 <span className="font-semibold">{selected.dimensions.certificate.tags[0]}</span> 将显著提升竞争力。
                      </p>
                    </div>
                  )}
                  {(selected.dimensions.internship?.tags?.length ?? 0) > 0 && (
                    <div className="flex gap-2 p-3 bg-teal-50 rounded-lg border border-teal-100">
                      <span className="text-teal-400 flex-shrink-0 text-sm mt-0.5">▸</span>
                      <p className="text-sm text-teal-800 leading-relaxed">
                        建议争取 <span className="font-semibold">{selected.dimensions.internship.tags[0]}</span> 相关实习经历。
                      </p>
                    </div>
                  )}
                  {topDims[0]?.score < 80 && (selected.dimensions.certificate?.tags?.length ?? 0) === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">选择岗位后自动生成建议</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}