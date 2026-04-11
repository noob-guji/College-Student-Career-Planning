'use client';

import { useState, useEffect } from 'react';
import { ArrowLeftRight, ArrowUpDown, Briefcase, Search, Loader2 } from 'lucide-react';
import JobProfileCard from '@/features/jobs/components/JobProfileCard';
import JobKnowledgeGraph from '@/features/jobs/components/JobKnowledgeGraph';
import { MarkerType, Position } from '@xyflow/react';

// ─────────────────────────────────────────────
// 构建晋升图（verticalNodes / verticalEdges）
// ─────────────────────────────────────────────
function buildVerticalGraph(ladder: string[], category: string) {
  const LEVEL_COLORS = [
    { bg:'#f8fafc',border:'#cbd5e1',color:'#64748b' },
    { bg:'#eff6ff',border:'#93c5fd',color:'#1d4ed8' },
    { bg:'#dbeafe',border:'#60a5fa',color:'#1e40af' },
    { bg:'#fef3c7',border:'#fcd34d',color:'#92400e' },
    { bg:'#fde68a',border:'#f59e0b',color:'#78350f' },
    { bg:'#fecaca',border:'#f87171',color:'#991b1b' },
  ];
  const colorAt = (i: number, total: number) => {
    const slot = Math.min(Math.floor((i / (total - 1 || 1)) * LEVEL_COLORS.length), LEVEL_COLORS.length - 1);
    return LEVEL_COLORS[slot];
  };

  const verticalNodes = ladder.map((name, i) => {
    const c = colorAt(i, ladder.length);
    return {
      id: `v_${i}`,
      position: { x: 50, y: 40 + i * 90 },
      data: { label: name },
      style: { background: c.bg, border: `1.5px solid ${c.border}`, color: c.color, borderRadius:'8px', padding:'8px 16px', fontSize:'13px', fontWeight: i===ladder.length-1?700:500, width:220, textAlign:'center' },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  const verticalEdges = ladder.slice(0,-1).map((_,i) => {
    const c = colorAt(i+1, ladder.length);
    return {
      id: `ve_${i}`, source:`v_${i}`, target:`v_${i+1}`, animated:true,
      style:{ strokeWidth:2, stroke:c.border },
      markerEnd:{ type: MarkerType.ArrowClosed, color:c.border },
    };
  });

  return { verticalNodes, verticalEdges };
}

// ─────────────────────────────────────────────
// 构建转岗图（horizontalNodes / horizontalEdges）
// ─────────────────────────────────────────────
function buildHorizontalGraph(midJob: string, lateralPaths: any[]) {
  if (!lateralPaths?.length) return null;

  const DIFF_COLOR: Record<string,{bg:string;border:string;color:string}> = {
    '低': { bg:'#f0fdf4', border:'#86efac', color:'#166534' },
    '中': { bg:'#fefce8', border:'#fde047', color:'#854d0e' },
    '高': { bg:'#fff1f2', border:'#fda4af', color:'#9f1239' },
  };

  const srcY = 30 + ((lateralPaths.length - 1) / 2) * 100;

  const srcNode = {
    id: 'h_src',
    position: { x: 50, y: srcY },
    data: { label: midJob },
    style: { background:'#1e293b', border:'2px solid #f59e0b', color:'#f59e0b', borderRadius:'10px', padding:'10px 18px', fontSize:'13px', fontWeight:700, width:200, textAlign:'center', boxShadow:'0 4px 16px rgba(245,158,11,0.25)' },
    sourcePosition: Position.Right,
  };

  const tgtNodes = lateralPaths.slice(0, 5).map((p: any, i: number) => {
    const c = DIFF_COLOR[p['难度']] ?? DIFF_COLOR['中'];
    return {
      id: `h_${i}`,
      position: { x: 370, y: 30 + i * 100 },
      data: { label: p['目标岗位'] },
      style: { background:c.bg, border:`1.5px solid ${c.border}`, color:c.color, borderRadius:'8px', padding:'8px 14px', fontSize:'13px', fontWeight:600, width:200, textAlign:'center' },
      targetPosition: Position.Left,
    };
  });

  const horizontalEdges = lateralPaths.slice(0,5).map((p: any, i: number) => ({
    id: `he_${i}`, source:'h_src', target:`h_${i}`, animated:true,
    label: `${Math.round(p['相似度得分']*100)}% · ${p['难度']}难度`,
    labelStyle:{ fontSize:10, fill:'#64748b', fontWeight:600 },
    labelBgStyle:{ fill:'#fff', fillOpacity:0.85 },
    style:{ strokeWidth:2, stroke:'#94a3b8' },
    markerEnd:{ type:MarkerType.ArrowClosed, color:'#94a3b8' },
  }));

  return {
    horizontalNodes: [srcNode, ...tgtNodes],
    horizontalEdges,
  };
}

// ─────────────────────────────────────────────
// 元数据
// ─────────────────────────────────────────────
const CAT_META: Record<string,[string,string,string]> = {
  'Java开发':['研发线','互联网/软件','高需求'],'Python开发':['研发线','互联网/AI','高成长'],
  'C/C++开发':['研发线','嵌入式/系统','核心'],'前端开发':['研发线','互联网/软件','高需求'],
  '后端开发':['研发线','互联网/软件','核心'],'全栈开发':['研发线','互联网/软件','复合型'],
  'Android开发':['研发线','移动端','高需求'],'iOS开发':['研发线','移动端','高需求'],
  '嵌入式开发':['研发线','硬件/物联网','稳定'],'算法工程师':['研发线','AI/ML','高薪'],
  'AI/机器学习':['研发线','人工智能','热门'],'大数据开发':['研发线','大数据','高成长'],
  '运维工程师':['运维线','IT基础设施','稳定'],'信息安全':['安全线','网络安全','高需求'],
  '网络工程师':['运维线','IT基础设施','稳定'],'硬件工程师':['研发线','硬件/电子','制造'],
  '测试工程师':['质量线','互联网/软件','入门友好'],'实施工程师':['交付线','企业软件','项目制'],
  '技术支持工程师':['支持线','IT服务','服务型'],'产品经理':['产品线','互联网','高影响力'],
  'UI/UX设计师':['设计线','互联网/创意','创意型'],'平面设计师':['设计线','创意/媒体','创意型'],
  '视觉设计师':['设计线','品牌/互联网','创意型'],'数据分析师':['数据线','互联网/金融','数据驱动'],
  'BI工程师':['数据线','商业智能','数据驱动'],'商业分析师':['数据线','咨询/互联网','商业型'],
  '运营专员':['运营线','互联网','增长型'],'市场专员':['市场线','互联网/消费品','市场型'],
  '品牌专员':['市场线','消费品/互联网','品牌型'],'新媒体运营':['运营线','互联网/媒体','内容型'],
  '内容运营':['运营线','互联网/媒体','内容型'],'社区运营':['运营线','互联网','社区型'],
  '电商运营':['运营线','电商/零售','增长型'],'销售':['销售线','全行业','高收入'],
  '商务拓展':['商务线','互联网/咨询','BD型'],'客户经理':['销售线','金融/企服','客户型'],
  '大客户销售':['销售线','企业服务','高客单价'],'广告销售':['销售线','媒体/互联网','广告型'],
  'HR':['职能线','全行业','稳定'],'招聘专员':['职能线','猎头/企业','招聘型'],
  '财务':['财务线','全行业','稳定'],'会计':['财务线','全行业','基础'],
  '法务':['职能线','全行业','专业'],'行政':['职能线','全行业','稳定'],
  '供应链':['供应链线','制造/电商','战略'],'项目经理':['管理线','全行业','管理型'],
};

const DEPT_RADAR: Record<string, number[]> = {
  '研发线':[88,60,75,92,80,72,82,58,88,65,90,88],'数据线':[90,65,80,88,72,78,78,55,85,80,85,85],
  '产品线':[80,60,85,85,78,90,80,72,82,88,82,88],'设计线':[75,70,88,80,72,82,75,60,78,72,80,85],
  '运营线':[72,55,82,82,72,88,75,68,78,82,82,85],'市场线':[68,60,78,80,70,88,72,70,75,85,80,85],
  '销售线':[65,55,72,75,68,95,72,82,72,88,85,88],'管理线':[78,65,78,82,75,88,82,90,82,85,88,88],
  '职能线':[70,68,75,80,72,82,75,68,78,72,82,85],'财务线':[82,80,72,78,78,75,80,65,82,80,90,90],
  '质量线':[85,65,70,88,82,75,80,58,88,68,90,85],'运维线':[85,65,70,90,85,75,80,60,88,65,88,85],
  '安全线':[88,75,72,90,85,72,82,60,90,68,88,88],'支持线':[78,60,68,82,82,85,75,60,80,70,82,85],
  '交付线':[75,60,68,82,82,82,82,65,82,72,85,85],'供应链线':[75,65,72,82,80,80,78,70,80,80,85,85],
};
const SUBJECTS = ['专业技能','证书要求','创新能力','学习能力','抗压能力','沟通能力','实习能力','领导力能','解决问题能力','商业敏感度','执行力','价值观匹配'];
function buildRadar(dept: string) {
  const line = dept.includes('线') ? dept : dept+'线';
  const scores = DEPT_RADAR[line] ?? Array(12).fill(80);
  return SUBJECTS.map((s,i) => ({ subject:s, A:scores[i], fullMark:100, detail:'' }));
}

const CAT_GROUPS: Record<string,string[]> = {
  '💻 技术研发': ['Java开发','Python开发','C/C++开发','前端开发','后端开发','全栈开发','Android开发','iOS开发','嵌入式开发'],
  '🤖 AI/数据':  ['算法工程师','AI/机器学习','大数据开发','数据分析师','BI工程师','商业分析师'],
  '🔧 IT运维':   ['运维工程师','信息安全','网络工程师','测试工程师','实施工程师','技术支持工程师'],
  '🎨 产品设计': ['产品经理','UI/UX设计师','平面设计师','视觉设计师'],
  '📈 运营市场': ['运营专员','市场专员','品牌专员','新媒体运营','内容运营','社区运营','电商运营'],
  '💼 销售商务': ['销售','商务拓展','客户经理','大客户销售','广告销售'],
  '🏢 职能支持': ['HR','招聘专员','财务','会计','法务','行政','供应链','项目经理','硬件工程师'],
};

// Lateral paths lookup (by entry-level job name or category)
const LATERAL_MAP: Record<string,string> = {
  '前端开发':'前端开发工程师','Java开发':'Java开发工程师','数据分析师':'数据分析师',
  '产品经理':'产品经理','测试工程师':'软件测试工程师','运营专员':'运营专员',
  '销售':'销售经理','项目经理':'项目经理','实施工程师':'实施工程师','技术支持工程师':'技术支持工程师',
};

export default function CareerCognition() {
  const [viewMode,    setViewMode]    = useState<'vertical'|'horizontal'>('vertical');
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [jobsData,    setJobsData]    = useState<Record<string,any>>({});
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [openGroups,  setOpenGroups]  = useState<Record<string,boolean>>({ '💻 技术研发': true });
  const [lateralData, setLateralData] = useState<Record<string,any[]>>({});

  useEffect(() => {
    // Load vertical paths
    Promise.all([
      fetch('/api/knowledge-graph?list=1').then(r=>r.json()),
      fetch('/api/knowledge-graph').then(r=>r.json()),
    ]).then(([listData, _]) => {
      const cats: string[] = listData.categories ?? [];
      const built: Record<string,any> = {};

      // Build entries for each category with graph data
      cats.forEach(cat => {
        const meta = CAT_META[cat] ?? ['综合线','全行业','稳定'];
        const [dept, industry, tag] = meta;
        built[cat] = {
          category: cat, dept, industry, tag,
          profile: null,
          graph: null,
          ladder: [],
        };
      });

      setJobsData(built);
      if (cats.length > 0) setSelectedCat(cats[0]);
      setLoading(false);

      // Load lateral paths
      fetch('/api/knowledge-graph?list=1').then(r=>r.json()).then(d => {
        const coreJobs: string[] = d.coreJobs ?? [];
        const latMap: Record<string,any[]> = {};
        Promise.all(coreJobs.map(job =>
          fetch(`/api/knowledge-graph?job=${encodeURIComponent(job)}`).then(r=>r.json()).then(d2 => {
            if (d2.lateral?.nodes) {
              latMap[job] = d2.lateral.nodes.filter((n:any) => !n.data.isSource).map((n:any) => ({
                目标岗位: String(n.data.label),
                相似度得分: n.data.similarity ?? 0.7,
                难度: n.data.difficulty ?? '中',
                所需补充技能: n.data.skills ?? [],
                预计过渡周期: n.data.period ?? '6-12个月',
                推荐行动: n.data.action ?? '',
                薪资变化参考: n.data.salary ?? '',
              }));
            }
          })
        )).then(() => setLateralData({ ...latMap }));
      });
    }).catch(() => setLoading(false));
  }, []);

  // Load graph for selected category
  useEffect(() => {
    if (!selectedCat) return;
    fetch(`/api/knowledge-graph?category=${encodeURIComponent(selectedCat)}`)
      .then(r => r.json())
      .then(data => {
        const vData = data.vertical;
        if (!vData) return;
        const ladder: string[] = vData.nodes?.map((n:any) => String(n.data.label)) ?? [];
        const meta = CAT_META[selectedCat] ?? ['综合线','全行业','稳定'];
        const [dept, industry, tag] = meta;
        const mid = ladder[Math.floor(ladder.length/2)] ?? selectedCat;
        const skills = Array.from(new Set([ladder[0], ladder[Math.floor(ladder.length/3)], ladder[ladder.length-1]])).slice(0,4) as string[];

        // Find lateral paths for this category
        const latKey = LATERAL_MAP[selectedCat] ?? Object.keys(lateralData).find(k => k.toLowerCase().includes(selectedCat.replace('开发','').replace('工程师','').toLowerCase()));
        const latPaths = latKey ? lateralData[latKey] : [];

        const vGraph = buildVerticalGraph(ladder, selectedCat);
        const hGraph = buildHorizontalGraph(mid, latPaths);

        setJobsData(prev => ({
          ...prev,
          [selectedCat]: {
            ...prev[selectedCat],
            ladder,
            profile: {
              title: mid, department: dept, industry, tag,
              description: `负责${selectedCat}相关工作，从${ladder[0]}起步，逐步成长至${ladder[ladder.length-1]}。要求具备扎实的专业基础与持续学习能力。`,
              skills, radarData: buildRadar(dept), category: selectedCat, ladder,
            },
            graph: {
              verticalNodes: vGraph.verticalNodes,
              verticalEdges: vGraph.verticalEdges,
              horizontalNodes: hGraph?.horizontalNodes ?? vGraph.verticalNodes,
              horizontalEdges: hGraph?.horizontalEdges ?? vGraph.verticalEdges,
            },
          }
        }));
      });
  }, [selectedCat, lateralData]);

  const selected = jobsData[selectedCat];
  const allCats = Object.keys(jobsData);
  const filteredCats = search ? allCats.filter(c => c.toLowerCase().includes(search.toLowerCase())) : allCats;

  return (
    <div className="space-y-6 max-w-[1600px] w-full mx-auto h-[max(100%,700px)] flex flex-col px-4 sm:px-6 lg:px-8 pb-6">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">岗位认知中心</h2>
          <p className="text-sm text-slate-500 mt-1">
            深入了解 <span className="font-semibold text-amber-600">{allCats.length}</span> 个岗位，探索职业发展路径
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {[{id:'vertical',icon:ArrowUpDown,label:'晋升路径'},{id:'horizontal',icon:ArrowLeftRight,label:'转岗路径'}].map(m => (
            <button key={m.id} onClick={() => setViewMode(m.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode===m.id?'bg-white text-[#F59E0B] shadow-sm':'text-[#111827]'}`}>
              <m.icon className="w-4 h-4" />{m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* 岗位列表 */}
        <div className="xl:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          <div className="p-3 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="搜索岗位大类..." className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 p-2 no-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">加载岗位库…</span>
              </div>
            ) : search ? (
              <div className="space-y-1">
                {filteredCats.map(cat => (
                  <button key={cat} onClick={() => setSelectedCat(cat)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all flex items-center gap-2.5 border ${
                      selectedCat===cat?'bg-amber-50 border-amber-200 text-amber-700 font-semibold':'border-transparent text-slate-600 hover:bg-slate-50'}`}>
                    <Briefcase className={`w-3.5 h-3.5 shrink-0 ${selectedCat===cat?'text-amber-500':'text-slate-400'}`} />
                    <span className="truncate">{cat}</span>
                  </button>
                ))}
              </div>
            ) : (
              Object.entries(CAT_GROUPS).map(([group, cats]) => {
                const groupCats = cats.filter(c => jobsData[c]);
                if (!groupCats.length) return null;
                const isOpen = openGroups[group] ?? false;
                return (
                  <div key={group} className="mb-1">
                    <button onClick={() => setOpenGroups(p => ({...p,[group]:!p[group]}))}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:text-slate-700">
                      <span>{group}</span>
                      <span className={`flex items-center gap-1 transition-transform ${isOpen?'rotate-90':''}`}>
                        <span className="text-amber-500">{groupCats.length}</span> ›
                      </span>
                    </button>
                    {isOpen && (
                      <div className="space-y-0.5 pl-1">
                        {groupCats.map(cat => (
                          <button key={cat} onClick={() => setSelectedCat(cat)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2.5 border ${
                              selectedCat===cat?'bg-amber-50 border-amber-200 text-amber-700 font-semibold':'border-transparent text-slate-600 hover:bg-slate-50'}`}>
                            <Briefcase className={`w-3 h-3 shrink-0 ${selectedCat===cat?'text-amber-500':'text-slate-300'}`} />
                            <span className="truncate">{cat}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="xl:col-span-4 min-h-0 flex flex-col">
          {selected?.profile ? (
            <JobProfileCard profile={selected.profile} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 h-full flex flex-col items-center justify-center text-slate-400 gap-3 p-8">
              {loading ? <><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">加载中…</span></>
                : <><Briefcase className="w-8 h-8 opacity-30" /><span className="text-sm">请在左侧选择岗位</span></>}
            </div>
          )}
        </div>

        {/* 职业发展地图 */}
        <div className="xl:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 shrink-0 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#F59E0B] rounded-full" />
              职业发展地图
              {selectedCat && <span className="text-xs text-slate-400 font-normal ml-1">— {selectedCat}</span>}
            </h3>
            {viewMode === 'horizontal' && selected?.graph && (
              <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                线宽 = 相似度，颜色 = 难度
              </span>
            )}
          </div>
          <div className="flex-1 w-full relative min-h-[300px]">
            {selected?.graph ? (
              <JobKnowledgeGraph viewMode={viewMode} graphData={selected.graph} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 gap-2">
                {loading || (selectedCat && !selected?.graph) ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">图谱加载中…</span></>
                ) : (
                  <span className="text-sm">请先选择左侧岗位</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
