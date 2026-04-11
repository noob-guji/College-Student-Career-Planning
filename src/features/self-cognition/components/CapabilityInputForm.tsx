'use client';

import { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, ChevronRight, FileJson, Save } from 'lucide-react';
import MBTILanding from '@/features/self-cognition/components/MBTILanding';

// 6维能力维度
const CAP_DIMS = ['逻辑能力', '沟通表达', '执行落地', '创新思维', '领导团队', '抗压能力'] as const;
type CapDim = typeof CAP_DIMS[number];

const TECH_SKILLS = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C/C++', 'Figma', 'Photoshop', 'SQL', 'Excel', 'Vue', 'React'];
const JOB_TYPES   = ['前端开发', '后端开发', '产品经理', 'UI设计', '算法工程师', '数据分析', '测试', '运营', '项目管理'];

export default function CapabilityInputForm() {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual' | 'assessment'>('upload');
  const [file,      setFile]      = useState<File | null>(null);
  const [saved,     setSaved]     = useState(false);

  // ── 表单状态
  const [name,       setName]       = useState('');
  const [education,  setEducation]  = useState('');
  const [major,      setMajor]      = useState('');
  const [targetCity, setTargetCity] = useState('');
  const [internship, setInternship] = useState('');
  const [projects,   setProjects]   = useState('');
  const [certs,      setCerts]      = useState('');
  const [selfDesc,   setSelfDesc]   = useState('');
  const [salaryExp,  setSalaryExp]  = useState('');
  const [direction,  setDirection]  = useState('');

  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [skills,           setSkills]           = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<Record<CapDim, number>>(
    Object.fromEntries(CAP_DIMS.map(d => [d, 75])) as Record<CapDim, number>
  );

  // 初始化：从 sessionStorage 恢复
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('careerProfile');
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.name)             setName(p.name);
      if (p.education)        setEducation(p.education);
      if (p.major)            setMajor(p.major);
      if (p.targetCity)       setTargetCity(p.targetCity);
      if (p.internship)       setInternship(p.internship);
      if (p.projects)         setProjects(p.projects);
      if (p.certs)            setCerts(p.certs);
      if (p.selfDesc)         setSelfDesc(p.selfDesc);
      if (p.salaryExp)        setSalaryExp(p.salaryExp);
      if (p.careerDirection)  setDirection(p.careerDirection);
      if (p.selectedJobTypes) setSelectedJobTypes(p.selectedJobTypes);
      if (p.skills)           setSkills(p.skills);
      if (p.capabilities)     setCapabilities(p.capabilities);
    } catch {}
  }, []);

  const toggleArr = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const handleSave = () => {
    const profile = {
      name, education, major, targetCity,
      internship, projects, certs, selfDesc, salaryExp,
      careerDirection: direction,
      selectedJobTypes,
      skills,
      capabilities,
      savedAt: Date.now(),
    };
    sessionStorage.setItem('careerProfile', JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Tabs */}
      <div className="p-4 border-b border-slate-100 flex gap-2 shrink-0 overflow-x-auto no-scrollbar">
        {(['upload','manual','assessment'] as const).map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab ? 'bg-amber-50 text-[#F59E0B]' : 'text-[#111827] hover:bg-slate-50'
            }`}
          >
            {{ upload:'简历智能解析', manual:'结构化信息填报', assessment:'深度测评问卷' }[tab]}
          </button>
        ))}
      </div>

      <div className="p-6 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        {/* ── 上传简历 */}
        {activeTab === 'upload' && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div
              className={`w-full max-w-lg border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                ${file ? 'border-green-500 bg-green-50' : 'border-[#94A3B8] hover:border-[#FFCA28] hover:bg-slate-50'}`}
              onDragOver={e => { e.preventDefault(); }}
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
            >
              {file ? (
                <div className="flex flex-col items-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <button onClick={() => setFile(null)} className="mt-3 text-sm text-blue-600 hover:underline">重新上传</button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-amber-50 text-[#F59E0B] rounded-full flex items-center justify-center mb-4">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900">拖拽文件到此处，或点击上传</h3>
                  <p className="text-slate-500 text-sm mt-2">支持 PDF · DOCX · PNG · JPG</p>
                  <label className="mt-6 px-6 py-2.5 bg-[#F59E0B] hover:bg-[#FF8F00] text-white text-sm font-medium rounded-lg cursor-pointer transition-colors shadow-sm">
                    选择文件
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
                  </label>
                </div>
              )}
            </div>
            {file && (
              <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2">
                <FileJson className="w-4 h-4" /> 开始智能解析
              </button>
            )}
          </div>
        )}

        {/* ── 手动填报 */}
        {activeTab === 'manual' && (
          <div className="max-w-2xl mx-auto space-y-8 pb-4">

            {/* 基础信息 */}
            <section className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">基础信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
                  <input value={name} onChange={e=>setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                    placeholder="您的姓名" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">最高学历</label>
                  <select value={education} onChange={e=>setEducation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-[#F59E0B]">
                    <option value="">请选择</option>
                    {['高中及以下','专科','本科','硕士','博士'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">专业 / 院校</label>
                  <input value={major} onChange={e=>setMajor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                    placeholder="计算机科学 / 长沙大学" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">意向城市</label>
                  <input value={targetCity} onChange={e=>setTargetCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                    placeholder="北京, 上海, 远程" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">期望岗位类型</label>
                  <div className="flex flex-wrap gap-2">
                    {JOB_TYPES.map(j => (
                      <label key={j} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all ${
                        selectedJobTypes.includes(j) ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
                      }`}>
                        <input type="checkbox" className="hidden" checked={selectedJobTypes.includes(j)}
                          onChange={() => toggleArr(selectedJobTypes, j, setSelectedJobTypes)} />
                        {j}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 专业技能 */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">专业技能</h3>
              <div className="flex flex-wrap gap-2">
                {TECH_SKILLS.map(s => (
                  <label key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all ${
                    skills.includes(s) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}>
                    <input type="checkbox" className="hidden" checked={skills.includes(s)}
                      onChange={() => toggleArr(skills, s, setSkills)} />
                    {s}
                  </label>
                ))}
              </div>
            </section>

            {/* 实践经历 */}
            <section className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">实践经历</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">实习经历</label>
                <textarea rows={2} value={internship} onChange={e=>setInternship(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                  placeholder="公司名称、职位及核心贡献..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">项目经历</label>
                <textarea rows={2} value={projects} onChange={e=>setProjects(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                  placeholder="项目描述与你在其中的角色..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">证书 / 荣誉</label>
                <textarea rows={2} value={certs} onChange={e=>setCerts(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                  placeholder="CET-6、计算机二级、互联网+省级二等奖..." />
              </div>
            </section>

            {/* 职业倾向 */}
            <section className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">职业倾向</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">侧重发展方向</label>
                <div className="flex flex-wrap gap-2">
                  {['技术专家','管理/团队领导','全栈复合型','独立开发者/创业'].map(d => (
                    <label key={d} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all ${
                      direction === d ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}>
                      <input type="radio" name="dir" className="hidden" checked={direction===d} onChange={() => setDirection(d)} />
                      {d}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">期望薪资</label>
                  <input value={salaryExp} onChange={e=>setSalaryExp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                    placeholder="10k-15k" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">一句话自我评价</label>
                <textarea rows={2} value={selfDesc} onChange={e=>setSelfDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                  placeholder="描述最突出的个人优势..." />
              </div>
            </section>

            {/* ★ 核心：6维能力自评滑块 */}
            <section className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
                能力自评 <span className="text-xs font-normal text-slate-400 ml-2">（滑动评分，影响岗位匹配结果）</span>
              </h3>
              {CAP_DIMS.map(dim => (
                <div key={dim}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{dim}</span>
                    <span className="font-bold text-amber-600">{capabilities[dim]}</span>
                  </div>
                  <input
                    type="range" min={20} max={100} step={5}
                    value={capabilities[dim]}
                    onChange={e => setCapabilities(prev => ({ ...prev, [dim]: Number(e.target.value) }))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-slate-200"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>待提升</span><span>优秀</span>
                  </div>
                </div>
              ))}
            </section>

            {/* 保存按钮 */}
            <div className="pt-2">
              <button onClick={handleSave}
                className="w-full py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all duration-300 bg-[#F59E0B] hover:bg-[#FF8F00] text-white">
                {saved
                  ? <><CheckCircle2 className="w-5 h-5" /> 已保存！</>
                  : <><Save className="w-5 h-5" /> 保存并生成画像 <ChevronRight className="w-5 h-5" /></>
                }
              </button>
            </div>
          </div>
        )}

        {activeTab === 'assessment' && <MBTILanding />}
      </div>
    </div>
  );
}
