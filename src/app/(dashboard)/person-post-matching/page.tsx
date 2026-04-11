"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import SmartEditorTool from '@/features/dashboard-core/components/SmartEditorTool';
import { computeMatchScores, buildMatchRadar, DEFAULT_CAPABILITIES, type MatchResult } from '@/lib/matching';
import styles from './page.module.css';

// 默认用户画像（未填表时的兜底）
const DEFAULT_PROFILE = {
  selectedJobTypes: ['产品经理'],
  skills: ['JavaScript', 'Python'],
  careerDirection: '全栈复合型',
  capabilities: DEFAULT_CAPABILITIES,
};

function loadProfile() {
  try {
    const raw = sessionStorage.getItem('careerProfile');
    if (!raw) return DEFAULT_PROFILE;
    const p = JSON.parse(raw);
    // 确保 capabilities 格式正确
    const caps = p.capabilities && typeof p.capabilities === 'object'
      ? p.capabilities
      : DEFAULT_CAPABILITIES;
    return {
      selectedJobTypes: p.selectedJobTypes ?? ['产品经理'],
      skills:           p.skills ?? [],
      careerDirection:  p.careerDirection ?? '全栈复合型',
      capabilities:     caps,
    };
  } catch { return DEFAULT_PROFILE; }
}

function saveMatchResult(results: MatchResult[], radarData: any[]) {
  sessionStorage.setItem('matchResult', JSON.stringify({
    top1: { role: results[0]?.role, score: results[0]?.score },
    top2: { role: results[1]?.role, score: results[1]?.score },
    top3: { role: results[2]?.role, score: results[2]?.score },
    radarData,
    savedAt: Date.now(),
  }));
}

// 用户能力雷达数据（左侧显示）
function buildUserRadar(caps: Record<string, number>) {
  return [
    { subject: '逻辑能力', A: caps['逻辑能力'] ?? 75, fullMark: 100 },
    { subject: '沟通表达', A: caps['沟通表达'] ?? 75, fullMark: 100 },
    { subject: '执行落地', A: caps['执行落地'] ?? 75, fullMark: 100 },
    { subject: '创新思维', A: caps['创新思维'] ?? 75, fullMark: 100 },
    { subject: '领导团队', A: caps['领导团队'] ?? 75, fullMark: 100 },
    { subject: '抗压能力', A: caps['抗压能力'] ?? 75, fullMark: 100 },
  ];
}

export default function PersonPostMatching() {
  type MatchStatus = 'idle' | 'analyzing' | 'results' | 'report';

  const [matchStatus,  setMatchStatus]  = useState<MatchStatus>('idle');
  const [mounted,      setMounted]      = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [matchRadar,   setMatchRadar]   = useState<any[]>([]);
  const [userRadar,    setUserRadar]    = useState<any[]>([]);
  const [hasProfile,   setHasProfile]   = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = sessionStorage.getItem('personPostMatchStatus');
    if (saved) setMatchStatus(saved as MatchStatus);

    // 检查是否有填写的画像
    const profile = loadProfile();
    const filled  = sessionStorage.getItem('careerProfile');
    setHasProfile(!!filled);
    setUserRadar(buildUserRadar(profile.capabilities));
  }, []);

  const updateMatchStatus = (status: MatchStatus) => {
    setMatchStatus(status);
    sessionStorage.setItem('personPostMatchStatus', status);
  };

  const handleImport = () => {
    updateMatchStatus('analyzing');
  };

  // 分析完成后计算真实匹配结果
  useEffect(() => {
    if (matchStatus !== 'analyzing') return;

    const timer = setTimeout(() => {
      const profile   = loadProfile();
      const results   = computeMatchScores(profile);
      const radarData = buildMatchRadar(profile.capabilities, results[0]?.role ?? '产品经理');

      setMatchResults(results);
      setMatchRadar(radarData);
      setUserRadar(buildUserRadar(profile.capabilities));
      saveMatchResult(results, radarData);

      updateMatchStatus('results');
    }, 3000);

    return () => clearTimeout(timer);
  }, [matchStatus]);

  const handleExportToWord = () => {
    if (!reportRef.current) return;
    const content = reportRef.current.innerHTML;
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head><meta charset="utf-8">
      <style>body{font-family:'Microsoft YaHei',sans-serif;padding:40px;}
      h3{color:#f59e0b;font-size:18px;}p{color:#475569;line-height:1.6;font-size:14px;}</style>
      </head><body>${content}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = '职业生涯发展报告.doc';
    a.click(); URL.revokeObjectURL(url);
  };

  if (!mounted) return null;

  // 选中的 TOP1 岗位
  const top1 = matchResults[0];

  return (
    <div className={styles.dashboardContainer}>
      {/* ── 左侧：用户数字分身 */}
      <div className={styles.leftCabin}>
        {matchStatus === 'idle' ? (
          <div className={styles.importSection}>
            <div className="text-center px-4 mb-4">
              {!hasProfile && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                  ⚠ 建议先在「自我认知中心」填写能力画像，获得更精准的匹配结果
                </p>
              )}
            </div>
            <button className={styles.importBtn} onClick={handleImport}>
              导入/同步能力刻画
            </button>
          </div>
        ) : (
          <div className={styles.avatarData}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className={styles.sectionTitle}>我的数字分身</h2>
              <button onClick={handleImport} style={{
                fontSize: '0.875rem', color: '#f59e0b',
                background: 'rgba(245,158,11,0.1)', padding: '0.25rem 0.75rem',
                borderRadius: '9999px', border: '1px solid rgba(245,158,11,0.2)',
                cursor: 'pointer', marginLeft: '1rem',
              }}>
                重新导入
              </button>
            </div>

            <div className={styles.radarPlaceholder}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={userRadar}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                  <Radar name="我的能力" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.tagsContainer}>
              {/* 根据最高维度生成动态标签 */}
              {(() => {
                const profile = loadProfile();
                const caps    = profile.capabilities;
                const sorted  = Object.entries(caps).sort((a,b) => b[1]-a[1]);
                const tagMap: Record<string, string> = {
                  逻辑能力: '逻辑能力突出', 沟通表达: '沟通力优秀',
                  执行落地: '执行力强', 创新思维: '创意思维活跃',
                  领导团队: '具备领导力', 抗压能力: '抗压能力强',
                };
                return sorted.slice(0,3).map(([dim]) => (
                  <span key={dim} className={styles.tag}>{tagMap[dim]}</span>
                ));
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ── 右侧：匹配结果 */}
      <div className={styles.rightCabin}>
        <AnimatePresence mode="wait">
          {matchStatus === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
              <p>等待导入能力模型进行星际匹配…</p>
            </motion.div>
          )}

          {matchStatus === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={styles.loadingState}>
              <div className={styles.scannerContainer}>
                <div className={styles.scannerLine} />
              </div>
              <p className={styles.loadingText}>AI 正在海量岗位库中检索...</p>
            </motion.div>
          )}

          {matchStatus === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} className={styles.resultState}>
              {/* TOP3 卡片 */}
              <div className={styles.topCards}>
                {matchResults.map((r, i) => (
                  <div key={r.role} className={`${styles.card} ${i === 0 ? styles.cardActive : ''}`}>
                    <div className={styles.cardRank}>TOP {i + 1}</div>
                    <div className={styles.cardTitle}>{r.role}</div>
                    <div className={styles.cardMatch}>匹配度: {r.score}%</div>
                    {i === 0 && r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 justify-center">
                        {r.tags.slice(0,2).map(t => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 bg-amber-100/60 text-amber-800 rounded">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 对比雷达图 */}
              <div className={styles.middleAnalysis}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={matchRadar}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                    <Radar name="我的能力"   dataKey="User" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                    <Radar name="岗位要求" dataKey="Post" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Legend wrapperStyle={{ color: '#475569', paddingTop: '20px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className={styles.bottomAction}>
                <button className={styles.reportBtn} onClick={() => updateMatchStatus('report')}>
                  <span className={styles.btnGlow} />
                  <span className={styles.btnText}>🔮 生成职业生涯发展报告</span>
                </button>
              </div>
            </motion.div>
          )}

          {matchStatus === 'report' && (
            <motion.div key="report" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }}
              className={styles.reportState}>
              <SmartEditorTool onExport={handleExportToWord} />

              <div className={styles.reportHeader}>
                <button className={styles.backBtn} onClick={() => updateMatchStatus('results')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                  </svg>
                  返回匹配结果
                </button>
              </div>

              <div className={styles.reportDocument} ref={reportRef}>
                <h2 className={styles.reportTitle}>职业生涯发展报告</h2>
                <div className={styles.reportSection}>
                  <h3>匹配结论</h3>
                  <p>
                    基于您的能力画像，目标岗位「{top1?.role}」综合匹配度为 <strong>{top1?.score}%</strong>。
                    {top1?.tags?.length ? `该岗位特点：${top1.tags.join('、')}。` : ''}
                    建议优先布局该方向，结合行动计划逐步提升核心竞争力。
                  </p>
                </div>
                <div className={styles.reportSection}>
                  <h3>职业目标设定</h3>
                  <p>短期（1年内）：获取「{top1?.role}」相关实习机会，完成核心技能体系搭建。<br />
                     中期（3-5年）：晋升中级岗位，主导核心业务模块，形成专业方法论。</p>
                </div>
                <div className={styles.reportSection}>
                  <h3>行业趋势分析</h3>
                  <p>该岗位市场需求在数字化转型背景下持续增长，AI融合趋势带来新的职业增量空间，具备复合能力的人才竞争优势显著。</p>
                </div>
                <div className={styles.reportSection}>
                  <h3>发展路径规划</h3>
                  <p>助理/实习生 → 初级从业者（1-3年）→ 中级/高级（3-5年）→ 专家/管理层</p>
                </div>
                <div className={styles.reportSection}>
                  <h3>行动计划</h3>
                  <p>阶段一（0-6个月）：系统学习核心知识，完成1个可展示项目，参加行业交流。<br />
                     阶段二（6-18个月）：获取实习机会，参与真实业务，积累作品集。</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
