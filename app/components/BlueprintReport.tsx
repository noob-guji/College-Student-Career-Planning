'use client';

import { motion } from 'framer-motion';

const sections = [
    {
        id: 'conclusion',
        title: '核心探索结论',
        content: (
            <p className="text-lg leading-relaxed text-slate-700 font-serif">
                综合多维数据分析，您的认知风格表现为坚定的探索者类型（INTJ/分析型）。
                在<span className="font-semibold text-slate-900 border-b border-indigo-400">系统架构</span>与<span className="font-semibold text-slate-900 border-b border-indigo-400">逻辑推理</span>上展现出极高的潜能。
                高度匹配“大前端架构师”或“全栈开发”的职业路径。
            </p>
        )
    },
    {
        id: 'goals',
        title: '职业目标设定',
        content: (
            <ul className="space-y-4 text-slate-700 list-disc list-inside ml-4 font-serif">
                <li><strong className="text-slate-900">短期目标 (1-2年):</strong> 熟练掌握现代前端框架（React/Vue），参与核心业务复杂场景线，独立负责性能优化组件沉淀。</li>
                <li><strong className="text-slate-900">中期目标 (3-5年):</strong> 晋升为高级工程师，主导中大型系统基建，开始深入 Node.js/Go 拓宽后端架构视野。</li>
            </ul>
        )
    },
    {
        id: 'trends',
        title: '行业趋势洞察',
        content: (
            <div className="bg-slate-50 border-l-4 border-slate-300 p-6 rounded-r text-slate-700 font-serif italic text-base leading-relaxed">
                “随着AI的大规模接入，纯表现层开发的价值正被压缩。工程化、全栈化（BFF）以及利用AI提效成为破局点。未来前端不仅是展现，更需要掌握边缘计算（Edge runtime）与Serverless架构理念。”
            </div>
        )
    },
    {
        id: 'path',
        title: '最优发展路径',
        content: (
            <div className="flex flex-col space-y-6 mt-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">1</div>
                    <div>
                        <h4 className="font-bold text-slate-900 text-lg">全栈化转型</h4>
                        <p className="text-slate-600 mt-1 font-serif">利用现有前端优势，逐步接管BFF层，降低沟通成本，扩大技术壁垒。</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">2</div>
                    <div>
                        <h4 className="font-bold text-slate-900 text-lg">AI与工程化融合</h4>
                        <p className="text-slate-600 mt-1 font-serif">探索AIGC在业务线上的插件应用与脚手架效率开发。</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'actions',
        title: '行动计划图',
        content: (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg shadow-sm">
                    <h4 className="font-bold text-slate-900">学术与技能</h4>
                    <ul className="text-sm text-slate-600 mt-2 space-y-2 font-serif list-disc ml-4">
                        <li>完成 React Server Components 的深度开发</li>
                        <li>考取 AWS 或 Azure 基础架构认证</li>
                    </ul>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg shadow-sm">
                    <h4 className="font-bold text-slate-900">实践与积累</h4>
                    <ul className="text-sm text-slate-600 mt-2 space-y-2 font-serif list-disc ml-4">
                        <li>主导开源项目（如搭建一套微前端基建）</li>
                        <li>在技术社区发布至少3篇系统级文章</li>
                    </ul>
                </div>
            </div>
        )
    }
];

export default function BlueprintReport() {
    return (
        <div className="w-full bg-white font-sans text-slate-900 p-8 md:p-16 mx-auto min-h-screen shadow-lg">
            <div className="max-w-3xl mx-auto space-y-24">

                <header className="border-b-2 border-slate-900 pb-8 text-center md:text-left">
                    <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2">INTELLIGENT REPORT V1.0</p>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 font-serif">职业生涯蓝图.</h1>
                    <p className="text-lg text-slate-600 mt-4 max-w-xl font-serif">
                        通过深度量化与AI语义解析，本报告旨在为您构建高视角的职业战略航标。
                    </p>
                </header>

                {sections.map((section, index) => (
                    <motion.section
                        key={section.id}
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="relative"
                    >
                        <div className="flex flex-col md:flex-row gap-4 md:gap-12">
                            <div className="md:w-1/3 shrink-0">
                                <h2 className="text-2xl font-bold border-t-2 border-slate-200 pt-4 text-slate-900 sticky top-24">
                                    {section.title}
                                </h2>
                            </div>
                            <div className="md:w-2/3 border-t-2 border-transparent pt-4">
                                {section.content}
                            </div>
                        </div>
                    </motion.section>
                ))}

                <footer className="border-t border-slate-200 pt-8 mt-32 text-center text-sm text-slate-400 font-serif">
                    <p>此蓝图由 AI 智能生成，随时可根据您的最新状态进行校准迭代。</p>
                </footer>
            </div>
        </div>
    );
}
