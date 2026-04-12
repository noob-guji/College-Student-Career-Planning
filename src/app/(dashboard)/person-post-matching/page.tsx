import MatchingCenter from '@/features/matching-center/components/MatchingCenter';

export default function PersonPostMatchingPage() {
  return <MatchingCenter />;
}



// "use client";

// import { useState, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
// import { ArrowRight, Star, TrendingUp, Zap, ChevronRight, BookOpen } from 'lucide-react';
// import { computeMatchScores, buildMatchRadar, DEFAULT_CAPABILITIES, type MatchResult } from '@/lib/matching';
// import styles from './page.module.css';
// import Link from 'next/link';

// function loadProfile() {
//   try {
//     const raw = sessionStorage.getItem('careerProfile');
//     if (!raw) return { selectedJobTypes:['产品经理'], skills:['Python'], careerDirection:'全栈复合型', capabilities: DEFAULT_CAPABILITIES };
//     const p = JSON.parse(raw);
//     return { selectedJobTypes: p.selectedJobTypes??['产品经理'], skills: p.skills??[], careerDirection: p.careerDirection??'全栈复合型', capabilities: p.capabilities??DEFAULT_CAPABILITIES };
//   } catch { return { selectedJobTypes:['产品经理'], skills:[], careerDirection:'全栈复合型', capabilities: DEFAULT_CAPABILITIES }; }
// }

// function saveMatchResult(results: MatchResult[], radarData: any[]) {
//   sessionStorage.setItem('matchResult', JSON.stringify({
//     top1: { role: results[0]?.role, score: results[0]?.score },
//     top2: { role: results[1]?.role, score: results[1]?.score },
//     top3: { role: results[2]?.role, score: results[2]?.score },
//     radarData, savedAt: Date.now(),
//   }));
// }

// function buildUserRadar(caps: Record<string,number>) {
//   return ['逻辑能力','沟通表达','执行落地','创新思维','领导团队','抗压能力']
//     .map(d => ({ subject: d, A: caps[d]??75, fullMark: 100 }));
// }

// // 差距分析卡片
// function GapCard({ result }: { result: MatchResult }) {
//   const dims = ['逻辑能力','沟通表达','执行落地','创新思维','领导团队','抗压能力'];
//   const caps = loadProfile().capabilities;
//   const gaps = dims.map(d => ({
//     dim: d,
//     user: caps[d]??75,
//     req: result.requirements[d]??75,
//     diff: (result.requirements[d]??75) - (caps[d]??75),
//   })).sort((a,b) => b.diff - a.diff);

//   return (
//     <div className="space-y-2">
//       <p className="text-xs font-bold text-slate-600 mb-3">与「{result.role}」的能力差距分析</p>
//       {gaps.map(g => {
//         const diffColor = g.diff > 10 ? 'text-red-500' : g.diff > 0 ? 'text-amber-500' : 'text-emerald-500';
//         const barColor  = g.diff > 10 ? 'bg-red-400' : g.diff > 0 ? 'bg-amber-400' : 'bg-emerald-400';
//         return (
//           <div key={g.dim} className="flex items-center gap-2">
//             <span className="text-[10px] text-slate-500 w-16 shrink-0 truncate">{g.dim}</span>
//             <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
//               <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(g.user,100)}%` }} />
//             </div>
//             <span className={`text-[10px] font-bold w-10 text-right shrink-0 ${diffColor}`}>
//               {g.diff > 0 ? `+${g.diff}` : g.diff === 0 ? '✓' : `${g.diff}`}
//             </span>
//           </div>
//         );
//       })}
//       <p className="text-[10px] text-slate-400 mt-2">正值表示岗位要求高于你当前水平，需要提升</p>
//     </div>
//   );
// }

// export default function PersonPostMatching() {
//   type MatchStatus = 'idle'|'analyzing'|'results';
//   const [matchStatus,  setMatchStatus]  = useState<MatchStatus>('idle');
//   const [mounted,      setMounted]      = useState(false);
//   const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
//   const [matchRadar,   setMatchRadar]   = useState<any[]>([]);
//   const [userRadar,    setUserRadar]    = useState<any[]>([]);
//   const [hasProfile,   setHasProfile]   = useState(false);
//   const [activeResult, setActiveResult] = useState(0);

//   useEffect(() => {
//     setMounted(true);
//     setHasProfile(!!sessionStorage.getItem('careerProfile'));
//     setUserRadar(buildUserRadar(loadProfile().capabilities));
//     const saved = sessionStorage.getItem('personPostMatchStatus');
//     // Only restore to results state, not analyzing
//     if (saved === 'results') {
//       const mr = sessionStorage.getItem('matchResult');
//       if (mr) {
//         try {
//           const parsed = JSON.parse(mr);
//           // Reconstruct match results from saved data
//           const profile = loadProfile();
//           const results = computeMatchScores(profile);
//           const radar   = buildMatchRadar(profile.capabilities, results[0]?.role??'产品经理');
//           setMatchResults(results);
//           setMatchRadar(radar);
//           setUserRadar(buildUserRadar(profile.capabilities));
//           setMatchStatus('results');
//         } catch {}
//       }
//     }
//   }, []);

//   const handleImport = () => {
//     setMatchStatus('analyzing');
//     sessionStorage.setItem('personPostMatchStatus', 'analyzing');
//   };

//   useEffect(() => {
//     if (matchStatus !== 'analyzing') return;
//     const timer = setTimeout(() => {
//       const profile = loadProfile();
//       const results = computeMatchScores(profile);
//       const radar   = buildMatchRadar(profile.capabilities, results[0]?.role??'产品经理');
//       setMatchResults(results);
//       setMatchRadar(radar);
//       setUserRadar(buildUserRadar(profile.capabilities));
//       saveMatchResult(results, radar);
//       setMatchStatus('results');
//       sessionStorage.setItem('personPostMatchStatus', 'results');
//     }, 3000);
//     return () => clearTimeout(timer);
//   }, [matchStatus]);

//   if (!mounted) return null;
//   const top1 = matchResults[0];

//   return (
//     <div className={styles.dashboardContainer}>
//       {/* 左侧 */}
//       <div className={styles.leftCabin}>
//         {matchStatus === 'idle' ? (
//           <div className={styles.importSection}>
//             {!hasProfile && (
//               <div className="text-center px-4 mb-4">
//                 <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
//                   ⚠ 建议先在「自我认知中心」填写能力画像，获得更精准的匹配结果
//                 </p>
//               </div>
//             )}
//             <button className={styles.importBtn} onClick={handleImport}>导入/同步能力刻画</button>
//           </div>
//         ) : (
//           <div className={styles.avatarData}>
//             <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
//               <h2 className={styles.sectionTitle}>我的数字分身</h2>
//               <button onClick={handleImport} style={{ fontSize:'0.8rem', color:'#f59e0b', background:'rgba(245,158,11,0.1)', padding:'0.2rem 0.6rem', borderRadius:'9999px', border:'1px solid rgba(245,158,11,0.2)', cursor:'pointer' }}>
//                 重新匹配
//               </button>
//             </div>
//             <div className={styles.radarPlaceholder}>
//               <ResponsiveContainer width="100%" height="100%">
//                 <RadarChart cx="50%" cy="50%" outerRadius="70%" data={userRadar}>
//                   <PolarGrid stroke="#e2e8f0" />
//                   <PolarAngleAxis dataKey="subject" tick={{ fill:'#475569', fontSize:12 }} />
//                   <Radar name="我的能力" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
//                 </RadarChart>
//               </ResponsiveContainer>
//             </div>
//             <div className={styles.tagsContainer}>
//               {(() => {
//                 const caps = loadProfile().capabilities;
//                 const sorted = Object.entries(caps).sort((a,b) => b[1]-a[1]);
//                 const tagMap: Record<string,string> = { 逻辑能力:'逻辑能力突出', 沟通表达:'沟通力优秀', 执行落地:'执行力强', 创新思维:'创意活跃', 领导团队:'具备领导力', 抗压能力:'抗压能力强' };
//                 return sorted.slice(0,3).map(([d]) => <span key={d} className={styles.tag}>{tagMap[d]}</span>);
//               })()}
//             </div>
//           </div>
//         )}
//       </div>

//       {/* 右侧 */}
//       <div className={styles.rightCabin}>
//         <AnimatePresence mode="wait">
//           {matchStatus === 'idle' && (
//             <motion.div key="idle" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className={styles.emptyState}>
//               <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
//               </svg>
//               <p>等待导入能力模型进行星际匹配…</p>
//             </motion.div>
//           )}

//           {matchStatus === 'analyzing' && (
//             <motion.div key="analyzing" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className={styles.loadingState}>
//               <div className={styles.scannerContainer}><div className={styles.scannerLine} /></div>
//               <p className={styles.loadingText}>AI 正在海量岗位库中检索...</p>
//             </motion.div>
//           )}

//           {matchStatus === 'results' && (
//             <motion.div key="results" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
//               className="flex flex-col h-full overflow-y-auto">

//               {/* TOP3 卡片 */}
//               <div className={styles.topCards}>
//                 {matchResults.map((r, i) => (
//                   <div key={r.role}
//                     onClick={() => setActiveResult(i)}
//                     className={`${styles.card} ${i===activeResult ? styles.cardActive : ''} cursor-pointer`}>
//                     <div className={styles.cardRank}>TOP {i+1}</div>
//                     <div className={styles.cardTitle}>{r.role}</div>
//                     <div className={styles.cardMatch}>匹配度: {r.score}%</div>
//                     {r.tags.length > 0 && (
//                       <div className="flex flex-wrap gap-1 mt-1 justify-center">
//                         {r.tags.slice(0,2).map(t => (
//                           <span key={t} className="text-[9px] px-1.5 py-0.5 bg-amber-100/60 text-amber-800 rounded">{t}</span>
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>

//               {/* 对比雷达 + 差距分析 */}
//               <div className="grid grid-cols-2 gap-4 px-4 py-3 flex-1 min-h-0">
//                 {/* 雷达图 */}
//                 <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
//                   <p className="text-xs font-semibold text-slate-700 mb-2">能力匹配雷达</p>
//                   <div className="h-48">
//                     <ResponsiveContainer width="100%" height="100%">
//                       <RadarChart cx="50%" cy="50%" outerRadius="70%" data={matchRadar}>
//                         <PolarGrid stroke="#e2e8f0" />
//                         <PolarAngleAxis dataKey="subject" tick={{ fill:'#475569', fontSize:10 }} />
//                         <Radar name="我的能力"   dataKey="User" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.35} />
//                         <Radar name="岗位要求" dataKey="Post" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
//                         <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }} />
//                         <Tooltip contentStyle={{ fontSize:11 }} />
//                       </RadarChart>
//                     </ResponsiveContainer>
//                   </div>
//                 </div>

//                 {/* 差距分析 */}
//                 <div className="bg-white rounded-xl p-3 border border-slate-100">
//                   {matchResults[activeResult] && <GapCard result={matchResults[activeResult]} />}
//                 </div>
//               </div>

//               {/* 匹配详情 + 行动指引 */}
//               {top1 && (
//                 <div className="mx-4 mb-3 p-4 bg-gradient-to-r from-slate-50 to-amber-50 rounded-xl border border-amber-100 space-y-3">
//                   <div className="flex items-center gap-2">
//                     <Star className="w-4 h-4 text-amber-500" />
//                     <span className="font-semibold text-slate-900 text-sm">最佳推荐：{top1.role}</span>
//                     <span className="ml-auto text-amber-600 font-black text-lg">{top1.score}%</span>
//                   </div>
//                   <div className="grid grid-cols-2 gap-2 text-xs">
//                     <div className="bg-white rounded-lg p-2.5 border border-slate-100">
//                       <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" />岗位标签</p>
//                       <div className="flex flex-wrap gap-1">
//                         {(top1.tags??[]).map(t => <span key={t} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px]">{t}</span>)}
//                       </div>
//                     </div>
//                     <div className="bg-white rounded-lg p-2.5 border border-slate-100">
//                       <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1"><Zap className="w-3 h-3 text-blue-500" />建议关注</p>
//                       <p className="text-slate-500 text-[10px] leading-relaxed">前往「生涯蓝图」生成完整 AI 职业规划报告</p>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* 导航到生涯蓝图（替代原来的 SmartEditorTool） */}
//               <div className="mx-4 mb-4">
//                 <Link href="/career-blueprint"
//                   className="group flex items-center justify-between w-full px-5 py-4 bg-[#111827] hover:bg-[#1a2333] text-white rounded-xl transition-all shadow-lg">
//                   <div className="flex items-center gap-3">
//                     <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center">
//                       <BookOpen className="w-4.5 h-4.5 text-amber-400" />
//                     </div>
//                     <div>
//                       <p className="font-bold text-sm">前往生涯蓝图</p>
//                       <p className="text-white/40 text-xs mt-0.5">AI 生成完整职业规划报告</p>
//                     </div>
//                   </div>
//                   <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
//                 </Link>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// }
