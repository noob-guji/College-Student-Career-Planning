'use client';

import { useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const user = session?.user;

  const initial = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?';

  if (status === 'loading') {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-pulse text-slate-400 text-sm">加载用户信息…</div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-20 sm:p-20 font-sans">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">个人信息中心</h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-2xl">
        {/* 头像区 */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-4xl font-bold shrink-0">
            {initial}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {user?.name ?? '未设置昵称'}
            </h2>
            <p className="text-slate-500 mt-1">
              {(() => {
                try {
                  const p = JSON.parse(sessionStorage.getItem('careerProfile') ?? '{}');
                  return [p.major, p.education].filter(Boolean).join(' | ') || '尚未填写专业信息';
                } catch { return '尚未填写专业信息'; }
              })()}
            </p>
            <p className="text-slate-400 text-sm mt-1">{user?.email ?? ''}</p>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">账号信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
            <div>
              <span className="text-slate-400 block mb-1">账号状态</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                正常
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">用户 ID</span>
              <span className="font-mono text-xs">{(user as any)?.id?.slice(0, 16) ?? '—'}…</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">登录邮箱</span>
              <span>{user?.email ?? '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">画像完善度</span>
              {(() => {
                try {
                  const p = JSON.parse(sessionStorage.getItem('careerProfile') ?? 'null');
                  if (!p) return <span className="text-amber-600">未填写</span>;
                  const score = [p.name, p.education, p.major, p.selectedJobTypes?.length, p.skills?.length].filter(Boolean).length;
                  return <span className={score >= 4 ? 'text-emerald-600' : 'text-amber-600'}>{Math.round(score / 5 * 100)}%</span>;
                } catch { return <span className="text-slate-400">—</span>; }
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
