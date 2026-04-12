'use client';

import CapabilityInputForm from '@/features/self-cognition/components/CapabilityInputForm';
import CapabilityPortraitDashboard from '@/features/self-cognition/components/CapabilityPortraitDashboard';
import ResumeParseResult from '@/features/self-cognition/components/ResumeParseResult';

export default function SelfCognition() {
    return (
        <div className="max-w-[1600px] w-full mx-auto space-y-6 flex flex-col h-full p-6 bg-[#F8FAFC]">
            <div className="shrink-0">
                <h2 className="text-2xl font-bold text-slate-900">自我认知中心</h2>
                <p className="text-sm text-slate-500 mt-1">多源能力数据采集与AI潜能解析</p>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-[52fr_50fr_45fr] gap-6 pb-6">
                {/* Left Column: Input Form */}
                <div className="lg:col-span-12 xl:col-span-1 h-[500px] xl:h-full flex flex-col min-h-0 overflow-hidden">
                    <CapabilityInputForm />
                </div>

                {/* Middle Column: Dashboard */}
                <div className="lg:col-span-8 xl:col-span-1 flex flex-col gap-6 min-h-0 overflow-hidden">
                    <div className="flex-1 min-h-[400px]">
                        <CapabilityPortraitDashboard />
                    </div>

                    <div className="bg-gradient-to-r from-amber-300 to-amber-100 rounded-xl shadow-md p-6 text-[#111827] shrink-0 relative overflow-hidden">
                        <div className="absolute -right-4 -top-12 w-32 h-32 bg-white/40 rounded-full blur-2xl"></div>
                        <div className="absolute right-20 -bottom-10 w-24 h-24 bg-white/40 rounded-full blur-xl"></div>
                        <h4 className="font-semibold text-lg relative z-10 flex items-center gap-2">
                            ✨ AI 职业匹配度洞察
                        </h4>
                        <p className="text-slate-800 text-sm mt-2 relative z-10 max-w-xl">
                            基于您的能力画像，AI已在【规划生成中心】为您匹配了3个高优发展路径。马上前往查看为您量身定制的职业进阶路线。
                        </p>
                    </div>
                </div>

                {/* Right Column: Resume Parse Result */}
                <div className="lg:col-span-4 xl:col-span-1 h-[600px] xl:h-full flex flex-col min-h-0 overflow-hidden">
                    <ResumeParseResult />
                </div>
            </div>
        </div>
    );
}
