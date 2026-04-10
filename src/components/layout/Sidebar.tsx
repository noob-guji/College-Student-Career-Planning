'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, UserCircle, Settings, Map, BookMarked, Brain, FileText, GitBranch } from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();

    const navGroups = [
        {
            label: '核心功能',
            items: [
                { name: '首页',       href: '/home',                icon: Home },
                { name: '岗位认知中心', href: '/roles',              icon: Compass },
                { name: '岗位图谱',   href: '/job-graph',           icon: GitBranch },
                { name: '自我认知中心', href: '/self-cognition',     icon: UserCircle },
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
                    <div className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-full transition-colors overflow-hidden ${pathname === '/profile' ? 'text-[#F59E0B]' : 'text-[#94A3B8] group-hover/profile:text-[#F59E0B]'}`}>
                        <UserCircle className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div className="ml-4 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className={`text-sm font-bold leading-tight ${pathname === '/profile' ? 'text-[#F59E0B]' : 'text-[#94A3B8] group-hover/profile:text-[#F59E0B]'}`}>张三</span>
                        <span className={`text-xs mt-1 leading-tight opacity-80 ${pathname === '/profile' ? 'text-[#F59E0B]' : 'text-[#94A3B8] group-hover/profile:text-[#F59E0B]'}`}>user@example.com</span>
                    </div>
                </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 pl-3 py-2 overflow-y-auto overflow-x-hidden space-y-1">
                {navGroups.map((group) => (
                    <div key={group.label}>
                        <div className="px-3 py-1 mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="text-[10px] font-bold tracking-widest text-[#4B5563] uppercase whitespace-nowrap">
                                {group.label}
                            </span>
                        </div>
                        {group.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`group/nav flex items-center px-3 py-2.5 text-sm font-medium whitespace-nowrap outline-none ${isActive ? 'sidebar-active-item' : 'rounded-l-xl text-[#94A3B8] hover:text-[#F59E0B]'}`}
                                >
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

                {/* Settings */}
                <Link
                    href="/settings"
                    className={`group/nav flex items-center px-3 py-2.5 text-sm font-medium whitespace-nowrap outline-none ${pathname === '/settings' ? 'sidebar-active-item' : 'rounded-l-xl text-[#94A3B8] hover:text-[#F59E0B]'}`}
                >
                    <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg">
                        <Settings className={`w-5 h-5 ${pathname === '/settings' ? 'text-[#F59E0B]' : 'text-[#94A3B8] group-hover/nav:text-[#F59E0B]'}`} />
                    </div>
                    <span className={`ml-4 opacity-0 group-hover:opacity-100 transition-all duration-300 ${pathname === '/settings' ? 'text-[#F59E0B] font-semibold' : 'text-[#94A3B8] group-hover/nav:text-[#F59E0B]'}`}>
                        设置
                    </span>
                </Link>
            </nav>

            {/* Footer */}
            <div className="py-4 px-5 shrink-0 overflow-hidden whitespace-nowrap">
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#F59E0B] font-bold shrink-0">S</div>
                    <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <p className="text-sm font-medium text-[#94A3B8] group-hover:text-[#F59E0B] transition-colors">计算机科学</p>
                        <p className="text-xs text-[#94A3B8] opacity-70 group-hover:text-[#F59E0B] group-hover:opacity-100 transition-colors">2026届 本科</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
