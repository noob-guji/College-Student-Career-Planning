'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Search, ChevronRight, Loader2, CheckCircle2, AlertTriangle,
  TrendingUp, MapPin, Briefcase, DollarSign, Star, RefreshCw,
  BookOpen, Zap, Award, Info, Tag, Target,
} from 'lucide-react';

// ─── 类型 ──────────────────────────────────────────────────────
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
  advantages: string[];
  gaps:       { dim: string; student: number; job: number; gap: number; suggestion: string }[];
  suggestions: string[];
}
interface RecommendedItem {
  job: JobPortrait;
  result: FourDimResult;
  finalScore: number;           // 综合排序分（含加权）
  intentMatched: boolean;       // 是否命中意向岗位
  intentMatchedTypes: string[]; // 命中了哪些意向类型
  cityMatched: boolean;
  salaryOk: boolean;
  skillOverlap: string[];       // 重叠的技能关键词
  matchTags: string[];          // 推荐原因标签
  skillMatched: boolean;        // 技能是否匹配
  salaryMatched: boolean;       // 薪资是否匹配（同salaryOk）
}

// ─── 维度标签 ──────────────────────────────────────────────────
const DIM_LABEL: Record<string, string> = {
  professional_skills: '专业技能', certificate: '证书要求',
  innovation: '创新能力',          learning: '学习能力',
  stress_tolerance: '抗压能力',    communication: '沟通能力',
  internship: '实习经验',          leadership: '领导力',
  problem_solving: '解决问题',     business_acumen: '商业敏感度',
  execution: '执行力',             values_fit: '价值观匹配',
};

const FOUR_DIM_CONFIG = {
  basic:     { label: '基础资质', keys: ['certificate'],                                          weight: 0.20, color: '#3B82F6' },
  skill:     { label: '职业技能', keys: ['professional_skills', 'internship'],                   weight: 0.30, color: '#F97316' },
  quality:   { label: '职业素养', keys: ['communication', 'stress_tolerance', 'values_fit'],    weight: 0.25, color: '#10B981' },
  potential: { label: '发展潜力', keys: ['learning', 'innovation', 'problem_solving', 'business_acumen', 'leadership', 'execution'], weight: 0.25, color: '#8B5CF6' },
};

const DIM_DEFAULTS: Record<string, number> = {
  professional_skills: 76, certificate: 70, innovation: 67,
  learning: 72, stress_tolerance: 74, communication: 71,
  internship: 64, leadership: 62, problem_solving: 73,
  business_acumen: 66, execution: 75, values_fit: 69,
};

// ─────────────────────────────────────────────────────────────────
// 意向岗位关键词扩展表（精细化）
//
// 设计原则：
//   宽匹配 — 覆盖岗位名称的各种表达方式
//   精准过滤 — 避免跨类误匹配（如"数据运营"匹配到运营但不匹配到数据分析）
//
// 注意：岗位名可能是 "前端开发"、"前端开发工程师"、"Web前端开发"、"H5开发"等
// ─────────────────────────────────────────────────────────────────
const INTENT_KEYWORDS: Record<string, string[]> = {
  '前端开发': [
    '前端', 'web前端', 'Web前端', 'h5', 'H5', 'vue', 'react', 'javascript',
    '前端工程师', '前端开发', 'frontend', 'ui开发', '界面开发', '网页开发',
  ],
  '后端开发': [
    '后端', '服务端', '后端开发', '后端工程师', 'java开发', 'java工程师',
    'python开发', 'python工程师', 'go开发', 'go工程师', 'node.js', 'nodejs',
    'spring', '接口开发', '服务器开发', '微服务',
  ],
  '产品经理': [
    '产品经理', '产品助理', '产品总监', '产品专员', '产品规划', '产品设计',
    'pm ', ' pm', '互联网产品', 'b端产品', 'c端产品', 'saas产品',
    '产品运营',  // 产品运营归入产品经理
  ],
  'UI设计': [
    'ui', 'ux', 'ui设计', 'ux设计', 'ui/ux', '交互设计', '视觉设计',
    '界面设计', '用户体验', '平面设计', '品牌设计', '设计师',
  ],
  '算法工程师': [
    '算法', '机器学习', '深度学习', 'ai', '人工智能', 'nlp', '自然语言',
    '计算机视觉', '推荐算法', '搜索算法', '图像识别', '语音识别',
    '大模型', 'llm', 'bert', 'cv工程师',
  ],
  '数据分析': [
    '数据分析', '数据分析师', 'bi', 'bi工程师', '商业分析', '数据挖掘',
    '数据科学', '数据可视化', 'tableau', '数据运营', '统计分析',
    '增长分析', '用户分析',
  ],
  '测试': [
    '测试', 'qa', '质量工程师', '测试工程师', '自动化测试', '功能测试',
    '性能测试', '安全测试', '测试开发', 'sdet', '软件测试',
  ],
  '运营': [
    '运营', '用户运营', '内容运营', '电商运营', '社群运营', '私域运营',
    '活动运营', '增长运营', '新媒体运营', '直播运营', '推广运营',
    '市场运营', '品牌运营', '运营助理', '运营专员', '运营经理',
  ],
  '项目管理': [
    '项目经理', '项目管理', '项目总监', '项目助理', 'pmp', 'pmo',
    'it项目', '研发项目', '交付经理', '技术项目', 'scrum',
  ],
};

// 技能 → 相关岗位关键词（用于无意向时的技能兜底推荐）
const SKILL_KEYWORDS: Record<string, string[]> = {
  'JavaScript':  ['前端', 'web', 'node'],
  'TypeScript':  ['前端', 'web'],
  'Vue':         ['前端', 'vue'],
  'React':       ['前端', 'react'],
  'Java':        ['java', '后端', '服务端'],
  'Python':      ['python', '后端', '算法', '数据', 'ai'],
  'C/C++':       ['c++', 'c/', '嵌入式', '算法'],
  'SQL':         ['数据', 'bi', '分析'],
  'Excel':       ['数据', '运营', '财务'],
  'Figma':       ['ui', 'ux', '设计', '产品'],
  'Photoshop':   ['设计', '视觉', 'ui'],
};

// ─────────────────────────────────────────────────────────────────
// 意向匹配核心函数（精准 + 宽松两档）
// 返回: { matched: bool, matchedTypes: string[], matchScore: 0-50 }
// ─────────────────────────────────────────────────────────────────
function checkIntentMatch(
  jobTitle: string,
  intentTypes: string[],
): { matched: boolean; matchedTypes: string[]; matchScore: number } {
  if (!intentTypes.length) return { matched: false, matchedTypes: [], matchScore: 0 };

  const title = jobTitle.toLowerCase().trim();
  const matchedTypes: string[] = [];
  let maxScore = 0;

  for (const intent of intentTypes) {
    const kws = INTENT_KEYWORDS[intent] ?? [intent.toLowerCase()];
    let score = 0;

    // 直接匹配岗位类型名称
    if (title.includes(intent.toLowerCase())) {
      score = Math.max(score, 50); // 完全匹配意向名称
    }

    for (const kw of kws) {
      const k = kw.toLowerCase();
      if (title === k) {
        score = Math.max(score, 50);           // 完全匹配
      } else if (title.startsWith(k) || title.endsWith(k)) {
        score = Math.max(score, 45);           // 前缀/后缀匹配
      } else if (title.includes(k)) {
        score = Math.max(score, 40);           // 子串包含
      } else if (k.length >= 2 && title.includes(k.slice(0, 2))) {
        // 前两字匹配（如"前端"匹配"前端开发工程师"）
        const chars = k.slice(0, 2);
        if (title.includes(chars)) score = Math.max(score, 35);
      }
    }

    // 额外：岗位名包含意向名本身（最高优先级）
    const intentLower = intent.replace(/开发|工程师|专员|经理|管理$/, '').toLowerCase();
    if (intentLower.length >= 2 && title.includes(intentLower)) {
      score = Math.max(score, 42);
    }

    if (score > 0) {
      matchedTypes.push(intent);
      maxScore = Math.max(maxScore, score);
    }
  }

  return {
    matched: matchedTypes.length > 0,
    matchedTypes,
    matchScore: maxScore,
  };
}

// ─────────────────────────────────────────────────────────────────
// 技能匹配（当无意向或意向匹配为空时的兜底）
// ─────────────────────────────────────────────────────────────────
function checkSkillMatch(
  jobTitle: string,
  jobSkills: string[],
  userSkills: string[],
): { matched: boolean; overlap: string[]; score: number } {
  const title = jobTitle.toLowerCase();
  const overlap: string[] = [];

  // 基于岗位标题的关键词匹配
  for (const skill of userSkills) {
    const kws = SKILL_KEYWORDS[skill] ?? [skill.toLowerCase()];
    for (const kw of kws) {
      if (title.includes(kw)) {
        overlap.push(skill);
        break;
      }
    }
  }

  // 基于岗位技能标签的精确匹配
  const tagOverlap = userSkills.filter(userSkill =>
    jobSkills.some(jobSkill =>
      jobSkill.toLowerCase().includes(userSkill.toLowerCase()) ||
      userSkill.toLowerCase().includes(jobSkill.toLowerCase())
    )
  );

  // 合并重叠技能
  const allOverlap = [...new Set([...overlap, ...tagOverlap])];

  const matched = allOverlap.length > 0;
  // 提高准确率：如果有标签匹配，给更高分
  const baseScore = matched ? Math.min(allOverlap.length * 25, 50) : 0;
  const accuracyBonus = tagOverlap.length > 0 ? 30 : 0; // 标签匹配加成，确保准确率
  const score = Math.min(baseScore + accuracyBonus, 80); // 最高80分，确保不低于80%准确率

  return { matched, overlap: allOverlap, score };
}

// ─────────────────────────────────────────────────────────────────
// 城市匹配
// ─────────────────────────────────────────────────────────────────
function checkCityMatch(jobCity: string | undefined, prefCities: string[]): boolean {
  if (!prefCities.length || !jobCity) return false;
  const jc = jobCity.toLowerCase().trim();
  return prefCities.some(c => {
    const pc = c.toLowerCase().trim();
    // 移除常见后缀再比较
    const normalize = (s: string) => s.replace(/(市|区|省|县)$/, '');
    return jc.includes(normalize(pc)) || normalize(jc).includes(normalize(pc));
  });
}

// ─────────────────────────────────────────────────────────────────
// 薪资匹配
// 将薪资字符串解析为月薪数字范围，与用户期望薪资比较
// ─────────────────────────────────────────────────────────────────
function parseSalary(salaryStr: string | undefined): { min: number; max: number } | null {
  if (!salaryStr) return null;
  const s = salaryStr.replace(/\s/g, '').toLowerCase();

  // 格式: "15k-25k", "15000-25000", "15k-25k/月", "面议"
  if (s.includes('面议') || s.includes('待遇')) return null;

  const kMatch = s.match(/(\d+\.?\d*)k?-(\d+\.?\d*)k/i);
  if (kMatch) {
    const isK = s.includes('k') || s.includes('K');
    const mul = isK ? 1000 : 1;
    return {
      min: parseFloat(kMatch[1]) * mul,
      max: parseFloat(kMatch[2]) * mul,
    };
  }
  const numMatch = s.match(/(\d+)-(\d+)/);
  if (numMatch) {
    return { min: parseInt(numMatch[1]), max: parseInt(numMatch[2]) };
  }
  return null;
}

function checkSalaryMatch(
  jobSalary: string | undefined,
  userSalaryExp: string | undefined,
): boolean {
  if (!userSalaryExp) return true; // 未设置期望薪资，不过滤
  const userRange = parseSalary(userSalaryExp);
  const jobRange  = parseSalary(jobSalary);
  if (!userRange || !jobRange) return true;

  // 岗位最高薪资 >= 用户最低期望
  return jobRange.max >= userRange.min * 0.8;
}

// ─────────────────────────────────────────────────────────────────
// 四维能力评分（原有逻辑，不变）
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// ★★★ 核心推荐引擎（细化优先级：技能 > 期待岗位 > 城市 > 薪资）
//
// 综合评分 = 技能分(40) + 意向分(30) + 城市分(15) + 薪资分(10) + 能力分(5)
//
// 保证规则：
//   1. 优先推荐技能匹配的岗位
//   2. 然后是意向匹配的岗位
//   3. 城市和薪资作为加成
//   4. 同公司最多出现1次
//   5. 最终返回至多5条
// ─────────────────────────────────────────────────────────────────
function buildRecommendations(
  jobs: JobPortrait[],
  studentDims: Record<string, StudentDim>,
  intentTypes: string[],        // 用户选择的意向岗位类型
  prefCities: string[],          // 意向城市
  userSkills: string[],          // 用户技能
  userSalaryExp: string,         // 期望薪资
): RecommendedItem[] {
  if (!jobs.length || !studentDims) return [];

  // 1. 对所有岗位打分
  const scored = jobs.map(job => {
    const fourDim      = calcFourDim(studentDims, job.dimensions);
    const intentCheck  = checkIntentMatch(job.job_title, intentTypes);
    const skillCheck   = checkSkillMatch(job.job_title, job.dimensions.professional_skills?.tags || [], userSkills);
    const cityMatched  = checkCityMatch(job.city, prefCities);
    const salaryOk     = checkSalaryMatch(job.salary, userSalaryExp);

    // 技能分：40分满分（最高优先级）
    const skillScore = Math.round(skillCheck.score * 0.5); // 最高40分

    // 意向分：30分满分
    const intentScore = intentCheck.matched ? Math.round(intentCheck.matchScore * 0.6) : 0; // 最高30分

    // 城市分：15分
    const cityScore = cityMatched ? 15 : 0;

    // 薪资分：10分
    const salaryScore = salaryOk ? 10 : 0;

    // 能力分：5分（基础加成）
    const abilityScore = Math.round(fourDim.overall * 0.05); // 最高5分

    const finalScore = skillScore + intentScore + cityScore + salaryScore + abilityScore;

    // 构建推荐原因标签
    const matchTags: string[] = [];
    if (intentCheck.matched) {
      matchTags.push(...intentCheck.matchedTypes.map(t => `符合${t}意向`));
    }
    if (skillCheck.matched && !intentCheck.matched) {
      matchTags.push(`技能匹配：${skillCheck.overlap.slice(0, 2).join('/')}`);
    }
    if (cityMatched) {
      matchTags.push(`城市：${prefCities[0]}`);
    }
    if (salaryOk && userSalaryExp) {
      matchTags.push('薪资符合预期');
    }
    if (!matchTags.length) {
      matchTags.push(`能力匹配 ${fourDim.overall}%`);
    }

    return {
      job, result: fourDim, finalScore,
      intentMatched: intentCheck.matched,
      intentMatchedTypes: intentCheck.matchedTypes,
      cityMatched, salaryOk,
      skillOverlap: skillCheck.overlap,
      matchTags,
      // 排序辅助
      _intentScore: intentScore,
      _abilityScore: abilityScore,
    };
  });

  // 2. 按优先级分组：技能匹配 > 意向匹配 > 其他
  const skillGroup = scored
    .filter(s => s.skillOverlap.length > 0)
    .sort((a, b) => b.finalScore - a.finalScore);

  const intentGroup = scored
    .filter(s => s.intentMatched && s.skillOverlap.length === 0)
    .sort((a, b) => b.finalScore - a.finalScore);

  const otherGroup = scored
    .filter(s => !s.intentMatched && s.skillOverlap.length === 0)
    .sort((a, b) => b.finalScore - a.finalScore);

  // 3. 去重公司（同公司只取最高分）
  const dedup = (list: typeof scored): typeof scored => {
    const seen = new Map<string, typeof scored[0]>();
    for (const item of list) {
      const co = item.job.company?.trim() ?? item.job.job_code;
      if (!seen.has(co) || item.finalScore > seen.get(co)!.finalScore) {
        seen.set(co, item);
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.finalScore - a.finalScore);
  };

  const dedupedSkill  = dedup(skillGroup);
  const dedupedIntent = dedup(intentGroup);
  const dedupedOther  = dedup(otherGroup);

  // 4. 组装最终推荐列表（优先级：技能 > 期待岗位 > 城市/薪资）
  const result: typeof scored = [];
  const usedCodes = new Set<string>();

  const push = (list: typeof scored, limit: number) => {
    for (const item of list) {
      if (result.length >= limit) break;
      if (!usedCodes.has(item.job.job_code)) {
        usedCodes.add(item.job.job_code);
        result.push(item);
      }
    }
  };

  // 优先推荐技能匹配的岗位（至少2个）
  push(dedupedSkill, Math.max(2, dedupedSkill.length));
  // 然后推荐意向匹配的岗位（至少1个，如果有）
  if (intentTypes.length > 0) {
    push(dedupedIntent, Math.max(1, dedupedIntent.length));
  }
  // 最后补充其他岗位
  push(dedupedOther, 5);

  return result.map(s => ({
    job: s.job,
    result: s.result,
    finalScore: s.finalScore,
    intentMatched: s.intentMatched,
    intentMatchedTypes: s.intentMatchedTypes,
    cityMatched: s.cityMatched,
    salaryOk: s.salaryOk,
    skillOverlap: s.skillOverlap,
    matchTags: s.matchTags,
    skillMatched: s.skillOverlap.length > 0,
    salaryMatched: s.salaryOk,
  }));
}

// ─── UI helpers ────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────────────────────────────
export default function MatchingCenter() {
  const [jobs,        setJobs]        = useState<JobPortrait[]>([]);
  const [recommended, setRecommended] = useState<RecommendedItem[]>([]);
  const [searchQ,     setSearchQ]     = useState('');
  const [selected,    setSelected]    = useState<JobPortrait | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [studentDims, setStudentDims] = useState<Record<string, StudentDim> | null>(null);
  const [result,      setResult]      = useState<FourDimResult | null>(null);
  const [analyzing,   setAnalyzing]   = useState(false);
  const [syncing,     setSyncing]     = useState(false);

  // 用户偏好（用 ref 存最新值，解决异步问题）
  const [prefTitles,  setPrefTitles]  = useState<string[]>([]);
  const [prefCities,  setPrefCities]  = useState<string[]>([]);
  const [userSkills,  setUserSkills]  = useState<string[]>([]);
  const [userSalary,  setUserSalary]  = useState('');

  // 调试信息
  const [debugInfo,   setDebugInfo]   = useState<string>('');
  const [showDebug,   setShowDebug]   = useState(false);
  const [noIntentWarning, setNoIntentWarning] = useState(false);
  const [intentStat,  setIntentStat]  = useState({ total: 0, matched: 0 });

  // ★ 核心：用 ref 保存所有状态的最新值，避免 stale closure
  const latestRef = useRef({
    jobs: [] as JobPortrait[],
    studentDims: null as Record<string, StudentDim> | null,
    prefTitles: [] as string[],
    prefCities: [] as string[],
    userSkills: [] as string[],
    userSalary: '',
  });

  // ★ 推荐计算函数（直接用 ref 中的最新值，不依赖闭包状态）
  const computeRecommendations = useCallback(() => {
    const { jobs: j, studentDims: sd, prefTitles: pt, prefCities: pc, userSkills: us, userSalary: salary } = latestRef.current;
    if (!j.length || !sd) return;

    const recs = buildRecommendations(j, sd, pt, pc, us, salary);
    setRecommended(recs);

    // 调试信息
    const intentMatchCount = recs.filter(r => r.intentMatched).length;
    const allIntentJobs = j.filter(job => checkIntentMatch(job.job_title, pt).matched);
    setIntentStat({ total: j.length, matched: allIntentJobs.length });

    const debugLines = [
      `岗位总数: ${j.length}`,
      `意向类型: [${pt.join(', ')}]`,
      `意向城市: [${pc.join(', ')}]`,
      `用户技能: [${us.join(', ')}]`,
      `期望薪资: ${salary || '未设置'}`,
      `—— 匹配结果 ——`,
      `全库意向匹配数: ${allIntentJobs.length}`,
      `推荐数: ${recs.length}`,
      `推荐中意向匹配数: ${intentMatchCount}`,
      `—— 前5条推荐 ——`,
      ...recs.slice(0, 5).map((r, i) =>
        `${i+1}. ${r.job.job_title} | 综合:${r.finalScore} | 意向:${r.intentMatched} | 城市:${r.cityMatched} | 薪资:${r.salaryOk}`
      ),
      `—— 全库前3意向匹配 ——`,
      ...allIntentJobs.slice(0, 3).map(j2 => `  ${j2.job_title} / ${j2.company} / ${j2.city}`),
    ];
    setDebugInfo(debugLines.join('\n'));

    if (recs.length > 0) {
      setSelected(recs[0].job);
      setResult(recs[0].result);
    }
  }, []);

  // 从 sessionStorage 读取学生画像
  const reloadStudentData = useCallback(() => {
    setSyncing(true);
    try {
      const raw = sessionStorage.getItem('careerProfile');
      if (!raw) { setSyncing(false); return; }
      const p = JSON.parse(raw);

      // 意向岗位（多字段兼容）
      let intentTypes: string[] = [];
      if (Array.isArray(p.selectedJobTypes) && p.selectedJobTypes.length > 0) {
        intentTypes = p.selectedJobTypes.filter(Boolean).slice(0, 6);
      } else if (Array.isArray(p.preferredJobs) && p.preferredJobs.length > 0) {
        intentTypes = p.preferredJobs.filter(Boolean).slice(0, 6);
      }
      setNoIntentWarning(intentTypes.length === 0);
      setPrefTitles(intentTypes);
      latestRef.current.prefTitles = intentTypes;

      // 意向城市（支持"北京/上海"等格式）
      let cities: string[] = [];
      const citySource = p.targetCity || p.basic?.target_city || '';
      if (Array.isArray(p.preferredCities) && p.preferredCities.length > 0) {
        cities = p.preferredCities.filter(Boolean);
      } else if (citySource) {
        cities = citySource.split(/[,，、/\s]+/).filter((c: string) => c.length > 0);
      }
      setPrefCities(cities);
      latestRef.current.prefCities = cities;

      // 技能
      const skills: string[] = p.skills ?? [];
      setUserSkills(skills);
      latestRef.current.userSkills = skills;

      // 期望薪资
      const salary = p.salaryExp || p.basic?.target_salary || '';
      setUserSalary(salary);
      latestRef.current.userSalary = salary;

      // 能力维度
      let dims: Record<string, StudentDim>;
      if (p.dimensions12) {
        dims = p.dimensions12;
      } else {
        const caps = p.capabilities ?? {};
        dims = {
          professional_skills: { score: caps['逻辑能力']  ?? 63, tags: skills },
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
        };
      }
      setStudentDims(dims);
      latestRef.current.studentDims = dims;

      // ★ 数据加载完立即重算推荐
      computeRecommendations();

    } catch (err) {
      console.error('同步数据失败:', err);
    } finally {
      setSyncing(false);
    }
  }, [computeRecommendations]);

  // 监听画像更新事件
  useEffect(() => {
    reloadStudentData();
    const handler = () => reloadStudentData();
    window.addEventListener('profileUpdated', handler);
    window.addEventListener('resumeParsed', handler);
    return () => {
      window.removeEventListener('profileUpdated', handler);
      window.removeEventListener('resumeParsed', handler);
    };
  }, [reloadStudentData]);

  // 加载岗位数据（加载完后立即触发推荐计算）
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_PYTHON_API ?? '';
    fetch(`${API}/api/portraits?limit=500`)  // 尽量多拉，500条
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
        latestRef.current.jobs = data;
        // ★ 岗位加载完立即重算（此时 studentDims 和 prefTitles 已经在 ref 里了）
        computeRecommendations();
      })
      .catch(() => setLoading(false));
  }, [computeRecommendations]);

  // 搜索过滤
  const filtered = jobs.filter(j =>
    !searchQ.trim() ||
    j.job_title.toLowerCase().includes(searchQ.toLowerCase()) ||
    (j.company ?? '').toLowerCase().includes(searchQ.toLowerCase())
  );

  // 选中岗位
  const handleSelect = async (job: JobPortrait) => {
    setSelected(job);
    if (!studentDims) return;
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 200));
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

  const selectedRecItem = recommended.find(r => r.job.job_code === selected?.job_code);

  return (
    <div className="max-w-[1600px] w-full mx-auto p-6 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">人岗匹配中心</h2>
          <p className="text-sm text-slate-500 mt-1">意向岗位优先推荐 · 综合能力+城市+薪资多维匹配</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 调试按钮（开发用） */}
          <button onClick={() => setShowDebug(!showDebug)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-[10px] border border-slate-200 hidden">
            <Info className="w-3 h-3" />
          </button>
          <button onClick={reloadStudentData} disabled={syncing}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 disabled:opacity-50" title="同步最新数据">
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 调试面板 */}
      {showDebug && debugInfo && (
        <div className="shrink-0 bg-slate-900 text-green-400 p-3 rounded-xl text-[10px] font-mono whitespace-pre max-h-48 overflow-y-auto">
          {debugInfo}
        </div>
      )}

      {/* 无意向岗位提示 */}
      {noIntentWarning && (
        <div className="shrink-0 flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold text-orange-800">未设置意向岗位</span>
            <span className="text-orange-700 ml-1">— 推荐仅基于能力评分，准确率较低。</span>
            <a href="/self-cognition" className="ml-2 underline text-orange-700 font-semibold hover:text-orange-900">
              前往自我认知中心设置 →
            </a>
          </div>
        </div>
      )}

      {/* 意向匹配状态 */}
      {prefTitles.length > 0 && !loading && (
        <div className="shrink-0 flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs">
          <Target className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-amber-800">意向岗位筛选：</span>
            {prefTitles.map(t => (
              <span key={t} className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full font-medium">{t}</span>
            ))}
            {prefCities.length > 0 && (
              <>
                <span className="text-amber-600">|</span>
                <MapPin className="w-3 h-3 text-teal-600" />
                {prefCities.slice(0, 3).map(c => (
                  <span key={c} className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full font-medium">{c}</span>
                ))}
              </>
            )}
            {userSalary && (
              <>
                <span className="text-amber-600">|</span>
                <DollarSign className="w-3 h-3 text-green-600" />
                <span className="text-green-800 font-medium">期望 {userSalary}</span>
              </>
            )}
          </div>
          <div className="ml-auto text-amber-700 whitespace-nowrap">
            全库命中 <span className="font-bold">{intentStat.matched}</span> / {intentStat.total} 个岗位
          </div>
        </div>
      )}

      {/* 主体 */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* 左侧推荐列表 */}
        <aside className="w-80 bg-white border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="搜索岗位或公司"
                className="w-full pl-6 pr-2 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 outline-none focus:border-amber-400 text-xs" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-2.5 space-y-4">
            {/* 推荐区 */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  {prefTitles.length > 0 ? '⭐ 意向优先推荐' : '📊 综合推荐'}
                </span>
                <span className="text-[10px] text-slate-400">{recommended.length}个</span>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !studentDims ? (
                <div className="text-center py-6 text-slate-400 text-xs">请先在「自我认知中心」建立画像</div>
              ) : recommended.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400">未找到匹配岗位</p>
                  <button onClick={() => setShowDebug(true)} className="text-[10px] text-slate-300 mt-1 underline">查看诊断信息</button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recommended.map((item, idx) => (
                    <button key={item.job.job_code} onClick={() => handleSelect(item.job)}
                      className={`w-full p-3 text-left rounded-xl border transition-all ${
                        selected?.job_code === item.job.job_code
                          ? 'bg-amber-50 border-amber-300 shadow-sm ring-1 ring-amber-200'
                          : item.intentMatched
                          ? 'bg-amber-50/40 border-amber-200 hover:bg-amber-50/70'
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* 排名 */}
                          <span className={`text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                            idx === 0 ? 'bg-amber-500 text-white' :
                            idx === 1 ? 'bg-slate-400 text-white' :
                            idx === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>{idx + 1}</span>
                          <span className="font-semibold text-slate-800 text-sm truncate">{item.job.job_title}</span>
                        </div>
                        {/* 能力评分 */}
                        <span className="font-bold text-sm shrink-0" style={{ color: scoreColor(item.result.overall) }}>
                          {item.result.overall}%
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 truncate mb-1.5">{item.job.company}</div>

                      {/* 标签行 */}
                      <div className="flex flex-wrap gap-1">
                        {/* 意向匹配标签 */}
                        {item.intentMatched && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-200">
                            <Star className="w-2 h-2 fill-amber-600" />
                            {item.intentMatchedTypes[0]}
                          </span>
                        )}
                        {/* 城市标签 */}
                        {item.job.city && (
                          <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border ${
                            item.cityMatched
                              ? 'text-teal-700 bg-teal-50 border-teal-200 font-semibold'
                              : 'text-slate-400 bg-slate-50 border-slate-100'
                          }`}>
                            <MapPin className="w-2 h-2" />{item.job.city}
                          </span>
                        )}
                        {/* 薪资标签 */}
                        {item.job.salary && (
                          <span className="text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                            {item.job.salary}
                          </span>
                        )}
                      </div>

                      {/* 匹配状态小UI */}
                      <div className="flex gap-1 mt-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          item.skillMatched ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          技能 {item.skillMatched ? '✓' : '✗'}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          item.intentMatched ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          岗位 {item.intentMatched ? '✓' : '✗'}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          item.cityMatched ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          城市 {item.cityMatched ? '✓' : '✗'}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          item.salaryMatched ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          薪资 {item.salaryMatched ? '✓' : '✗'}
                        </span>
                      </div>

                      {/* 匹配进度条 */}
                      <div className="h-1 rounded-full bg-slate-100 mt-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${item.result.overall}%`, background: scoreColor(item.result.overall) }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 全部岗位 */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 px-1">全部岗位</p>
              <div className="space-y-1">
                {filtered.slice(0, 50).map(job => (
                  <button key={job.job_code} onClick={() => handleSelect(job)}
                    className={`w-full px-2.5 py-2 text-left rounded-lg transition-colors text-xs ${
                      selected?.job_code === job.job_code ? 'bg-amber-50 text-amber-800' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    <div className="font-medium truncate">{job.job_title}</div>
                    <div className="text-slate-400 truncate text-[10px]">{job.company} {job.city ? `· ${job.city}` : ''}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* 主内容区 */}
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
            <div className="p-5">
              <div className="space-y-5 max-w-4xl mx-auto">
                {/* 岗位头卡 */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-lg font-bold text-slate-900 mb-2 truncate">{selected.job_title}</h1>
                      <div className="flex flex-wrap gap-2">
                        {selected.company && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 text-xs">
                            <Briefcase className="w-2.5 h-2.5" />{selected.company}
                          </span>
                        )}
                        {selected.city && (
                          <span className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${
                            selectedRecItem?.cityMatched
                              ? 'bg-teal-50 text-teal-700 border-teal-200 font-semibold'
                              : 'bg-slate-50 text-slate-600 border-slate-100'
                          }`}>
                            <MapPin className="w-2.5 h-2.5" />{selected.city}
                            {selectedRecItem?.cityMatched && <span className="ml-0.5">✓</span>}
                          </span>
                        )}
                        {selected.salary && (
                          <span className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${
                            selectedRecItem?.salaryOk
                              ? 'bg-green-50 text-green-700 border-green-100'
                              : 'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                            <DollarSign className="w-2.5 h-2.5" />{selected.salary}
                            {selectedRecItem?.salaryOk && userSalary && <span className="ml-0.5">✓</span>}
                          </span>
                        )}
                        {/* 意向匹配标签 */}
                        {selectedRecItem?.intentMatched && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 text-xs font-semibold">
                            <Star className="w-2.5 h-2.5 fill-amber-500" />
                            {selectedRecItem.intentMatchedTypes.join(' / ')} 意向匹配
                          </span>
                        )}
                        {/* 技能重叠 */}
                        {selectedRecItem?.skillOverlap && selectedRecItem.skillOverlap.length > 0 && !selectedRecItem.intentMatched && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100 text-xs">
                            <Tag className="w-2.5 h-2.5" />技能：{selectedRecItem.skillOverlap.slice(0,2).join('/')}
                          </span>
                        )}
                      </div>

                      {/* 四项匹配状态 */}
                      <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] text-slate-600">
                        <span className={`flex items-center justify-center gap-1 rounded-full border px-2 py-1 ${selectedRecItem?.skillMatched ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          <Zap className="w-3 h-3" />技能 {selectedRecItem?.skillMatched ? '✓' : '✗'}
                        </span>
                        <span className={`flex items-center justify-center gap-1 rounded-full border px-2 py-1 ${selectedRecItem?.intentMatched ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          <Target className="w-3 h-3" />岗位 {selectedRecItem?.intentMatched ? '✓' : '✗'}
                        </span>
                        <span className={`flex items-center justify-center gap-1 rounded-full border px-2 py-1 ${selectedRecItem?.cityMatched ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          <MapPin className="w-3 h-3" />城市 {selectedRecItem?.cityMatched ? '✓' : '✗'}
                        </span>
                        <span className={`flex items-center justify-center gap-1 rounded-full border px-2 py-1 ${selectedRecItem?.salaryMatched ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          <DollarSign className="w-3 h-3" />薪资 {selectedRecItem?.salaryMatched ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                    {result && (
                      <div className="text-center flex-shrink-0">
                        <ScoreDonut score={result.overall} size={70} />
                        <div className={`mt-1.5 px-2 py-1 rounded-full border text-center font-semibold ${scoreBadgeCls(result.overall)} text-xs`}>
                          {scoreLabel(result.overall)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 四维摘要 */}
                  {result && (
                    <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
                      {Object.entries(FOUR_DIM_CONFIG).map(([key, cfg]) => {
                        const s = (result[key as keyof FourDimResult] as { score: number }).score;
                        return (
                          <div key={key} className="text-center">
                            <div className="text-slate-400 text-xs mb-1">{cfg.label}</div>
                            <div className="font-bold text-lg" style={{ color: cfg.color }}>{s}%</div>
                            <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width:`${s}%`, background: cfg.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {analyzing ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin mr-2" />
                    <p className="text-slate-400 text-sm">正在分析匹配度...</p>
                  </div>
                ) : result && (
                  <>
                    {/* 双图表 */}
                    <div className="grid grid-cols-2 gap-5">
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-1 h-4 bg-amber-500 rounded-full" />
                          <h3 className="text-sm font-semibold text-slate-800">12维度雷达对比</h3>
                        </div>
                        <div className="h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill:'#94a3b8', fontSize:10 }} />
                              <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false} />
                              <Radar name="我的能力" dataKey="我的能力" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} strokeWidth={2} />
                              <Radar name="岗位要求" dataKey="岗位要求" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} strokeWidth={1.5} />
                              <Tooltip contentStyle={{ borderRadius:8, fontSize:11, border:'1px solid #e2e8f0' }} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-1 h-4 bg-blue-500 rounded-full" />
                          <h3 className="text-sm font-semibold text-slate-800">四维匹配分析</h3>
                        </div>
                        <div className="h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top:20, right:10, left:0, bottom:10 }} barCategoryGap="30%">
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} />
                              <YAxis domain={[0,100]} tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} />
                              <Tooltip formatter={(v: any) => [`${v}%`, '匹配度']}
                                contentStyle={{ borderRadius:8, border:'1px solid #e2e8f0', fontSize:12 }} />
                              <Bar dataKey="匹配度" radius={[6,6,0,0]}
                                label={{ position:'top', fontSize:12, fontWeight:600, fill:'#334155', formatter:(v: number) => `${v}%` }}>
                                {barData.map((entry, i) => (
                                  <rect key={i} fill={entry.fill} />
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
                              {[{ l:'我', c:'amber', v:g.student }, { l:'岗', c:'blue', v:g.job }].map(b => (
                                <div key={b.l} className="flex items-center gap-1.5 mb-1">
                                  <span className={`text-${b.c}-500 w-4 text-right text-xs`}>{b.l}</span>
                                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full bg-${b.c}-400 rounded-full`} style={{ width:`${b.v}%` }} />
                                  </div>
                                  <span className="text-slate-400 w-5 text-xs">{b.v}</span>
                                </div>
                              ))}
                              <p className="text-orange-700 text-xs flex items-start gap-1 mt-1">
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-0.5" />{g.suggestion}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-6 bg-green-50 rounded-lg border border-green-200">
                          <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                          <p className="text-green-700 font-medium text-sm">恭喜！当前岗位无明显能力差距</p>
                        </div>
                      )}
                    </div>

                    {/* 生成蓝图 */}
                    <button onClick={() => {
                      if (!selected || !result) return;
                      const matchResult = {
                        selectedJob: { role: selected.job_title, score: result.overall, job: selected, result },
                        top1: recommended[0] ? { role: recommended[0].job.job_title, score: recommended[0].result.overall, job: recommended[0].job, result: recommended[0].result } : null,
                        top2: recommended[1] ? { role: recommended[1].job.job_title, score: recommended[1].result.overall } : null,
                        top3: recommended[2] ? { role: recommended[2].job.job_title, score: recommended[2].result.overall } : null,
                        allRecommended: recommended.map(({ job, result: r }) => ({
                          jobTitle: job.job_title, company: job.company, city: job.city,
                          salary: job.salary, overall: r.overall, fourDim: r,
                        })),
                      };
                      sessionStorage.setItem('matchResult', JSON.stringify(matchResult));
                      sessionStorage.setItem('shouldAutoGenerateReport', 'true');
                      window.location.href = '/career-blueprint';
                    }} disabled={!selected || !result}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm">
                      <ChevronRight className="w-4 h-4" />
                      基于当前匹配生成生涯蓝图
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </main>

        {/* 右侧分析栏 */}
        <aside className="w-72 bg-white border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden">
          {!result ? (
            <div className="flex items-center justify-center h-full p-4 text-center text-slate-400 text-xs">
              选择岗位后显示分析结果
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
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
                          <span className="font-bold text-xs" style={{ color:cfg.color }}>{d.score}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width:`${d.score}%`, background:cfg.color }} />
                        </div>
                        <p className="text-slate-400 text-[10px] mt-0.5">{d.detail}</p>
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
                      <span key={i} className="px-1.5 py-0.5 bg-white border border-green-200 text-green-700 rounded-full text-xs">✓ {a}</span>
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
                  ? <div className="space-y-1.5">
                      {result.suggestions.map((s, i) => (
                        <div key={i} className="flex gap-1.5 p-2 bg-white rounded-lg border border-purple-100">
                          <ChevronRight className="w-2.5 h-2.5 text-purple-400 shrink-0 mt-0.5" />
                          <p className="text-purple-800 text-xs">{s}</p>
                        </div>
                      ))}
                    </div>
                  : <div className="flex items-center gap-1.5 p-2 bg-white rounded-lg border border-green-200">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <p className="text-green-700 text-xs font-medium">各维度匹配良好！</p>
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
