'use client';

import { motion } from 'framer-motion';
import JobGraphViewer from '@/features/jobs/components/JobGraphViewer';

export default function JobGraphPage() {
    return (
        <div className="max-w-[1600px] w-full mx-auto p-6 flex flex-col gap-6 h-full">
            <div className="shrink-0">
                <h2 className="text-2xl font-bold text-slate-900">岗位图谱</h2>
                <p className="text-sm text-slate-500 mt-1">
                    基于真实招聘数据构建 · 垂直晋升路径 + 水平转岗路径 · 交互式浏览
                </p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 min-h-0 bg-[#F8FAFC] rounded-2xl border border-slate-200 p-4 overflow-hidden flex flex-col"
            >
                <JobGraphViewer />
            </motion.div>
        </div>
    );
}