'use client';

import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const completenessData = [
    { name: '能力完整度', value: 78, fill: '#FF8F00' }
];

const competitivenessData = [
    { name: '专业技能', you: 85, peer: 70 },
    { name: '项目经验', you: 65, peer: 55 },
    { name: '学历背景', you: 80, peer: 80 },
    { name: '综合素质', you: 90, peer: 75 },
];

export default function CapabilityPortraitDashboard() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-5 bg-[#F59E0B] rounded-full"></span>
                能力画像分析
            </h3>

            <div className="grid grid-cols-1 gap-6 flex-1 min-h-0 overflow-hidden pb-2">

                {/* Completeness Ring */}
                <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-4 border border-slate-100 relative">
                    <h4 className="text-sm font-semibold text-slate-700 absolute top-4 left-4">模型匹配完整度</h4>
                    <div className="w-full h-48 mt-6 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart
                                cx="50%" cy="50%"
                                innerRadius="70%" outerRadius="100%"
                                barSize={15}
                                data={completenessData}
                                startAngle={90} endAngle={-270}
                            >
                                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                <RadialBar
                                    background={{ fill: '#E2E8F0' }}
                                    dataKey="value"
                                    cornerRadius={10}
                                />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-[#F59E0B]">78<span className="text-lg text-[#FFCA28]">%</span></span>
                            <span className="text-xs text-slate-500 mt-1">综合评分</span>
                        </div>
                    </div>
                </div>

                {/* Competitiveness Bar Chart */}
                <div className="flex flex-col bg-white rounded-xl p-4 border border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-700 mb-4">同级同专业竞争力对比</h4>
                    <div className="flex-1 w-full min-h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={competitivenessData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#111827', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend iconType="circle" formatter={(value) => <span style={{ color: '#111827' }}>{value}</span>} wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar dataKey="you" name="我的水平" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                <Bar dataKey="peer" name="同级均值" fill="#E2E8F0" radius={[4, 4, 0, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex gap-2 items-start">
                    <div className="bg-amber-50 text-[#F59E0B] text-xs px-2 py-1 rounded font-bold shrink-0 mt-0.5">AI 分析</div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        您的<strong className="text-slate-900 border-b border-blue-200 pb-0.5">综合素质</strong>和<strong className="text-slate-900 border-b border-blue-200 pb-0.5">专业技能</strong>显著高于同专业均值，在面试中具备较强的主动权。建议进一步补充企业级工程项目经验，以弥补在<strong className="text-slate-900 border-b border-rose-200 pb-0.5">项目经验</strong>上的细微短板。
                    </p>
                </div>
            </div>
        </div>
    );
}
