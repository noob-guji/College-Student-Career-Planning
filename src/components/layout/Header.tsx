'use client';

import { Bell, Search, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 搜索结果类型
interface SearchResult {
  type: '岗位' | '技能' | '路径' | '功能';
  title: string;
  desc: string;
  href: string;
  highlight?: string;
}

// 静态搜索数据（岗位名 + 功能页）
const STATIC_DATA: SearchResult[] = [
  // 功能入口
  { type:'功能', title:'岗位认知中心',  desc:'浏览46个岗位画像与发展地图', href:'/roles' },
  { type:'功能', title:'岗位图谱',      desc:'交互式晋升/转岗路径可视化',  href:'/job-graph' },
  { type:'功能', title:'自我认知中心',  desc:'填写能力画像与MBTI测评',     href:'/self-cognition' },
  { type:'功能', title:'人岗匹配中心',  desc:'AI计算岗位匹配分',           href:'/person-post-matching' },
  { type:'功能', title:'生涯蓝图',      desc:'AI生成个性化职业规划报告',    href:'/career-blueprint' },
  { type:'功能', title:'知识中枢',      desc:'岗位数据与领域知识库',       href:'/knowledge-hub' },
  { type:'功能', title:'智脑引擎',      desc:'大模型核心调度管理',         href:'/ai-engine' },
  // 常见岗位
  { type:'岗位', title:'前端开发工程师', desc:'前端开发 · 研发线', href:'/roles' },
  { type:'岗位', title:'Java开发工程师', desc:'后端开发 · 研发线', href:'/roles' },
  { type:'岗位', title:'产品经理',       desc:'产品线 · 高影响力', href:'/roles' },
  { type:'岗位', title:'数据分析师',     desc:'数据线 · 数据驱动', href:'/roles' },
  { type:'岗位', title:'算法工程师',     desc:'AI/ML · 高薪',     href:'/roles' },
  { type:'岗位', title:'运营专员',       desc:'运营线 · 增长型',   href:'/roles' },
  { type:'岗位', title:'UI/UX设计师',    desc:'设计线 · 创意型',   href:'/roles' },
  { type:'岗位', title:'项目经理',       desc:'管理线 · 全行业',   href:'/roles' },
  { type:'岗位', title:'测试工程师',     desc:'质量线 · 入门友好', href:'/roles' },
  // 技能
  { type:'技能', title:'React / Vue',    desc:'前端框架', href:'/self-cognition' },
  { type:'技能', title:'Python',         desc:'通用编程语言', href:'/self-cognition' },
  { type:'技能', title:'SQL 数据分析',   desc:'数据查询与分析', href:'/self-cognition' },
  { type:'技能', title:'项目管理 PMP',   desc:'项目管理认证', href:'/self-cognition' },
  // 路径
  { type:'路径', title:'前端 → 产品经理转岗',  desc:'前端工程师转型产品路径', href:'/job-graph' },
  { type:'路径', title:'测试 → 开发工程师',    desc:'测试工程师晋升路径',     href:'/job-graph' },
  { type:'路径', title:'数据分析 → 产品经理',  desc:'数据岗位转岗路径',       href:'/job-graph' },
];

// 动态读取知识图谱的岗位（从API）
async function fetchJobList(): Promise<string[]> {
  try {
    const r = await fetch('/api/knowledge-graph?list=1');
    const d = await r.json();
    return [...(d.categories??[]), ...(d.coreJobs??[])];
  } catch { return []; }
}

export default function Header() {
  const router = useRouter();
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [open,     setOpen]     = useState(false);
  const [jobs,     setJobs]     = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 加载动态岗位列表
  useEffect(() => {
    fetchJobList().then(setJobs);
  }, []);

  // 搜索逻辑
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setResults([]); setOpen(false); return; }

    // 从静态数据搜索（不区分大小写）
    const staticMatches = STATIC_DATA.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q)
    );

    // 从动态岗位搜索
    const jobMatches: SearchResult[] = jobs
      .filter(j => j.toLowerCase().includes(q))
      .filter(j => !staticMatches.some(s => s.title === j))
      .slice(0, 5)
      .map(j => ({ type:'岗位' as const, title: j, desc:'点击前往岗位认知中心', href:'/roles' }));

    const all = [...staticMatches, ...jobMatches].slice(0, 8);
    setResults(all);
    setOpen(all.length > 0);
  }, [query, jobs]);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setOpen(false);
    router.push(result.href);
  };

  const TYPE_COLOR: Record<string,string> = {
    '岗位': 'bg-amber-100 text-amber-700',
    '技能': 'bg-blue-100 text-blue-700',
    '路径': 'bg-purple-100 text-purple-700',
    '功能': 'bg-emerald-100 text-emerald-700',
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
      {/* 搜索框 */}
      <div ref={panelRef} className="flex-1 max-w-lg relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); setQuery(''); }
            if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]);
          }}
          className="block w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#F59E0B] focus:border-[#F59E0B] sm:text-sm transition-colors"
          placeholder="搜索岗位、技能、路径..."
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 搜索结果下拉 */}
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
            {results.map((r, i) => (
              <button key={i} onClick={() => handleSelect(r)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors text-left border-b border-slate-50 last:border-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${TYPE_COLOR[r.type]}`}>{r.type}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{r.title}</div>
                  <div className="text-xs text-slate-400 truncate">{r.desc}</div>
                </div>
              </button>
            ))}
            <div className="px-4 py-2 bg-slate-50 text-[10px] text-slate-400 text-right">
              共 {results.length} 个结果 · 按 Enter 跳转第一项
            </div>
          </div>
        )}
      </div>

      <div className="ml-4 flex items-center gap-3">
        <button className="p-2 text-slate-400 hover:text-slate-600 relative transition-colors rounded-full hover:bg-slate-100">
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
