'use client';

import { useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle2, ChevronRight, FileJson, Save, Loader2, BarChart2, Zap } from 'lucide-react';
import MBTILanding from '@/features/self-cognition/components/MBTILanding';

// ── 6维维度
const CAP_DIMS = ['逻辑能力', '沟通表达', '执行落地', '创新思维', '领导团队', '抗压能力'] as const;
type CapDim = typeof CAP_DIMS[number];

const TECH_SKILLS = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C/C++', 'Figma', 'Photoshop', 'SQL', 'Excel', 'Vue', 'React'];
const JOB_TYPES   = ['前端开发', '后端开发', '产品经理', 'UI设计', '算法工程师', '数据分析', '测试', '运营', '项目管理'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ─────────────────────────────────────────────────────────────
// 客户端 DOCX 文本提取（使用 mammoth.js）
// ─────────────────────────────────────────────────────────────
async function extractDocxText(file: File): Promise<string> {
  try {
    // 动态导入 mammoth，避免 SSR 问题
    const mammoth = await import('mammoth');
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value;
  } catch {
    // fallback：读取原始字节并尝试提取可见文本
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let text = '';
    for (let i = 0; i < bytes.length; i++) {
      const c = bytes[i];
      if ((c >= 0x20 && c < 0x7f) || c === 0x0a || c === 0x0d) {
        text += String.fromCharCode(c);
      }
    }
    // 简单过滤XML标签
    return text.replace(/<[^>]+>/g, ' ').replace(/\s{3,}/g, '\n').slice(0, 8000);
  }
}

// ─────────────────────────────────────────────────────────────
// 算法评分：纯表单数据生成评分（问题2）
// 基于填写完整度、能力自评、技能数量、实习经历等
// ─────────────────────────────────────────────────────────────
function computeManualScore(params: {
  name: string; education: string; major: string; school: string;
  targetCity: string; internship: string; projects: string; certs: string;
  skills: string[]; selectedJobTypes: string[];
  capabilities: Record<CapDim, number>;
}): { completeness: number; competitiveness: number; completeness_reason: string } {
  const {
    name, education, major, school, targetCity,
    internship, projects, certs, skills, selectedJobTypes, capabilities,
  } = params;

  // ── 完整度计算（满分100）
  let comp = 0;
  if (name.trim())         comp += 8;
  if (education)           comp += 8;
  if (major.trim())        comp += 8;
  if (school.trim())       comp += 8;
  if (targetCity.trim())   comp += 6;
  if (internship.trim())   comp += 15;
  if (projects.trim())     comp += 12;
  if (certs.trim())        comp += 10;
  if (skills.length >= 1)  comp += 8;
  if (skills.length >= 3)  comp += 5;
  if (selectedJobTypes.length > 0) comp += 7;
  const capFilled = Object.values(capabilities).filter(v => v !== 75).length;
  if (capFilled >= 3)      comp += 5;

  const completeness = Math.min(100, comp);

  // ── 竞争力计算（综合能力分 + 加成项）
  const capAvg = Math.round(
    Object.values(capabilities).reduce((a, b) => a + b, 0) / CAP_DIMS.length
  );

  let bonus = 0;
  // 学历加成
  if (education === '硕士' || education === '博士') bonus += 12;
  else if (education === '本科') bonus += 7;
  else if (education === '专科') bonus += 3;
  // 实习经历加成
  if (internship.length > 30)  bonus += 8;
  if (internship.length > 80)  bonus += 5;
  // 项目经历加成
  if (projects.length > 30)   bonus += 6;
  if (projects.length > 100)  bonus += 4;
  // 证书加成
  if (certs.length > 10)      bonus += 5;
  // 技能加成
  if (skills.length >= 2)     bonus += 4;
  if (skills.length >= 5)     bonus += 4;
  // 意向明确加成
  if (selectedJobTypes.length > 0) bonus += 3;

  // 竞争力 = 能力均分（基础65%）+ 加成（35%上限）
  const competitiveness = Math.min(98, Math.round(capAvg * 0.65 + bonus));

  // 生成说明文字
  const missing: string[] = [];
  if (!internship.trim()) missing.push('实习经历');
  if (!projects.trim())  missing.push('项目经历');
  if (!certs.trim())     missing.push('证书/荣誉');
  if (skills.length === 0) missing.push('技能标签');
  if (!school.trim())    missing.push('学校');

  const reason = missing.length > 0
    ? `当前画像完整度 ${completeness}%，缺少：${missing.join('、')}。补充后竞争力可显著提升。`
    : `画像较完整，综合能力均值 ${capAvg} 分，整体竞争力良好。`;

  return { completeness, competitiveness, completeness_reason: reason };
}

// ─────────────────────────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────────────────────────
export default function CapabilityInputForm() {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual' | 'assessment'>('upload');
  const [file,       setFile]       = useState<File | null>(null);
  const [saved,      setSaved]      = useState(false);
  const [parsing,    setParsing]    = useState(false);
  const [parseError, setParseError] = useState('');
  const [parseResult, setParseResult] = useState<any>(null);

  // 表单状态
  const [name,           setName]           = useState('');
  const [education,      setEducation]      = useState('');
  const [major,          setMajor]          = useState('');
  const [school,         setSchool]         = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [targetCity,     setTargetCity]     = useState('');
  const [internship,     setInternship]     = useState('');
  const [projects,       setProjects]       = useState('');
  const [certs,          setCerts]          = useState('');
  const [selfDesc,       setSelfDesc]       = useState('');
  const [salaryExp,      setSalaryExp]      = useState('');
  const [direction,      setDirection]      = useState('');
  const [supplementBasicInfo, setSupplementBasicInfo] = useState('');
  const [highlightSupplement, setHighlightSupplement] = useState(false);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [skills,           setSkills]           = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<Record<CapDim, number>>(
    Object.fromEntries(CAP_DIMS.map(d => [d, 75])) as Record<CapDim, number>
  );
  const [manualScore, setManualScore] = useState<any>(null);
  const supplementRef = useRef<HTMLTextAreaElement | null>(null);

  const debounceUpdate = useRef<ReturnType<typeof setTimeout>>(undefined);
  const syncProfileToDisplay = () => {
    if (debounceUpdate.current) clearTimeout(debounceUpdate.current);
    debounceUpdate.current = setTimeout(() => {
      try {
        const raw = sessionStorage.getItem('careerProfile');
        const existing = raw ? JSON.parse(raw) : {};
        sessionStorage.setItem('careerProfile', JSON.stringify({
          ...existing,
          name, education, major, school, graduationYear, targetCity, salaryExp,
          basic: { ...existing.basic, name, education, major, school,
            graduation_year: graduationYear, target_city: targetCity, target_salary: salaryExp },
        }));
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      } catch {}
    }, 500);
  };

  // 恢复 sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('careerProfile');
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.name)            setName(p.name);
      if (p.education)       setEducation(p.education);
      if (p.major)           setMajor(p.major);
      if (p.school)          setSchool(p.school);
      if (p.graduationYear)  setGraduationYear(p.graduationYear);
      if (p.targetCity)      setTargetCity(p.targetCity);
      if (p.internship)      setInternship(p.internship);
      if (p.projects)        setProjects(p.projects);
      if (p.certs)           setCerts(p.certs);
      if (p.selfDesc)        setSelfDesc(p.selfDesc);
      if (p.salaryExp)       setSalaryExp(p.salaryExp);
      if (p.careerDirection) setDirection(p.careerDirection);
      if (p.selectedJobTypes) setSelectedJobTypes(p.selectedJobTypes);
      if (p.skills)          setSkills(p.skills);
      if (p.capabilities)    setCapabilities(p.capabilities);
      if (p.supplementBasicInfo) setSupplementBasicInfo(p.supplementBasicInfo);
    } catch {}

    const switchToManualHandler = (event: Event) => {
      setActiveTab('manual');
      const detail = (event as CustomEvent)?.detail;
      if (detail?.field === 'supplementBasicInfo') {
        window.setTimeout(() => {
          supplementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightSupplement(true);
          setTimeout(() => setHighlightSupplement(false), 3000);
        }, 120);
      }
    };
    window.addEventListener('switchToManualTab', switchToManualHandler);
    return () => window.removeEventListener('switchToManualTab', switchToManualHandler);
  }, []);

  const toggleArr = (arr: string[], val: string, set: (v: string[]) => void) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  // ─────────────────────────────────────────────────────────────
  // 解析简历 — 支持 PDF / DOCX / 图片
  // ─────────────────────────────────────────────────────────────
  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setParseError('');
    try {
      const isDocx = file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc');
      let res: Response;

      if (isDocx) {
        // ★ DOCX：先在浏览器端提取文本，再发给 API
        const text = await extractDocxText(file);
        if (!text.trim() || text.length < 30) {
          throw new Error('WORD文档内容提取失败，请尝试将文档另存为PDF后上传');
        }
        const fd = new FormData();
        fd.append('text', text.slice(0, 12000)); // 文本模式
        fd.append('filename', file.name);
        fd.append('type', 'docx_text');
        // ✅ 加上这一行：把原始文件也传给后端，以通过后端的非空校验
        fd.append('file', file);
        res = await fetch('/api/ai/parse-resume', { method: 'POST', body: fd });
      } else {
        // PDF / 图片：直接发文件
        const fd = new FormData();
        fd.append('file', file);
        res = await fetch('/api/ai/parse-resume', { method: 'POST', body: fd });
      }

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || '解析失败');
      const d = json.data;
      setParseResult(d);

      // 回填表单
      if (d.basic?.name)            setName(d.basic.name);
      if (d.basic?.education)       setEducation(d.basic.education);
      if (d.basic?.major)           setMajor(d.basic.major);
      if (d.basic?.school)          setSchool(d.basic.school);
      if (d.basic?.graduation_year) setGraduationYear(d.basic.graduation_year);
      if (d.basic?.target_city)     setTargetCity(d.basic.target_city);
      if (d.basic?.target_salary)   setSalaryExp(d.basic.target_salary);
      if (d.internship_detail)      setInternship(d.internship_detail);
      if (d.project_detail)         setProjects(d.project_detail);
      if (d.certs_detail)           setCerts(d.certs_detail);
      if (d.skills?.length)         setSkills(d.skills.filter((s: string) => TECH_SKILLS.includes(s)));

      // ★ 解析意向岗位：从 AI 返回的字段中提取
      const parsedJobTypes: string[] = [];
      if (d.basic?.target_role) {
        const role: string = d.basic.target_role;
        JOB_TYPES.forEach(jt => {
          if (role.includes(jt) || jt.includes(role.split(/[,，、/]/)[0].trim())) {
            parsedJobTypes.push(jt);
          }
        });
      }
      if (d.job_intentions?.length) {
        d.job_intentions.forEach((intent: string) => {
          JOB_TYPES.forEach(jt => {
            if (intent.includes(jt) || jt.split('').some(c => intent.includes(c))) {
              if (!parsedJobTypes.includes(jt)) parsedJobTypes.push(jt);
            }
          });
        });
      }
      if (parsedJobTypes.length > 0) setSelectedJobTypes(parsedJobTypes);

      // 12维 → 6维
      if (d.dimensions) {
        const dm = d.dimensions;
        setCapabilities({
          逻辑能力: dm.problem_solving?.score ?? 75,
          沟通表达: dm.communication?.score ?? 75,
          执行落地: dm.execution?.score ?? 75,
          创新思维: dm.innovation?.score ?? 75,
          领导团队: dm.leadership?.score ?? 75,
          抗压能力: dm.stress_tolerance?.score ?? 75,
        });
      }

      // 保存到 sessionStorage
      const profile = {
        name: d.basic?.name || '', education: d.basic?.education || '',
        major: d.basic?.major || '', school: d.basic?.school || '',
        graduationYear: d.basic?.graduation_year || '', targetCity: d.basic?.target_city || '',
        internship: d.internship_detail || '', projects: d.project_detail || '',
        certs: d.certs_detail || '', selfDesc: '', salaryExp: d.basic?.target_salary || '',
        careerDirection: '', selectedJobTypes: parsedJobTypes,
        skills: d.skills || [],
        capabilities: {
          逻辑能力: d.dimensions?.problem_solving?.score ?? 75,
          沟通表达: d.dimensions?.communication?.score ?? 75,
          执行落地: d.dimensions?.execution?.score ?? 75,
          创新思维: d.dimensions?.innovation?.score ?? 75,
          抗压能力: d.dimensions?.stress_tolerance?.score ?? 75,
          领导团队: d.dimensions?.leadership?.score ?? 75,
        },
        dimensions12: d.dimensions,
        completeness: d.completeness, competitiveness: d.competitiveness,
        basic: { name: d.basic?.name||'', education: d.basic?.education||'', major: d.basic?.major||'',
          school: d.basic?.school||'', graduation_year: d.basic?.graduation_year||'',
          target_city: d.basic?.target_city||'', target_salary: d.basic?.target_salary||'',
          target_role: d.basic?.target_role||'' },
        savedAt: Date.now(),
      };
      sessionStorage.setItem('careerProfile', JSON.stringify(profile));
      window.dispatchEvent(new CustomEvent('resumeParsed'));
    } catch (e: any) {
      setParseError(e.message || '解析失败，请重试');
    } finally {
      setParsing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 保存（手动填报）
  // ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setParseError('');
    let existingProfile: any = {};
    try { const raw = sessionStorage.getItem('careerProfile'); if (raw) existingProfile = JSON.parse(raw); } catch {}

    // ★ 生成算法评分（手动填写时的分析反馈）
    const score = computeManualScore({
      name, education, major, school, targetCity, internship, projects, certs,
      skills, selectedJobTypes, capabilities,
    });
    setManualScore(score);

    const profile = {
      name, education, major, school, graduationYear, targetCity,
      internship, projects, certs, selfDesc, salaryExp,
      careerDirection: direction,
      selectedJobTypes: [...new Set([...(existingProfile.selectedJobTypes||[]), ...selectedJobTypes])],
      skills: [...new Set([...(existingProfile.skills||[]), ...skills])],
      capabilities,
      dimensions12: existingProfile.dimensions12,
      completeness: score.completeness,
      competitiveness: score.competitiveness,
      basic: {
        ...existingProfile.basic,
        name, education, major, school,
        graduation_year: graduationYear, target_city: targetCity, target_salary: salaryExp,
      },
      supplementBasicInfo, savedAt: Date.now(),
    };
    sessionStorage.setItem('careerProfile', JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    window.dispatchEvent(new CustomEvent('profileUpdated'));
  };

  // ─────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Tabs */}
      <div className="p-4 border-b border-slate-100 flex gap-2 shrink-0 overflow-x-auto no-scrollbar">
        {(['upload','manual','assessment'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab ? 'bg-amber-50 text-[#F59E0B]' : 'text-[#111827] hover:bg-slate-50'
            }`}>
            {{ upload:'简历智能解析', manual:'结构化信息填报', assessment:'深度测评问卷' }[tab]}
          </button>
        ))}
      </div>

      <div className="p-6 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">

        {/* ─── 上传简历 ─── */}
        {activeTab === 'upload' && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div
              className={`w-full max-w-lg border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                ${file ? 'border-green-500 bg-green-50' : 'border-[#94A3B8] hover:border-[#FFCA28] hover:bg-slate-50'}`}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const dropped = e.dataTransfer.files[0];
                if (dropped) { setFile(dropped); setParseResult(null); setParseError(''); }
              }}
            >
              {file ? (
                <div className="flex flex-col items-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')
                      ? '📄 Word文档 — 将自动在浏览器端提取文本后解析'
                      : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                  </p>
                  <button onClick={() => { setFile(null); setParseResult(null); setParseError(''); }}
                    className="mt-3 text-sm text-blue-600 hover:underline">重新上传</button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-amber-50 text-[#F59E0B] rounded-full flex items-center justify-center mb-4">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900">拖拽文件到此处，或点击上传</h3>
                  <p className="text-slate-500 text-sm mt-2">支持 PDF · DOCX · DOC · PNG · JPG，最大 10MB</p>
                  <label className="mt-6 px-6 py-2.5 bg-[#F59E0B] hover:bg-[#FF8F00] text-white text-sm font-medium rounded-lg cursor-pointer transition-colors shadow-sm">
                    选择文件
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={e => {
                        const sel = e.target.files?.[0];
                        if (!sel) return;
                        if (sel.size > MAX_FILE_SIZE) {
                          setParseError('文件过大，请上传不超过 10MB 的文件'); return;
                        }
                        setFile(sel); setParseResult(null); setParseError('');
                        setSelectedJobTypes([]); setDirection('');
                      }} />
                  </label>
                </div>
              )}
            </div>

            {parseError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 max-w-lg w-full text-center">
                {parseError}
              </p>
            )}

            {/* 解析结果卡 */}
            {parseResult && (
              <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> 解析完成，已自动填入画像
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label:'完整度', val:`${parseResult.completeness}分`, color:'text-amber-600' },
                    { label:'竞争力', val:`${parseResult.competitiveness}分`, color:'text-blue-600' },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 rounded-lg p-2.5 text-center">
                      <div className={`text-xl font-bold ${item.color}`}>{item.val}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.label}评分</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">{parseResult.completeness_reason}</div>
                {/* 解析出的意向岗位 */}
                {selectedJobTypes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1.5">已识别意向岗位：</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJobTypes.map(j => (
                        <span key={j} className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-full font-medium">{j}</span>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">如需修改，请切换到「结构化信息填报」手动调整</p>
                  </div>
                )}
                <button onClick={handleSave}
                  className="w-full py-2.5 bg-[#F59E0B] hover:bg-[#FF8F00] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> 保存到我的画像
                </button>
              </div>
            )}

            {file && !parseResult && (
              <button onClick={handleParse} disabled={parsing}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors">
                {parsing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> AI 解析中...</>
                  : <><FileJson className="w-4 h-4" /> 开始智能解析</>}
              </button>
            )}

            {/* DOCX 提示 */}
            <div className="w-full max-w-lg p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700 font-semibold mb-1">📄 支持 WORD 简历解析</p>
              <p className="text-xs text-blue-600 leading-relaxed">
                上传 .docx/.doc 文件后，系统会在浏览器端自动提取文本内容，再通过 AI 进行结构化解析，
                无需手动转换格式。建议使用 Office 2013+ 格式以获得最佳解析效果。
              </p>
            </div>
          </div>
        )}

        {/* ─── 手动填报 ─── */}
        {activeTab === 'manual' && (
          <div className="max-w-2xl mx-auto space-y-8 pb-4">

            {/* 算法分析结果卡（保存后展示）*/}
            {manualScore && (
              <div className="bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold text-sm">
                  <BarChart2 className="w-4 h-4 text-amber-600" />
                  画像分析结果
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[
                    { label:'填写完整度', val:manualScore.completeness, color:'text-amber-600', bg:'bg-amber-50', border:'border-amber-100' },
                    { label:'综合竞争力', val:manualScore.competitiveness, color:'text-blue-600', bg:'bg-blue-50', border:'border-blue-100' },
                  ].map(item => (
                    <div key={item.label} className={`${item.bg} border ${item.border} rounded-lg p-3 text-center`}>
                      <div className={`text-2xl font-black ${item.color}`}>{item.val}</div>
                      <div className="h-1.5 bg-white rounded-full overflow-hidden mt-1 mx-2">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width:`${item.val}%`, background: item.color.replace('text-','').includes('amber') ? '#f59e0b' : '#3b82f6' }} />
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5">{item.label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{manualScore.completeness_reason}</p>
              </div>
            )}

            {/* 基础信息 */}
            <section className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">基础信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
                  <input value={name} onChange={e=>{setName(e.target.value); syncProfileToDisplay();}}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                    placeholder="您的姓名" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">最高学历</label>
                  <select value={education} onChange={e=>{setEducation(e.target.value); syncProfileToDisplay();}}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-[#F59E0B]">
                    <option value="">请选择</option>
                    {['高中及以下','专科','本科','硕士','博士'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">学校</label>
                  <input value={school} onChange={e=>{setSchool(e.target.value); syncProfileToDisplay();}}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                    placeholder="毕业学校 / 在读院校" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">专业</label>
                  <input value={major} onChange={e=>{setMajor(e.target.value); syncProfileToDisplay();}}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                    placeholder="计算机科学" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">意向城市</label>
                  <input value={targetCity} onChange={e=>{setTargetCity(e.target.value); syncProfileToDisplay();}}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                    placeholder="北京 / 上海 / 远程" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">毕业年份</label>
                  <input value={graduationYear} onChange={e=>{setGraduationYear(e.target.value); syncProfileToDisplay();}}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                    placeholder="2025" />
                </div>

                {/* ★ 期望岗位类型（重要：这是推荐关键字段，放在最显眼位置） */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    期望岗位类型
                    <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">★ 直接影响推荐结果</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {JOB_TYPES.map(j => (
                      <label key={j} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all ${
                        selectedJobTypes.includes(j) ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
                      }`}>
                        <input type="checkbox" className="hidden" checked={selectedJobTypes.includes(j)}
                          onChange={() => toggleArr(selectedJobTypes, j, setSelectedJobTypes)} />
                        {selectedJobTypes.includes(j) ? '✓ ' : ''}{j}
                      </label>
                    ))}
                  </div>
                  {selectedJobTypes.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1.5">⚠ 未选择意向岗位时，推荐结果仅基于能力匹配，准确率较低</p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">补充基本信息</label>
                  <textarea id="supplement-basic-info" ref={supplementRef} rows={2} value={supplementBasicInfo}
                    onChange={e => setSupplementBasicInfo(e.target.value)}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B] transition-all ${
                      highlightSupplement ? 'border-amber-500 shadow-lg shadow-amber-200 animate-pulse' : ''
                    }`}
                    placeholder="例如：我就读于XX大学计算机科学与技术专业，目标城市为上海，目标岗位为全栈开发..." />
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
              {[
                { label:'实习经历', val:internship, set:setInternship, ph:'公司名称、职位及核心贡献...' },
                { label:'项目经历', val:projects,   set:setProjects,   ph:'项目描述与你在其中的角色...' },
                { label:'证书 / 荣誉', val:certs,   set:setCerts,      ph:'CET-6、计算机二级、互联网+省级二等奖...' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                  <textarea rows={2} value={f.val} onChange={e => f.set(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                    placeholder={f.ph} />
                </div>
              ))}
            </section>

            {/* 职业倾向 */}
            <section className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">职业倾向</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">侧重发展方向</label>
                <div className="flex flex-wrap gap-2">
                  {['技术专家','管理/团队领导','全栈复合型','独立开发者/创业'].map(d => (
                    <label key={d} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all ${
                      direction===d ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}>
                      <input type="radio" name="dir" className="hidden" checked={direction===d} onChange={() => setDirection(d)} />
                      {d}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">期望薪资</label>
                <input value={salaryExp} onChange={e=>{setSalaryExp(e.target.value); syncProfileToDisplay();}}
                  className="w-full md:w-48 px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                  placeholder="10k-15k" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">一句话自我评价</label>
                <textarea rows={2} value={selfDesc} onChange={e=>setSelfDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-[#F59E0B] focus:border-[#F59E0B]"
                  placeholder="描述最突出的个人优势..." />
              </div>
            </section>

            {/* 6维能力自评 */}
            <section className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
                能力自评
                <span className="text-xs font-normal text-slate-400 ml-2">（滑动评分，影响岗位匹配结果）</span>
              </h3>
              {CAP_DIMS.map(dim => (
                <div key={dim}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{dim}</span>
                    <span className="font-bold text-amber-600">{capabilities[dim]}</span>
                  </div>
                  <input type="range" min={20} max={100} step={5}
                    value={capabilities[dim]}
                    onChange={e => setCapabilities(prev => ({ ...prev, [dim]: Number(e.target.value) }))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-slate-200" />
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
                  : <><Zap className="w-5 h-5" /> 保存并生成画像 <ChevronRight className="w-5 h-5" /></>}
              </button>
              <p className="text-center text-xs text-slate-400 mt-2">保存后将自动计算完整度与竞争力评分</p>
            </div>
          </div>
        )}

        {activeTab === 'assessment' && <MBTILanding />}
      </div>
    </div>
  );
}
