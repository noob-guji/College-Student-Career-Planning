'use client';

import { useState, useEffect } from 'react';

interface Profile {
  capabilities: Record<string, number>;
  selectedJobTypes: string[];
  skills: string[];
  name: string;
  major: string;
  education: string;
  dimensions12?: Record<string, { score: number; tags: string[]; reason: string }>;
  completeness?: number;
  competitiveness?: number;
  basic?: {
    name?: string;
    education?: string;
    major?: string;
    school?: string;
    graduation_year?: string;
    target_city?: string;
    target_salary?: string;
  };
}

// ✅ 放在组件外部
function loadProfile(): Profile | null {
  try {
    const raw = sessionStorage.getItem('careerProfile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function ResumeParseResult() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const updateProfile = () => {
      const p = loadProfile();
      setProfile(p);
    };

    updateProfile();

    // 监听数据更新事件
    window.addEventListener('profileUpdated', updateProfile);
    window.addEventListener('resumeParsed', updateProfile);

    return () => {
      window.removeEventListener('profileUpdated', updateProfile);
      window.removeEventListener('resumeParsed', updateProfile);
    };
  }, []);

  // 如果没有任何数据，显示空状态
  if (!profile) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
          <span className="w-1 h-5 bg-[#F59E0B] rounded-full" />
          简历解析结果
        </h3>
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <p>暂无数据，请先填写信息或上传简历</p>
        </div>
      </div>
    );
  }

  const dims12 = profile.dimensions12;
  const basic = profile.basic || {};
  const caps6 = profile.capabilities || {};

  // 6维能力标签映射
  const cap6Labels: Record<string, string> = {
    '逻辑能力': '逻辑能力',
    '沟通表达': '沟通表达',
    '执行落地': '执行落地',
    '创新思维': '创新思维',
    '领导团队': '领导团队',
    '抗压能力': '抗压能力',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col overflow-hidden">
      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4 shrink-0">
        <span className="w-1 h-5 bg-[#F59E0B] rounded-full" />
        简历解析结果
      </h3>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {/* 内容完整度 - 如果有数据就显示 */}
        {profile.completeness !== undefined && (
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-400 rounded-full"></span>
              内容完整度
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">简历完整度评分</span>
              <span className="text-lg font-bold text-amber-600">{profile.completeness}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden mt-2">
              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${profile.completeness}%` }}></div>
            </div>
          </div>
        )}

        {/* 基本信息 - 始终显示，如果有任何数据 */}
        {(profile.name || profile.education || profile.major || basic.name || basic.education || basic.major || basic.school || basic.graduation_year || basic.target_city || basic.target_salary) && (
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-gray-400 rounded-full"></span>
              基本信息
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">姓名：</span>{basic.name || profile.name || '未填写'}</div>
              <div><span className="text-slate-500">学历：</span>{basic.education || profile.education || '未填写'}</div>
              <div><span className="text-slate-500">专业：</span>{basic.major || profile.major || '未填写'}</div>
              <div><span className="text-slate-500">学校：</span>{basic.school || '未填写'}</div>
              <div><span className="text-slate-500">毕业年份：</span>{basic.graduation_year || '未填写'}</div>
              <div><span className="text-slate-500">目标城市：</span>{basic.target_city || '未填写'}</div>
              <div><span className="text-slate-500">期望薪资：</span>{basic.target_salary || '未填写'}</div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">未填写的信息可以通过表单补充</p>
              <button
                onClick={() => {
                  // 切换到手动填报标签页，并定位到补充基本信息输入栏
                  const event = new CustomEvent('switchToManualTab', { detail: { field: 'supplementBasicInfo' } });
                  window.dispatchEvent(event);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                补充基本信息
              </button>
            </div>
          </div>
        )}

        {/* 已标记技能 - 如果有数据就显示 */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-teal-400 rounded-full"></span>
              已标记技能
            </h4>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map(skill => (
                <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 12维能力 - 如果有数据就显示 */}
        {dims12 && Object.keys(dims12).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-400 rounded-full"></span>
              12维度能力分析
            </h4>
            {Object.entries(dims12).map(([key, val]) => {
              const labelMap: Record<string, string> = {
                professional_skills: '专业技能',
                certificate: '证书要求',
                innovation: '创新能力',
                learning: '学习能力',
                stress_tolerance: '抗压能力',
                communication: '沟通能力',
                internship: '实习能力',
                leadership: '领导力',
                problem_solving: '解决问题',
                business_acumen: '商业敏感度',
                execution: '执行力',
                values_fit: '价值观匹配',
              };

              const s = val.score;
              const color =
                s >= 80 ? 'text-green-600' :
                s >= 60 ? 'text-amber-600' :
                'text-red-600';

              return (
                <div key={key} className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-slate-900">{labelMap[key]}</h5>
                    <span className={`font-bold text-lg ${color}`}>{s}</span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${s}%` }}
                    />
                  </div>

                  <div className="bg-slate-50 rounded p-3">
                    <p className="text-xs font-medium text-slate-700 mb-1">分析原因：</p>
                    <p className="text-xs text-slate-600">{val.reason}</p>
                  </div>

                  {val.tags.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-slate-700 mb-1">相关标签：</p>
                      <div className="flex flex-wrap gap-1">
                        {val.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 6维能力 - 如果有数据就显示 */}
        {caps6 && Object.keys(caps6).length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-purple-400 rounded-full"></span>
              6维能力画像
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(cap6Labels).map(([key, label]) => {
                const score = caps6[key] || 75;
                const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
                return (
                  <div key={key} className="bg-white rounded-lg p-3 border border-slate-200 group relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                      <span className={`text-sm font-bold ${color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        {score}分
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-purple-400 transition-all" style={{ width: `${score}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-3">鼠标悬停查看具体得分</p>
          </div>
        )}

        {/* 同级竞争力对比 - 如果有数据就显示 */}
        {profile.competitiveness !== undefined && (
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-green-400 rounded-full"></span>
              同级竞争力对比
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">竞争力评分</span>
              <span className="text-lg font-bold text-green-600">{profile.competitiveness}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden mt-2">
              <div className="h-full rounded-full bg-green-400 transition-all" style={{ width: `${profile.competitiveness}%` }}></div>
            </div>
          </div>
        )}

        {/* 完整度和竞争力得分 - 如果有数据就显示 */}
        {(profile.completeness !== undefined || profile.competitiveness !== undefined) && (
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-indigo-400 rounded-full"></span>
              综合评分
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {profile.completeness !== undefined && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600 mb-1">{profile.completeness}%</div>
                  <div className="text-sm text-slate-600">完整度</div>
                </div>
              )}
              {profile.competitiveness !== undefined && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">{profile.competitiveness}%</div>
                  <div className="text-sm text-slate-600">竞争力</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 12维能力画像分析（各个得分）- 如果有数据就显示 */}
        {dims12 && Object.keys(dims12).length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-orange-400 rounded-full"></span>
              12维能力画像分析
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(dims12).map(([key, val]) => {
                const labelMap: Record<string, string> = {
                  professional_skills: '专业技能',
                  certificate: '证书要求',
                  innovation: '创新能力',
                  learning: '学习能力',
                  stress_tolerance: '抗压能力',
                  communication: '沟通能力',
                  internship: '实习能力',
                  leadership: '领导力',
                  problem_solving: '解决问题',
                  business_acumen: '商业敏感度',
                  execution: '执行力',
                  values_fit: '价值观匹配',
                };
                const s = val.score;
                const color = s >= 80 ? 'bg-green-100 text-green-700' : s >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                return (
                  <div key={key} className={`rounded-lg p-2 text-center ${color}`}>
                    <div className="text-xs font-medium">{labelMap[key]}</div>
                    <div className="text-sm font-bold">{s}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}