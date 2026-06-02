'use client';

import { useState, useEffect } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Search, ChevronRight, Loader2, CheckCircle2, AlertTriangle,
  TrendingUp, MapPin, Briefcase, DollarSign, Star, Target, RefreshCw,
  BookOpen, Zap, Award, Users,
} from 'lucide-react';

// ─── 类型 ─────────────────────────────────────────────────────
interface StudentDim { score: number; tags: string[]; reason?: string; }
interface JobPortrait {
  job_code: string; job_title: string; company: string;
  city?: string; salary?: string;
  dimensions: Record<string, { score: number; tags: string[]; reason?: string }>;
}
interface FourDimResult {
  basic:     { score: number; detail: string };
  skill:     { score: number; detail: string };
  quality:   { score: number; detail: string };
  potential: { score: number; detail: string };
  overall:   number;
  advantages:  string[];
  gaps:        { dim: string; student: number; job: number; gap: number; suggestion: string }[];
  suggestions: string[];
}

// ─── 常量 ─────────────────────────────────────────────────────
const DIM_LABEL: Record<string, string> = {
  professional_skills: '专业技能', certificate: '证书要求',
  innovation: '创新能力',          learning: '学习能力',
  stress_tolerance: '抗压能力',    communication: '沟通能力',
  internship: '实习经验',          leadership: '领导力',
  problem_solving: '解决问题',     business_acumen: '商业敏感度',
  execution: '执行力',             values_fit: '价值观匹配',
};

const FOUR_DIM_CONFIG = {
  basic:     { label: '基础资质', keys: ['certificate'],                                         weight: 0.20, color: '#3B82F6' },
  skill:     { label: '职业技能', keys: ['professional_skills', 'internship'],                  weight: 0.30, color: '#F97316' },
  quality:   { label: '职业素养', keys: ['communication', 'stress_tolerance', 'values_fit'],   weight: 0.25, color: '#10B981' },
  potential: { label: '发展潜力', keys: ['learning', 'innovation', 'problem_solving', 'business_acumen', 'leadership', 'execution'], weight: 0.25, color: '#8B5CF6' },
};

const DIM_DEFAULTS: Record<string, number> = {
  professional_skills: 76, certificate: 70, innovation: 67,
  learning: 72, stress_tolerance: 74, communication: 71,
  internship: 64, leadership: 62, problem_solving: 73,
  business_acumen: 66, execution: 75, values_fit: 69,
};

// ─── 差异化评分算法 ─────────────────────────────────────────
function calcFourDim(
  student: Record<string, StudentDim>,
  job: Record<string, { score: number; tags: string[] }>,
): FourDimResult {
  const dimScore = (keys: string[]) => {
    const pairs = keys.map(k => ({ s: student[k]?.score ?? 55, j: job[k]?.score ?? 68 }));
    const scores = pairs.map(({ s, j }) => {
      if (j === 0) return 95;
      const gap = s - j;
      let m: number;
      if (gap >= 15)       m = 88 + Math.min((gap - 15) * 0.25, 10);
      else if (gap >= 0)   m = 70 + gap * 1.2;
      else if (gap >= -10) m = 58 + gap * 1.4;
      else if (gap >= -20) m = 42 + (gap + 10) * 1.2;
      else                 m = Math.max(18, 30 + (gap + 20) * 0.9);
      if (j >= 88) m *= 0.87;
      else if (j >= 80) m *= 0.93;
      return Math.min(98, Math.max(15, Math.round(m)));
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const basic     = dimScore(FOUR_DIM_CONFIG.basic.keys);
  const skill     = dimScore(FOUR_DIM_CONFIG.skill.keys);
  const quality   = dimScore(FOUR_DIM_CONFIG.quality.keys);
  const potential = dimScore(FOUR_DIM_CONFIG.potential.keys);
  const overall   = Math.round(basic * 0.20 + skill * 0.30 + quality * 0.25 + potential * 0.25);

  const gaps = Object.keys(DIM_LABEL)
    .map(k => ({
      dim: DIM_LABEL[k],
      student: student[k]?.score ?? 55,
      job: job[k]?.score ?? 68,
      gap: (job[k]?.score ?? 68) - (student[k]?.score ?? 55),
    }))
    .filter(g => g.gap > 8)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 4)
    .map(g => ({
      ...g,
      suggestion: `建议专项训练将「${g.dim}」从 ${g.student} 提升至 ${g.job}（差距 ${g.gap} 分）`,
    }));

  const advantages = Object.keys(DIM_LABEL)
    .filter(k => (student[k]?.score ?? 55) >= (job[k]?.score ?? 68) - 3)
    .map(k => DIM_LABEL[k]).slice(0, 5);

  return {
    basic:     { score: basic,     detail: `学历证书与岗位基础要求匹配度 ${basic}%` },
    skill:     { score: skill,     detail: `专业技能与实习经验综合匹配 ${skill}%` },
    quality:   { score: quality,   detail: `沟通表达、抗压能力、价值观匹配 ${quality}%` },
    potential: { score: potential, detail: `学习成长、创新执行等发展潜力 ${potential}%` },
    overall, advantages, gaps,
    suggestions: gaps.map(g => g.suggestion),
  };
}

// ✅ 强化：个人意愿加分（岗位类型12分 + 城市8分，意愿权重极高）
function prefBonus(job: JobPortrait, preferredTitles: string[], preferredCities: string[]) {
  let bonus = 0;
  const hasPreferredTitle = preferredTitles.some(t => 
    t && job.job_title.includes(t) || t && t.includes(job.job_title)
  );
  const hasPreferredCity = preferredCities.some(c => 
    c && (job.city ?? '').includes(c) || c && c.includes(job.city ?? '')
  );

  if (hasPreferredTitle) bonus += 12;  // 意向岗位类型：高权重
  if (hasPreferredCity) bonus += 8;    // 意向城市：高权重
  return bonus;
}

function scoreColor(s: number) {
  if (s >= 80) return '#16a34a';
  if (s >= 65) return '#d97706';
  if (s >= 50) return '#ea580c';
  return '#dc2626';
}
function scoreLabel(s: number) {
  if (s >= 85) return '高度匹配';
  if (s >= 70) return '较好匹配';
  if (s >= 55) return '一般匹配';
  return '匹配较低';
}
function scoreBadgeCls(s: number) {
  if (s >= 80) return 'bg-green-50 border-green-200 text-green-700';
  if (s >= 65) return 'bg-amber-50 border-amber-200 text-amber-700';
  if (s >= 50) return 'bg-orange-50 border-orange-200 text-orange-700';
  return 'bg-red-50 border-red-200 text-red-700';
}

function ScoreDonut({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={5.5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5.5}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={size * 0.21} fontWeight="800" fill={color}>{score}%</text>
    </svg>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────
export default function MatchingCenter() {
  const [jobs, setJobs]                 = useState<JobPortrait[]>([]);
  const [recommended, setRecommended]   = useState<Array<{ job: JobPortrait; result: FourDimResult; isPref: boolean }>>([]);
  const [searchQ, setSearchQ]           = useState('');
  const [selected, setSelected]         = useState<JobPortrait | null>(null);
  const [loading, setLoading]           = useState(true);
  const [studentDims, setStudentDims]   = useState<Record<string, StudentDim> | null>(null);
  const [result, setResult]             = useState<FourDimResult | null>(null);
  const [analyzing, setAnalyzing]       = useState(false);
  const [prefTitles, setPrefTitles]     = useState<string[]>([]);
  const [prefCities, setPrefCities]     = useState<string[]>([]);
  const [syncing, setSyncing]           = useState(false);

  // 从 sessionStorage 读取学生数据的函数
  const reloadStudentData = () => {
    setSyncing(true);
    try {
      const raw = sessionStorage.getItem('careerProfile');
      if (!raw) {
        setSyncing(false);
        return;
      }
      const p = JSON.parse(raw);
      
      // ✅ 强制读取：学生填写的期望岗位类型、意向城市
      if (Array.isArray(p.preferredJobs) && p.preferredJobs.length > 0) {
        setPrefTitles(p.preferredJobs.filter(Boolean).slice(0, 3));
      } else if (Array.isArray(p.selectedJobTypes) && p.selectedJobTypes.length > 0) {
        setPrefTitles(p.selectedJobTypes.filter(Boolean).slice(0, 3));
      }
      
      if (Array.isArray(p.preferredCities) && p.preferredCities.length > 0) {
        setPrefCities(p.preferredCities.filter(Boolean).slice(0, 3));
      } else if (p.targetCity) {
        setPrefCities([p.targetCity]);
      }
      
      // 读取能力维度
      if (p.dimensions12) {
        setStudentDims(p.dimensions12);
      } else {
        const caps = p.capabilities ?? {};
        setStudentDims({
          professional_skills: { score: caps['逻辑能力']  ?? 63, tags: p.skills ?? [] },
          certificate:         { score: 54,                        tags: [] },
          innovation:          { score: caps['创新思维']  ?? 61, tags: [] },
          learning:            { score: caps['创新思维']  ?? 67, tags: [] },
          stress_tolerance:    { score: caps['抗压能力']  ?? 59, tags: [] },
          communication:       { score: caps['沟通表达']  ?? 64, tags: [] },
          internship:          { score: p.internship ? 68 : 43,   tags: [] },
          leadership:          { score: caps['领导团队']  ?? 53, tags: [] },
          problem_solving:     { score: caps['逻辑能力']  ?? 64, tags: [] },
          business_acumen:     { score: 51,                        tags: [] },
          execution:           { score: caps['执行落地']  ?? 63, tags: [] },
          values_fit:          { score: 69,                        tags: [] },
        });
      }
    } catch (error) {
      console.error('同步数据失败:', error);
    } finally {
      setSyncing(false);
    }
  };

  // ✅ 初始化：组件挂载时读取学生数据
  useEffect(() => {
    reloadStudentData();
  }, []);

  // ✅ 监听：学生在自我认知中心更新数据时，自动同步
  useEffect(() => {
    const handleProfileUpdate = () => {
      reloadStudentData();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  // ✅ 核心：智能推荐 = 个人意愿优先 + 匹配度排序
  useEffect(() => {
    if (!studentDims) return;

    fetch(`${process.env.NEXT_PUBLIC_PYTHON_API}/api/portraits?limit=200`)
      .then(r => r.json())
      .then((raw: JobPortrait[]) => {
        const data: JobPortrait[] = raw.map(job => {
          const dims = { ...job.dimensions };
          Object.keys(DIM_LABEL).forEach(k => {
            if (!dims[k] || dims[k].score === 0) {
              const base = DIM_DEFAULTS[k] ?? 70;
              const jitter = Math.round((Math.random() - 0.5) * 18);
              dims[k] = { score: Math.max(40, Math.min(98, base + jitter)), tags: [] };
            }
          });
          return { ...job, dimensions: dims };
        });

        setJobs(data);
        setLoading(false);

        // 计算所有岗位匹配分 + 意愿加分
        const scoredList = data.map(job => {
          const matchResult = calcFourDim(studentDims, job.dimensions);
          const preferenceBonus = prefBonus(job, prefTitles, prefCities);
          const isPreferred = preferenceBonus > 0;
          const finalScore = matchResult.overall + preferenceBonus;

          return {
            job,
            result: matchResult,
            isPreferred,
            finalScore,
          };
        });

        // ✅ 强制规则：
        // 1. 先拿出所有匹配学生意愿的岗位，按总分排序
        // 2. 推荐列表前2个必须是意愿岗位（只要有）
        // 3. 剩下的用高匹配度岗位补全
        const preferredJobs = scoredList.filter(item => item.isPreferred).sort((a, b) => b.finalScore - a.finalScore);
        const otherJobs = scoredList.filter(item => !item.isPreferred).sort((a, b) => b.finalScore - a.finalScore);

        // 意愿岗位至少展示2个，总推荐5个
        const finalRecommended = [
          ...preferredJobs.slice(0, 2),
          ...otherJobs.slice(0, 5 - Math.min(preferredJobs.length, 2))
        ].map(item => ({
          job: item.job,
          result: item.result,
          isPref: item.isPreferred
        }));

        setRecommended(finalRecommended);
        if (finalRecommended.length > 0) {
          setSelected(finalRecommended[0].job);
          setResult(finalRecommended[0].result);
        }
      })
      .catch(() => setLoading(false));
  }, [studentDims, prefTitles, prefCities]);

  const filtered = jobs.filter(j =>
    !searchQ.trim() || j.job_title.includes(searchQ) || (j.company ?? '').includes(searchQ)
  );

  const handleSelect = async (job: JobPortrait) => {
    setSelected(job);
    if (!studentDims) return;
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 350));
    setResult(calcFourDim(studentDims, job.dimensions));
    setAnalyzing(false);
  };

  const radarData = selected && studentDims
    ? Object.keys(DIM_LABEL).map(k => ({
        subject: DIM_LABEL[k],
        我的能力: studentDims[k]?.score ?? 55,
        岗位要求: selected.dimensions[k]?.score ?? 68,
      }))
    : [];

  const barData = result
    ? Object.entries(FOUR_DIM_CONFIG).map(([key, cfg]) => ({
        name: cfg.label,
        匹配度: (result[key as keyof FourDimResult] as { score: number }).score,
        fill: cfg.color,
      }))
    : [];

  return (
    <div className="max-w-[1600px] w-full mx-auto p-6 flex flex-col gap-6 h-full">
      {/* 顶部标题区 */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">人岗匹配中心</h2>
          <p className="text-sm text-slate-500 mt-1">基于能力画像智能推荐岗位 · 多维度匹配分析 · 同步更新个人意愿</p>
        </div>
        <button
          onClick={reloadStudentData}
          disabled={syncing}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          title="同步最新数据">
          <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 主体内容区 */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* 左侧栏 */}
        <aside className="w-80 bg-white border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            {/* 搜索框 */}
            <div className="relative mb-3">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="搜索岗位或公司"
                className="w-full pl-6 pr-2 py-2 rounded-md bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 outline-none focus:border-amber-400 transition-colors text-xs" />
            </div>

            {/* 学生个人意愿标签（高亮展示） */}
            {(prefTitles.length > 0 || prefCities.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {prefTitles.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2 py-1 bg-amber-100 border border-amber-300 rounded-full text-amber-800 text-xs font-medium">
                    <Briefcase className="w-2 h-2" />意向岗位：{t}
                  </span>
                ))}
                {prefCities.map(c => (
                  <span key={c} className="flex items-center gap-1 px-2 py-1 bg-teal-100 border border-teal-300 rounded-full text-teal-800 text-xs font-medium">
                    <MapPin className="w-2 h-2" />意向城市：{c}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
                智能推荐（{prefTitles.length > 0 || prefCities.length > 0 ? '已优先匹配你的意愿' : '按能力匹配'}）
              </p>
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !studentDims ? (
                <p className="text-xs text-slate-400">请先建立学生画像</p>
              ) : (
                <div className="space-y-1.5">
                  {recommended.map(({ job, result: mr, isPref }) => (
                    <button key={job.job_code} onClick={() => handleSelect(job)}
                      className={`w-full p-3 text-left rounded-lg border transition-all ${
                        selected?.job_code === job.job_code
                          ? 'bg-amber-50 border-amber-300'
                          : isPref 
                            ? 'bg-amber-50/70 border-amber-200'  // 意愿岗位高亮
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="font-semibold text-slate-800 text-sm truncate">{job.job_title}</span>
                        <span className="font-bold text-sm" style={{ color: scoreColor(mr.overall) }}>{mr.overall}%</span>
                      </div>
                      <div className="text-xs text-slate-400 truncate">{job.company}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {job.city && <span className="flex items-center gap-0.5 text-xs text-slate-400"><MapPin className="w-2 h-2" />{job.city}</span>}
                        {isPref && (
                          <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                            <Star className="w-2 h-2 fill-amber-500" />我的意愿
                          </span>
                        )}
                      </div>
                      <div className="h-1 rounded-full bg-slate-100 mt-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${mr.overall}%`, background: scoreColor(mr.overall) }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">全部岗位</p>
              <div className="space-y-1">
                {filtered.slice(0, 30).map(job => (
                  <button key={job.job_code} onClick={() => handleSelect(job)}
                    className={`w-full p-2 text-left rounded transition-colors text-xs ${
                      selected?.job_code === job.job_code ? 'bg-amber-50 text-amber-800' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    <div className="font-medium truncate">{job.job_title}</div>
                    <div className="text-slate-400 truncate">{job.company}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* 右侧主区域 */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-white border border-slate-200/80 rounded-2xl">
          {!selected ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-7 h-7 text-amber-400" />
                </div>
                <p className="text-slate-400 text-sm">
                  {!studentDims ? '请先前往「自我认知中心」建立画像' : '从左侧选择岗位查看匹配详情'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-5 max-w-4xl mx-auto">
                {/* 头部卡片 */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold text-slate-900 mb-3 truncate">{selected.job_title}</h1>
                  <div className="flex flex-wrap gap-2">
                    {selected.company && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 text-xs">
                        <Briefcase className="w-2.5 h-2.5" />{selected.company}
                      </span>
                    )}
                    {selected.city && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-full border border-teal-100 text-xs">
                        <MapPin className="w-2.5 h-2.5" />{selected.city}
                      </span>
                    )}
                    {selected.salary && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-100 text-xs">
                        <DollarSign className="w-2.5 h-2.5" />{selected.salary}/月
                      </span>
                    )}
                    {/* 标记：是否匹配学生意愿 */}
                    {prefBonus(selected, prefTitles, prefCities) > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 text-xs font-medium">
                        <Star className="w-2.5 h-2.5 fill-amber-500" />匹配你的意向
                      </span>
                    )}
                  </div>
                </div>
                {result && (
                  <div className="text-center flex-shrink-0">
                    <ScoreDonut score={result.overall} size={70} />
                    <div className={`mt-2 px-2 py-1 rounded-full border text-center font-semibold ${scoreBadgeCls(result.overall)} text-xs`}>
                      {scoreLabel(result.overall)}
                    </div>
                  </div>
                )}
              </div>

              {result && (
                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
                  {Object.entries(FOUR_DIM_CONFIG).map(([key, cfg]) => {
                    const s = (result[key as keyof FourDimResult] as { score: number }).score;
                    return (
                      <div key={key} className="text-center">
                        <div className="text-slate-400 text-xs mb-1">{cfg.label}</div>
                        <div className="font-bold text-lg" style={{ color: cfg.color }}>{s}%</div>
                        <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s}%`, background: cfg.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            </div>

            {analyzing ? (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">正在分析匹配度...</p>
                </div>
              </div>
            ) : result && (
              <>
                {/* 双图表 */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                      <h3 className="text-sm font-semibold text-slate-800">12维度雷达对比</h3>
                    </div>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="我的能力" dataKey="我的能力" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.18} strokeWidth={2} />
                          <Radar name="岗位要求" dataKey="岗位要求" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.10} strokeWidth={1.5} />
                          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11, border: '1px solid #e2e8f0' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                      <h3 className="text-sm font-semibold text-slate-800">四维匹配分析</h3>
                    </div>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={barData} 
                          margin={{ top: 20, right: 10, left: 0, bottom: 10 }}
                          barCategoryGap="30%"
                          barGap={5}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} />
                          <Tooltip 
                            formatter={(value) => [`${value}%`, '匹配度']}
                            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, padding: '6px 10px' }}
                          />
                          <Bar 
                            dataKey="匹配度" 
                            radius={[6, 6, 0, 0]}
                            label={{ position: 'top', fontSize: 12, fontWeight: 600, fill: '#334155', formatter: (v) => `${v}%` }}
                          >
                            {barData.map((entry, index) => (
                              <rect key={index} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* 差距分析 */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-0.5 h-4 bg-orange-400 rounded-full" />
                    <h3 className="font-semibold text-slate-800 text-sm">主要差距分析</h3>
                    <span className="ml-auto px-2 py-1 bg-orange-50 border border-orange-200 text-orange-600 rounded-full text-xs">
                      {result.gaps.length} 项待提升
                    </span>
                  </div>

                  {result.gaps.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {result.gaps.map((g, i) => (
                        <div key={i} className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-slate-700 text-xs">{g.dim}</span>
                            <span className="text-red-600 font-bold text-xs">-{g.gap}分</span>
                          </div>
                          <div className="space-y-1.5 mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-600 w-5 text-right text-xs">我</span>
                              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${g.student}%` }} />
                              </div>
                              <span className="text-slate-400 w-5 text-xs">{g.student}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-blue-500 w-5 text-right text-xs">岗</span>
                              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${g.job}%` }} />
                              </div>
                              <span className="text-slate-400 w-5 text-xs">{g.job}</span>
                            </div>
                          </div>
                          <p className="text-orange-700 text-xs flex items-start gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-0.5" />
                            {g.suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                      <p className="text-green-700 font-medium text-sm">恭喜你！当前岗位无明显能力差距</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (!selected || !result) return;
                    // 支持任意岗位生成蓝图：使用当前选中的岗位
                    const matchResult = {
                      selectedJob: {
                        role: selected.job_title,
                        score: result.overall,
                        job: selected,
                        result: result,
                      },
                      // 保留推荐数据作为参考
                      top1: recommended.length > 0 ? { 
                        role: recommended[0].job.job_title, 
                        score: recommended[0].result.overall,
                        job: recommended[0].job,
                        result: recommended[0].result,
                      } : null,
                      top2: recommended.length > 1 ? { 
                        role: recommended[1].job.job_title, 
                        score: recommended[1].result.overall,
                        job: recommended[1].job,
                        result: recommended[1].result,
                      } : null,
                      top3: recommended.length > 2 ? { 
                        role: recommended[2].job.job_title, 
                        score: recommended[2].result.overall,
                        job: recommended[2].job,
                        result: recommended[2].result,
                      } : null,
                      allRecommended: recommended.map(({ job, result }) => ({
                        jobTitle: job.job_title,
                        company: job.company,
                        city: job.city,
                        salary: job.salary,
                        overall: result.overall,
                        fourDim: result,
                      })),
                    };
                    sessionStorage.setItem('matchResult', JSON.stringify(matchResult));
                    sessionStorage.setItem('shouldAutoGenerateReport', 'true');
                    window.location.href = '/career-blueprint';
                  }}
                  disabled={!selected || !result}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm">
                  <ChevronRight className="w-4 h-4" />
                  基于当前匹配生成生涯蓝图
                </button>
              </>
            )}
          </div>
        )}
      </main>

      {/* 右侧栏 */}
      <aside className="w-80 bg-white border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden">
        {!result ? (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-center text-slate-400 text-xs">选择岗位后显示分析结果</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            <div className={`rounded-xl border p-4 ${scoreBadgeCls(result.overall)}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Award className="w-3.5 h-3.5" />
                <span className="font-semibold text-sm">综合评级</span>
              </div>
              <div className="font-bold text-2xl">{result.overall}%</div>
              <div className="text-xs">{scoreLabel(result.overall)} · 四维加权</div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Zap className="w-3 h-3 text-slate-500" />
                <span className="font-semibold text-sm text-slate-700">四维详细分析</span>
              </div>
              <div className="space-y-3">
                {Object.entries(FOUR_DIM_CONFIG).map(([key, cfg]) => {
                  const d = result[key as keyof FourDimResult] as { score: number; detail: string };
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-600 font-medium text-xs">{cfg.label}</span>
                        <span className="font-bold text-xs" style={{ color: cfg.color }}>{d.score}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: cfg.color }} />
                      </div>
                      <p className="text-slate-400 text-xs mt-1">{d.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {result.advantages.length > 0 && (
              <div className="bg-green-50 rounded-xl border border-green-100 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  <span className="font-semibold text-green-800 text-sm">核心优势</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.advantages.map((a, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-white border border-green-200 text-green-700 rounded-full font-medium text-xs">
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <BookOpen className="w-3 h-3 text-purple-600" />
                <span className="font-semibold text-purple-800 text-sm">提升建议</span>
              </div>
              {result.suggestions.length > 0
                ? <div className="space-y-2">
                    {result.suggestions.map((s, i) => (
                      <div key={i} className="flex gap-1.5 p-2 bg-white rounded-lg border border-purple-100">
                        <ChevronRight className="w-2.5 h-2.5 text-purple-400 shrink-0 mt-0.5" />
                        <p className="text-purple-800 text-xs">{s}</p>
                      </div>
                    ))}
                  </div>
                : <div className="flex items-center gap-1.5 p-2 bg-white rounded-lg border border-green-200">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <p className="text-green-700 font-medium text-xs">各维度匹配良好，保持优势！</p>
                  </div>
              }
            </div>

          </div>
        )}
      </aside>
      </div>
    </div>
  );
}