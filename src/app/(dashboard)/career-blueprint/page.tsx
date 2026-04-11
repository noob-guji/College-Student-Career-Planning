'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import CareerBlueprintGenerator from '@/features/career-blueprint/components/CareerBlueprintGenerator';
import ReportEditor from '@/features/career-blueprint/components/ReportEditor';
import AIAssistantWidget from '@/features/dashboard-core/components/AIAssistantWidget';

// 将生成的报告数据转换为 ReportEditor 的 sections 格式
function reportToSections(data: any) {
  if (!data) return undefined;

  const c = data.conclusion ?? {};
  const g = data.goals ?? {};
  const t = data.trends ?? {};
  const p = data.pathway ?? {};
  const a = data.actionPlan ?? {};
  const e = data.evaluation ?? {};

  return [
    {
      id: 'conclusion', title: '职业探索与匹配结论', isComplete: true,
      content: [
        c.summary ?? '',
        c.strengths?.length ? `核心优势：${c.strengths.join('；')}` : '',
        c.gaps?.length ? `待提升：${c.gaps.join('；')}` : '',
      ].filter(Boolean).join('\n'),
    },
    {
      id: 'goals', title: '职业目标设定', isComplete: true,
      content: [
        `【短期目标 · ${g.shortTerm?.period ?? '1年内'}】`,
        g.shortTerm?.objectives?.join('\n') ?? '',
        `里程碑：${g.shortTerm?.milestones?.join('、') ?? ''}`,
        '',
        `【中期目标 · ${g.midTerm?.period ?? '3-5年'}】`,
        g.midTerm?.objectives?.join('\n') ?? '',
        `里程碑：${g.midTerm?.milestones?.join('、') ?? ''}`,
      ].filter(s => s !== undefined).join('\n'),
    },
    {
      id: 'trends', title: '行业趋势分析', isComplete: true,
      content: [
        t.marketDemand ?? '',
        t.salaryRange   ? `薪资区间：${t.salaryRange}` : '',
        t.growthRate    ? `增长率：${t.growthRate}` : '',
        t.hotSkills?.length ? `热门技能：${t.hotSkills.join('、')}` : '',
        t.insights ?? '',
      ].filter(Boolean).join('\n'),
    },
    {
      id: 'pathway', title: '发展路径规划', isComplete: true,
      content: [
        ...(p.steps ?? []).map((s: any) =>
          `【${s.stage} · ${s.duration}】${s.role}\n${s.description}`),
        p.alternativePaths?.length
          ? `\n可转型路径：${p.alternativePaths.map((x: any) => `${x.name}（${x.reason}）`).join('；')}`
          : '',
      ].filter(Boolean).join('\n\n'),
    },
    {
      id: 'action', title: '行动计划', isComplete: true,
      content: (a.phases ?? []).map((ph: any) =>
        `【${ph.phase} · ${ph.duration}】\n学习：${ph.learning?.join('、')}\n实践：${ph.practice?.join('、')}\n证书：${ph.certificates?.join('、')}`
      ).join('\n\n'),
    },
    {
      id: 'evaluation', title: '评估机制', isComplete: true,
      content: (e.checkpoints ?? []).map((cp: any) =>
        `【${cp.time}检查点】\n指标：${cp.metrics?.join('；')}\n调整触发：${cp.adjustTrigger}`
      ).join('\n\n'),
    },
  ];
}

export default function CareerBlueprintPage() {
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportId,        setReportId]        = useState('');
  const [reportSections,  setReportSections]  = useState<any[] | undefined>(undefined);

  // 从 sessionStorage 读取人岗匹配结果
  const [matchData, setMatchData] = useState({
    targetRole: '产品经理',
    matchScore: 85,
    userSkills: [] as string[],
    userCapabilities: [] as Array<{ subject: string; score: number }>,
  });

  useEffect(() => {
    try {
      // 读取匹配结果
      const mr = sessionStorage.getItem('matchResult');
      if (mr) {
        const parsed = JSON.parse(mr);
        if (parsed.top1?.role)  setMatchData(prev => ({ ...prev, targetRole: parsed.top1.role, matchScore: parsed.top1.score }));
      }
      // 读取用户画像
      const pr = sessionStorage.getItem('careerProfile');
      if (pr) {
        const parsed = JSON.parse(pr);
        const skills = parsed.skills ?? [];
        const caps   = Object.entries(parsed.capabilities ?? {}).map(([subject, score]) => ({
          subject, score: score as number,
        }));
        setMatchData(prev => ({ ...prev, userSkills: skills, userCapabilities: caps }));
      }
    } catch {}
  }, []);

  const handleExportWord = () => {
    // 用编辑器 sections 内容导出
    const content = (reportSections ?? [])
      .map(s => `<h3>${s.title}</h3><p>${(s.content ?? '').replace(/\n/g, '<br/>')}</p>`)
      .join('');
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head><meta charset="utf-8"><style>
      body{font-family:'Microsoft YaHei',sans-serif;padding:40px;}
      h1{font-size:22px;border-bottom:2px solid #f59e0b;padding-bottom:8px;}
      h3{color:#f59e0b;font-size:16px;margin:20px 0 8px;}
      p{line-height:1.8;font-size:14px;color:#475569;}
      </style></head>
      <body>
        <h1>职业生涯发展报告 · ${matchData.targetRole}</h1>
        <p style="color:#94a3b8;font-size:12px;">匹配度：${matchData.matchScore}% | 生成时间：${new Date().toLocaleDateString('zh-CN')}</p>
        ${content}
      </body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `职业生涯发展报告_${matchData.targetRole}.doc`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="shrink-0">
        <h2 className="text-2xl font-bold text-slate-900">生涯蓝图</h2>
        <p className="text-sm text-slate-500 mt-1">
          AI 生成个性化职业规划报告 · 目标岗位：
          <strong className="text-amber-600 ml-1">{matchData.targetRole}</strong>
          <span className="ml-2 text-slate-400">匹配度 {matchData.matchScore}%</span>
          {reportId && (
            <span className="ml-3 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
              报告已保存
            </span>
          )}
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* 报告生成器 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col"
        >
          <CareerBlueprintGenerator
            targetRole={matchData.targetRole}
            matchScore={matchData.matchScore}
            userSkills={matchData.userSkills}
            userCapabilities={matchData.userCapabilities}
            onReportGenerated={(data, id) => {
              setReportGenerated(true);
              setReportId(id);
              // ★ 核心修复：将生成的报告内容填充到编辑器
              setReportSections(reportToSections(data));
            }}
          />
        </motion.div>

        {/* AI 对话 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[600px] flex flex-col"
        >
          <AIAssistantWidget variant="static" />
        </motion.div>
      </div>

      {/* 智笔润色工具栏（报告生成后才显示，并传入真实内容） */}
      {reportGenerated && (
        <ReportEditor
          sections={reportSections}
          onExportWord={handleExportWord}
        />
      )}
    </div>
  );
}
