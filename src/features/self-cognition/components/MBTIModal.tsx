'use client';

import { X, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TestResultData } from './MBTIModal_types';

export type { TestResultData };

// ─────────────────────────────────────────────
// 题目 + 维度映射
// score 1-5：1=完全不同意, 3=中立, 5=完全同意
// dim + positive=true 表示：同意 → 倾向该维度的第一个字母
// ─────────────────────────────────────────────
const QUESTIONS: { text: string; dim: 'EI' | 'SN' | 'TF' | 'JP'; positive: boolean }[] = [
  { text: '在社交场合中，你通常是主动发起对话的那个人。',           dim: 'EI', positive: true  },
  { text: '你更喜欢按部就班地完成工作，而不是在最后一刻突击。',     dim: 'JP', positive: true  },
  { text: '你经常花时间思考宇宙起源或人类本质等抽象问题。',         dim: 'SN', positive: false },
  { text: '面对朋友的倾诉，你倾向于先提供情感支持而非解决方案。',   dim: 'TF', positive: false },
  { text: '做决定时，你更多依赖逻辑和事实而不是个人感受。',         dim: 'TF', positive: true  },
  { text: '你觉得适应新环境和毫无计划的变动相对容易。',             dim: 'JP', positive: false },
  { text: '比起在家看书，你更喜欢周末和一大群朋友出去玩。',         dim: 'EI', positive: true  },
  { text: '面对复杂问题时，你会列出详细步骤逐一击破。',             dim: 'JP', positive: true  },
  { text: '在艺术展览中，你更关注作品传达的深刻寓意而非技巧。',     dim: 'SN', positive: false },
  { text: '看到别人哭泣时，你往往也会感到悲伤甚至跟着流泪。',       dim: 'TF', positive: false },
  { text: '你更看重一个人的能力和效率而非是否讨人喜欢。',           dim: 'TF', positive: true  },
  { text: '旅游时你喜欢随走随看，而不是制定详细行程。',             dim: 'JP', positive: false },
  { text: '你很难在嘈杂的派对聚会中长时间保持精力充沛。',           dim: 'EI', positive: false },
  { text: '你做事非常有条理，会提前整理好明天要用的物品。',         dim: 'JP', positive: true  },
  { text: '探讨未来的各种可能性比讨论当前的具体事实更让你兴奋。',   dim: 'SN', positive: false },
  { text: '当与他人发生冲突时，你会优先考虑维护和谐。',             dim: 'TF', positive: false },
  { text: '在团队合作中，如果有人跟不上进度，你会直白地指出来。',   dim: 'TF', positive: true  },
  { text: '比起结构严谨的环境，你更喜欢充满弹性和自由度的工作。',   dim: 'JP', positive: false },
  { text: '你在陌生人面前通常比较沉默，但在熟人面前却很健谈。',     dim: 'EI', positive: false },
  { text: '无论做什么事，你总是有备用计划甚至备用的备用计划。',     dim: 'JP', positive: true  },
];

// MBTI 类型信息
const MBTI_TYPES: Record<string, { title: string; desc: string; strengths: string[]; weaknesses: string[] }> = {
  INTJ: { title: '建筑师', desc: '富有想象力且战略性强，一切都在计划中。', strengths: ['战略思维极强', '独立自主', '意志坚定', '高标准严要求'], weaknesses: ['过于自信', '难以接受情感诉求', '完美主义倾向', '人际关系冷淡'] },
  INTP: { title: '逻辑学家', desc: '具有创造性的发明家，对知识有无穷的渴求。', strengths: ['逻辑分析能力强', '创造性思维', '客观理性', '求知欲旺盛'], weaknesses: ['漫不经心', '难以表达情感', '容易分心', '过于追求完美'] },
  ENTJ: { title: '指挥官', desc: '大胆、富有想象力且意志坚强的领袖。', strengths: ['天生领袖气质', '战略眼光独到', '高效且有条理', '决断力强'], weaknesses: ['固执己见', '不擅长情感表达', '过于强势', '不耐烦'] },
  ENTP: { title: '辩论家', desc: '聪明好奇的思想家，无法抗拒智识挑战。', strengths: ['思维敏捷灵活', '创造力强', '沟通能力突出', '自信开朗'], weaknesses: ['争强好胜', '缺乏专注力', '不擅执行', '容易忽视细节'] },
  INFJ: { title: '提倡者', desc: '安静而神秘，同时令人鼓舞且不知疲倦的理想主义者。', strengths: ['洞察力强', '原则性强', '富有同理心', '有远见'], weaknesses: ['过于敏感', '固执', '完美主义', '容易精疲力竭'] },
  INFP: { title: '调停者', desc: '诗意、善良的利他主义者，总是热情地为美好事物服务。', strengths: ['理想主义', '开放包容', '富有创意', '忠诚专一'], weaknesses: ['过于理想化', '自我批评', '缺乏实用性', '容易忽视细节'] },
  ENFJ: { title: '主人公', desc: '富有魅力的激励者，热爱激励他人。', strengths: ['天生领袖', '共情能力强', '善于沟通', '利他主义'], weaknesses: ['过于理想化', '优柔寡断', '过度牺牲自我', '回避冲突'] },
  ENFP: { title: '竞选者', desc: '充满热情的富有创意的社会活动家。', strengths: ['好奇心强', '观察力敏锐', '充满活力', '善于社交'], weaknesses: ['注意力分散', '缺乏专注', '过于情绪化', '独立性过强'] },
  ISTJ: { title: '物流师', desc: '务实且注重事实的可靠人才。', strengths: ['诚实可靠', '责任心强', '有条理', '坚韧不拔'], weaknesses: ['固执保守', '难以接受变化', '自我批评', '不擅表达情感'] },
  ISFJ: { title: '守卫者', desc: '非常专注的保护者，随时准备保卫所爱的人。', strengths: ['支持性强', '可靠负责', '耐心细致', '观察敏锐'], weaknesses: ['过于谦逊', '容易被忽视', '过度付出', '不擅拒绝'] },
  ESTJ: { title: '总经理', desc: '出色的管理者，对管理事务和人员非常在行。', strengths: ['组织能力强', '责任心强', '有条理', '诚实正直'], weaknesses: ['固执己见', '难以表达情感', '过于关注地位', '难以放松'] },
  ESFJ: { title: '执政官', desc: '极其关心他人，社交能力强，人缘极好。', strengths: ['善于照顾他人', '责任感强', '善于合作', '忠诚可靠'], weaknesses: ['过于在意他人看法', '容易被伤害', '不擅创新', '过度分享'] },
  ISTP: { title: '鉴赏家', desc: '大胆且务实的实验者，擅长使用各种工具。', strengths: ['乐观冷静', '富有创意', '实用主义', '危机处理能力强'], weaknesses: ['固执', '不擅表达情感', '难以预测', '容易冒险'] },
  ISFP: { title: '探险家', desc: '灵活有魅力的艺术家，随时准备探索新事物。', strengths: ['魅力十足', '对美敏感', '和平主义', '开朗好奇'], weaknesses: ['过于竞争', '难以长期规划', '过度独立', '不可预测'] },
  ESTP: { title: '企业家', desc: '精明、充满活力的感知者，真正享受活在当下。', strengths: ['大胆果断', '直接务实', '精于观察', '原创风格'], weaknesses: ['不敏感', '缺乏耐心', '冒险倾向', '不善规划'] },
  ESFP: { title: '表演者', desc: '充满活力的娱乐者，生活对他们来说从不无聊。', strengths: ['大胆乐观', '审美独特', '实用主义', '热爱关注'], weaknesses: ['敏感脆弱', '冲突回避', '容易分心', '缺乏规划'] },
};

// ─────────────────────────────────────────────
// 计算 MBTI 结果
// ─────────────────────────────────────────────
function calculateMBTI(answers: Record<number, number>): TestResultData {
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

  QUESTIONS.forEach((q, i) => {
    const ans = answers[i] ?? 3; // 默认中立
    const weight = ans - 3; // -2 ~ +2

    if (q.dim === 'EI') {
      if (q.positive) { scores.E += weight; } else { scores.I += weight; }
    } else if (q.dim === 'SN') {
      // positive=false 表示同意→N
      if (q.positive) { scores.S += weight; } else { scores.N += weight; }
    } else if (q.dim === 'TF') {
      if (q.positive) { scores.T += weight; } else { scores.F += weight; }
    } else {
      if (q.positive) { scores.J += weight; } else { scores.P += weight; }
    }
  });

  const type = [
    scores.E >= scores.I ? 'E' : 'I',
    scores.S >= scores.N ? 'S' : 'N',
    scores.T >= scores.F ? 'T' : 'F',
    scores.J >= scores.P ? 'J' : 'P',
  ].join('');

  // 百分比计算（归一化为 0-100）
  const toPercent = (a: number, b: number) => {
    const total = Math.abs(a) + Math.abs(b) + 1;
    return Math.round(((a + total / 2) / total) * 100);
  };
  const eScore = toPercent(scores.E, scores.I);
  const sScore = toPercent(scores.S, scores.N);
  const tScore = toPercent(scores.T, scores.F);
  const jScore = toPercent(scores.J, scores.P);

  const info = MBTI_TYPES[type] ?? MBTI_TYPES['INTJ'];

  return {
    type,
    title: info.title,
    description: info.desc,
    scores: {
      e: eScore, i: 100 - eScore,
      s: sScore, n: 100 - sScore,
      t: tScore, f: 100 - tScore,
      j: jScore, p: 100 - jScore,
    },
    strengths:  info.strengths,
    weaknesses: info.weaknesses,
  };
}

// ─────────────────────────────────────────────
// Modal 组件（保留原有 UI，只修改结果计算）
// ─────────────────────────────────────────────
interface MBTIModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: TestResultData | null;
}

const TOTAL_QUESTIONS = QUESTIONS.length;

export default function MBTIModal({ isOpen, onClose, initialData }: MBTIModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction,    setDirection]    = useState(1);
  const [answers,      setAnswers]      = useState<Record<number, number>>({});
  const [isFinished,   setIsFinished]   = useState(false);
  const [resultData,   setResultData]   = useState<TestResultData | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setResultData(initialData);
        setIsFinished(true);
      } else {
        setResultData(null);
        setIsFinished(false);
        setCurrentIndex(0);
        setAnswers({});
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleOptionSelect = (score: number) => {
    const newAnswers = { ...answers, [currentIndex]: score };
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentIndex < TOTAL_QUESTIONS - 1) {
        setDirection(1);
        setCurrentIndex(currentIndex + 1);
      } else {
        // ★ 真实计算 MBTI 结果
        const result = calculateMBTI(newAnswers);
        // 保存到 sessionStorage
        try { sessionStorage.setItem('mbtiResult', JSON.stringify(result)); } catch {}
        setResultData(result);
        setIsFinished(true);
      }
    }, 300);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) { setDirection(-1); setCurrentIndex(currentIndex - 1); }
  };

  const progress = Math.round((currentIndex / TOTAL_QUESTIONS) * 100);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { z: 1, x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
  };

  const OPTIONS = [
    { score: 1, label: '完全不同意', short: '强烈否定' },
    { score: 2, label: '不同意',     short: '倾向否定' },
    { score: 3, label: '中立',       short: '中立' },
    { score: 4, label: '同意',       short: '倾向同意' },
    { score: 5, label: '完全同意',   short: '强烈同意' },
  ];

  const OPTION_STYLES = [
    'hover:bg-rose-50 hover:border-rose-500 hover:text-rose-600 hover:ring-4 hover:ring-rose-100/50',
    'hover:bg-orange-50 hover:border-orange-500 hover:text-orange-500 hover:ring-4 hover:ring-orange-100/50',
    'hover:bg-slate-50 hover:border-slate-500 hover:text-slate-600 hover:ring-4 hover:ring-slate-100/50',
    'hover:bg-teal-50 hover:border-teal-500 hover:text-teal-500 hover:ring-4 hover:ring-teal-100/50',
    'hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-500 hover:ring-4 hover:ring-emerald-100/50',
  ];

  const SELECTED_STYLES = [
    'bg-rose-50 border-rose-500 text-rose-600 ring-4 ring-rose-100/50 scale-110',
    'bg-orange-50 border-orange-500 text-orange-500 ring-4 ring-orange-100/50 scale-110',
    'bg-slate-50 border-slate-500 text-slate-600 ring-4 ring-slate-100/50 scale-110',
    'bg-teal-50 border-teal-500 text-teal-500 ring-4 ring-teal-100/50 scale-110',
    'bg-emerald-50 border-emerald-500 text-emerald-500 ring-4 ring-emerald-100/50 scale-110',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-4 shrink-0">
          <h2 className="text-xl font-bold text-slate-900">MBTI 职业性格测评</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!isFinished ? (
            <div className="px-8 pb-8 space-y-6">
              {/* 进度条 */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>问题 {currentIndex + 1} / {TOTAL_QUESTIONS}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${progress}%` }} className="h-full bg-amber-500 rounded-full" />
                </div>
              </div>

              {/* 问题 */}
              <div className="min-h-[80px] flex items-center">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.p key={currentIndex} custom={direction} variants={variants}
                    initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="text-lg font-medium text-slate-800 leading-relaxed">
                    {QUESTIONS[currentIndex].text}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* 选项 */}
              <div className="flex justify-between items-end gap-3">
                {OPTIONS.map((opt, i) => (
                  <button key={opt.score} onClick={() => handleOptionSelect(opt.score)}
                    className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 border-slate-200 text-slate-400 text-xs font-semibold transition-all duration-150 cursor-pointer
                      ${answers[currentIndex] === opt.score ? SELECTED_STYLES[i] : OPTION_STYLES[i]}`}>
                    <div className={`w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-bold text-sm`}>
                      {opt.score}
                    </div>
                    <span className="hidden sm:block text-center leading-tight">{opt.short}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>← 完全不同意</span>
                <span>完全同意 →</span>
              </div>

              {/* 上一题 */}
              {currentIndex > 0 && (
                <button onClick={handlePrevious}
                  className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> 上一题
                </button>
              )}
            </div>
          ) : resultData ? (
            <div className="px-8 pb-8 space-y-5">
              {/* 结果标题 */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  <CheckCircle2 className="w-4 h-4" /> 测评完成
                </div>
                <h3 className="text-5xl font-black text-slate-900 tracking-wider mb-2">{resultData.type}</h3>
                <p className="text-lg font-semibold text-amber-600">{resultData.title}</p>
                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">{resultData.description}</p>
              </div>

              {/* 维度得分 */}
              <div className="space-y-3">
                {[
                  ['E 外向', resultData.scores.e, 'I 内向', resultData.scores.i, 'teal'],
                  ['S 实感', resultData.scores.s, 'N 直觉', resultData.scores.n, 'blue'],
                  ['T 思考', resultData.scores.t, 'F 情感', resultData.scores.f, 'purple'],
                  ['J 判断', resultData.scores.j, 'P 感知', resultData.scores.p, 'amber'],
                ].map(([la, sa, lb, sb, color]) => (
                  <div key={String(la)} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                      <span className={`text-${color}-600`}>{la} ({sa}%)</span>
                      <span>{lb} ({sb}%)</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${sa}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className={`h-full bg-${color}-500 rounded-l-full`} />
                      <div className="flex-1 bg-slate-300 rounded-r-full" />
                    </div>
                  </div>
                ))}
              </div>

              {/* 优劣势 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-700 mb-2">✅ 优势</p>
                  {resultData.strengths.map(s => (
                    <p key={s} className="text-xs text-emerald-800 flex items-start gap-1.5 mt-1">
                      <span className="text-emerald-500 shrink-0">▸</span>{s}
                    </p>
                  ))}
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs font-bold text-amber-700 mb-2">⚠️ 待改善</p>
                  {resultData.weaknesses.map(w => (
                    <p key={w} className="text-xs text-amber-800 flex items-start gap-1.5 mt-1">
                      <span className="text-amber-500 shrink-0">▸</span>{w}
                    </p>
                  ))}
                </div>
              </div>

              <button onClick={onClose}
                className="w-full py-3 bg-[#111827] text-amber-400 font-bold rounded-xl hover:bg-slate-800 transition-colors">
                完成 · 关闭
              </button>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
