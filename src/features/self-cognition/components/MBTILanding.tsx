'use client';

import { useState } from 'react';
import { ArrowRight, Glasses, HeartHandshake, Shield, Compass, History, ChevronRight } from 'lucide-react';
import MBTIModal, { TestResultData } from './MBTIModal';
import PersonalityDetailsModal from './PersonalityDetailsModal';
import { motion, AnimatePresence } from 'framer-motion';

const PERSONALITY_TYPES = [
  { id:'nt', badge:'NT', title:'分析家', examples:'INTJ, INTP, ENTJ, ENTP', summary:'理性思考，追求创新',
    color:'from-blue-500/5 to-transparent', iconBg:'bg-blue-100/80', iconColor:'text-blue-600',
    badgeBg:'bg-blue-500', hoverBorder:'hover:border-blue-200/50', hoverShadow:'hover:shadow-blue-900/5',
    icon: <Glasses className="w-8 h-8" /> },
  { id:'nf', badge:'NF', title:'外交家', examples:'INFJ, INFP, ENFJ, ENFP', summary:'理想主义，富有同理心',
    color:'from-emerald-500/5 to-transparent', iconBg:'bg-emerald-100/80', iconColor:'text-emerald-600',
    badgeBg:'bg-emerald-500', hoverBorder:'hover:border-emerald-200/50', hoverShadow:'hover:shadow-emerald-900/5',
    icon: <HeartHandshake className="w-8 h-8" /> },
  { id:'sj', badge:'SJ', title:'哨兵', examples:'ISTJ, ISFJ, ESTJ, ESFJ', summary:'务实可靠，注重秩序',
    color:'from-amber-500/5 to-transparent', iconBg:'bg-amber-100/80', iconColor:'text-amber-600',
    badgeBg:'bg-amber-500', hoverBorder:'hover:border-amber-200/50', hoverShadow:'hover:shadow-amber-900/5',
    icon: <Shield className="w-8 h-8" /> },
  { id:'sp', badge:'SP', title:'探险家', examples:'ISTP, ISFP, ESTP, ESFP', summary:'灵活适应，享受当下',
    color:'from-purple-500/5 to-transparent', iconBg:'bg-purple-100/80', iconColor:'text-purple-600',
    badgeBg:'bg-purple-500', hoverBorder:'hover:border-purple-200/50', hoverShadow:'hover:shadow-purple-900/5',
    icon: <Compass className="w-8 h-8" /> },
];

// 读取真实历史（sessionStorage）
function loadHistory(): (TestResultData & { date: string })[] {
  try {
    const r = sessionStorage.getItem('mbtiResult');
    if (!r) return [];
    const data: TestResultData = JSON.parse(r);
    return [{ ...data, date: new Date().toLocaleDateString('zh-CN') }];
  } catch { return []; }
}

export default function MBTILanding() {
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedTypeId,  setSelectedTypeId]  = useState<string|null>(null);
  const [isHistoryOpen,   setIsHistoryOpen]   = useState(false);
  const [historyData,     setHistoryData]     = useState<TestResultData|null>(null);

  const history = loadHistory();

  const handleOpenTest = () => { setHistoryData(null); setIsTestModalOpen(true); };
  const handleOpenHistory = (data: TestResultData) => { setHistoryData(data); setIsTestModalOpen(true); setIsHistoryOpen(false); };

  return (
    <div className="flex flex-col h-full items-center px-4 py-10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-slate-50 rounded-full blur-3xl opacity-50 z-0 -translate-y-1/2 translate-x-1/3" />

      {/* Header */}
      <div className="text-center max-w-2xl mt-4 mb-12 relative z-50 flex flex-col items-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 leading-tight">
          MBTI深度测评问卷
        </h2>
        <p className="text-slate-500 text-base md:text-lg mb-10 font-medium tracking-wide">
          只需10分钟，揭开你隐藏的职场人格底牌。
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-center w-full relative">
          <button onClick={handleOpenTest}
            className="group inline-flex items-center justify-center gap-3 px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 sm:hover:-translate-y-1">
            开始测试 <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          <div className="relative inline-block">
            <button onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`group inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl shadow-sm border border-slate-200 hover:shadow transition-all duration-300 focus:outline-none ${isHistoryOpen ? 'ring-2 ring-slate-200 bg-slate-50' : ''}`}>
              <History className={`w-4 h-4 transition-transform duration-300 ${isHistoryOpen ? 'rotate-[-30deg] text-slate-700' : 'text-slate-400'}`} />
              历史记录 {history.length > 0 && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{history.length}</span>}
            </button>

            <AnimatePresence>
              {isHistoryOpen && (
                <motion.div
                  initial={{ opacity:0, scaleY:0, y:-10 }} animate={{ opacity:1, scaleY:1, y:0 }} exit={{ opacity:0, scaleY:0, y:-10 }}
                  transition={{ duration:0.3, ease:[0.25,1,0.5,1] }}
                  className="absolute top-full left-1/2 -translate-x-1/2 sm:left-auto sm:-translate-x-0 sm:right-0 mt-4 w-full sm:w-80 origin-top bg-white/85 backdrop-blur-xl border border-slate-200/60 rounded-[1.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] z-50 overflow-hidden">
                  <div className="p-5 flex flex-col gap-3">
                    <div className="px-1 pb-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold tracking-widest text-slate-400 uppercase">测评结果</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{history.length}条记录</span>
                    </div>
                    {history.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">暂无历史记录，完成测试后自动保存</p>
                    ) : (
                      history.map((item, i) => (
                        <div key={i} onClick={() => handleOpenHistory(item)}
                          className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow hover:border-slate-300 transition-all cursor-pointer flex justify-between items-center group">
                          <div>
                            <h4 className="font-bold text-slate-800">{item.type} - {item.title}</h4>
                            <span className="text-xs text-slate-400">{item.date}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Cards — 点击传 typeId */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-4xl pb-10 relative z-10 px-2 lg:px-0">
        {PERSONALITY_TYPES.map((type) => (
          <div key={type.id} onClick={() => setSelectedTypeId(type.id)}
            className={`group relative flex flex-col items-center justify-center text-center overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 shadow-sm transition-all duration-300 transform hover:-translate-y-1 cursor-pointer p-8 sm:p-10 ${type.hoverBorder} ${type.hoverShadow}`}>
            <div className={`absolute inset-0 bg-gradient-to-b opacity-60 z-0 ${type.color}`} />
            <div className="relative z-10 flex flex-col items-center w-full">
              <div className="relative mb-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${type.iconBg} ${type.iconColor} shadow-inner ring-4 ring-white`}>
                  {type.icon}
                </div>
                <div className={`absolute -top-1 -right-3 ${type.badgeBg} text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg border-2 border-white tracking-widest`}>
                  {type.badge}
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-wide">{type.title}</h3>
              <div className="text-xs font-bold text-slate-400 tracking-[0.2em] mb-4 uppercase">{type.examples}</div>
              <p className="text-sm md:text-base text-slate-500 font-medium">{type.summary}</p>
              <div className="mt-4 text-xs text-slate-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                点击查看详情 <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <MBTIModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} initialData={historyData} />
      <PersonalityDetailsModal isOpen={selectedTypeId !== null} onClose={() => setSelectedTypeId(null)} typeId={selectedTypeId} />
    </div>
  );
}
