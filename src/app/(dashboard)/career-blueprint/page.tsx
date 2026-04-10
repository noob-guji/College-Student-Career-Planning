'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import CareerBlueprintGenerator from '@/features/career-blueprint/components/CareerBlueprintGenerator';
import ReportEditor from '@/features/career-blueprint/components/ReportEditor';
import AIAssistantWidget from '@/features/dashboard-core/components/AIAssistantWidget';

export default function CareerBlueprintPage() {
    const [reportGenerated, setReportGenerated] = useState(false);
    const [reportId, setReportId] = useState('');
    const reportRef = useRef<HTMLDivElement>(null);

    return (
        <div className="max-w-[1600px] w-full mx-auto p-6 flex flex-col gap-6">
            {/* Header */}
            <div className="shrink-0">
                <h2 className="text-2xl font-bold text-slate-900">生涯蓝图</h2>
                <p className="text-sm text-slate-500 mt-1">
                    AI 生成个性化职业规划报告 · 包含6大核心模块
                    {reportId && (
                        <span className="ml-3 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                            报告 ID: {reportId.slice(0, 12)}...
                        </span>
                    )}
                </p>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                {/* Left: Report Generator */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col"
                >
                    <CareerBlueprintGenerator
                        targetRole="产品经理"
                        matchScore={92}
                        userSkills={['逻辑分析', '沟通表达', '项目管理', '抗压能力']}
                        onReportGenerated={(data, id) => {
                            setReportGenerated(true);
                            setReportId(id);
                        }}
                    />
                </motion.div>

                {/* Right: AI Chat */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[600px] flex flex-col"
                >
                    <AIAssistantWidget variant="static" />
                </motion.div>
            </div>

            {/* Smart Editor Toolbar (功能6) */}
            {reportGenerated && (
                <ReportEditor
                    reportRef={reportRef}
                    onExportWord={() => {
                        const content = `
                            <html><head><meta charset='utf-8'><style>
                            body{font-family:'Microsoft YaHei',sans-serif;padding:40px;}
                            h1{font-size:24px;border-bottom:2px solid #f59e0b;padding-bottom:8px;}
                            </style></head>
                            <body><h1>职业生涯发展报告</h1><p>报告ID: ${reportId}</p></body></html>
                        `;
                        const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = '职业生涯发展报告.doc';
                        a.click(); URL.revokeObjectURL(url);
                    }}
                />
            )}
        </div>
    );
}
