'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Compass, UserCircle, Map, FileText, GitBranch,
  BookMarked, Brain, ArrowRight, ChevronRight,
  CheckCircle2, AlertCircle, TrendingUp, Star,
  Target, Zap, BarChart2, Award, Clock
} from 'lucide-react';

interface Summary {
  name: string;
  major: string;
  education: string;
  skills: string[];
  selectedJobTypes: string[];
  careerDirection: string;
  completeness: number;
  hasMatchResult: boolean;
  matchTop1?: { role:string; score:number };
  matchTop2?: { role:string; score:number };
  matchTop3?: { role:string; score:number };
  hasReport: boolean;
  mbtiType?: string;
  mbtiTitle?: string;
  capabilities: Record<string,number>;
  capTopDim: string;
  capTopScore: number;
  salaryExp: string;
  targetCity: string;
}

function loadSummary(userName: string): Summary {
  try {
    const profile = JSON.parse(sessionStorage.getItem('careerProfile') ?? '{}');
    const match   = JSON.parse(sessionStorage.getItem('matchResult')  ?? '{}');
    const mbti    = JSON.parse(sessionStorage.getItem('mbtiResult')   ?? '{}');
    const hasReport = !!sessionStorage.getItem('lastReportId');

    const filledFields = [
      profile.name, profile.education, profile.major,
      profile.selectedJobTypes?.length, profile.skills?.length,
      Object.keys(profile.capabilities??{}).length > 0
        && Object.values(profile.capabilities??{}).some((v:any) => v !== 75),
    ].filter(Boolean).length;

    const caps: Record<string,number> = profile.capabilities ?? {};
    const topDimEntry = Object.entries(caps).sort((a,b) => b[1]-a[1])[0];

    return {
      name:             profile.name || userName,
      major:            profile.major || '',
      education:        profile.education || '',
      skills:           profile.skills ?? [],
      selectedJobTypes: profile.selectedJobTypes ?? [],
      careerDirection:  profile.careerDirection ?? '',
      // 修复：report 算作第3步，完整 = completeness>0 + match + report
      completeness:     Math.round(filledFields / 6 * 100),
      hasMatchResult:   !!match.top1?.role,
      matchTop1:        match.top1,
      matchTop2:        match.top2,
      matchTop3:        match.top3,
      hasReport,
      mbtiType:         mbti.type,
      mbtiTitle:        mbti.title,
      capabilities:     caps,
      capTopDim:        topDimEntry?.[0] ?? '',
      capTopScore:      topDimEntry?.[1] ?? 0,
      salaryExp:        profile.salaryExp ?? '',
      targetCity:       profile.targetCity ?? '',
    };
  } catch {
    return {
      name: userName, major:'', education:'', skills:[], selectedJobTypes:[], careerDirection:'',
      completeness: 0, hasMatchResult: false, hasReport: false,
      capabilities: {}, capTopDim:'', capTopScore:0, salaryExp:'', targetCity:'',
    };
  }
}

const STEPS = [
  { id:1, label:'填写能力画像',   href:'/self-cognition',       icon:UserCircle, desc:'完善个人技能与能力自评' },
  { id:2, label:'人岗智能匹配',   href:'/person-post-matching', icon:Map,         desc:'基于画像计算岗位匹配分' },
  { id:3, label:'生成生涯蓝图',   href:'/career-blueprint',     icon:FileText,    desc:'AI 生成个性化职业规划' },
];

const QUICK_LINKS = [
  { label:'岗位认知中心', href:'/roles',        icon:Compass,   color:'text-blue-600',   bg:'bg-blue-50',   border:'border-blue-100' },
  { label:'岗位图谱',     href:'/job-graph',    icon:GitBranch, color:'text-purple-600', bg:'bg-purple-50', border:'border-purple-100' },
  { label:'知识中枢',     href:'/knowledge-hub',icon:BookMarked,color:'text-amber-600',  bg:'bg-amber-50',  border:'border-amber-100' },
  { label:'智脑引擎',     href:'/ai-engine',    icon:Brain,     color:'text-emerald-600',bg:'bg-emerald-50',border:'border-emerald-100' },
];

// 六维能力标签
const CAP_LABELS: Record<string,string> = { 逻辑能力:'🧠', 沟通表达:'💬', 执行落地:'⚡', 创新思维:'💡', 领导团队:'👑', 抗压能力:'🛡️' };

export default function HomePage() {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<Summary|null>(null);

  useEffect(() => {
    const name = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? '同学';
    setSummary(loadSummary(name));
  }, [session]);

  const userName = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? '同学';
  const hour = new Date().getHours();
  const greeting = hour<6?'夜深了':hour<12?'早上好':hour<18?'下午好':'晚上好';

  // 修复：已有报告 = 完成所有3步
  const currentStep = !summary?.completeness ? 0
    : !summary.hasMatchResult ? 1
    : !summary.hasReport ? 2 : 3;

  const dims = ['逻辑能力','沟通表达','执行落地','创新思维','领导团队','抗压能力'];

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-5">
      {/* 问候区 */}
      <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}
        className="bg-gradient-to-r from-[#111827] to-[#1e293b] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute right-16 bottom-0 w-32 h-32 bg-blue-500/10 rounded-full translate-y-1/2 blur-xl" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-white/50 text-sm mb-1">{greeting}，欢迎回来 👋</p>
            <h1 className="text-2xl font-black text-white mb-2">{userName}</h1>
            {summary?.major && <p className="text-white/40 text-sm">{summary.major}{summary.education ? ` · ${summary.education}` : ''}{summary.targetCity ? ` · 意向城市：${summary.targetCity}` : ''}</p>}
          </div>
          <div className="text-right space-y-1">
            {summary?.matchTop1 && (
              <div className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                <Star className="w-3 h-3" />最佳匹配：{summary.matchTop1.role} · {summary.matchTop1.score}%
              </div>
            )}
            {summary?.mbtiType && (
              <div className="flex justify-end">
                <span className="text-xs bg-white/10 text-white/60 px-2.5 py-1 rounded-full">{summary.mbtiType} · {summary.mbtiTitle}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <div className="space-y-5">

          {/* 规划进度 */}
          <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.04 }}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">职业规划进度</h2>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${currentStep===3?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>
                {currentStep===3?'✅ 已完成':'完成 '+currentStep+'/3 步'}
              </span>
            </div>
            <div className="flex gap-2 mb-4">
              {[1,2,3].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i<=currentStep?'bg-amber-500':'bg-slate-100'}`} />
              ))}
            </div>
            <div className="space-y-2.5">
              {STEPS.map((step,i) => {
                const done = i < currentStep;
                const current = i === currentStep;
                const Icon = step.icon;
                return (
                  <Link key={step.id} href={step.href}
                    className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all group ${
                      current ? 'bg-amber-50 border-amber-200' : done ? 'bg-slate-50 border-slate-100' : 'border-dashed border-slate-200 opacity-60'
                    }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${done?'bg-emerald-100':current?'bg-amber-100':'bg-slate-100'}`}>
                      {done ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" /> : <Icon className={`w-4.5 h-4.5 ${current?'text-amber-600':'text-slate-400'}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${done?'text-slate-400 line-through':current?'text-amber-700':'text-slate-400'}`}>{step.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{step.desc}</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 ${current?'text-amber-500':'text-slate-300'}`} />
                  </Link>
                );
              })}
            </div>
          </motion.div>

          {/* 匹配结果 */}
          {summary?.hasMatchResult && (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.08 }}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-amber-500" />人岗匹配结果</h2>
              <div className="grid grid-cols-3 gap-3">
                {[summary.matchTop1, summary.matchTop2, summary.matchTop3].filter(Boolean).map((r,i) => (
                  <div key={i} className={`p-3 rounded-xl border text-center ${i===0?'bg-amber-50 border-amber-200':'bg-slate-50 border-slate-100'}`}>
                    <div className={`text-[10px] font-bold mb-1 ${i===0?'text-amber-600':'text-slate-400'}`}>TOP {i+1}</div>
                    <div className="font-bold text-slate-900 text-sm">{r!.role}</div>
                    <div className={`text-xl font-black mt-1 ${i===0?'text-amber-500':'text-slate-600'}`}>{r!.score}%</div>
                  </div>
                ))}
              </div>
              <Link href="/person-post-matching" className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium">
                查看详细分析 <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>
          )}

          {/* 快捷入口 */}
          <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.12 }}>
            <h2 className="font-bold text-slate-900 mb-3">功能入口</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {QUICK_LINKS.map(link => { const Icon = link.icon; return (
                <Link key={link.href} href={link.href}
                  className={`group flex flex-col items-center gap-2.5 p-4 rounded-xl border ${link.bg} ${link.border} hover:shadow-md transition-all`}>
                  <div className={`w-10 h-10 rounded-xl ${link.bg} flex items-center justify-center`}><Icon className={`w-5 h-5 ${link.color}`} /></div>
                  <span className="text-xs font-semibold text-slate-700 text-center">{link.label}</span>
                </Link>
              ); })}
            </div>
          </motion.div>
        </div>

        {/* 右侧：个人洞察区 */}
        <div className="space-y-4">

          {/* 能力画像完整度 */}
          <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.06 }}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5"><BarChart2 className="w-4 h-4 text-amber-500" />能力画像</h3>
              <Link href="/self-cognition" className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-0.5">
                {summary?.completeness===100?'已完善':'去完善'}<ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-black text-amber-500">{summary?.completeness??0}</span>
              <span className="text-slate-400 text-sm mb-1">%</span>
              {summary?.capTopDim && <span className="ml-auto text-xs text-slate-500">{CAP_LABELS[summary.capTopDim]} {summary.capTopDim} 最突出</span>}
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
              <motion.div initial={{ width:0 }} animate={{ width:`${summary?.completeness??0}%` }} transition={{ duration:0.8,delay:0.3 }}
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" />
            </div>
            {/* 6维能力简表 */}
            {summary && Object.keys(summary.capabilities).length > 0 && (
              <div className="space-y-1.5">
                {dims.map(d => {
                  const score = summary.capabilities[d] ?? 75;
                  const isDefault = score === 75;
                  return (
                    <div key={d} className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 w-14 shrink-0">{d}</span>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isDefault?'bg-slate-300':'bg-amber-400'}`} style={{ width:`${score}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold w-6 text-right shrink-0 ${isDefault?'text-slate-400':'text-amber-600'}`}>{score}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {(summary?.completeness??0) === 0 && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">完善画像可提升匹配准确度</p>
              </div>
            )}
          </motion.div>

          {/* 职业倾向 */}
          {(summary?.selectedJobTypes?.length??0) > 0 || summary?.careerDirection ? (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.1 }}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-1.5"><Zap className="w-4 h-4 text-blue-500" />职业倾向</h3>
              {summary?.selectedJobTypes?.length ? (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">期望岗位方向</p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.selectedJobTypes.map(j => <span key={j} className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full font-medium">{j}</span>)}
                  </div>
                </div>
              ) : null}
              {summary?.careerDirection && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">发展方向</p>
                  <span className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-semibold">{summary.careerDirection}</span>
                </div>
              )}
              {summary?.salaryExp && <p className="text-[11px] text-slate-500 mt-3">💰 期望薪资：{summary.salaryExp}</p>}
            </motion.div>
          ) : null}

          {/* 技能标签 */}
          {(summary?.skills?.length??0) > 0 && (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.12 }}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-1.5"><Award className="w-4 h-4 text-purple-500" />已掌握技能</h3>
              <div className="flex flex-wrap gap-1.5">
                {summary!.skills.slice(0,10).map(s => <span key={s} className="text-[11px] px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full">{s}</span>)}
                {summary!.skills.length>10 && <span className="text-[11px] px-2 py-1 bg-slate-100 text-slate-500 rounded-full">+{summary!.skills.length-10}</span>}
              </div>
            </motion.div>
          )}

          {/* MBTI + 生涯报告状态 */}
          {(summary?.mbtiType || summary?.hasReport) && (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.14 }}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              {summary?.mbtiType && (
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl border border-indigo-100">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <span className="text-indigo-700 font-black text-sm">{summary.mbtiType}</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{summary.mbtiTitle}</p>
                    <p className="text-xs text-slate-400">MBTI 性格类型</p>
                  </div>
                </div>
              )}
              {summary?.hasReport && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">生涯蓝图已生成</p>
                    <p className="text-xs text-slate-400">AI 职业规划报告已就绪</p>
                  </div>
                  <Link href="/career-blueprint" className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-0.5">
                    查看<ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {/* 空状态引导 */}
          {(summary?.completeness??0) === 0 && (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.16 }}
              className="bg-gradient-to-br from-slate-50 to-amber-50 border border-amber-100 rounded-2xl p-5 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3"><UserCircle className="w-6 h-6 text-amber-600" /></div>
              <p className="text-sm font-semibold text-slate-900 mb-1">还没有能力画像</p>
              <p className="text-xs text-slate-500 mb-3">填写个人信息，开启精准匹配</p>
              <Link href="/self-cognition"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors">
                立即填写 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
