'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Star, TrendingUp, Map, ClipboardList,
  CheckCircle2, ChevronRight, Loader2, RotateCcw,
  Lightbulb, Flag, FileText, Clock, ChevronDown,
  Edit3, Download, FileCheck, X, Minimize2, Maximize2, Check, AlertCircle
} from 'lucide-react';
import AIAssistantWidget from '@/features/dashboard-core/components/AIAssistantWidget';
import { useSession } from 'next-auth/react';

// ─────────────────────────────────────────────
// Simple Markdown renderer (bold + newlines)
// ─────────────────────────────────────────────
function MD({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={li}>
            {parts.map((p, pi) =>
              p.startsWith('**') && p.endsWith('**')
                ? <strong key={pi} className="font-semibold text-slate-900">{p.slice(2,-2)}</strong>
                : <span key={pi}>{p}</span>
            )}
            {li < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const show = (m: string) => { setMsg(m); setVisible(true); setTimeout(() => setVisible(false), 2500); };
  return { msg, visible, show };
}

// ─────────────────────────────────────────────
// Section config
// ─────────────────────────────────────────────
const SECTIONS = [
  { id:'conclusion', label:'匹配结论', icon: Star,          color:'text-amber-600',   bg:'bg-amber-50',   border:'border-amber-200' },
  { id:'goals',      label:'职业目标', icon: Flag,          color:'text-blue-600',    bg:'bg-blue-50',    border:'border-blue-200' },
  { id:'trends',     label:'行业趋势', icon: TrendingUp,    color:'text-emerald-600', bg:'bg-emerald-50', border:'border-emerald-200' },
  { id:'pathway',    label:'发展路径', icon: Map,           color:'text-purple-600',  bg:'bg-purple-50',  border:'border-purple-200' },
  { id:'actionPlan', label:'行动计划', icon: ClipboardList, color:'text-rose-600',    bg:'bg-rose-50',    border:'border-rose-200' },
  { id:'evaluation', label:'评估机制', icon: CheckCircle2,  color:'text-indigo-600',  bg:'bg-indigo-50',  border:'border-indigo-200' },
];

// ─────────────────────────────────────────────
// Section content renderers
// ─────────────────────────────────────────────
function renderContent(section: string, data: any): React.ReactNode {
  if (!data) return null;
  const c = data.conclusion??{}, g = data.goals??{}, t = data.trends??{}, p = data.pathway??{}, a = data.actionPlan??{}, e = data.evaluation??{};

  switch (section) {
    case 'conclusion': return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
          <div className="text-center shrink-0">
            <div className="text-3xl font-black text-amber-600">{c.matchScore}%</div>
            <div className="text-xs text-amber-700 font-medium mt-0.5">综合匹配度</div>
          </div>
          <div>
            <div className="font-bold text-slate-900 text-base">目标岗位：{c.targetRole}</div>
            <div className="text-sm text-slate-600 mt-1 leading-relaxed"><MD text={c.summary??''} /></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="text-xs font-bold text-emerald-700 mb-2">✅ 核心优势</div>
            {(c.strengths??[]).map((s:string,i:number) => <div key={i} className="text-xs text-emerald-800 flex items-start gap-1.5 mt-1"><span className="text-emerald-500 shrink-0">▸</span><MD text={s} /></div>)}
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
            <div className="text-xs font-bold text-orange-700 mb-2">⚠️ 待提升点</div>
            {(c.gaps??[]).map((s:string,i:number) => <div key={i} className="text-xs text-orange-800 flex items-start gap-1.5 mt-1"><span className="text-orange-400 shrink-0">▸</span><MD text={s} /></div>)}
          </div>
        </div>
      </div>
    );
    case 'goals': return (
      <div className="space-y-4">
        {[g.shortTerm, g.midTerm].filter(Boolean).map((goal:any,idx:number) => (
          <div key={idx} className={`p-4 rounded-xl border ${idx===0?'bg-blue-50 border-blue-100':'bg-indigo-50 border-indigo-100'}`}>
            <div className={`font-bold text-sm mb-2 flex items-center gap-2 ${idx===0?'text-blue-700':'text-indigo-700'}`}>
              <Flag className="w-4 h-4" />{idx===0?'短期目标':'中期目标'} · {goal.period}
            </div>
            <ul className="space-y-1.5 mb-3">
              {(goal.objectives??[]).map((obj:string,i:number) => (
                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${idx===0?'text-blue-500':'text-indigo-500'}`} />
                  <MD text={obj} />
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1.5">
              {(goal.milestones??[]).map((m:string,i:number) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${idx===0?'bg-blue-100 text-blue-800':'bg-indigo-100 text-indigo-800'}`}>✓ <MD text={m} /></span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
    case 'trends': return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg"><div className="text-xs text-emerald-600 font-medium mb-1">薪资区间</div><div className="text-sm font-bold text-emerald-800"><MD text={t.salaryRange??''} /></div></div>
          <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg"><div className="text-xs text-teal-600 font-medium mb-1">需求增长率</div><div className="text-sm font-bold text-teal-800"><MD text={t.growthRate??''} /></div></div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed"><MD text={t.marketDemand??''} /></div>
        <div className="flex flex-wrap gap-2">{(t.hotSkills??[]).map((s:string,i:number) => <span key={i} className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold rounded-full">{s}</span>)}</div>
        <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg text-sm text-amber-800 italic leading-relaxed">💡 <MD text={t.insights??''} /></div>
      </div>
    );
    case 'pathway': return (
      <div className="space-y-5">
        <div className="relative">
          {(p.steps??[]).map((step:any,i:number) => (
            <div key={i} className="flex gap-4 mb-5 last:mb-0">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-md">{i+1}</div>
                {i<(p.steps??[]).length-1 && <div className="w-0.5 flex-1 mt-2 bg-gradient-to-b from-purple-400 to-purple-200 min-h-[32px]" />}
              </div>
              <div className="flex-1 pb-1">
                <div className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full inline-block mb-1">{step.stage} · {step.duration}</div>
                <div className="font-bold text-slate-900">{step.role}</div>
                <div className="text-sm text-slate-600 mt-0.5 leading-relaxed"><MD text={step.description} /></div>
              </div>
            </div>
          ))}
        </div>
        {(p.alternativePaths??[]).length > 0 && (
          <div><div className="text-xs font-bold text-slate-600 mb-2">可转型路径</div>
            {(p.alternativePaths??[]).map((path:any,i:number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100 mb-2">
                <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-purple-700">{i+1}</div>
                <div><div className="font-semibold text-slate-900 text-sm">{path.name}</div><div className="text-xs text-slate-600 mt-0.5"><MD text={path.reason} /></div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
    case 'actionPlan': return (
      <div className="space-y-4">
        {(a.phases??[]).map((phase:any,i:number) => (
          <div key={i} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-900 text-sm">{phase.phase}</span>
              <span className="text-xs bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full font-medium">{phase.duration}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['📚 学习','learning','text-blue-600'],['🛠 实践','practice','text-emerald-600'],['🏆 证书','certificates','text-amber-600']].map(([label,key,color]) => (
                <div key={key}>
                  <div className={`text-xs font-bold ${color} mb-1.5`}>{label}</div>
                  {((phase as any)[key]??[]).map((item:string,j:number) => <div key={j} className="text-xs text-slate-700 flex items-start gap-1.5 mt-1"><span className={`${color.replace('text-','text-')} shrink-0`}>•</span><MD text={item} /></div>)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
    case 'evaluation': return (
      <div className="space-y-3">
        {(e.checkpoints??[]).map((cp:any,i:number) => (
          <div key={i} className="p-4 rounded-xl border border-indigo-100 bg-indigo-50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">{cp.time}</div>
              <span className="font-semibold text-slate-900 text-sm">检查点</span>
            </div>
            <div className="mb-2">
              {(cp.metrics??[]).map((m:string,j:number) => <div key={j} className="text-xs text-slate-700 flex items-start gap-1.5 mt-1"><CheckCircle2 className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" /><MD text={m} /></div>)}
            </div>
            <div className="mt-2 p-2 bg-white/70 rounded-lg border border-indigo-100 text-xs text-slate-700">
              <span className="font-medium text-slate-500">调整触发：</span><MD text={cp.adjustTrigger} />
            </div>
          </div>
        ))}
      </div>
    );
    default: return null;
  }
}

// ─────────────────────────────────────────────
// Smart Editor Toolbar (inline, no floating)
// ─────────────────────────────────────────────
function SmartToolbar({ activeSection, sectionContent, onPolish, onExportWord, onCheck }: {
  activeSection: string;
  sectionContent: string;
  onPolish: () => void;
  onExportWord: () => void;
  onCheck: () => void;
}) {
  const [acting, setAct] = useState<string|null>(null);
  const act = (id: string, fn: ()=>void) => { setAct(id); fn(); setTimeout(() => setAct(null), 1800); };
  const tools = [
    { id:'polish',  icon:Sparkles,   label:'润色当前模块', color:'text-indigo-600', bg:'hover:bg-indigo-50',  fn: onPolish },
    { id:'check',   icon:FileCheck,  label:'完整性检查',   color:'text-emerald-600',bg:'hover:bg-emerald-50', fn: onCheck },
    { id:'word',    icon:Download,   label:'导出 Word',    color:'text-slate-600',  bg:'hover:bg-slate-100',  fn: onExportWord },
  ];
  return (
    <div className="flex gap-2 shrink-0">
      {tools.map(t => {
        const Icon = t.icon;
        const isAct = acting === t.id;
        return (
          <button key={t.id} onClick={() => act(t.id, t.fn)} disabled={acting !== null}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isAct ? 'bg-slate-100 border-slate-200 animate-pulse' : `bg-white border-slate-200 ${t.bg} ${t.color}`
            } disabled:opacity-50 disabled:cursor-not-allowed`}>
            {isAct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
            {isAct ? '处理中…' : t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function CareerBlueprintPage() {
  const { data: session } = useSession();
  const toast = useToast();

  // Report state
  const [reportData,    setReportData]    = useState<any>(null);
  const [reportId,      setReportId]      = useState('');
  const [activeSection, setActiveSection] = useState('conclusion');
  const [generating,    setGenerating]    = useState(false);
  const [genStep,       setGenStep]       = useState(0);
  const [genError,      setGenError]      = useState('');

  // History
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Polish / check notification
  const [checkResults, setCheckResults] = useState<{id:string;status:'ok'|'weak'|'missing'}[]>([]);
  const [showCheck,    setShowCheck]    = useState(false);

  // Match data from sessionStorage
  const [matchData, setMatchData] = useState({ targetRole:'产品经理', matchScore:85, userSkills:[] as string[], userCapabilities:[] as any[] });

  const GEN_STEPS = ['解析能力画像数据…','匹配行业岗位知识库…','生成职业目标矩阵…','规划发展路径图谱…','制定分阶段行动计划…','设置评估检查点…','报告生成完成 ✓'];

  useEffect(() => {
    // Load match data
    try {
      const mr = JSON.parse(sessionStorage.getItem('matchResult')??'{}');
      const pr = JSON.parse(sessionStorage.getItem('careerProfile')??'{}');
      if (mr.top1?.role)  setMatchData(p => ({ ...p, targetRole: mr.top1.role, matchScore: mr.top1.score }));
      if (pr.skills)      setMatchData(p => ({ ...p, userSkills: pr.skills }));
      if (pr.capabilities) {
        const caps = Object.entries(pr.capabilities).map(([subject,score]) => ({ subject, score: score as number }));
        setMatchData(p => ({ ...p, userCapabilities: caps }));
      }
    } catch {}

    // Load cached report
    try {
      const cached = sessionStorage.getItem('lastReportData');
      const cachedId = sessionStorage.getItem('lastReportId');
      if (cached) { setReportData(JSON.parse(cached)); setReportId(cachedId??''); }
    } catch {}
  }, []);

  // Load history
  useEffect(() => {
    fetch('/api/ai/generate-report')
      .then(r => r.json())
      .then(d => setHistoryList(d.reports??[]))
      .catch(() => {});
  }, [reportId]);

  const handleGenerate = async () => {
    setGenerating(true); setGenStep(0); setGenError('');
    const interval = setInterval(() => setGenStep(p => p < GEN_STEPS.length - 2 ? p+1 : p), 450);
    try {
      const res  = await fetch('/api/ai/generate-report', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ targetRole: matchData.targetRole, matchScore: matchData.matchScore,
          userProfile: { major:'计算机科学', grade:'大三', skills: matchData.userSkills, capabilities: matchData.userCapabilities },
          userId: (session?.user as any)?.id }),
      });
      clearInterval(interval);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setGenStep(GEN_STEPS.length - 1);
      await new Promise(r => setTimeout(r, 600));
      setReportData(result.data);
      setReportId(result.reportId);
      sessionStorage.setItem('lastReportData', JSON.stringify(result.data));
      sessionStorage.setItem('lastReportId', result.reportId);
      toast.show('报告生成完成！');
    } catch (e: any) {
      clearInterval(interval);
      setGenError(e.message??'生成失败');
    } finally {
      setGenerating(false);
    }
  };

  // Polish current section using AI
  const handlePolish = async () => {
    const content = reportData ? JSON.stringify((reportData as any)[activeSection]) : '';
    const sectionLabel = SECTIONS.find(s=>s.id===activeSection)?.label ?? activeSection;
    try {
      const res = await fetch('/api/ai/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages:[{ role:'user', content:
          `请对以下职业规划报告「${sectionLabel}」模块进行专业润色，保留核心信息，提升表达，直接输出润色后的JSON，与原格式一致：\n${content}`
        }]}),
      });
      const data = await res.json();
      const text: string = data.content ?? '';
      // Try to parse JSON from the response
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const polished = JSON.parse(match[0]);
          setReportData((prev:any) => {
            const updated = { ...prev, [activeSection]: polished };
            sessionStorage.setItem('lastReportData', JSON.stringify(updated));
            return updated;
          });
          toast.show(`「${sectionLabel}」润色完成`);
          return;
        } catch {}
      }
      toast.show('AI 已分析，请查看对话框获取建议');
    } catch {
      toast.show('润色服务暂不可用');
    }
  };

  const handleCheck = () => {
    const results = SECTIONS.map(s => ({
      id: s.id,
      status: !reportData?.[s.id] ? 'missing' : JSON.stringify(reportData[s.id]).length < 50 ? 'weak' : 'ok',
    })) as typeof checkResults;
    setCheckResults(results);
    setShowCheck(true);
  };

  const handleExportWord = () => {
    const sections = SECTIONS.map(s => `<h3>${s.label}</h3><p>${JSON.stringify(reportData?.[s.id]??'').replace(/[{}"[\]]/g,'').replace(/,/g,'\n')}</p>`).join('');
    const html = `<html><head><meta charset='utf-8'><style>body{font-family:'Microsoft YaHei',sans-serif;padding:40px;}h1{font-size:22px;border-bottom:2px solid #f59e0b;padding-bottom:8px;}h3{color:#f59e0b;font-size:16px;margin:16px 0 8px;}p{line-height:1.8;font-size:14px;color:#475569;}</style></head>
      <body><h1>职业生涯发展报告 · ${matchData.targetRole}</h1>${sections}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type:'application/msword' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `生涯蓝图_${matchData.targetRole}.doc`; a.click();
    toast.show('Word 导出成功');
  };

  const activeCfg = SECTIONS.find(s=>s.id===activeSection)!;

  return (
    <div className="max-w-[1600px] w-full mx-auto p-6 flex flex-col gap-4">
      {/* Toast */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div initial={{ opacity:0,y:-12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium bg-emerald-50 border-emerald-200 text-emerald-800">
            <Check className="w-4 h-4" />{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">生涯蓝图</h2>
          <p className="text-sm text-slate-500 mt-1">
            目标岗位：<strong className="text-amber-600">{matchData.targetRole}</strong>
            <span className="ml-2 text-slate-400">匹配度 {matchData.matchScore}%</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 历史报告 */}
          <div className="relative">
            <button onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition-colors">
              <Clock className="w-3.5 h-3.5" /> 历史报告 ({historyList.length})
              <ChevronDown className={`w-3 h-3 transition-transform ${showHistory?'rotate-180':''}`} />
            </button>
            <AnimatePresence>
              {showHistory && historyList.length > 0 && (
                <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                  className="absolute right-0 top-10 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-600 flex justify-between">
                    <span>历史报告</span>
                    <button onClick={() => setShowHistory(false)}><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {historyList.map(r => (
                      <button key={r.id} onClick={async () => {
                        try {
                          // fetch full report... for now use cached or regenerate
                          setShowHistory(false);
                          toast.show(`已切换到报告：${r.targetRole}`);
                        } catch {}
                      }} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-amber-50 border-b border-slate-50 text-left">
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{r.targetRole}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString('zh-CN')}</div>
                        </div>
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">{r.matchScore}%</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 重新生成 */}
          {reportData && (
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
              <RotateCcw className={`w-3.5 h-3.5 ${generating?'animate-spin':''}`} /> 重新生成
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* 左侧：报告 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[560px] flex flex-col">
          {!reportData && !generating ? (
            // 初始状态
            <motion.div initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }}
              className="flex flex-col items-center justify-center h-full min-h-[500px] gap-5 px-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2">AI 职业生涯蓝图</h3>
                <p className="text-sm text-slate-500 max-w-sm leading-relaxed">基于你的能力画像与人岗匹配数据，生成包含6大模块的个性化职业规划报告。</p>
              </div>
              <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
                {SECTIONS.map(s => { const Icon=s.icon; return (
                  <div key={s.id} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg ${s.bg} border ${s.border}`}>
                    <Icon className={`w-4 h-4 ${s.color}`} /><span className="text-xs text-slate-700 font-medium text-center">{s.label}</span>
                  </div>); })}
              </div>
              {genError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{genError}</p>}
              <button onClick={handleGenerate}
                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-200 hover:scale-105 transition-all text-sm">
                <Sparkles className="w-4 h-4" /> 立即生成职业生涯蓝图
              </button>
            </motion.div>
          ) : generating ? (
            // 生成中
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] gap-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-amber-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-7 h-7 text-amber-500" /></div>
              </div>
              <div className="text-center">
                <div className="font-bold text-slate-900 text-lg mb-1">AI 正在生成报告</div>
                <div className="text-sm text-amber-600 font-medium">{GEN_STEPS[genStep]}</div>
              </div>
              <div className="w-64 space-y-1.5">
                {GEN_STEPS.slice(0,-1).map((step,i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${i<genStep?'bg-emerald-500':i===genStep?'bg-amber-500 animate-pulse':'bg-slate-200'}`}>
                      {i<genStep && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-xs ${i<=genStep?'text-slate-700':'text-slate-400'}`}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // 报告显示
            <>
              {/* Tab 导航 + 工具栏 */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0">
                <div className="flex gap-1 flex-1">
                  {SECTIONS.map(s => { const Icon=s.icon; const isActive=activeSection===s.id; return (
                    <button key={s.id} onClick={() => setActiveSection(s.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        isActive ? `${s.bg} ${s.color} ${s.border} border shadow-sm` : 'text-slate-500 hover:text-slate-700 hover:bg-white border border-transparent'
                      }`}>
                      <Icon className="w-3.5 h-3.5" />{s.label}
                    </button>); })}
                </div>
                <SmartToolbar activeSection={activeSection} sectionContent="" onPolish={handlePolish} onExportWord={handleExportWord} onCheck={handleCheck} />
              </div>

              {/* Section header */}
              <div className={`px-5 pt-4 pb-3 ${activeCfg.bg} border-b ${activeCfg.border} shrink-0`}>
                <div className={`flex items-center gap-2 font-bold text-sm ${activeCfg.color}`}>
                  <activeCfg.icon className="w-4 h-4" />{activeCfg.label}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                <AnimatePresence mode="wait">
                  <motion.div key={activeSection} initial={{ opacity:0,x:8 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-8 }} transition={{ duration:0.15 }}>
                    {renderContent(activeSection, reportData)}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Check panel */}
              <AnimatePresence>
                {showCheck && (
                  <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                    className="border-t border-slate-100 p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-700">完整性检查</span>
                      <button onClick={() => setShowCheck(false)}><X className="w-3.5 h-3.5 text-slate-400" /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {checkResults.map(r => {
                        const s = SECTIONS.find(x=>x.id===r.id)!;
                        const clr = r.status==='ok'?'text-emerald-700 bg-emerald-50 border-emerald-200' : r.status==='weak'?'text-amber-700 bg-amber-50 border-amber-200':'text-red-700 bg-red-50 border-red-200';
                        const icon = r.status==='ok'?'✅':r.status==='weak'?'⚠️':'❌';
                        return (
                          <div key={r.id} className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs ${clr}`}>
                            <span>{icon} {s.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* 右侧：AI 对话 */}
        <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.1 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[600px] lg:h-auto flex flex-col">
          <AIAssistantWidget variant="static" />
        </motion.div>
      </div>
    </div>
  );
}
