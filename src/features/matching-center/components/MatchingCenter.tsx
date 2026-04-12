'use client';

import { useState, useEffect } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { Search, ChevronRight, Loader2, CheckCircle2, AlertTriangle, TrendingUp, Building2 } from 'lucide-react';

// ─── 类型 ────────────────────────────────────────────────────
interface StudentDim { score: number; tags: string[]; reason?: string; }
interface JobPortrait {
  job_code: string; job_title: string; company: string;
  city?: string; salary?: string;
  dimensions: Record<string, { score: number; tags: string[]; reason?: string }>;
}
interface FourDimResult {
  basic:       { score: number; detail: string };
  skill:       { score: number; detail: string };
  quality:     { score: number; detail: string };
  potential:   { score: number; detail: string };
  overall:     number;
  advantages:  string[];
  gaps:        { dim: string; student: number; job: number; suggestion: string }[];
  suggestions: string[];
}

// ─── 常量 ────────────────────────────────────────────────────
const DIM_LABEL: Record<string, string> = {
  professional_skills: '专业技能', certificate: '证书要求',
  innovation: '创新能力', learning: '学习能力',
  stress_tolerance: '抗压能力', communication: '沟通能力',
  internship: '实习能力', leadership: '领导力',
  problem_solving: '解决问题', business_acumen: '商业敏感度',
  execution: '执行力', values_fit: '价值观匹配',
};

// 四维分析权重配置
const FOUR_DIM_CONFIG = {
  basic:     { label: '基础要求', keys: ['certificate'],                                          weight: 0.2, color: '#378ADD' },
  skill:     { label: '职业技能', keys: ['professional_skills', 'internship'],                   weight: 0.3, color: '#F97316' },
  quality:   { label: '职业素养', keys: ['communication', 'stress_tolerance', 'values_fit'],    weight: 0.25, color: '#1D9E75' },
  potential: { label: '发展潜力', keys: ['learning', 'innovation', 'problem_solving', 'business_acumen', 'leadership', 'execution'], weight: 0.25, color: '#7F77DD' },
};

function calcFourDim(student: Record<string, StudentDim>, job: Record<string, { score: number; tags: string[] }>): FourDimResult {
  const dimScore = (keys: string[]) => {
    const scores = keys.map(k => ({
      s: student[k]?.score ?? 60,
      j: job[k]?.score ?? 60,
    }));

    // 改进匹配算法：考虑能力差距和岗位要求水平
    const matchScores = scores.map(({ s, j }) => {
      if (j === 0) return 100; // 如果岗位不要求此能力，满分

      // 能力差距计算（考虑岗位要求的难度）
      const gap = s - j;
      let matchScore;

      if (gap >= 0) {
        // 能力超过要求：根据超过程度给分，但设置上限
        matchScore = Math.min(100, 80 + Math.min(gap * 0.5, 20));
      } else {
        // 能力不足：根据差距程度扣分，但设置下限
        matchScore = Math.max(30, 80 + gap * 1.2);
      }

      // 根据岗位要求的水平调整（高要求岗位匹配更严格）
      if (j >= 85) {
        matchScore = matchScore * 0.9; // 高要求岗位稍微降低匹配度
      } else if (j <= 70) {
        matchScore = Math.min(100, matchScore * 1.05); // 低要求岗位稍微提高匹配度
      }

      return Math.round(matchScore);
    });

    return Math.round(matchScores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const basic     = dimScore(FOUR_DIM_CONFIG.basic.keys);
  const skill     = dimScore(FOUR_DIM_CONFIG.skill.keys);
  const quality   = dimScore(FOUR_DIM_CONFIG.quality.keys);
  const potential = dimScore(FOUR_DIM_CONFIG.potential.keys);

  const overall = Math.round(
    basic     * FOUR_DIM_CONFIG.basic.weight +
    skill     * FOUR_DIM_CONFIG.skill.weight +
    quality   * FOUR_DIM_CONFIG.quality.weight +
    potential * FOUR_DIM_CONFIG.potential.weight
  );

  // 差距分析
  const gaps = Object.keys(DIM_LABEL)
    .map(k => ({
      dim: DIM_LABEL[k],
      student: student[k]?.score ?? 60,
      job: job[k]?.score ?? 60,
      gap: (job[k]?.score ?? 60) - (student[k]?.score ?? 60),
      suggestion: '',
    }))
    .filter(g => g.gap > 15)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 4)
    .map(g => ({
      ...g,
      suggestion: `建议通过实践项目或学习课程将${g.dim}提升至${g.job}分水平`,
    }));

  const advantages = Object.keys(DIM_LABEL)
    .filter(k => (student[k]?.score ?? 60) >= (job[k]?.score ?? 60))
    .map(k => DIM_LABEL[k])
    .slice(0, 4);

  return {
    basic:     { score: basic,     detail: `证书与学历要求匹配度 ${basic}%` },
    skill:     { score: skill,     detail: `专业技能与实习经验匹配度 ${skill}%` },
    quality:   { score: quality,   detail: `沟通、抗压、价值观匹配度 ${quality}%` },
    potential: { score: potential, detail: `学习、创新、执行等发展潜力匹配度 ${potential}%` },
    overall, advantages, gaps,
    suggestions: gaps.map(g => g.suggestion),
  };
}

function scoreColor(s: number) {
  if (s >= 80) return '#16a34a';
  if (s >= 60) return '#ca8a04';
  return '#dc2626';
}

// ─── 主组件 ──────────────────────────────────────────────────
export default function MatchingCenter() {
  const [jobs, setJobs] = useState<JobPortrait[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Array<{ job: JobPortrait; result: FourDimResult }>>([]);
  const [searchQ, setSearchQ] = useState('');
  const [selected, setSelected] = useState<JobPortrait | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentDims, setStudentDims] = useState<Record<string, StudentDim> | null>(null);
  const [result, setResult] = useState<FourDimResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // 加载学生画像
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('careerProfile');
      if (raw) {
        const p = JSON.parse(raw);
        // 优先用简历解析的12维度，否则用6维映射
        if (p.dimensions12) {
          setStudentDims(p.dimensions12);
        } else {
          const caps = p.capabilities ?? {};
          setStudentDims({
            professional_skills: { score: caps['逻辑能力'] ?? 70, tags: p.skills ?? [] },
            certificate:         { score: 60, tags: [] },
            innovation:          { score: caps['创新思维'] ?? 70, tags: [] },
            learning:            { score: caps['创新思维'] ?? 70, tags: [] },
            stress_tolerance:    { score: caps['抗压能力'] ?? 70, tags: [] },
            communication:       { score: caps['沟通表达'] ?? 70, tags: [] },
            internship:          { score: p.internship ? 75 : 50, tags: [] },
            leadership:          { score: caps['领导团队'] ?? 60, tags: [] },
            problem_solving:     { score: caps['逻辑能力'] ?? 70, tags: [] },
            business_acumen:     { score: 60, tags: [] },
            execution:           { score: caps['执行落地'] ?? 70, tags: [] },
            values_fit:          { score: 75, tags: [] },
          });
        }
      }
    } catch {}
  }, []);

  // 加载岗位数据并自动匹配
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_PYTHON_API}/api/portraits?limit=200`)
      .then(r => r.json())
      .then(data => {
        setJobs(data);
        setLoading(false);

        // 如果有学生画像，智能推荐岗位（优先展示画像更完整、得分更丰富的岗位）
        if (studentDims && data.length > 0) {
          const allMatches = data.map((job: JobPortrait) => {
            const result = calcFourDim(studentDims, job.dimensions);
            const dimValues = Object.values(job.dimensions || {});
            const scoredCount = dimValues.filter(dim => (dim.score ?? 0) > 0).length;
            const tagsCount = dimValues.reduce((sum, dim) => sum + ((dim.tags?.length ?? 0)), 0);
            const richness = (scoredCount / 12) * 0.7 + Math.min(tagsCount / 24, 1) * 0.3;
            return { job, result, richness };
          });

          const ranked = allMatches
            .map(match => ({
              ...match,
              rankingScore: match.result.overall * 0.7 + match.richness * 30,
            }))
            .sort((a, b) => b.rankingScore - a.rankingScore);

          const topCandidates = ranked.filter(match => match.richness >= 0.45 || match.result.overall >= 78);
          const smartRecommendations = [
            ...topCandidates.slice(0, 5),
            ...ranked.filter(match => !topCandidates.some(item => item.job.job_code === match.job.job_code)).slice(0, Math.max(0, 5 - topCandidates.length)),
          ]
            .slice(0, 5)
            .map(({ job, result }) => ({ job, result }));

          setRecommendedJobs(smartRecommendations);
          // 自动选择第一个作为默认
          if (smartRecommendations.length > 0) {
            setSelected(smartRecommendations[0].job);
            setResult(smartRecommendations[0].result);
          }
        }
      })
      .catch(() => setLoading(false));
  }, [studentDims]);

  const filtered = jobs.filter(j =>
    !searchQ.trim() || j.job_title.includes(searchQ) || j.company?.includes(searchQ)
  );

  // 选择岗位后自动分析
  const handleSelect = async (job: JobPortrait) => {
    setSelected(job);
    if (!studentDims) return;
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 600)); // 模拟分析延迟
    const r = calcFourDim(studentDims, job.dimensions);
    setResult(r);
    setAnalyzing(false);
  };

  // 雷达对比数据
  const radarData = selected && studentDims
    ? Object.keys(DIM_LABEL).map(k => ({
        subject: DIM_LABEL[k],
        学生: studentDims[k]?.score ?? 60,
        岗位要求: selected.dimensions[k]?.score ?? 60,
      }))
    : [];

  // 四维柱状图数据
  const fourDimBar = result
    ? Object.entries(FOUR_DIM_CONFIG).map(([key, cfg]) => ({
        name: cfg.label,
        匹配度: result[key as keyof FourDimResult] as any,
        color: cfg.color,
      }))
    : [];

  return (
    <div className="flex h-full bg-slate-50">
      {/* 左侧目录 */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-3">人岗匹配中心</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="搜索岗位..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-500 outline-none focus:border-amber-400" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">智能推荐</h3>
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>
            ) : !studentDims ? (
              <p className="text-xs text-slate-500">请先建立学生画像</p>
            ) : recommendedJobs.length === 0 ? (
              <p className="text-xs text-slate-500">暂无推荐岗位</p>
            ) : (
              <div className="space-y-2">
                {recommendedJobs.map(({ job, result: matchResult }, i) => (
                  <button key={job.job_code} onClick={() => handleSelect(job)}
                    className={`w-full p-3 text-left rounded-lg border transition-all ${
                      selected?.job_code === job.job_code
                        ? 'bg-amber-50 border-amber-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}>
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-medium text-slate-900 text-sm truncate">{job.job_title}</div>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0">
                        {matchResult.overall}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">{job.company}</div>
                    {job.salary && <div className="text-xs text-slate-400 mt-1">{job.salary}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">全部岗位</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {filtered.slice(0, 20).map(job => (
                <button key={job.job_code} onClick={() => handleSelect(job)}
                  className={`w-full p-2 text-left rounded border transition-all text-xs ${
                    selected?.job_code === job.job_code
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                  }`}>
                  <div className="font-medium text-slate-800 truncate">{job.job_title}</div>
                  <div className="text-slate-500 truncate">{job.company}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="w-10 h-10 text-amber-400" />
            </div>
            {!studentDims
              ? <>
                  <p className="text-slate-700 text-lg font-semibold mb-2">尚未建立学生画像</p>
                  <p className="text-slate-500 text-sm">请先前往「自我认知中心」填写信息</p>
                </>
              : loading
                ? <>
                    <p className="text-slate-600 text-lg font-semibold mb-2">正在分析匹配岗位...</p>
                    <p className="text-slate-500 text-sm">基于您的画像智能推荐</p>
                  </>
                : <>
                    <p className="text-slate-600 text-lg font-semibold mb-2">从左侧选择推荐岗位查看详情</p>
                    <p className="text-slate-500 text-sm">系统已为您推荐最匹配的岗位</p>
                  </>
            }
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          {/* 岗位信息卡片 */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{selected.job_title}</h1>
                <div className="flex flex-wrap gap-2">
                  {selected.company && <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">{selected.company}</span>}
                  {selected.city && <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm font-medium">{selected.city}</span>}
                  {selected.salary && <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">{selected.salary}/月</span>}
                </div>
              </div>
              {result && (
                <div className="text-right">
                  <div className="text-4xl font-black mb-1" style={{ color: scoreColor(result.overall) }}>{result.overall}%</div>
                  <div className="text-sm text-slate-500">综合匹配度</div>
                </div>
              )}
            </div>
          </div>

          {analyzing ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">正在进行四维匹配分析...</p>
              </div>
            </div>
          ) : result && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 12维度对比雷达图 */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-1 h-5 bg-amber-400 rounded-full"></span>
                  <h3 className="text-lg font-semibold text-slate-900">12维度对比雷达图</h3>
                  <div className="flex gap-4 ml-auto text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 rounded"></span>我的能力</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 rounded"></span>岗位要求</span>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData} margin={{ top: 20, right: 50, bottom: 20, left: 50 }}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="我的能力" dataKey="学生" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.25} strokeWidth={2} />
                      <Radar name="岗位要求" dataKey="岗位要求" stroke="#378ADD" fill="#378ADD" fillOpacity={0.15} strokeWidth={1.5} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11, marginTop: 10 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 四维匹配分析 */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-1 h-5 bg-green-400 rounded-full"></span>
                  <h3 className="text-lg font-semibold text-slate-900">四维匹配分析</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(FOUR_DIM_CONFIG).map(([key, cfg]) => {
                    const dimResult = result[key as keyof FourDimResult] as { score: number; detail: string };
                    return (
                      <div key={key} className="bg-slate-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-slate-800">{cfg.label}</span>
                          <span className="text-sm font-bold" style={{ color: scoreColor(dimResult.score) }}>{dimResult.score}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 overflow-hidden mb-2">
                          <div className="h-full rounded-full transition-all" style={{ width: `${dimResult.score}%`, background: cfg.color }}></div>
                        </div>
                        <p className="text-xs text-slate-600">{dimResult.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 主要差距分析 */}
          {result && result.gaps.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-1 h-5 bg-orange-400 rounded-full"></span>
                <h3 className="text-lg font-semibold text-slate-900">主要差距分析</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.gaps.map((g, i) => (
                  <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-800">{g.dim}</span>
                      <div className="flex gap-3 text-xs">
                        <span className="text-amber-600 font-semibold">我：{g.student}分</span>
                        <span className="text-blue-600 font-semibold">要求：{g.job}分</span>
                        <span className="text-red-600 font-semibold">差距：{g.job - g.student}分</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden mb-3">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${g.student}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-600 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                      {g.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 匹配优势和提升建议 */}
          {result && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* 匹配优势 */}
              {result.advantages.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-1 h-5 bg-green-400 rounded-full"></span>
                    <h3 className="text-lg font-semibold text-slate-900">匹配优势</h3>
                  </div>
                  <div className="space-y-3">
                    {result.advantages.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-green-800">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 提升建议 */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-1 h-5 bg-purple-400 rounded-full"></span>
                  <h3 className="text-lg font-semibold text-slate-900">提升建议</h3>
                </div>
                {result.suggestions.length > 0
                  ? <div className="space-y-3">
                      {result.suggestions.map((s, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-purple-800 leading-relaxed">{s}</p>
                        </div>
                      ))}
                    </div>
                  : <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <p className="text-sm text-green-700 font-medium">各维度匹配良好，保持现有优势！</p>
                    </div>
                }

                {/* 生成生涯蓝图按钮 */}
                <button
                  onClick={() => {
                    if (recommendedJobs.length > 0) {
                      sessionStorage.setItem('matchResult', JSON.stringify(
                        recommendedJobs.map(({ job, result }) => ({
                          jobTitle: job.job_title,
                          company: job.company,
                          overall: result.overall,
                          fourDim: result,
                        }))
                      ));
                    }
                    window.location.href = '/career-blueprint';
                  }}
                  className="w-full mt-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  基于此匹配生成生涯蓝图
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}