"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import SmartEditorTool from '@/features/dashboard-core/components/SmartEditorTool';
import styles from './page.module.css';

const userData = [
    { subject: '逻辑能力', A: 85, fullMark: 100 },
    { subject: '沟通表达', A: 90, fullMark: 100 },
    { subject: '执行落地', A: 78, fullMark: 100 },
    { subject: '创新思维', A: 82, fullMark: 100 },
    { subject: '领导团队', A: 65, fullMark: 100 },
    { subject: '抗压能力', A: 95, fullMark: 100 },
];

const matchData = [
    { subject: '逻辑能力', User: 85, Post: 80, fullMark: 100 },
    { subject: '沟通表达', User: 90, Post: 85, fullMark: 100 },
    { subject: '执行落地', User: 78, Post: 90, fullMark: 100 },
    { subject: '创新思维', User: 82, Post: 75, fullMark: 100 },
    { subject: '领导团队', User: 65, Post: 60, fullMark: 100 },
    { subject: '抗压能力', User: 95, Post: 85, fullMark: 100 },
];

export default function PersonPostMatching() {
    type MatchStatus = 'idle' | 'analyzing' | 'results' | 'report';
    const [matchStatus, setMatchStatus] = useState<MatchStatus>('idle');
    const [mounted, setMounted] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        const saved = sessionStorage.getItem('personPostMatchStatus');
        if (saved) {
            setMatchStatus(saved as MatchStatus);
        }
    }, []);

    const updateMatchStatus = (status: MatchStatus) => {
        setMatchStatus(status);
        sessionStorage.setItem('personPostMatchStatus', status);
    };

    const handleExportToWord = () => {
        if (!reportRef.current) return;
        const content = reportRef.current.innerHTML;
        const html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Microsoft YaHei', sans-serif; padding: 40px; }
                    .reportTitle { font-size: 24px; font-weight: bold; color: #334155; margin-bottom: 24px; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
                    .reportSection { margin-bottom: 20px; background: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; }
                    h3 { color: #f59e0b; margin-top: 0; font-size: 18px; margin-bottom: 10px; }
                    p { color: #475569; line-height: 1.6; font-size: 14px; margin: 0; }
                </style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = '职业生涯发展报告.doc';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = () => {
        updateMatchStatus('analyzing');
    };

    useEffect(() => {
        if (matchStatus === 'analyzing') {
            const timer = setTimeout(() => {
                updateMatchStatus('results');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [matchStatus]);

    if (!mounted) return null;

    return (
        <div className={styles.dashboardContainer}>
            {/* Left Cabin */}
            <div className={styles.leftCabin}>
                {matchStatus === 'idle' ? (
                    <div className={styles.importSection}>
                        <button className={styles.importBtn} onClick={handleImport}>
                            导入/同步能力刻画
                        </button>
                    </div>
                ) : (
                    <div className={styles.avatarData}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className={styles.sectionTitle}>我的数字分身</h2>
                            <button 
                                onClick={handleImport}
                                style={{
                                    fontSize: '0.875rem',
                                    color: '#f59e0b',
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    marginLeft: '1rem'
                                }}
                            >
                                重新导入能力画像
                            </button>
                        </div>
                        <div className={styles.radarPlaceholder}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={userData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                                    <Radar name="我的能力" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className={styles.tagsContainer}>
                            <span className={styles.tag}>自驱力突出</span>
                            <span className={styles.tag}>沟通力优秀</span>
                            <span className={styles.tag}>抗压极强</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Cabin */}
            <div className={styles.rightCabin}>
                <AnimatePresence mode="wait">
                    {matchStatus === 'idle' && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className={styles.emptyState}
                        >
                            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v4M12 16h.01" />
                            </svg>
                            <p>等待导入能力模型进行星际匹配…</p>
                        </motion.div>
                    )}

                    {matchStatus === 'analyzing' && (
                        <motion.div
                            key="analyzing"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className={styles.loadingState}
                        >
                            <div className={styles.scannerContainer}>
                                <div className={styles.scannerLine}></div>
                            </div>
                            <p className={styles.loadingText}>AI 正在海量岗位库中检索...</p>
                        </motion.div>
                    )}

                    {matchStatus === 'results' && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                            className={styles.resultState}
                        >
                            <div className={styles.topCards}>
                                <div className={`${styles.card} ${styles.cardActive}`}>
                                    <div className={styles.cardRank}>TOP 1</div>
                                    <div className={styles.cardTitle}>产品经理</div>
                                    <div className={styles.cardMatch}>核心匹配度: 92%</div>
                                </div>
                                <div className={styles.card}>
                                    <div className={styles.cardRank}>TOP 2</div>
                                    <div className={styles.cardTitle}>项目经理</div>
                                    <div className={styles.cardMatch}>核心匹配度: 85%</div>
                                </div>
                                <div className={styles.card}>
                                    <div className={styles.cardRank}>TOP 3</div>
                                    <div className={styles.cardTitle}>运营专家</div>
                                    <div className={styles.cardMatch}>核心匹配度: 78%</div>
                                </div>
                            </div>
                            <div className={styles.middleAnalysis}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={matchData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                                        <Radar name="我的能力" dataKey="User" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                                        <Radar name="目标岗位要求" dataKey="Post" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                        <Legend wrapperStyle={{ color: '#475569', paddingTop: '20px' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className={styles.bottomAction}>
                                <button className={styles.reportBtn} onClick={() => updateMatchStatus('report')}>
                                    <span className={styles.btnGlow}></span>
                                    <span className={styles.btnText}>🔮 生成职业生涯发展报告</span>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {matchStatus === 'report' && (
                        <motion.div
                            key="report"
                            initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }}
                            className={styles.reportState}
                        >
                            <SmartEditorTool onExport={handleExportToWord} />
                            
                            <div className={styles.reportHeader}>
                                <button className={styles.backBtn} onClick={() => updateMatchStatus('results')}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="19" y1="12" x2="5" y2="12"></line>
                                        <polyline points="12 19 5 12 12 5"></polyline>
                                    </svg>
                                    返回匹配结果
                                </button>
                            </div>

                            <div className={styles.reportDocument} ref={reportRef}>
                                <h2 className={styles.reportTitle}>职业生涯发展报告</h2>
                                <div className={styles.reportSection}>
                                    <h3>职业目标设定</h3>
                                    <p>短期（1年内）：熟悉基础业务流程... <br /> 中期（3-5年）：独立负责核心模块...</p>
                                </div>
                                <div className={styles.reportSection}>
                                    <h3>行业趋势分析</h3>
                                    <p>该岗位市场需求正以每年15%速度增长...</p>
                                </div>
                                <div className={styles.reportSection}>
                                    <h3>发展路径规划</h3>
                                    <p>初级专员 {'->'} 资深专家 {'->'} 架构师/团队Leader</p>
                                </div>
                                <div className={styles.reportSection}>
                                    <h3>行动计划</h3>
                                    <p>阶段一：考取相关认证... <br /> 阶段二：参与跨部门核心项目...</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
