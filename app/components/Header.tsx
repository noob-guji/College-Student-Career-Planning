import { Bell, Search } from 'lucide-react';

export default function Header() {
    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex-1 max-w-lg relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#F59E0B] focus:border-[#F59E0B] sm:text-sm transition-colors"
                    placeholder="搜索岗位、技能、路径..."
                />
            </div>
            <div className="ml-4 flex items-center gap-3">
                <button className="p-2 text-slate-400 hover:text-slate-600 relative transition-colors rounded-full hover:bg-slate-100">
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    <Bell className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
