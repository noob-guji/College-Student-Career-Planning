'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Briefcase, Building } from 'lucide-react';

export default function JobProfileCard({ profile }: { profile?: any }) {
    if (!profile) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-amber-50 to-white shrink-0">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{profile.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-2">
                            <span className="flex items-center gap-1">
                                <Briefcase className="w-4 h-4" /> {profile.department}
                            </span>
                            <span className="flex items-center gap-1">
                                <Building className="w-4 h-4" /> {profile.industry}
                            </span>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200 shadow-sm">
                        {profile.tag}
                    </span>
                </div>
                <p className="text-slate-600 text-sm mt-4 leading-relaxed">
                    {profile.description}
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                    {profile.skills?.map((skill: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-xs rounded-md shadow-sm">{skill}</span>
                    ))}
                </div>
            </div>

            <div className="p-6 flex-1 flex flex-col min-h-0 relative">
                <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2 shrink-0">
                    <span className="w-1 h-4 bg-[#F59E0B] rounded-full"></span>
                    岗位能力矩阵
                </h4>
                <div className="w-full h-[280px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="60%" data={profile.radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar
                                name={profile.title}
                                dataKey="A"
                                stroke="#F59E0B"
                                strokeWidth={2}
                                fill="#F59E0B"
                                fillOpacity={0.3}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex-1 overflow-y-auto mt-2 pr-2 space-y-2.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {profile.radarData?.map((item: any, idx: number) => (
                        <div key={idx} className="text-sm text-slate-700 leading-relaxed pb-1 border-b border-slate-100 last:border-0">
                            <span className="font-bold text-slate-900 dimension-name">{item.subject}: </span>
                            <span className="dimension-detail">{item.detail}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
