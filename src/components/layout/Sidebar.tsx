'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, UserCircle, Settings, Map, BookMarked, Brain, FileText, GitBranch } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  const displayName  = user?.name  ?? user?.email?.split('@')[0] ?? '未登录';
  const displayEmail = user?.email ?? '';
  const initial      = displayName[0]?.toUpperCase() ?? '?';

  // 从 sessionStorage 读取专业信息（客户端）
  const major = (() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(sessionStorage.getItem('careerProfile') ?? '{}');
      return p.major?.split('/')[0] ?? ''; // 取专业名（去掉院校）
    } catch { return ''; }
  })();

  const navGroups = [
    {
      label: '核心功能',
      items: [
        { name: '首页',         href: '/home',                 icon: Home },
        { name: '岗位认知中心', href: '/roles',                icon: Compass },
        { name: '岗位图谱',     href: '/job-graph',            icon: GitBranch },
        { name: '自我认知中心', href: '/self-cognition',       icon: UserCircle },
        { name: '人岗匹配中心', href: '/person-post-matching', icon: Map },
      ],
    },
    {
      label: '规划生成',
      items: [
        { name: '生涯蓝图', href: '/career-blueprint', icon: FileText },
      ],
    },
    {
      label: '系统支撑',
      items: [
        { name: '知识中枢', href: '/knowledge-hub', icon: BookMarked },
        { name: '智脑引擎', href: '/ai-engine',     icon: Brain },
      ],
    },
  ];

  return (
    <div className="group w-20 hover:w-64 bg-[#111827] h-full flex flex-col transition-all duration-300 ease-in-out shrink-0 z-20 overflow-x-hidden">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 shrink-0 overflow-hidden whitespace-nowrap">
        <div className="w-10 h-10 rounded-md text-[#F59E0B] flex items-center justify-center shrink-0">
          <span className="font-bold text-2xl">A</span>
        </div>
        <h1 className="font-bold text-lg text-[#F59E0B] ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          职业规划智能体
        </h1>
      </div>

      {/* Profile */}
      <div className="pl-3 pt-4 pb-4 shrink-0 relative">
        <Link href="/profile" className={`flex items-center px-3 py-3 whitespace-nowrap group/profile focus:outline-none ${pathname === '/profile' ? 'sidebar-active-item' : 'rounded-l-xl'}`}>
          <div className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-full font-bold text-sm transition-colors ${pathname === '/profile' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-amber-400 group-hover/profile:bg-amber-500 group-hover/profile:text-white'}`}>
            {initial}
          </div>
          <div className="ml-4 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className={`text-sm font-bold leading-tight ${pathname === '/profile' ? 'text-[#F59E0B]' : 'text-[#94A3B8] group-hover/profile:text-[#F59E0B]'}`}>
              {displayName}
            </span>
            <span className={`text-xs mt-0.5 leading-tight opacity-80 truncate max-w-[140px] ${pathname === '/profile' ? 'text-[#F59E0B]' : 'text-[#94A3B8] group-hover/profile:text-[#F59E0B]'}`}>
              {displayEmail}
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 pl-3 py-2 overflow-y-auto overflow-x-hidden space-y-1">
        {navGroups.map(group => (
          <div key={group.label}>
            <div className="px-3 py-1 mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-[10px] font-bold tracking-widest text-[#4B5563] uppercase whitespace-nowrap">
                {group.label}
              </span>
            </div>
            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link key={item.name} href={item.href}
                  className={`group/nav flex items-center px-3 py-2.5 text-sm font-medium whitespace-nowrap outline-none ${isActive ? 'sidebar-active-item' : 'rounded-l-xl text-[#94A3B8] hover:text-[#F59E0B]'}`}>
                  <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg">
                    <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-[#F59E0B]' : 'text-[#94A3B8] group-hover/nav:text-[#F59E0B]'}`} />
                  </div>
                  <span className={`ml-4 opacity-0 group-hover:opacity-100 transition-all duration-300 ${isActive ? 'text-[#F59E0B] font-semibold' : 'text-[#94A3B8] group-hover/nav:text-[#F59E0B]'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
            <div className="mx-3 my-1.5 border-t border-[#1F2937]" />
          </div>
        ))}

        <Link href="/settings"
          className={`group/nav flex items-center px-3 py-2.5 text-sm font-medium whitespace-nowrap outline-none ${pathname === '/settings' ? 'sidebar-active-item' : 'rounded-l-xl text-[#94A3B8] hover:text-[#F59E0B]'}`}>
          <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg">
            <Settings className={`w-5 h-5 ${pathname === '/settings' ? 'text-[#F59E0B]' : 'text-[#94A3B8] group-hover/nav:text-[#F59E0B]'}`} />
          </div>
          <span className={`ml-4 opacity-0 group-hover:opacity-100 transition-all duration-300 ${pathname === '/settings' ? 'text-[#F59E0B] font-semibold' : 'text-[#94A3B8] group-hover/nav:text-[#F59E0B]'}`}>
            设置
          </span>
        </Link>
      </nav>

      {/* Footer — 专业信息 */}
      <div className="py-4 px-5 shrink-0 overflow-hidden whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-amber-400 font-bold shrink-0 text-sm">
            {initial}
          </div>
          <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-sm font-medium text-[#94A3B8] group-hover:text-[#F59E0B] transition-colors truncate max-w-[130px]">
              {major || '尚未填写专业'}
            </p>
            <p className="text-xs text-[#94A3B8] opacity-70 group-hover:text-[#F59E0B] group-hover:opacity-100 transition-colors">
              {displayName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
