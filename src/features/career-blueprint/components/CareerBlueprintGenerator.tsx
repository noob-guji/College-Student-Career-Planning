'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Target, TrendingUp, Map, ClipboardList,
  CheckCircle2, ChevronRight, Loader2, RotateCcw,
  Star, ArrowRight, Lightbulb, Flag
} from 'lucide-react';

// ============================================================
// 功能5：生涯蓝图 — 职业生涯发展报告生成器
// ============================================================

interface ReportData {
  conclusion: {
    summary: string;
    targetRole: string;
    matchScore: number;
    strengths: string[];
    gaps: string[];
  };
  goals: {
    shortTerm: { period: string; objectives: string[]; milestones: string[] };
    midTerm: { period: string; objectives: string[]; milestones: string[] };
  };
  trends: {
    marketDemand: string;
    salaryRange: string;
    growthRate: string;
    hotSkills: string[];
    insights: string;
  };
  pathway: {
    steps: Array<{ stage: string; role: string; duration: string; description: string }>;
    alternativePaths: Array<{ name: string; reason: string }>;
  };
  actionPlan: {
    phases: Array<{
      phase: string;
      duration: string;
      learning: string[];
      practice: string[];
      certificates: string[];
    }>;
  };
  evaluation: {
    checkpoints: Array<{ time: string; metrics: string[]; adjustTrigger: string }>;
  };
}

interface CareerBlueprintGeneratorProps {
  targetRole?: string;
  matchScore?: number;
  userSkills?: string[];
  userCapabilities?: Array<{ subject: string; score: number }>;
  onReportGenerated?: (data: ReportData, reportId: string) => void;
}

const sectionConfig = [
  { id: 'conclusion', label: '职业探索与匹配结论', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'goals', label: '职业目标设定', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'trends', label: '行业趋势分析', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'pathway', label: '发展路径规划', icon: Map, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'actionPlan', label: '行动计划', icon: ClipboardList, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  { id: 'evaluation', label: '评估机制', icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
];

const generationSteps = [
  '解析能力画像数据...',
  '匹配行业岗位知识库...',
  '生成职业目标矩阵...',
  '规划发展路径图谱...',
  '制定分阶段行动计划...',
  '设置评估检查点...',
  '报告生成完成 ✓',
];

export default function CareerBlueprintGenerator({
  targetRole = '产品经理',
  matchScore = 92,
  userSkills = ['逻辑分析', '沟通表达', '项目管理'],
  userCapabilities = [
    { subject: '逻辑能力', score: 85 },
    { subject: '沟通表达', score: 90 },
    { subject: '执行落地', score: 78 },
    { subject: '创新思维', score: 82 },
    { subject: '领导团队', score: 65 },
    { subject: '抗压能力', score: 95 },
  ],
  onReportGenerated,
}: CareerBlueprintGeneratorProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [activeSection, setActiveSection] = useState('conclusion');
  const [error, setError] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  // ====================== 【要求添加：读取匹配结果】 ======================
  const [matchedJobs, setMatchedJobs] = useState<Array<{ jobTitle: string; company: string; overall: number; fourDim: any }>>([]);
  const [selectedJob, setSelectedJob] = useState<{ jobTitle: string; company: string; overall: number; fourDim: any } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('matchResult');
      if (raw) {
        const d = JSON.parse(raw);
        if (Array.isArray(d)) {
          setMatchedJobs(d);
          setSelectedJob(d[0]); // 默认选择第一个
        } else {
          setMatchedJobs([d]);
          setSelectedJob(d);
        }
      }
    } catch {}
  }, []);
  // ======================================================================

  const handleGenerate = async () => {
    setStatus('generating');
    setGenerationStep(0);
    setError('');

    const stepInterval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev < generationSteps.length - 2) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 400);

    try {
      const res = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },

        // ====================== 【要求修改：fetch body】 ======================
        body: JSON.stringify({
          targetRole: selectedJob?.jobTitle || targetRole,
          matchScore: selectedJob?.overall || matchScore,
          userProfile: {
            major: '计算机科学',
            grade: '大三',
            skills: userSkills,
            capabilities: userCapabilities.map(c => ({
              subject: c.subject,
              score: c.score,
            })),
            matchGaps: selectedJob?.fourDim?.gaps?.map((g: any) => g.dim) ?? [],
          },
        }),
        // ======================================================================
      });

      clearInterval(stepInterval);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();

      if (result.error) throw new Error(result.error);

      setGenerationStep(generationSteps.length - 1);
      await new Promise(r => setTimeout(r, 600));

      setReportData(result.data);
      setStatus('done');
      onReportGenerated?.(result.data, result.reportId);
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || '生成失败，请重试');
      setStatus('error');
    }
  };

  const renderConclusion = (data: ReportData['conclusion']) => (
    <div className="space-y-5">
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
        <div className="text-center shrink-0">
          <div className="text-3xl font-black text-amber-600">{data.matchScore}%</div>
          <div className="text-xs text-amber-700 font-medium mt-0.5">综合匹配度</div>
        </div>
        <div>
          <div className="font-bold text-slate-900 text-lg">目标岗位：{data.targetRole}</div>
          <div className="text-sm text-slate-600 mt-1 leading-relaxed">{data.summary}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
          <div className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 核心优势
          </div>
          {data.strengths.map((s, i) => (
            <div key={i} className="text-xs text-emerald-800 flex items-start gap-1.5 mt-1">
              <span className="text-emerald-500 shrink-0">▸</span>{s}
            </div>
          ))}
        </div>
        <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
          <div className="text-xs font-bold text-orange-700 mb-2 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5" /> 待提升点
          </div>
          {data.gaps.map((g, i) => (
            <div key={i} className="text-xs text-orange-800 flex items-start gap-1.5 mt-1">
              <span className="text-orange-400 shrink-0">▸</span>{g}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderGoals = (data: ReportData['goals']) => (
    <div className="space-y-4">
      {[data.shortTerm, data.midTerm].map((goal, idx) => (
        <div key={idx} className={`p-4 rounded-xl border ${idx === 0 ? 'bg-blue-50 border-blue-100' : 'bg-indigo-50 border-indigo-100'}`}>
          <div className={`font-bold text-sm mb-2 flex items-center gap-2 ${idx === 0 ? 'text-blue-700' : 'text-indigo-700'}`}>
            <Flag className="w-4 h-4" />
            {idx === 0 ? '短期目标' : '中期目标'} · {goal.period}
          </div>
          <ul className="space-y-1.5 mb-3">
            {goal.objectives.map((obj, i) => (
              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${idx === 0 ? 'text-blue-500' : 'text-indigo-500'}`} />
                {obj}
              </li>
            ))}
          </ul>
          <div className="border-t border-white/60 pt-2">
            <div className="text-xs font-medium text-slate-500 mb-1">关键里程碑</div>
            <div className="flex flex-wrap gap-2">
              {goal.milestones.map((m, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-full font-medium ${idx === 0 ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>
                  ✓ {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTrends = (data: ReportData['trends']) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
          <div className="text-xs text-emerald-600 font-medium mb-1">薪资区间</div>
          <div className="text-sm font-bold text-emerald-800">{data.salaryRange}</div>
        </div>
        <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg">
          <div className="text-xs text-teal-600 font-medium mb-1">需求增长率</div>
          <div className="text-sm font-bold text-teal-800">{data.growthRate}</div>
        </div>
      </div>
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed">
        <div className="font-medium text-slate-900 mb-1.5 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-600" /> 市场需求分析
        </div>
        {data.marketDemand}
      </div>
      <div>
        <div className="text-xs font-bold text-slate-600 mb-2">🔥 热门技能</div>
        <div className="flex flex-wrap gap-2">
          {data.hotSkills.map((skill, i) => (
            <span key={i} className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold rounded-full">
              {skill}
            </span>
          ))}
        </div>
      </div>
      <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg text-sm text-amber-800 italic leading-relaxed">
        💡 {data.insights}
      </div>
    </div>
  );

  const renderPathway = (data: ReportData['pathway']) => (
    <div className="space-y-5">
      <div className="relative">
        {data.steps.map((step, i) => (
          <div key={i} className="flex gap-4 mb-6 last:mb-0">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                {i + 1}
              </div>
              {i < data.steps.length - 1 && (
                <div className="w-0.5 flex-1 mt-2 bg-gradient-to-b from-purple-400 to-purple-200 min-h-[40px]" />
              )}
            </div>
            <div className="pb-2 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                  {step.stage} · {step.duration}
                </span>
              </div>
              <div className="font-bold text-slate-900 text-base">{step.role}</div>
              <div className="text-sm text-slate-600 mt-0.5 leading-relaxed">{step.description}</div>
            </div>
          </div>
        ))}
      </div>
      {data.alternativePaths.length > 0 && (
        <div>
          <div className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5" /> 可转型路径
          </div>
          <div className="space-y-2">
            {data.alternativePaths.map((path, i) => (
              <div key={i} className="p-3 bg-purple-50 rounded-lg border border-purple-100 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-purple-700 text-xs font-bold">{i + 1}</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{path.name}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{path.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderActionPlan = (data: ReportData['actionPlan']) => (
    <div className="space-y-4">
      {data.phases.map((phase, i) => (
        <div key={i} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-slate-900 text-sm">{phase.phase}</span>
            <span className="text-xs bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full font-medium">
              {phase.duration}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs font-bold text-blue-600 mb-1.5">📚 学习</div>
              {phase.learning.map((item, j) => (
                <div key={j} className="text-xs text-slate-700 flex items-start gap-1.5 mt-1">
                  <span className="text-blue-400 shrink-0">•</span>{item}
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-600 mb-1.5">🛠 实践</div>
              {phase.practice.map((item, j) => (
                <div key={j} className="text-xs text-slate-700 flex items-start gap-1.5 mt-1">
                  <span className="text-emerald-400 shrink-0">•</span>{item}
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs font-bold text-amber-600 mb-1.5">🏆 证书</div>
              {phase.certificates.map((item, j) => (
                <div key={j} className="text-xs text-slate-700 flex items-start gap-1.5 mt-1">
                  <span className="text-amber-400 shrink-0">•</span>{item}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEvaluation = (data: ReportData['evaluation']) => (
    <div className="space-y-3">
      {data.checkpoints.map((cp, i) => (
        <div key={i} className="p-4 rounded-xl border border-indigo-100 bg-indigo-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
              {cp.time}
            </div>
            <span className="font-semibold text-slate-900 text-sm">检查点</span>
          </div>
          <div className="mb-2">
            <div className="text-xs font-bold text-indigo-700 mb-1">达成指标</div>
            {cp.metrics.map((m, j) => (
              <div key={j} className="text-xs text-slate-700 flex items-start gap-1.5 mt-1">
                <CheckCircle2 className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />{m}
              </div>
            ))}
          </div>
          <div className="mt-2 p-2 bg-white/70 rounded-lg border border-indigo-100">
            <span className="text-xs font-medium text-slate-500">调整触发条件：</span>
            <span className="text-xs text-slate-700 ml-1">{cp.adjustTrigger}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSection = () => {
    if (!reportData) return null;
    switch (activeSection) {
      case 'conclusion': return renderConclusion(reportData.conclusion);
      case 'goals': return renderGoals(reportData.goals);
      case 'trends': return renderTrends(reportData.trends);
      case 'pathway': return renderPathway(reportData.pathway);
      case 'actionPlan': return renderActionPlan(reportData.actionPlan);
      case 'evaluation': return renderEvaluation(reportData.evaluation);
      default: return null;
    }
  };

  if (status === 'idle') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 px-8 text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 mb-2">AI 职业生涯蓝图</h3>
          <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
            基于您的能力画像与人岗匹配数据，生成包含6大模块的个性化职业规划报告，具备完整可操作性与可解释性。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
          {sectionConfig.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.id} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg ${s.bg} border ${s.border}`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-slate-700 font-medium text-center leading-tight">{s.label.replace('与', '\n与')}</span>
              </div>
            );
          })}
        </div>
        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-200 hover:shadow-amber-300 hover:scale-105 transition-all duration-200 text-sm"
        >
          <Sparkles className="w-4 h-4" />
          立即生成职业生涯蓝图
        </button>

        {/* ====================== 【要求修改：显示文字】 ====================== */}
        <p className="text-xs text-slate-400">
          {selectedJob
            ? `基于匹配岗位：${selectedJob.jobTitle} · 匹配度 ${selectedJob.overall}%`
            : `目标岗位：${targetRole} · 匹配度 ${matchScore}%`
          }
        </p>
        {/* ====================================================================== */}
      </motion.div>
    );
  }

  if (status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-amber-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-amber-500" />
          </div>
        </div>
        <div className="text-center">
          <div className="font-bold text-slate-900 text-lg mb-1">AI 正在生成报告</div>
          <div className="text-sm text-amber-600 font-medium">{generationSteps[generationStep]}</div>
        </div>
        <div className="w-64 space-y-1.5">
          {generationSteps.slice(0, -1).map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${i < generationStep ? 'bg-emerald-500' : i === generationStep ? 'bg-amber-500 animate-pulse' : 'bg-slate-200'}`}>
                {i < generationStep && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-xs transition-colors ${i <= generationStep ? 'text-slate-700' : 'text-slate-400'}`}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <div className="text-center">
          <div className="font-bold text-slate-900 mb-1">生成失败</div>
          <div className="text-sm text-red-600">{error}</div>
        </div>
        <button onClick={handleGenerate} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
          <RotateCcw className="w-4 h-4" /> 重新生成
        </button>
      </div>
    );
  }

  const activeConfig = sectionConfig.find(s => s.id === activeSection)!;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      <div className="flex gap-1.5 p-3 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0">
        {matchedJobs.length > 1 && (
          <div className="flex items-center gap-2 mr-4">
            <span className="text-xs font-medium text-slate-600">选择岗位：</span>
            <select
              value={selectedJob?.jobTitle || ''}
              onChange={(e) => {
                const job = matchedJobs.find(j => j.jobTitle === e.target.value);
                setSelectedJob(job || null);
              }}
              className="text-xs px-2 py-1 border border-slate-300 rounded-md bg-white"
            >
              {matchedJobs.map((job, i) => (
                <option key={i} value={job.jobTitle}>
                  {job.jobTitle} ({job.overall}%匹配)
                </option>
              ))}
            </select>
          </div>
        )}
        {sectionConfig.map(s => {
          const Icon = s.icon;
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? `${s.bg} ${s.color} ${s.border} border shadow-sm`
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          );
        })}
        <button
          onClick={handleGenerate}
          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg border border-transparent transition-all"
          title="重新生成"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className={`px-5 pt-4 pb-3 ${activeConfig.bg} border-b ${activeConfig.border} shrink-0`}>
        <div className={`flex items-center gap-2 font-bold text-base ${activeConfig.color}`}>
          <activeConfig.icon className="w-4 h-4" />
          {activeConfig.label}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5" ref={reportRef}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}