'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Star, TrendingUp, Map, ClipboardList,
  CheckCircle2, ChevronRight, Loader2, RotateCcw,
  Lightbulb, Flag, Clock, ChevronDown, FileCheck,
  X, Check, Edit3, Save, Printer, FileText,
} from 'lucide-react';
import AIAssistantWidget from '@/features/dashboard-core/components/AIAssistantWidget';
import { useSession } from 'next-auth/react';

// ─────────────────────────────────────────────
// Markdown 渲染（粗体 + 换行）
// ─────────────────────────────────────────────
function MD({ text }: { text: string }) {
  if (!text) return null;
  return (
    <>
      {text.split('\n').map((line, li, arr) => (
        <span key={li}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((p, pi) =>
            p.startsWith('**') && p.endsWith('**')
              ? <strong key={pi} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>
              : <span key={pi}>{p}</span>
          )}
          {li < arr.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────
function useToast() {
  const [state, setState] = useState({ msg: '', visible: false, type: 'success' as 'success' | 'error' });
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    setState({ msg, visible: true, type });
    setTimeout(() => setState(p => ({ ...p, visible: false })), 2500);
  };
  return { ...state, show };
}

// ─────────────────────────────────────────────
// Section 配置
// ─────────────────────────────────────────────
const SECTIONS = [
  { id: 'conclusion', label: '匹配结论',  icon: Star,          color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  { id: 'goals',      label: '职业目标',  icon: Flag,          color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  { id: 'trends',     label: '行业趋势',  icon: TrendingUp,    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'pathway',    label: '发展路径',  icon: Map,           color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  { id: 'actionPlan', label: '行动计划',  icon: ClipboardList, color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  { id: 'evaluation', label: '评估机制',  icon: CheckCircle2,  color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
];

// ─────────────────────────────────────────────
// 将 reportData 转为纯文本（用于编辑和导出）
// ─────────────────────────────────────────────
function sectionToText(section: string, data: any): string {
  if (!data) return '';
  const c = data.conclusion ?? {};
  const g = data.goals ?? {};
  const t = data.trends ?? {};
  const p = data.pathway ?? {};
  const a = data.actionPlan ?? {};
  const e = data.evaluation ?? {};

  switch (section) {
    case 'conclusion':
      return [
        `目标岗位：${c.targetRole ?? ''}`,
        `综合匹配度：${c.matchScore ?? ''}%`,
        ``,
        c.summary ?? '',
        ``,
        `核心优势：`,
        ...(c.strengths ?? []).map((s: string) => `• ${s}`),
        ``,
        `待提升点：`,
        ...(c.gaps ?? []).map((s: string) => `• ${s}`),
      ].join('\n');

    case 'goals':
      return [
        `【短期目标 · ${g.shortTerm?.period ?? '1年内'}】`,
        ...(g.shortTerm?.objectives ?? []).map((o: string) => `• ${o}`),
        ``,
        `里程碑：${(g.shortTerm?.milestones ?? []).join('、')}`,
        ``,
        `【中期目标 · ${g.midTerm?.period ?? '3-5年'}】`,
        ...(g.midTerm?.objectives ?? []).map((o: string) => `• ${o}`),
        ``,
        `里程碑：${(g.midTerm?.milestones ?? []).join('、')}`,
      ].join('\n');

    case 'trends':
      return [
        `薪资区间：${t.salaryRange ?? ''}`,
        `需求增长率：${t.growthRate ?? ''}`,
        ``,
        `市场需求分析：`,
        t.marketDemand ?? '',
        ``,
        `热门技能：${(t.hotSkills ?? []).join('、')}`,
        ``,
        `趋势洞察：${t.insights ?? ''}`,
      ].join('\n');

    case 'pathway':
      return [
        `发展阶段：`,
        ...(p.steps ?? []).map((s: any) => `【${s.stage} · ${s.duration}】${s.role}\n  ${s.description}`),
        ``,
        `可转型路径：`,
        ...(p.alternativePaths ?? []).map((x: any) => `• ${x.name}：${x.reason}`),
      ].join('\n');

    case 'actionPlan':
      return (a.phases ?? []).map((ph: any) => [
        `【${ph.phase} · ${ph.duration}】`,
        `学习任务：${(ph.learning ?? []).join('；')}`,
        `实践任务：${(ph.practice ?? []).join('；')}`,
        `目标证书：${(ph.certificates ?? []).join('；')}`,
      ].join('\n')).join('\n\n');

    case 'evaluation':
      return (e.checkpoints ?? []).map((cp: any) => [
        `【${cp.time}检查点】`,
        `达成指标：${(cp.metrics ?? []).join('；')}`,
        `调整触发条件：${cp.adjustTrigger ?? ''}`,
      ].join('\n')).join('\n\n');

    default: return '';
  }
}

// ─────────────────────────────────────────────
// 将编辑后文本回写到 reportData
// （简单回写：把文本整体放入 summary / description 字段）
// ─────────────────────────────────────────────
function textToSectionData(section: string, text: string, original: any): any {
  // 保留原有结构，把纯文本作为 summary/description 覆盖
  switch (section) {
    case 'conclusion':
      return { ...original.conclusion, summary: text };
    case 'goals':
      return { ...original.goals, _editedText: text };
    case 'trends':
      return { ...original.trends, _editedText: text };
    case 'pathway':
      return { ...original.pathway, _editedText: text };
    case 'actionPlan':
      return { ...original.actionPlan, _editedText: text };
    case 'evaluation':
      return { ...original.evaluation, _editedText: text };
    default: return original[section];
  }
}

// ─────────────────────────────────────────────
// 渲染内容（带 _editedText 优先展示）
// ─────────────────────────────────────────────
function SectionView({ section, data }: { section: string; data: any }) {
  if (!data) return null;
  const c = data.conclusion ?? {};
  const g = data.goals ?? {};
  const t = data.trends ?? {};
  const p = data.pathway ?? {};
  const a = data.actionPlan ?? {};
  const e = data.evaluation ?? {};

  // 如果有手动编辑的文本，直接展示纯文本
  const sectionData = data[section];
  if (sectionData?._editedText) {
    return (
      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 rounded-xl p-4 border border-slate-100">
        {sectionData._editedText}
      </div>
    );
  }

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
            <div className="text-sm text-slate-600 mt-1 leading-relaxed"><MD text={c.summary ?? ''} /></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="text-xs font-bold text-emerald-700 mb-2">✅ 核心优势</div>
            {(c.strengths ?? []).map((s: string, i: number) => <div key={i} className="text-xs text-emerald-800 flex items-start gap-1.5 mt-1"><span className="text-emerald-500 shrink-0">▸</span><MD text={s} /></div>)}
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
            <div className="text-xs font-bold text-orange-700 mb-2">⚠️ 待提升点</div>
            {(c.gaps ?? []).map((s: string, i: number) => <div key={i} className="text-xs text-orange-800 flex items-start gap-1.5 mt-1"><span className="text-orange-400 shrink-0">▸</span><MD text={s} /></div>)}
          </div>
        </div>
      </div>
    );
    case 'goals': return (
      <div className="space-y-4">
        {[g.shortTerm, g.midTerm].filter(Boolean).map((goal: any, idx: number) => (
          <div key={idx} className={`p-4 rounded-xl border ${idx === 0 ? 'bg-blue-50 border-blue-100' : 'bg-indigo-50 border-indigo-100'}`}>
            <div className={`font-bold text-sm mb-2 flex items-center gap-2 ${idx === 0 ? 'text-blue-700' : 'text-indigo-700'}`}>
              <Flag className="w-4 h-4" />{idx === 0 ? '短期目标' : '中期目标'} · {goal.period}
            </div>
            <ul className="space-y-1.5 mb-3">
              {(goal.objectives ?? []).map((obj: string, i: number) => (
                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${idx === 0 ? 'text-blue-500' : 'text-indigo-500'}`} />
                  <MD text={obj} />
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1.5">
              {(goal.milestones ?? []).map((m: string, i: number) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${idx === 0 ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>✓ {m}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
    case 'trends': return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg"><div className="text-xs text-emerald-600 font-medium mb-1">薪资区间</div><div className="text-sm font-bold text-emerald-800"><MD text={t.salaryRange ?? ''} /></div></div>
          <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg"><div className="text-xs text-teal-600 font-medium mb-1">需求增长率</div><div className="text-sm font-bold text-teal-800"><MD text={t.growthRate ?? ''} /></div></div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed"><MD text={t.marketDemand ?? ''} /></div>
        <div className="flex flex-wrap gap-2">{(t.hotSkills ?? []).map((s: string, i: number) => <span key={i} className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold rounded-full">{s}</span>)}</div>
        <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg text-sm text-amber-800 italic leading-relaxed">💡 <MD text={t.insights ?? ''} /></div>
      </div>
    );
    case 'pathway': return (
      <div className="space-y-5">
        {(p.steps ?? []).map((step: any, i: number) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-md">{i + 1}</div>
              {i < (p.steps ?? []).length - 1 && <div className="w-0.5 flex-1 mt-2 bg-gradient-to-b from-purple-400 to-purple-200 min-h-[32px]" />}
            </div>
            <div className="flex-1 pb-1">
              <div className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full inline-block mb-1">{step.stage} · {step.duration}</div>
              <div className="font-bold text-slate-900">{step.role}</div>
              <div className="text-sm text-slate-600 mt-0.5 leading-relaxed"><MD text={step.description} /></div>
            </div>
          </div>
        ))}
        {(p.alternativePaths ?? []).length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-600 mb-2">可转型路径</div>
            {(p.alternativePaths ?? []).map((path: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100 mb-2">
                <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center shrink-0 text-xs font-bold text-purple-700">{i + 1}</div>
                <div><div className="font-semibold text-slate-900 text-sm">{path.name}</div><div className="text-xs text-slate-600 mt-0.5"><MD text={path.reason} /></div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
    case 'actionPlan': return (
      <div className="space-y-4">
        {(a.phases ?? []).map((phase: any, i: number) => (
          <div key={i} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-900 text-sm">{phase.phase}</span>
              <span className="text-xs bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full font-medium">{phase.duration}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {([['📚 学习', 'learning', 'text-blue-600'], ['🛠 实践', 'practice', 'text-emerald-600'], ['🏆 证书', 'certificates', 'text-amber-600']] as const).map(([label, key, color]) => (
                <div key={key}>
                  <div className={`text-xs font-bold ${color} mb-1.5`}>{label}</div>
                  {((phase as any)[key] ?? []).map((item: string, j: number) => <div key={j} className="text-xs text-slate-700 flex items-start gap-1.5 mt-1"><span className="text-slate-400 shrink-0">•</span><MD text={item} /></div>)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
    case 'evaluation': return (
      <div className="space-y-3">
        {(e.checkpoints ?? []).map((cp: any, i: number) => (
          <div key={i} className="p-4 rounded-xl border border-indigo-100 bg-indigo-50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">{cp.time}</div>
              <span className="font-semibold text-slate-900 text-sm">检查点</span>
            </div>
            {(cp.metrics ?? []).map((m: string, j: number) => <div key={j} className="text-xs text-slate-700 flex items-start gap-1.5 mt-1"><CheckCircle2 className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" /><MD text={m} /></div>)}
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
// 导出 PDF — print CSS（全部6模块，中文排版）
// ─────────────────────────────────────────────
function buildPrintHTML(reportData: any, matchData: { targetRole: string; matchScore: number }): string {
  const c = reportData?.conclusion ?? {};
  const g = reportData?.goals ?? {};
  const t = reportData?.trends ?? {};
  const p = reportData?.pathway ?? {};
  const a = reportData?.actionPlan ?? {};
  const e = reportData?.evaluation ?? {};

  const row = (label: string, value: string) =>
    `<div class="row"><span class="label">${label}</span><span class="value">${value}</span></div>`;

  const list = (items: string[]) =>
    items.map(item => `<li>${item}</li>`).join('');

  const badge = (text: string, cls = '') =>
    `<span class="badge ${cls}">${text}</span>`;

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>职业生涯发展报告 · ${matchData.targetRole}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Microsoft YaHei', 'PingFang SC', 'SimHei', sans-serif; font-size: 13px; color: #1e293b; background: #fff; line-height: 1.7; }
  @page { size: A4; margin: 18mm 16mm 18mm 16mm; }

  /* 封面 */
  .cover { page-break-after: always; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg,#0f172a 0%,#1e293b 100%); color: white; text-align: center; padding: 40px; }
  .cover-logo { font-size: 48px; font-weight: 900; color: #f59e0b; margin-bottom: 24px; letter-spacing: 2px; }
  .cover-title { font-size: 28px; font-weight: 900; margin-bottom: 12px; color: #f8fafc; }
  .cover-sub { font-size: 15px; color: rgba(255,255,255,0.5); margin-bottom: 40px; }
  .cover-meta { display: flex; gap: 40px; justify-content: center; }
  .cover-meta-item { text-align: center; }
  .cover-meta-item .big { font-size: 36px; font-weight: 900; color: #f59e0b; }
  .cover-meta-item .small { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 4px; }
  .cover-date { margin-top: 48px; font-size: 12px; color: rgba(255,255,255,0.3); }

  /* 正文 */
  .section { margin-bottom: 32px; page-break-inside: avoid; }
  .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; }
  .section-num { width: 26px; height: 26px; background: #f59e0b; color: #1e293b; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; flex-shrink: 0; }
  .section-title { font-size: 16px; font-weight: 900; color: #0f172a; }

  .highlight-box { background: linear-gradient(135deg,#fffbeb,#fef3c7); border: 1px solid #fde68a; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
  .highlight-box .score { font-size: 40px; font-weight: 900; color: #d97706; float: right; line-height: 1; }
  .highlight-box .role { font-size: 17px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
  .highlight-box .summary { font-size: 12px; color: #475569; line-height: 1.7; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
  .card-title { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
  .card ul { list-style: none; padding: 0; }
  .card ul li { font-size: 12px; color: #334155; padding: 3px 0; padding-left: 14px; position: relative; }
  .card ul li::before { content: '▸'; position: absolute; left: 0; color: #f59e0b; }

  .goal-block { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
  .goal-block.mid { background: #eef2ff; border-color: #c7d2fe; }
  .goal-label { font-size: 11px; font-weight: 700; color: #1d4ed8; margin-bottom: 8px; }
  .goal-block.mid .goal-label { color: #4338ca; }
  .goal-block ul { list-style: none; padding: 0; }
  .goal-block ul li { font-size: 12px; color: #1e40af; padding: 3px 0 3px 16px; position: relative; }
  .goal-block ul li::before { content: '›'; position: absolute; left: 0; font-weight: 700; }
  .milestones { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .milestone { font-size: 11px; background: rgba(255,255,255,0.7); border: 1px solid #93c5fd; border-radius: 20px; padding: 2px 10px; color: #1d4ed8; }

  .info-row { display: flex; gap: 12px; margin-bottom: 12px; }
  .info-card { flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; }
  .info-card.alt { background: #f0fdfa; border-color: #99f6e4; }
  .info-card .info-label { font-size: 10px; color: #059669; font-weight: 700; margin-bottom: 4px; }
  .info-card .info-value { font-size: 13px; font-weight: 700; color: #065f46; }
  .body-text { font-size: 12px; color: #334155; line-height: 1.8; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
  .skills-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .skill-tag { font-size: 11px; background: linear-gradient(90deg,#10b981,#0891b2); color: white; border-radius: 20px; padding: 3px 12px; font-weight: 600; }
  .insight-box { border-left: 4px solid #f59e0b; background: #fffbeb; padding: 12px 14px; border-radius: 0 8px 8px 0; font-size: 12px; color: #78350f; font-style: italic; }

  .step-row { display: flex; gap: 14px; margin-bottom: 14px; align-items: flex-start; }
  .step-num { width: 30px; height: 30px; background: #7c3aed; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px; flex-shrink: 0; margin-top: 2px; }
  .step-content { flex: 1; }
  .step-badge { display: inline-block; font-size: 10px; font-weight: 700; color: #7c3aed; background: #f3e8ff; border: 1px solid #d8b4fe; border-radius: 20px; padding: 2px 10px; margin-bottom: 4px; }
  .step-role { font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 3px; }
  .step-desc { font-size: 12px; color: #475569; }
  .alt-paths { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 12px; margin-top: 14px; }
  .alt-path-label { font-size: 11px; font-weight: 700; color: #7c3aed; margin-bottom: 8px; }
  .alt-path-item { display: flex; gap: 8px; margin-bottom: 6px; align-items: flex-start; font-size: 12px; color: #4c1d95; }

  .phase-block { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 12px; background: white; }
  .phase-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .phase-title { font-size: 13px; font-weight: 700; color: #0f172a; }
  .phase-period { font-size: 11px; background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; border-radius: 20px; padding: 2px 10px; font-weight: 600; }
  .phase-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  .phase-col-title { font-size: 11px; font-weight: 700; margin-bottom: 6px; }
  .phase-col-title.blue { color: #2563eb; }
  .phase-col-title.green { color: #059669; }
  .phase-col-title.amber { color: #d97706; }
  .phase-col ul { list-style: none; padding: 0; }
  .phase-col ul li { font-size: 11px; color: #334155; padding: 2px 0 2px 12px; position: relative; }
  .phase-col ul li::before { content: '•'; position: absolute; left: 0; color: #94a3b8; }

  .checkpoint { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 14px; margin-bottom: 10px; }
  .checkpoint-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .checkpoint-time { background: #4f46e5; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0; }
  .checkpoint-label { font-size: 13px; font-weight: 700; color: #1e293b; }
  .checkpoint ul { list-style: none; padding: 0; }
  .checkpoint ul li { font-size: 12px; color: #3730a3; padding: 2px 0 2px 16px; position: relative; }
  .checkpoint ul li::before { content: '✓'; position: absolute; left: 0; color: #6366f1; font-weight: 700; }
  .trigger-box { margin-top: 8px; background: rgba(255,255,255,0.6); border: 1px solid #c7d2fe; border-radius: 6px; padding: 8px 10px; font-size: 11px; color: #4338ca; }
  .trigger-box .trigger-label { font-weight: 700; color: #64748b; margin-right: 4px; }

  .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
  .page-break { page-break-before: always; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- ═══ 封面 ═══ -->
<div class="cover">
  <div class="cover-logo">职业生涯蓝图</div>
  <div class="cover-title">个性化职业规划报告</div>
  <div class="cover-sub">基于 AI 大模型深度生成 · 包含六大核心规划模块</div>
  <div class="cover-meta">
    <div class="cover-meta-item"><div class="big">${matchData.targetRole}</div><div class="small">目标岗位</div></div>
    <div class="cover-meta-item"><div class="big">${matchData.matchScore}%</div><div class="small">综合匹配度</div></div>
  </div>
  <div class="cover-date">生成日期：${new Date().toLocaleDateString('zh-CN', { year:'numeric',month:'long',day:'numeric' })}</div>
</div>

<div class="page-break"></div>

<!-- ═══ 第一节：匹配结论 ═══ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">1</div>
    <div class="section-title">职业探索与匹配结论</div>
  </div>
  <div class="highlight-box">
    <div class="score">${c.matchScore ?? matchData.matchScore}%</div>
    <div class="role">目标岗位：${c.targetRole ?? matchData.targetRole}</div>
    <div class="summary">${c.summary ?? ''}</div>
    <div style="clear:both"></div>
  </div>
  <div class="two-col">
    <div class="card">
      <div class="card-title">✅ 核心优势</div>
      <ul>${list(c.strengths ?? [])}</ul>
    </div>
    <div class="card">
      <div class="card-title">⚠️ 待提升点</div>
      <ul>${list(c.gaps ?? [])}</ul>
    </div>
  </div>
</div>

<!-- ═══ 第二节：职业目标 ═══ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">2</div>
    <div class="section-title">职业目标设定</div>
  </div>
  <div class="goal-block">
    <div class="goal-label">🎯 短期目标 · ${g.shortTerm?.period ?? '1年内'}</div>
    <ul>${list(g.shortTerm?.objectives ?? [])}</ul>
    <div class="milestones">${(g.shortTerm?.milestones ?? []).map((m: string) => `<span class="milestone">✓ ${m}</span>`).join('')}</div>
  </div>
  <div class="goal-block mid">
    <div class="goal-label">🚀 中期目标 · ${g.midTerm?.period ?? '3-5年'}</div>
    <ul>${list(g.midTerm?.objectives ?? [])}</ul>
    <div class="milestones">${(g.midTerm?.milestones ?? []).map((m: string) => `<span class="milestone" style="border-color:#a5b4fc;color:#4338ca">✓ ${m}</span>`).join('')}</div>
  </div>
</div>

<!-- ═══ 第三节：行业趋势 ═══ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">3</div>
    <div class="section-title">行业趋势分析</div>
  </div>
  <div class="info-row">
    <div class="info-card">
      <div class="info-label">薪资区间</div>
      <div class="info-value">${t.salaryRange ?? '—'}</div>
    </div>
    <div class="info-card alt">
      <div class="info-label">需求增长率</div>
      <div class="info-value">${t.growthRate ?? '—'}</div>
    </div>
  </div>
  <div class="body-text">${t.marketDemand ?? ''}</div>
  <div class="skills-row">${(t.hotSkills ?? []).map((s: string) => `<span class="skill-tag">${s}</span>`).join('')}</div>
  <div class="insight-box">💡 ${t.insights ?? ''}</div>
</div>

<!-- ═══ 第四节：发展路径 ═══ -->
<div class="section page-break">
  <div class="section-header">
    <div class="section-num">4</div>
    <div class="section-title">发展路径规划</div>
  </div>
  ${(p.steps ?? []).map((step: any, i: number) => `
  <div class="step-row">
    <div class="step-num">${i + 1}</div>
    <div class="step-content">
      <div class="step-badge">${step.stage} · ${step.duration}</div>
      <div class="step-role">${step.role}</div>
      <div class="step-desc">${step.description}</div>
    </div>
  </div>`).join('')}
  ${(p.alternativePaths ?? []).length > 0 ? `
  <div class="alt-paths">
    <div class="alt-path-label">可转型路径</div>
    ${(p.alternativePaths ?? []).map((path: any, i: number) => `
    <div class="alt-path-item">
      <div style="width:20px;height:20px;background:#d8b4fe;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:#6d28d9;flex-shrink:0">${i + 1}</div>
      <div><strong>${path.name}</strong>：${path.reason}</div>
    </div>`).join('')}
  </div>` : ''}
</div>

<!-- ═══ 第五节：行动计划 ═══ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">5</div>
    <div class="section-title">行动计划</div>
  </div>
  ${(a.phases ?? []).map((phase: any) => `
  <div class="phase-block">
    <div class="phase-header">
      <div class="phase-title">${phase.phase}</div>
      <div class="phase-period">${phase.duration}</div>
    </div>
    <div class="phase-grid">
      <div class="phase-col">
        <div class="phase-col-title blue">📚 学习任务</div>
        <ul>${list(phase.learning ?? [])}</ul>
      </div>
      <div class="phase-col">
        <div class="phase-col-title green">🛠 实践安排</div>
        <ul>${list(phase.practice ?? [])}</ul>
      </div>
      <div class="phase-col">
        <div class="phase-col-title amber">🏆 目标证书</div>
        <ul>${list(phase.certificates ?? [])}</ul>
      </div>
    </div>
  </div>`).join('')}
</div>

<!-- ═══ 第六节：评估机制 ═══ -->
<div class="section">
  <div class="section-header">
    <div class="section-num">6</div>
    <div class="section-title">评估机制</div>
  </div>
  ${(e.checkpoints ?? []).map((cp: any) => `
  <div class="checkpoint">
    <div class="checkpoint-header">
      <div class="checkpoint-time">${cp.time}</div>
      <div class="checkpoint-label">检查点</div>
    </div>
    <ul>${list(cp.metrics ?? [])}</ul>
    <div class="trigger-box"><span class="trigger-label">调整触发条件：</span>${cp.adjustTrigger ?? ''}</div>
  </div>`).join('')}
</div>

<div class="footer">
  此报告由职业规划智能体 AI 生成 · 内容仅供参考 · 建议结合实际情况动态调整
</div>

</body>
</html>`;
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function CareerBlueprintPage() {
  const { data: session } = useSession();
  const toast = useToast();

  const [reportData,    setReportData]    = useState<any>(null);
  const [reportId,      setReportId]      = useState('');
  const [activeSection, setActiveSection] = useState('conclusion');
  const [generating,    setGenerating]    = useState(false);
  const [genStep,       setGenStep]       = useState(0);
  const [genError,      setGenError]      = useState('');
  const [historyList,   setHistoryList]   = useState<any[]>([]);
  const [showHistory,   setShowHistory]   = useState(false);
  const [checkResults,  setCheckResults]  = useState<{id:string;status:'ok'|'weak'|'missing'}[]>([]);
  const [showCheck,     setShowCheck]     = useState(false);

  // ── 手动编辑状态
  const [editMode,    setEditMode]    = useState(false);
  const [editText,    setEditText]    = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [matchData, setMatchData] = useState({
    targetRole: '产品经理', matchScore: 85,
    userSkills: [] as string[], userCapabilities: [] as any[],
  });

  const GEN_STEPS = ['解析能力画像数据…','匹配行业岗位知识库…','生成职业目标矩阵…','规划发展路径图谱…','制定分阶段行动计划…','设置评估检查点…','报告生成完成 ✓'];

  useEffect(() => {
    try {
      const mr = JSON.parse(sessionStorage.getItem('matchResult') ?? '{}');
      const pr = JSON.parse(sessionStorage.getItem('careerProfile') ?? '{}');
      if (mr.top1?.role) setMatchData(p => ({ ...p, targetRole: mr.top1.role, matchScore: mr.top1.score }));
      if (pr.skills) setMatchData(p => ({ ...p, userSkills: pr.skills }));
      if (pr.capabilities) {
        const caps = Object.entries(pr.capabilities).map(([subject, score]) => ({ subject, score: score as number }));
        setMatchData(p => ({ ...p, userCapabilities: caps }));
      }
    } catch {}
    try {
      const cached = sessionStorage.getItem('lastReportData');
      const cachedId = sessionStorage.getItem('lastReportId');
      if (cached) { setReportData(JSON.parse(cached)); setReportId(cachedId ?? ''); }
    } catch {}
  }, []);

  useEffect(() => {
    fetch('/api/ai/generate-report').then(r => r.json()).then(d => setHistoryList(d.reports ?? [])).catch(() => {});
  }, [reportId]);

  // ── 切换 section 时退出编辑模式
  useEffect(() => {
    setEditMode(false);
  }, [activeSection]);

  // ── 进入编辑模式：填充当前 section 的文本
  const handleEnterEdit = () => {
    const text = sectionToText(activeSection, reportData);
    setEditText(text);
    setEditMode(true);
  };

  // ── 保存编辑
  const handleSaveEdit = () => {
    setEditLoading(true);
    const updated = {
      ...reportData,
      [activeSection]: textToSectionData(activeSection, editText, reportData),
    };
    setReportData(updated);
    sessionStorage.setItem('lastReportData', JSON.stringify(updated));
    setEditMode(false);
    setEditLoading(false);
    toast.show(`「${SECTIONS.find(s => s.id === activeSection)?.label}」已保存`);
  };

  // ── 生成报告
  const handleGenerate = async () => {
    setGenerating(true); setGenStep(0); setGenError(''); setEditMode(false);
    const interval = setInterval(() => setGenStep(p => p < GEN_STEPS.length - 2 ? p + 1 : p), 450);
    try {
      const res = await fetch('/api/ai/generate-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: matchData.targetRole, matchScore: matchData.matchScore,
          userProfile: { major: '计算机科学', grade: '大三', skills: matchData.userSkills, capabilities: matchData.userCapabilities },
          userId: (session?.user as any)?.id,
        }),
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
      setGenError(e.message ?? '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  // ── AI 润色（更新当前 section）
  const handlePolish = async () => {
    const content = reportData ? JSON.stringify((reportData as any)[activeSection]) : '';
    const label = SECTIONS.find(s => s.id === activeSection)?.label ?? activeSection;
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: `请对以下职业规划报告「${label}」模块进行专业润色，保留核心信息，提升表达，直接输出润色后的JSON，与原格式一致：\n${content}` }] }),
      });
      const data = await res.json();
      const match = (data.content ?? '').match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const polished = JSON.parse(match[0]);
          const updated = { ...reportData, [activeSection]: polished };
          setReportData(updated);
          sessionStorage.setItem('lastReportData', JSON.stringify(updated));
          setEditMode(false);
          toast.show(`「${label}」润色完成`);
          return;
        } catch {}
      }
      toast.show('请在右侧对话框查看 AI 建议');
    } catch {
      toast.show('润色服务暂不可用', 'error');
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

  // ── 导出 Word（纯中文）
  const handleExportWord = () => {
    const c = reportData?.conclusion ?? {};
    const g = reportData?.goals ?? {};
    const t = reportData?.trends ?? {};
    const p = reportData?.pathway ?? {};
    const a = reportData?.actionPlan ?? {};
    const e = reportData?.evaluation ?? {};

    const sect = (title: string, body: string) =>
      `<h3 style="color:#d97706;font-size:16px;margin:20px 0 8px;border-left:4px solid #f59e0b;padding-left:10px;">${title}</h3>
       <div style="font-size:13px;color:#334155;line-height:1.8;">${body}</div>`;

    const ul = (items: string[]) => `<ul style="margin:6px 0;padding-left:20px;">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8">
<style>
body { font-family: 'Microsoft YaHei', sans-serif; padding: 40px; color: #1e293b; }
h1 { font-size: 24px; font-weight: 900; color: #0f172a; border-bottom: 3px solid #f59e0b; padding-bottom: 10px; margin-bottom: 24px; }
h2 { font-size: 14px; color: #64748b; font-weight: 400; margin-bottom: 24px; }
</style>
</head>
<body>
<h1>职业生涯发展报告</h1>
<h2>目标岗位：${matchData.targetRole}　·　综合匹配度：${matchData.matchScore}%　·　生成日期：${new Date().toLocaleDateString('zh-CN')}</h2>

${sect('一、职业探索与匹配结论', `
  <p><strong>目标岗位：</strong>${c.targetRole ?? ''}</p>
  <p><strong>综合匹配度：</strong>${c.matchScore ?? matchData.matchScore}%</p>
  <p><strong>综合分析：</strong>${c.summary ?? ''}</p>
  <p><strong>核心优势：</strong></p>${ul(c.strengths ?? [])}
  <p><strong>待提升点：</strong></p>${ul(c.gaps ?? [])}
`)}

${sect('二、职业目标设定', `
  <p><strong>【短期目标 · ${g.shortTerm?.period ?? '1年内'}】</strong></p>
  ${ul(g.shortTerm?.objectives ?? [])}
  <p>关键里程碑：${(g.shortTerm?.milestones ?? []).join('、')}</p>
  <p><strong>【中期目标 · ${g.midTerm?.period ?? '3-5年'}】</strong></p>
  ${ul(g.midTerm?.objectives ?? [])}
  <p>关键里程碑：${(g.midTerm?.milestones ?? []).join('、')}</p>
`)}

${sect('三、行业趋势分析', `
  <p><strong>薪资区间：</strong>${t.salaryRange ?? ''}</p>
  <p><strong>需求增长率：</strong>${t.growthRate ?? ''}</p>
  <p><strong>市场需求：</strong>${t.marketDemand ?? ''}</p>
  <p><strong>热门技能：</strong>${(t.hotSkills ?? []).join('、')}</p>
  <p><strong>趋势洞察：</strong>${t.insights ?? ''}</p>
`)}

${sect('四、发展路径规划', `
  ${(p.steps ?? []).map((s: any, i: number) => `
    <p><strong>${i + 1}. ${s.stage} · ${s.duration} — ${s.role}</strong></p>
    <p style="padding-left:20px;color:#475569">${s.description}</p>
  `).join('')}
  ${(p.alternativePaths ?? []).length > 0 ? `
    <p><strong>可转型路径：</strong></p>
    ${ul((p.alternativePaths ?? []).map((x: any) => `${x.name}：${x.reason}`))}
  ` : ''}
`)}

${sect('五、行动计划', `
  ${(a.phases ?? []).map((ph: any) => `
    <p><strong>${ph.phase}（${ph.duration}）</strong></p>
    <p>学习任务：${(ph.learning ?? []).join('；')}</p>
    <p>实践安排：${(ph.practice ?? []).join('；')}</p>
    <p>目标证书：${(ph.certificates ?? []).join('；')}</p>
    <br/>
  `).join('')}
`)}

${sect('六、评估机制', `
  ${(e.checkpoints ?? []).map((cp: any) => `
    <p><strong>【${cp.time}检查点】</strong></p>
    <p>达成指标：${(cp.metrics ?? []).join('；')}</p>
    <p>调整触发条件：${cp.adjustTrigger ?? ''}</p>
    <br/>
  `).join('')}
`)}

<p style="margin-top:40px;font-size:11px;color:#94a3b8;text-align:center;">
  此报告由职业规划智能体 AI 生成 · 内容仅供参考 · 建议结合实际情况动态调整
</p>
</body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const a2 = document.createElement('a');
    a2.href = URL.createObjectURL(blob);
    a2.download = `职业生涯发展报告_${matchData.targetRole}.doc`;
    a2.click();
    toast.show('Word 导出成功');
  };

  // ── 导出 PDF（打印预览）
  const handleExportPDF = () => {
    const html = buildPrintHTML(reportData, matchData);
    const win = window.open('', '_blank');
    if (!win) { toast.show('请允许弹出窗口', 'error'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 600);
    toast.show('PDF 导出已打开，请选择"另存为PDF"');
  };

  const activeCfg = SECTIONS.find(s => s.id === activeSection)!;

  return (
    <div className="max-w-[1600px] w-full mx-auto p-6 flex flex-col gap-4">
      {/* Toast */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
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
              <ChevronDown className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showHistory && historyList.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute right-0 top-10 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-600 flex justify-between">
                    <span>历史报告</span>
                    <button onClick={() => setShowHistory(false)}><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="max-h-60 overflow-y-auto no-scrollbar">
                    {historyList.map(r => (
                      <button key={r.id} onClick={() => { setShowHistory(false); toast.show(`报告：${r.targetRole}`); }}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-amber-50 border-b border-slate-50 text-left">
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
          {reportData && (
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
              <RotateCcw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} /> 重新生成
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* 报告区 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[560px] flex flex-col">
          {!reportData && !generating ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full min-h-[500px] gap-5 px-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2">AI 职业生涯蓝图</h3>
                <p className="text-sm text-slate-500 max-w-sm leading-relaxed">基于你的能力画像与人岗匹配数据，生成包含6大模块的个性化职业规划报告。</p>
              </div>
              <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
                {SECTIONS.map(s => { const Icon = s.icon; return (
                  <div key={s.id} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg ${s.bg} border ${s.border}`}>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-xs text-slate-700 font-medium text-center">{s.label}</span>
                  </div>); })}
              </div>
              {genError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{genError}</p>}
              <button onClick={handleGenerate}
                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-200 hover:scale-105 transition-all text-sm">
                <Sparkles className="w-4 h-4" /> 立即生成职业生涯蓝图
              </button>
            </motion.div>
          ) : generating ? (
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
                {GEN_STEPS.slice(0, -1).map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${i < genStep ? 'bg-emerald-500' : i === genStep ? 'bg-amber-500 animate-pulse' : 'bg-slate-200'}`}>
                      {i < genStep && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-xs ${i <= genStep ? 'text-slate-700' : 'text-slate-400'}`}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Tab 导航 + 工具栏 */}
              <div className="flex flex-col gap-2 p-3 bg-slate-50 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <div className="flex gap-1 flex-1 min-w-0">
                    {SECTIONS.map(s => { const Icon = s.icon; const isActive = activeSection === s.id; return (
                      <button key={s.id} onClick={() => setActiveSection(s.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                          isActive ? `${s.bg} ${s.color} ${s.border} border shadow-sm` : 'text-slate-500 hover:text-slate-700 hover:bg-white border border-transparent'
                        }`}>
                        <Icon className="w-3.5 h-3.5" />{s.label}
                      </button>); })}
                  </div>
                </div>
                {/* 工具栏第二行 */}
                <div className="flex gap-2 flex-wrap">
                  {/* 编辑/保存 */}
                  {!editMode ? (
                    <button onClick={handleEnterEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white border-blue-200 text-blue-600 hover:bg-blue-50 transition-all">
                      <Edit3 className="w-3.5 h-3.5" /> 手动编辑
                    </button>
                  ) : (
                    <>
                      <button onClick={handleSaveEdit} disabled={editLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-60">
                        <Save className="w-3.5 h-3.5" /> 保存修改
                      </button>
                      <button onClick={() => setEditMode(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                        <X className="w-3.5 h-3.5" /> 取消
                      </button>
                    </>
                  )}
                  {/* 润色 */}
                  <button onClick={handlePolish}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all">
                    <Sparkles className="w-3.5 h-3.5" /> AI 润色
                  </button>
                  {/* 完整性检查 */}
                  <button onClick={handleCheck}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all">
                    <FileCheck className="w-3.5 h-3.5" /> 完整性检查
                  </button>
                  <div className="ml-auto flex gap-2">
                    {/* 导出 Word */}
                    <button onClick={handleExportWord}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white border-slate-200 text-slate-600 hover:bg-slate-100 transition-all">
                      <FileText className="w-3.5 h-3.5" /> 导出 Word
                    </button>
                    {/* 导出 PDF */}
                    <button onClick={handleExportPDF}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-amber-500 border-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm shadow-amber-200">
                      <Printer className="w-3.5 h-3.5" /> 导出 PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 标题 */}
              <div className={`px-5 pt-4 pb-3 ${activeCfg.bg} border-b ${activeCfg.border} shrink-0`}>
                <div className={`flex items-center justify-between`}>
                  <div className={`flex items-center gap-2 font-bold text-sm ${activeCfg.color}`}>
                    <activeCfg.icon className="w-4 h-4" />{activeCfg.label}
                  </div>
                  {editMode && (
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      ✏️ 编辑模式
                    </span>
                  )}
                </div>
              </div>

              {/* 内容区 */}
              <div className="flex-1 overflow-y-auto p-5">
                <AnimatePresence mode="wait">
                  {editMode ? (
                    <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="w-full h-80 p-4 text-sm text-slate-700 font-mono border border-blue-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50/30 leading-relaxed"
                        placeholder="在此编辑内容…"
                      />
                      <p className="text-xs text-slate-400 mt-2">
                        提示：编辑完成后点击「保存修改」，内容将以纯文本模式展示并用于导出。
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key={activeSection} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
                      <SectionView section={activeSection} data={reportData} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 完整性检查面板 */}
              <AnimatePresence>
                {showCheck && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="border-t border-slate-100 p-4 bg-slate-50 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-700">完整性检查</span>
                      <button onClick={() => setShowCheck(false)}><X className="w-3.5 h-3.5 text-slate-400" /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {checkResults.map(r => {
                        const s = SECTIONS.find(x => x.id === r.id)!;
                        const clr = r.status === 'ok' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : r.status === 'weak' ? 'text-amber-700 bg-amber-50 border-amber-200'
                          : 'text-red-700 bg-red-50 border-red-200';
                        return (
                          <div key={r.id} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium ${clr}`}>
                            {r.status === 'ok' ? '✅' : r.status === 'weak' ? '⚠️' : '❌'} {s.label}
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

        {/* AI 对话 */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[600px] lg:h-auto flex flex-col">
          <AIAssistantWidget variant="static" />
        </motion.div>
      </div>
    </div>
  );
}
