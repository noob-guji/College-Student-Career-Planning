'use client';

import { X, ChevronLeft, CheckCircle2, Check, Minus, X as XIcon, XCircle, Share2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TestResultData {
    type: string;
    title: string;
    description: string;
    scores: {
        e: number; i: number;
        s: number; n: number;
        t: number; f: number;
        j: number; p: number;
    };
    strengths: string[];
    weaknesses: string[];
}

interface MBTIModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: TestResultData | null;
}

// Generate mock questions
const MOCK_QUESTIONS = [
    "在社交场合中，你通常是主动发起对话的那个人。",
    "你更喜欢按部就班地完成工作，而不是在最后一刻突击。",
    "你经常花时间思考宇宙的起源或人类的本质等抽象问题。",
    "面对朋友的倾诉，你倾向于先提供情感支持，而不是解决问题的方案。",
    "你在做决定时，更多地依赖逻辑和事实，而不是个人感受。",
    "你觉得适应新环境和毫无计划的变动相对容易。",
    "比起在家里看书，你更喜欢周末和一大群朋友狂欢。",
    "当面临复杂问题时，你会列出详细的步骤逐一击破。",
    "在艺术展览中，你更关注作品传达的深刻寓意，而不是其技巧的精湛。",
    "看到别人哭泣时，你往往也会感到悲伤，甚至跟着流泪。",
    "你更看重一个人的能力和效率，而不是他是否讨人喜欢。",
    "旅游时，你喜欢随走随看，而不是制定详细的每日行程。",
    "你很难在嘈杂的派对聚会中长时间保持精力充沛。",
    "你做事非常有条理，经常会提前整理好明天要用的物品。",
    "对你来说，探讨未来的各种可能性比讨论当前的具体事实更有趣。",
    "当与他人发生冲突时，你会优先考虑维护和谐，而不是证明自己是对的。",
    "在团队合作中，如果有人跟不上进度，你会直白地指出来。",
    "比起结构严谨的传统工作环境，你更喜欢充满弹性和自由度的工作。",
    "你在陌生人面前通常比较沉默寡言，但在熟人面前却很健谈。",
    "无论做什么事情，你总是有“备用计划”甚至“备用的备用计划”。"
];

const TOTAL_QUESTIONS = MOCK_QUESTIONS.length;

// Static mock result for when answering questions
const DEFAULT_TEST_RESULT: TestResultData = {
    type: 'ESTJ',
    title: '总经理',
    description: '出色的管理者，对管理事务或人员非常在行。',
    scores: { e: 65, i: 35, s: 72, n: 28, t: 58, f: 42, j: 80, p: 20 },
    strengths: ['高效且有条理，善于建立系统', '极强的责任心，信守对一切的承诺', '忠诚可靠的基石，受人尊敬的公民', '出色的组织能力，能将混乱变为井然有序'],
    weaknesses: ['容易固执己见，不愿接受非传统思路', '难以表达情感，显得过于严厉和生硬', '过于关注社会地位和公众眼中的形象', '难以放松自我，总是觉得有任务需要完成']
};

export default function MBTIModal({ isOpen, onClose, initialData }: MBTIModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [isFinished, setIsFinished] = useState(false);
    const [resultData, setResultData] = useState<TestResultData>(DEFAULT_TEST_RESULT);

    // Reset state when opened or given initial data
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setResultData(initialData);
                setIsFinished(true);
            } else {
                setResultData(DEFAULT_TEST_RESULT);
                setIsFinished(false);
                setCurrentIndex(0);
                setAnswers({});
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleOptionSelect = (score: number) => {
        setAnswers({ ...answers, [currentIndex]: score });
        
        // Advance to next question automatically after a short delay for feedback
        setTimeout(() => {
            if (currentIndex < TOTAL_QUESTIONS - 1) {
                setDirection(1);
                setCurrentIndex(currentIndex + 1);
            } else {
                // Completed the assessment
                setIsFinished(true);
            }
        }, 300);
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setDirection(-1);
            setCurrentIndex(currentIndex - 1);
        }
    };

    const progressPercentage = Math.round(((currentIndex) / TOTAL_QUESTIONS) * 100);

    // Variants for sliding transitions
    const variants = {
        enter: (dir: number) => ({
            x: dir > 0 ? 50 : -50,
            opacity: 0
        }),
        center: {
            z: 1,
            x: 0,
            opacity: 1
        },
        exit: (dir: number) => ({
            z: 0,
            x: dir < 0 ? 50 : -50,
            opacity: 0
        })
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
                onClick={onClose}
            ></div>
            
            {/* Modal Content */}
            <div className="relative w-full max-w-5xl h-[90vh] sm:h-[85vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-200 border border-white/20">
                {/* Header */}
                <div className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-md z-20 shrink-0">
                    <h3 className="text-xl font-bold text-slate-900 tracking-wide">
                        {!isFinished ? "16型人格深度测评" : "测评结果报告"}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Conditional Rendering of Test vs Result */}
                {!isFinished ? (
                    /* The Test UI */
                    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50 relative">
                        {/* Background decorations */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/40 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-100/40 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>
                        
                        {/* Top Progress Bar Area */}
                        <div className="w-full px-6 sm:px-16 pt-8 pb-4 relative z-10 shrink-0">
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-base font-bold text-slate-700 font-mono tracking-tight sm:text-lg">
                                    问题 {currentIndex + 1} <span className="text-slate-400 text-sm">/ {TOTAL_QUESTIONS}</span>
                                </span>
                                <span className="text-sm font-bold text-slate-400 font-mono">{progressPercentage}%</span>
                            </div>
                            {/* The dynamic progress bar */}
                            <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden shrink-0 shadow-inner">
                                <div 
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${progressPercentage}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Question & Options Area */}
                        <div className="flex-1 relative w-full flex items-center justify-center px-4 sm:px-16 pb-12 z-10">
                            <AnimatePresence custom={direction} mode="wait">
                                <motion.div
                                    key={currentIndex}
                                    custom={direction}
                                    variants={variants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{
                                        x: { type: "tween", duration: 0.35, ease: [0.25, 1, 0.5, 1] },
                                        opacity: { duration: 0.25 }
                                    }}
                                    className="w-full max-w-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-8 sm:p-14 border border-slate-100/60"
                                >
                                    {/* Question Text */}
                                    <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center mb-16 leading-relaxed tracking-tight">
                                        {MOCK_QUESTIONS[currentIndex]}
                                    </h4>

                                    {/* 5 Options Timeline */}
                                    <div className="flex flex-col mb-2">
                                        <div className="flex justify-between items-center w-full gap-2 sm:gap-4 relative px-2">
                                            {/* Background connecting line */}
                                            <div className="absolute top-1/2 left-8 right-8 h-1 bg-slate-100 -translate-y-1/2 z-0 hidden sm:block rounded-full"></div>
                                            
                                            {/* Option 1: Strongly Disagree */}
                                            <button 
                                                onClick={() => handleOptionSelect(1)}
                                                className={`relative z-10 group flex flex-col items-center justify-center gap-3`}
                                            >
                                                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 shadow-sm
                                                    bg-white border-rose-100 text-rose-400 group-hover:bg-rose-50 group-hover:border-rose-400 group-hover:text-rose-600 group-hover:scale-110 group-hover:shadow-rose-100/50 group-hover:shadow-lg
                                                    ${answers[currentIndex] === 1 ? 'bg-rose-50 border-rose-500 text-rose-600 ring-4 ring-rose-100/50 scale-110' : ''}`}>
                                                    <XCircle className="w-8 h-8" strokeWidth={2.5} />
                                                </div>
                                                <span className="text-xs sm:text-sm font-bold text-rose-400 group-hover:text-rose-600 transition-colors">完全不同意</span>
                                            </button>

                                            {/* Option 2: Disagree */}
                                            <button 
                                                onClick={() => handleOptionSelect(2)}
                                                className={`relative z-10 group flex flex-col items-center justify-center gap-3`}
                                            >
                                                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 mt-1.5 sm:mt-2 shadow-sm
                                                    bg-white border-orange-100 text-orange-400 group-hover:bg-orange-50 group-hover:border-orange-400 group-hover:text-orange-500 group-hover:scale-110 group-hover:shadow-orange-100/50 group-hover:shadow-md
                                                    ${answers[currentIndex] === 2 ? 'bg-orange-50 border-orange-500 text-orange-500 ring-4 ring-orange-100/50 scale-110' : ''}`}>
                                                    <XIcon className="w-6 h-6" strokeWidth={2.5} />
                                                </div>
                                                <span className="text-xs sm:text-sm font-semibold text-slate-400 group-hover:text-orange-500 transition-colors">不同意</span>
                                            </button>

                                            {/* Option 3: Neutral */}
                                            <button 
                                                onClick={() => handleOptionSelect(3)}
                                                className={`relative z-10 group flex flex-col items-center justify-center gap-3`}
                                            >
                                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 mt-2.5 sm:mt-3 shadow-sm
                                                    bg-white border-slate-100 text-slate-400 group-hover:bg-slate-50 group-hover:border-slate-400 group-hover:text-slate-600 group-hover:scale-110 group-hover:shadow-slate-100/50 group-hover:shadow-md
                                                    ${answers[currentIndex] === 3 ? 'bg-slate-50 border-slate-500 text-slate-600 ring-4 ring-slate-100/50 scale-110' : ''}`}>
                                                    <Minus className="w-5 h-5" strokeWidth={3} />
                                                </div>
                                                <span className="text-xs sm:text-sm font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">中立</span>
                                            </button>

                                            {/* Option 4: Agree */}
                                            <button 
                                                onClick={() => handleOptionSelect(4)}
                                                className={`relative z-10 group flex flex-col items-center justify-center gap-3`}
                                            >
                                                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 mt-1.5 sm:mt-2 shadow-sm
                                                    bg-white border-teal-100 text-teal-400 group-hover:bg-teal-50 group-hover:border-teal-400 group-hover:text-teal-500 group-hover:scale-110 group-hover:shadow-teal-100/50 group-hover:shadow-md
                                                    ${answers[currentIndex] === 4 ? 'bg-teal-50 border-teal-500 text-teal-500 ring-4 ring-teal-100/50 scale-110' : ''}`}>
                                                    <Check className="w-6 h-6" strokeWidth={3} />
                                                </div>
                                                <span className="text-xs sm:text-sm font-semibold text-slate-400 group-hover:text-teal-500 transition-colors">同意</span>
                                            </button>

                                            {/* Option 5: Strongly Agree */}
                                            <button 
                                                onClick={() => handleOptionSelect(5)}
                                                className={`relative z-10 group flex flex-col items-center justify-center gap-3`}
                                            >
                                                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 shadow-sm
                                                    bg-white border-emerald-100 text-emerald-400 group-hover:bg-emerald-50 group-hover:border-emerald-400 group-hover:text-emerald-500 group-hover:scale-110 group-hover:shadow-emerald-100/50 group-hover:shadow-lg
                                                    ${answers[currentIndex] === 5 ? 'bg-emerald-50 border-emerald-500 text-emerald-500 ring-4 ring-emerald-100/50 scale-110' : ''}`}>
                                                    <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} />
                                                </div>
                                                <span className="text-xs sm:text-sm font-bold text-emerald-400 group-hover:text-emerald-500 transition-colors">完全同意</span>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer / Meta Data Area */}
                        <div className="w-full px-6 sm:px-16 pb-6 pt-4 flex items-center justify-between bg-transparent z-10 shrink-0">
                            <button 
                                onClick={handlePrevious}
                                disabled={currentIndex === 0}
                                className="flex items-center text-slate-500 font-semibold hover:text-indigo-600 transition-colors disabled:opacity-30 disabled:hover:text-slate-500 group"
                            >
                                <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" /> 上一题
                            </button>

                            <div className="text-center font-medium text-slate-400/80 text-sm tracking-wide">
                                共 {TOTAL_QUESTIONS} 题 · 预计还需 <span className="text-slate-500">{Math.max(1, Math.ceil((TOTAL_QUESTIONS - currentIndex) * 0.5))}</span> 分钟
                            </div>
                            
                            <div className="w-20"></div>
                        </div>
                    </div>
                ) : (
                    /* The Final Result Page UI */
                    <div className="flex-1 overflow-y-auto w-full px-4 sm:px-12 py-8 bg-slate-50/50 relative z-10 custom-scrollbar">
                        <div className="max-w-4xl mx-auto space-y-6">
                            
                            {/* Result Header */}
                            <div className="flex items-start justify-between bg-white p-8 sm:p-10 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-teal-50/60 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-50/80 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>
                                
                                <div className="relative z-10">
                                    <div className="inline-block px-3.5 py-1.5 bg-teal-100/80 text-teal-800 text-xs font-black tracking-widest rounded-full mb-4 uppercase shadow-sm">
                                        测试结果
                                    </div>
                                    <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-3 tracking-tighter loading-tight">
                                        {resultData.type} <span className="text-slate-300 font-normal mx-2">|</span> {resultData.title}
                                    </h2>
                                    <p className="text-lg text-slate-600 font-medium tracking-wide">
                                        {resultData.description}
                                    </p>
                                </div>
                                <button className="relative z-10 p-3 bg-white hover:bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-800 rounded-full transition-all shadow-sm hover:shadow-md hover:scale-105">
                                    <Share2 className="w-5 h-5" />
                                </button>
                            </div>

                            {/* 4 Dimensions Grid */}
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center px-2">
                                    <span className="w-1.5 h-6 bg-teal-500 rounded-full mr-3 inline-block"></span> 人格维度解析
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* E-I */}
                                    <div className="bg-white p-6 sm:p-7 rounded-[1.5rem] border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
                                        <div className="flex justify-between items-end mb-4 font-bold tracking-tight">
                                            <span className="text-teal-600 text-xl">E <span className="text-sm font-semibold text-slate-500 ml-1">外向 <span className="text-teal-500 font-mono tracking-tighter opacity-80">({resultData.scores.e}%)</span></span></span>
                                            <span className="text-slate-400 text-xl"><span className="text-sm font-semibold text-slate-400 mr-1"><span className="font-mono tracking-tighter opacity-80">({resultData.scores.i}%)</span> 内向</span> I</span>
                                        </div>
                                        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${resultData.scores.e}%` }} transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }} className="h-full bg-teal-500"></motion.div>
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${resultData.scores.i}%` }} transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }} className="h-full bg-slate-200/50"></motion.div>
                                        </div>
                                    </div>

                                    {/* S-N */}
                                    <div className="bg-white p-6 sm:p-7 rounded-[1.5rem] border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
                                        <div className="flex justify-between items-end mb-4 font-bold tracking-tight">
                                            <span className="text-teal-600 text-xl">S <span className="text-sm font-semibold text-slate-500 ml-1">实感 <span className="text-teal-500 font-mono tracking-tighter opacity-80">({resultData.scores.s}%)</span></span></span>
                                            <span className="text-slate-400 text-xl"><span className="text-sm font-semibold text-slate-400 mr-1"><span className="font-mono tracking-tighter opacity-80">({resultData.scores.n}%)</span> 直觉</span> N</span>
                                        </div>
                                        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${resultData.scores.s}%` }} transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1], delay: 0.1 }} className="h-full bg-teal-500"></motion.div>
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${resultData.scores.n}%` }} transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1], delay: 0.1 }} className="h-full bg-slate-200/50"></motion.div>
                                        </div>
                                    </div>

                                    {/* T-F */}
                                    <div className="bg-white p-6 sm:p-7 rounded-[1.5rem] border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
                                        <div className="flex justify-between items-end mb-4 font-bold tracking-tight">
                                            <span className="text-teal-600 text-xl">T <span className="text-sm font-semibold text-slate-500 ml-1">理智 <span className="text-teal-500 font-mono tracking-tighter opacity-80">({resultData.scores.t}%)</span></span></span>
                                            <span className="text-slate-400 text-xl"><span className="text-sm font-semibold text-slate-400 mr-1"><span className="font-mono tracking-tighter opacity-80">({resultData.scores.f}%)</span> 情感</span> F</span>
                                        </div>
                                        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${resultData.scores.t}%` }} transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1], delay: 0.2 }} className="h-full bg-teal-500"></motion.div>
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${resultData.scores.f}%` }} transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1], delay: 0.2 }} className="h-full bg-slate-200/50"></motion.div>
                                        </div>
                                    </div>

                                    {/* J-P */}
                                    <div className="bg-white p-6 sm:p-7 rounded-[1.5rem] border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
                                        <div className="flex justify-between items-end mb-4 font-bold tracking-tight">
                                            <span className="text-teal-600 text-xl">J <span className="text-sm font-semibold text-slate-500 ml-1">判断 <span className="text-teal-500 font-mono tracking-tighter opacity-80">({resultData.scores.j}%)</span></span></span>
                                            <span className="text-slate-400 text-xl"><span className="text-sm font-semibold text-slate-400 mr-1"><span className="font-mono tracking-tighter opacity-80">({resultData.scores.p}%)</span> 理解</span> P</span>
                                        </div>
                                        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${resultData.scores.j}%` }} transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1], delay: 0.3 }} className="h-full bg-teal-500"></motion.div>
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${resultData.scores.p}%` }} transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1], delay: 0.3 }} className="h-full bg-slate-200/50"></motion.div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Strengths and Weaknesses Columns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Strengths Column */}
                                <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-emerald-100/50 shadow-sm transition-shadow hover:shadow-md relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/80 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                                    <div className="flex items-center gap-4 mb-6 relative z-10">
                                        <div className="w-12 h-12 rounded-full bg-emerald-100/80 flex items-center justify-center text-emerald-600 shadow-inner">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 tracking-wide">核心优势</h3>
                                    </div>
                                    <ul className="space-y-4 relative z-10">
                                        {resultData.strengths.map((item, i) => (
                                            <li key={i} className="flex items-start text-slate-700 font-medium leading-relaxed">
                                                <Check className="w-5 h-5 text-emerald-500 mr-3 shrink-0 mt-0.5" strokeWidth={3} />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Weaknesses Column */}
                                <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-amber-100/50 shadow-sm transition-shadow hover:shadow-md relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/80 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                                    <div className="flex items-center gap-4 mb-6 relative z-10">
                                        <div className="w-12 h-12 rounded-full bg-amber-100/80 flex items-center justify-center text-amber-600 shadow-inner">
                                            <AlertCircle className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 tracking-wide">潜在盲区</h3>
                                    </div>
                                    <ul className="space-y-4 relative z-10">
                                        {resultData.weaknesses.map((item, i) => (
                                            <li key={i} className="flex items-start text-slate-700 font-medium leading-relaxed">
                                                <AlertCircle className="w-5 h-5 text-amber-500 mr-3 shrink-0 mt-0.5" strokeWidth={2.5} />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            
                            {/* Action Button */}
                            <div className="pt-6 pb-2 flex justify-center">
                                <button onClick={onClose} className="px-12 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl transition-all hover:-translate-y-1 focus:ring-4 focus:ring-slate-200">
                                    完成并关闭
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(203, 213, 225, 0.5);
                    border-radius: 20px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background-color: rgba(148, 163, 184, 0.8);
                }
            `}</style>
        </div>
    );
}
