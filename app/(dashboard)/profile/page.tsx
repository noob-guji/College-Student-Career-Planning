export default function ProfilePage() {
    return (
        <div className="p-8 pb-20 sm:p-20 font-sans">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">个人信息中心</h1>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-2xl">
                <div className="flex items-center gap-6 mb-8.">
                    <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-4xl font-bold shrink-0">
                        张
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">张三</h2>
                        <p className="text-slate-500 mt-1">计算机科学 | 2026届 本科</p>
                        <p className="text-slate-400 text-sm mt-1">user@example.com</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">基本设置</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                        <div>
                            <span className="text-slate-400 block mb-1">账号状态</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">正常</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block mb-1">注册时间</span>
                            <span>2026-01-01</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
