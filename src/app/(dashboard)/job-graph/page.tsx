'use client';

import { motion } from 'framer-motion';
import JobGraphViewer from '@/features/jobs/components/JobGraphViewer';
import AIAssistantWidget from '@/features/dashboard-core/components/AIAssistantWidget';

export default function JobGraphPage() {
    return (
        <div className="max-w-[1600px] w-full mx-auto p-6 flex flex-col gap-6 h-full">
            {/* Header */}
            <div className="shrink-0">
                <h2 className="text-2xl font-bold text-slate-900">岗位图谱</h2>
                <p className="text-sm text-slate-500 mt-1">
                    基于真实招聘数据构建 · 垂直晋升路径 + 水平转岗路径 · 交互式浏览
                </p>
            </div>

            {/* Main Grid */}
            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
                {/* Graph Area */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#F8FAFC] rounded-2xl border border-slate-200 p-4 overflow-hidden flex flex-col min-h-[600px]"
                >
                    <JobGraphViewer />
                </motion.div>

                {/* Right: AI Chat */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[600px] xl:h-full flex flex-col"
                >
                    <AIAssistantWidget variant="static" />
                </motion.div>
            </div>
        </div>
    );
}
