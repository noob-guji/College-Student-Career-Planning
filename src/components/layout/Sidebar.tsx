'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, UserCircle, Settings, Map, BookMarked, Brain, FileText, GitBranch, LogOut, PenTool } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName  = user?.name  ?? user?.email?.split('@')[0] ?? '未登录';
  const displayEmail = user?.email ?? '';
  const initial      = displayName[0]?.toUpperCase() ?? '?';

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: '/auth' });
  };

  const navGroups = [
    {
      label: '核心功能',
      items: [
        { name: '首页',         href: '/home',                 icon: Home },
        { name: '岗位认知中心', href: '/roles',                icon: Compass },
        { name: '岗位智绘', href: '/job-portrait',          icon: PenTool },
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
            <span className="text-xs mt-0.5 leading-tight opacity-60 text-[#94A3B8] truncate max-w-[140px]">
              {displayEmail}
            </span>
          </div>
        </Link>
      </div>

      {/* Nav — 隐藏滚动条 */}
      <nav className="flex-1 pl-3 py-2 overflow-y-auto overflow-x-hidden no-scrollbar space-y-1">
        {navGroups.map(group => (
          <div key={group.label}>
            <div className="px-3 py-1 mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-[10px] font-bold tracking-widest text-[#4B5563] uppercase whitespace-nowrap">
                {group.label}
              </span>
            </div>
            {group.items.map(item => {
              const Icon    = item.icon;
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

      {/* 退出登录 */}
      <div className="py-3 px-3 shrink-0 overflow-hidden whitespace-nowrap border-t border-[#1F2937]">
        <button onClick={handleLogout} disabled={loggingOut}
          className="group/logout w-full flex items-center px-3 py-2.5 rounded-l-xl text-[#94A3B8] hover:text-red-400 transition-colors disabled:opacity-50">
          <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg">
            <LogOut className={`w-5 h-5 ${loggingOut ? 'animate-spin' : ''} text-[#94A3B8] group-hover/logout:text-red-400 transition-colors`} />
          </div>
          <span className="ml-4 opacity-0 group-hover:opacity-100 transition-all duration-300 text-sm font-medium">
            {loggingOut ? '退出中…' : '退出登录'}
          </span>
        </button>
      </div>
    </div>
  );
}
