'use client';

import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, ChevronRight, FileJson } from 'lucide-react';
import MBTILanding from '@/features/self-cognition/components/MBTILanding';

export default function CapabilityInputForm() {
    const [activeTab, setActiveTab] = useState<'upload' | 'manual' | 'assessment'>('upload');
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isAtBottom, setIsAtBottom] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        // Check if we are within 50px of the bottom
        if (scrollHeight - scrollTop - clientHeight < 50) {
            setIsAtBottom(true);
        } else {
            // Alternatively, allow it to stay visible once reached? No, user said when scrolled to bottom.
            setIsAtBottom(false);
        }
    };

    // Check if form doesn't need scrolling
    useEffect(() => {
        if (activeTab === 'manual') {
            handleScroll();
        }
    }, [activeTab]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex gap-2 shrink-0 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('upload')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'upload' ? 'bg-amber-50 text-[#F59E0B]' : 'bg-transparent text-[#111827] hover:bg-slate-50'
                        }`}
                >
                    简历智能解析
                </button>
                <button
                    onClick={() => setActiveTab('manual')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'manual' ? 'bg-amber-50 text-[#F59E0B]' : 'bg-transparent text-[#111827] hover:bg-slate-50'
                        }`}
                >
                    结构化信息填报
                </button>
                <button
                    onClick={() => setActiveTab('assessment')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'assessment' ? 'bg-amber-50 text-[#F59E0B]' : 'bg-transparent text-[#111827] hover:bg-slate-50'
                        }`}
                >
                    深度测评问卷
                </button>
            </div>

            <div 
                className="p-6 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar scroll-smooth" 
                ref={scrollRef} 
                onScroll={handleScroll}
            >
                {activeTab === 'upload' && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div
                            className={`w-full max-w-lg border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-[#94A3B8] hover:border-[#FFCA28] hover:bg-slate-50'
                                } ${file ? 'border-green-500 bg-green-50' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {file ? (
                                <div className="flex flex-col items-center">
                                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                                    <p className="text-slate-900 font-medium">{file.name}</p>
                                    <p className="text-slate-500 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    <button
                                        onClick={() => setFile(null)}
                                        className="mt-4 text-sm text-blue-600 hover:underline"
                                    >
                                        重新上传
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 bg-amber-50 text-[#F59E0B] rounded-full flex items-center justify-center mb-4">
                                        <UploadCloud className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-slate-900 font-semibold text-lg">拖拽文件到此处，或点击上传</h3>
                                    <p className="text-slate-500 text-sm mt-2 max-w-sm">
                                        支持 PDF, DOCX, PNG, JPG 格式。系统将自动解析您的技能、经历及学术背景。
                                    </p>
                                    <label className="mt-6 px-6 py-2.5 bg-[#F59E0B] hover:bg-[#FF8F00] text-white text-sm font-medium rounded-lg cursor-pointer transition-colors shadow-sm">
                                        选择文件
                                        <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleChange} />
                                    </label>
                                </div>
                            )}
                        </div>

                        {file && (
                            <button className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all transform hover:scale-[1.02]">
                                <FileJson className="w-4 h-4" />
                                开始智能解析
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'manual' && (
                    <div className="max-w-2xl mx-auto space-y-10 pb-4">
                        {/* 基础信息 */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">基础信息</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm" placeholder="您的姓名" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">最高学历</label>
                                    <select className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm bg-white">
                                        <option value="">请选择</option>
                                        <option value="highschool">高中及以下</option>
                                        <option value="associate">专科</option>
                                        <option value="bachelor">本科</option>
                                        <option value="master">硕士</option>
                                        <option value="phd">博士</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">专业 / 院校</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm" placeholder="例如：计算机科学与技术 / 长沙大学" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">意向城市</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm" placeholder="例如：北京, 上海, 远程" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">期望岗位类型</label>
                                    <div className="flex flex-wrap gap-3">
                                        {['前端开发', '后端开发', '产品经理', 'UI设计', '算法工程师'].map(job => (
                                            <label key={job} className="flex items-center gap-2 text-sm text-slate-700">
                                                <input type="checkbox" className="rounded text-[#F59E0B] focus:ring-[#F59E0B]" />
                                                {job}
                                            </label>
                                        ))}
                                        <div className="flex items-center gap-2 text-sm text-slate-700 w-full sm:w-auto mt-2 sm:mt-0">
                                            <span className="shrink-0">其他:</span>
                                            <input type="text" className="flex-1 px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm" placeholder="自定义岗位" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 专业技能 */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">专业技能</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">掌握编程语言 / 工具</label>
                                    <div className="flex flex-wrap gap-3">
                                        {['JavaScript', 'TypeScript', 'Python', 'Java', 'Figma', 'Photoshop'].map(tool => (
                                            <label key={tool} className="flex items-center gap-2 text-sm text-slate-700">
                                                <input type="checkbox" className="rounded text-[#F59E0B] focus:ring-[#F59E0B]" />
                                                {tool}
                                            </label>
                                        ))}
                                        <div className="flex items-center gap-2 text-sm text-slate-700 mt-2 sm:mt-0">
                                            <span className="shrink-0">补充:</span>
                                            <input type="text" className="px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm" placeholder="..." />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">主修专业课程 1</label>
                                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm" placeholder="课程名称与成绩" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">主修专业课程 2</label>
                                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm" placeholder="课程名称与成绩" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 证书 & 荣誉 */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">证书 & 荣誉</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">已获证书</label>
                                    <textarea rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm resize-none" placeholder="CET-6, 计算机二级..."></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">获奖情况</label>
                                    <textarea rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm resize-none" placeholder="例如：国家励志奖学金、互联网+竞赛省级二等奖"></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">科研 / 论文 / 专利</label>
                                    <textarea rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm resize-none" placeholder="如无则可不填..."></textarea>
                                </div>
                            </div>
                        </div>

                        {/* 实践经历 */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">实践经历</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">实习经历</label>
                                    <textarea rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm resize-none" placeholder="公司名称、职位及核心贡献..."></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">商业 / 开源项目经历</label>
                                    <textarea rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm resize-none" placeholder="项目描述与你在其中的角色..."></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">校园 / 社团经历</label>
                                    <textarea rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm resize-none" placeholder="例如：学生会部长，负责统筹百人活动..."></textarea>
                                </div>
                            </div>
                        </div>

                        {/* 职业倾向 */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">职业倾向</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">侧重发展方向</label>
                                        <div className="flex flex-col gap-2">
                                            {['技术专家', '管理/团队领导', '全栈复合型', '独立开发者/创业'].map(dir => (
                                                <label key={dir} className="flex items-center gap-2 text-sm text-slate-700">
                                                    <input type="radio" name="career_dir" className="text-[#F59E0B] focus:ring-[#F59E0B]" />
                                                    {dir}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">可接受工作性质</label>
                                        <div className="flex flex-col gap-2">
                                            {['全职', '兼职 / 远程', '外包驻场', '按项目结算'].map(type => (
                                                <label key={type} className="flex items-center gap-2 text-sm text-slate-700">
                                                    <input type="checkbox" className="rounded text-[#F59E0B] focus:ring-[#F59E0B]" />
                                                    {type}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">期望薪资范围 (月薪)</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm" placeholder="例如：10k-15k, 面议" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">一句话自我评价</label>
                                    <textarea rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm resize-none" placeholder="描述最突出的个人优势..."></textarea>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button placed at the END of the form */}
                        <div className="pt-6">
                            <button 
                                className={`w-full py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all duration-300
                                    ${isAtBottom 
                                        ? 'bg-[#F59E0B] hover:bg-[#FF8F00] text-white opacity-100 pointer-events-auto transform translate-y-0' 
                                        : 'bg-slate-200 text-slate-400 opacity-50 pointer-events-none transform translate-y-4'}`}
                            >
                                保存并生成画像 <ChevronRight className="w-5 h-5" />
                            </button>
                            {!isAtBottom && (
                                <p className="text-center text-xs text-slate-500 mt-3 animate-pulse">
                                    ↑ 请向下滚动填写完整信息后提交
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'assessment' && (
                    <MBTILanding />
                )}
            </div>
        </div>
    );
}
