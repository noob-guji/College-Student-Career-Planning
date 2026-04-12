'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, Radar, PolarGrid
} from 'recharts';
import { RefreshCw } from 'lucide-react';

// 同级平均值（动态计算：基于用户能力稍微调整）
const getPeerAvg = (userCaps: Record<string, number>) => {
  const baseAvg: Record<string, number> = {
    逻辑能力: 68, 沟通表达: 72, 执行落地: 70, 创新思维: 65, 领导团队: 58, 抗压能力: 74,
  };
  // 动态调整：如果用户能力高于平均，均值稍微提高，反之降低
  const userAvg = Object.values(userCaps).reduce((a, b) => a + b, 0) / Object.keys(userCaps).length;
  const adjustment = (userAvg - 70) * 0.1; // 轻微调整
  return Object.fromEntries(
    Object.entries(baseAvg).map(([k, v]) => [k, Math.max(50, Math.min(90, v + adjustment))])
  );
};

// ✅ 已按要求扩展 Profile 接口
interface Profile {
  capabilities: Record<string, number>;
  selectedJobTypes: string[];
  skills: string[];
  name: string;
  major: string;
  education: string;
  // 新增：简历解析的12维度完整数据
  dimensions12?: Record<string, { score: number; tags: string[]; reason: string }>;
  completeness?: number;
  competitiveness?: number;
}

function loadProfile(): Profile | null {
  try {
    const raw = sessionStorage.getItem('careerProfile');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// 原 calcCompleteness 保留（兼容旧数据）
function calcCompleteness(profile: Profile): number {
  let score = 0;
  if (profile?.name)               score += 10;
  if (profile?.education)          score += 10;
  if (profile?.major)              score += 10;
  if (profile?.selectedJobTypes?.length) score += 20;
  if (profile?.skills?.length)     score += 20;
  const caps = Object.values(profile?.capabilities ?? {});
  const allDefault = caps.every(v => v === 75);
  if (caps.length > 0 && !allDefault) score += 30;
  else if (caps.length > 0) score += 15;
  return Math.min(score, 100);
}

export default function CapabilityPortraitDashboard() {
  const [profile,    setProfile]    = useState<Profile | null>(null);
  const [lastSaved,  setLastSaved]  = useState('');

  const reload = () => {
    const p = loadProfile();
    setProfile(p);
    if (p) {
      try {
        const raw = sessionStorage.getItem('careerProfile');
        const ts  = JSON.parse(raw!).savedAt;
        setLastSaved(new Date(ts).toLocaleTimeString('zh-CN'));
      } catch {}
    }
  };

  useEffect(() => {
    reload();
    const handler = () => reload();
    window.addEventListener('storage', handler);

    // 监听简历解析完成事件，自动刷新能力画像
    const resumeParsedHandler = () => {
      setTimeout(() => reload(), 500); // 延迟500ms确保数据已保存
    };
    window.addEventListener('resumeParsed', resumeParsedHandler);

    // 监听表单保存事件，自动刷新能力画像
    const profileUpdatedHandler = () => {
      setTimeout(() => reload(), 300); // 延迟300ms确保数据已保存
    };
    window.addEventListener('profileUpdated', profileUpdatedHandler);

    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('resumeParsed', resumeParsedHandler);
      window.removeEventListener('profileUpdated', profileUpdatedHandler);
    };
  }, []);

  const caps  = profile?.capabilities ?? {};
  const dims  = ['逻辑能力', '沟通表达', '执行落地', '创新思维', '领导团队', '抗压能力'];
  const hasCaps = Object.keys(caps).length > 0;

  // ✅ 已按要求添加：优先使用简历解析分数
  const dims12 = profile?.dimensions12;
  const completenessScore = profile?.completeness ?? calcCompleteness(profile!);
  const competitivenessScore = profile?.competitiveness ?? (
    hasCaps ? Math.round(Object.values(caps).reduce((a, b) => a + b, 0) / dims.length) : 0
  );

  const peerAvg = getPeerAvg(caps);

  const competitivenessData = [
    { 
      name: '专业技能', 
      you: hasCaps 
        ? Math.round((caps['逻辑能力'] + caps['执行落地']) / 2) 
        : 75, 
      peer: peerAvg['逻辑能力'] 
    },
    { 
      name: '沟通表达', 
      you: caps['沟通表达'], 
      peer: peerAvg['沟通表达'] 
    },
    { 
      name: '学习能力', 
      you: caps['创新思维'], 
      peer: peerAvg['创新思维'] 
    },
    { 
      name: '综合素质', 
      you: competitivenessScore, 
      peer: 70 
    },
  ];

  // 12维雷达图数据
  const radarData = Object.entries(dims12 || {}).map(([key, val]) => {
    const labelMap: Record<string, string> = {
      professional_skills: '专业技能', certificate: '证书要求',
      innovation: '创新能力', learning: '学习能力',
      stress_tolerance: '抗压能力', communication: '沟通能力',
      internship: '实习能力', leadership: '领导力',
      problem_solving: '解决问题', business_acumen: '商业敏感度',
      execution: '执行力', values_fit: '价值观匹配',
    };
    return {
      subject: labelMap[key] || key,
      value: val.score,
      fullMark: 100,
      reason: val.reason,
    };
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="w-1 h-5 bg-[#F59E0B] rounded-full" />
          能力画像分析
        </h3>
        <div className="flex items-center gap-2">
          {lastSaved && <span className="text-[10px] text-slate-400">更新于 {lastSaved}</span>}
          <button onClick={reload} className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors" title="刷新">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!profile ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
            <RefreshCw className="w-5 h-5" />
          </div>
          <p>暂无画像数据</p>
          <p className="text-xs opacity-70">请在「结构化信息填报」中填写并保存</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 flex-1 min-h-0 overflow-y-auto pb-2">

          {/* 完整度 + 能力雷达 并排 */}
          <div className="grid grid-cols-2 gap-4">
            {/* ✅ 已按要求更新图表数据 */}
            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-3 border border-slate-100 relative">
              <span className="text-xs font-semibold text-slate-700 mb-2">内容完整度</span>
              <div className="w-full h-36 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
                    barSize={14} data={[{ name: '完整度', value: completenessScore, fill: '#F59E0B' }]}
                    startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background={{ fill: '#E2E8F0' }} dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-[#F59E0B]">{completenessScore}<span className="text-sm">%</span></span>
                  <span className="text-[10px] text-slate-500 mt-0.5">综合评分</span>
                </div>
              </div>
            </div>

            {/* 12维雷达 */}
            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-xs font-semibold text-slate-700 mb-1 self-start">12维能力</span>
              <div className="w-full h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                              <p className="font-semibold text-slate-900">{data.subject}</p>
                              <p className="text-sm text-slate-600">得分: {data.value}</p>
                              <p className="text-sm text-slate-600">原因: {data.reason}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Radar name="能力得分" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 竞争力对比柱状图 */}
          <div className="flex flex-col bg-white rounded-xl p-4 border border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">同级竞争力对比（橙=你，灰=均值）</h4>
            <div className="w-full min-h-[160px]">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={competitivenessData} margin={{ top: 0, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#111827', fontSize: 11 }} dy={8} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="you"  name="我" fill="#F59E0B" radius={[4,4,0,0]} />
                  <Bar dataKey="peer" name="同级均值" fill="#CBD5E1" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ✅ 已按要求插入：12维度画像展示块 */}
          {dims12 && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-amber-400 rounded-full inline-block" />
                12维度能力画像（简历解析）
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(dims12).map(([key, val]) => {
                  const labelMap: Record<string, string> = {
                    professional_skills: '专业技能', certificate: '证书要求',
                    innovation: '创新能力', learning: '学习能力',
                    stress_tolerance: '抗压能力', communication: '沟通能力',
                    internship: '实习能力', leadership: '领导力',
                    problem_solving: '解决问题', business_acumen: '商业敏感度',
                    execution: '执行力', values_fit: '价值观匹配',
                  };
                  const s = val.score;
                  const color = s >= 80 ? '#16a34a' : s >= 60 ? '#ca8a04' : '#dc2626';
                  return (
                    <div key={key} className="bg-white rounded-lg p-2 border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-slate-500 truncate">{labelMap[key]}</span>
                        <span className="text-[10px] font-bold" style={{ color }}>{s}</span>
                      </div>
                      <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400 transition-all"
                          style={{ width: `${s}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <div className="flex-1 bg-amber-50 rounded-lg p-2 text-center border border-amber-100">
                  <div className="text-lg font-bold text-amber-600">{completenessScore}</div>
                  <div className="text-[10px] text-amber-700">完整度</div>
                </div>
                <div className="flex-1 bg-blue-50 rounded-lg p-2 text-center border border-blue-100">
                  <div className="text-lg font-bold text-blue-600">{competitivenessScore}</div>
                  <div className="text-[10px] text-blue-700">竞争力</div>
                </div>
              </div>
            </div>
          )}

          {/* 已选技能标签 */}
          {profile.skills?.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-xs font-semibold text-slate-600 mb-2">已标记技能</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map(s => (
                  <span key={s} className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}