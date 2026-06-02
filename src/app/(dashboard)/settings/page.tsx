'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Shield, Database, Bell, LogOut,
  ChevronRight, Check, Trash2, AlertTriangle,
  Moon, Sun, Monitor
} from 'lucide-react';

// ── Toast
function Toast({ msg, visible }: { msg:string; visible:boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity:0,y:-12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-12 }}
          className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border bg-emerald-50 border-emerald-200 text-emerald-800">
          <Check className="w-4 h-4" /> {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
function useToast() {
  const [state, setState] = useState({ msg:'', visible:false });
  const show = (msg: string) => { setState({ msg, visible:true }); setTimeout(() => setState(p=>({...p,visible:false})), 2500); };
  return { ...state, show };
}

// ── Confirm dialog
function ConfirmDialog({ open, title, desc, onConfirm, onCancel, danger }: {
  open:boolean; title:string; desc:string; onConfirm:()=>void; onCancel:()=>void; danger?:boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onCancel}>
          <motion.div initial={{ scale:0.95,y:10 }} animate={{ scale:1,y:0 }} exit={{ scale:0.95 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger?'bg-red-100':'bg-amber-100'}`}>
                <AlertTriangle className={`w-5 h-5 ${danger?'text-red-600':'text-amber-600'}`} />
              </div>
              <div>
                <p className="font-bold text-slate-900">{title}</p>
                <p className="text-sm text-slate-500 mt-1">{desc}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">取消</button>
              <button onClick={onConfirm} className={`px-4 py-2 text-sm text-white font-medium rounded-lg transition-colors ${danger?'bg-red-600 hover:bg-red-700':'bg-amber-500 hover:bg-amber-600'}`}>确认</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// 真实主题切换
// ─────────────────────────────────────────────
type ThemeValue = 'light' | 'dark' | 'system';

function applyTheme(theme: ThemeValue) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
  localStorage.setItem('theme', theme);
}

function useTheme() {
  const [theme, setTheme] = useState<ThemeValue>('system');

  useEffect(() => {
    const saved = (localStorage.getItem('theme') ?? 'system') as ThemeValue;
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const changeTheme = (t: ThemeValue) => {
    setTheme(t);
    applyTheme(t);
  };

  return { theme, changeTheme };
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
type TabId = 'account' | 'privacy' | 'data' | 'about';
const TABS: { id:TabId; label:string; icon:any }[] = [
  { id:'account',  label:'账号与偏好', icon:User },
  { id:'privacy',  label:'隐私与安全', icon:Shield },
  { id:'data',     label:'数据管理',   icon:Database },
  { id:'about',    label:'关于',       icon:Bell },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const user  = session?.user;
  const toast = useToast();
  const { theme, changeTheme } = useTheme();

  const [activeTab,    setActiveTab]    = useState<TabId>('account');
  const [showLogoutDlg,setShowLogoutDlg]= useState(false);
  const [showClearDlg, setShowClearDlg] = useState(false);
  const [notifications,setNotifications]= useState(true);
  const [aiContext,    setAiContext]    = useState(true);

  const initial = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?';

  const handleLogout = async () => { setShowLogoutDlg(false); await signOut({ callbackUrl:'/auth' }); };

  const handleClearData = () => {
    ['careerProfile','matchResult','personPostMatchStatus','lastReportId','lastReportData','mbtiResult'].forEach(k => sessionStorage.removeItem(k));
    setShowClearDlg(false);
    toast.show('本地数据已全部清除');
  };

  return (
    <div className="max-w-[1000px] mx-auto p-6">
      <Toast {...toast} />
      <ConfirmDialog open={showLogoutDlg} title="退出登录" desc="确定要退出当前账号吗？" onConfirm={handleLogout} onCancel={() => setShowLogoutDlg(false)} />
      <ConfirmDialog open={showClearDlg} title="清除本地数据" desc="将清除能力画像、匹配结果等本地缓存，数据库记录不受影响。" onConfirm={handleClearData} onCancel={() => setShowClearDlg(false)} danger />

      <h2 className="text-2xl font-bold text-slate-900 mb-6">设置</h2>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
        {/* 左侧 Tab */}
        <div className="space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${activeTab===tab.id?'bg-[#111827] text-amber-400 shadow-sm':'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className={`w-4 h-4 ${activeTab===tab.id?'text-amber-400':'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
          <div className="pt-3 mt-3 border-t border-slate-200">
            <button onClick={() => setShowLogoutDlg(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all text-left">
              <LogOut className="w-4 h-4" /> 退出登录
            </button>
          </div>
        </div>

        {/* 右侧内容 */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} transition={{ duration:0.15 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

            {/* 账号与偏好 */}
            {activeTab === 'account' && (
              <div>
                {/* 用户卡 */}
                <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 text-xl font-black shrink-0">{initial}</div>
                  <div>
                    <p className="font-bold text-slate-900 text-base">{user?.name ?? '—'}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{user?.email ?? '—'}</p>
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> 账号正常
                    </span>
                  </div>
                </div>

                {/* 真实主题切换 */}
                <div className="p-5 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900 mb-1">界面主题</p>
                  <p className="text-xs text-slate-400 mb-3">切换后立即生效，下次打开自动恢复</p>
                  <div className="flex gap-2">
                    {([
                      { id:'light' as ThemeValue,  icon:Sun,     label:'浅色' },
                      { id:'dark'  as ThemeValue,  icon:Moon,    label:'深色' },
                      { id:'system'as ThemeValue,  icon:Monitor, label:'跟随系统' },
                    ]).map(t => {
                      const Icon = t.icon;
                      return (
                        <button key={t.id} onClick={() => { changeTheme(t.id); toast.show(`已切换为「${t.label}」主题`); }}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            theme===t.id?'bg-amber-50 border-amber-300 text-amber-700 shadow-sm':'border-slate-200 text-slate-600 hover:border-amber-200'
                          }`}>
                          <Icon className="w-3.5 h-3.5" /> {t.label}
                          {theme===t.id && <Check className="w-3 h-3 text-amber-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 通知开关 */}
                <div className="p-5 flex items-center justify-between border-b border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-900">操作通知</p>
                    <p className="text-xs text-slate-400 mt-0.5">显示保存、导出等操作的 Toast 提示</p>
                  </div>
                  <button onClick={() => { setNotifications(!notifications); toast.show(notifications?'通知已关闭':'通知已开启'); }}
                    className={`w-11 h-6 rounded-full transition-all relative ${notifications?'bg-amber-500':'bg-slate-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${notifications?'left-5':'left-0.5'}`} />
                  </button>
                </div>

                {/* AI 上下文 */}
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">AI 上下文增强</p>
                    <p className="text-xs text-slate-400 mt-0.5">允许 AI 读取能力画像提供个性化建议</p>
                  </div>
                  <button onClick={() => { setAiContext(!aiContext); toast.show(aiContext?'AI上下文已关闭':'AI上下文已开启'); }}
                    className={`w-11 h-6 rounded-full transition-all relative ${aiContext?'bg-amber-500':'bg-slate-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${aiContext?'left-5':'left-0.5'}`} />
                  </button>
                </div>
              </div>
            )}

            {/* 隐私与安全 */}
            {activeTab === 'privacy' && (
              <div className="p-5 space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm font-bold text-slate-900 mb-3">数据存储说明</p>
                  <ul className="text-xs text-slate-500 space-y-2">
                    {['登录账号信息加密存储在本地 SQLite 数据库','能力画像、匹配结果存储在浏览器 sessionStorage（关闭浏览器后清除）','AI 对话记录写入 ChatLog 数据表','职业规划报告存储在 CareerReport 数据表'].map((t,i) => (
                      <li key={i} className="flex items-start gap-2"><span className="text-amber-500 shrink-0 mt-0.5">▸</span>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 数据管理 */}
            {activeTab === 'data' && (
              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-400 mb-4">管理本地缓存数据，数据库中的账号和报告记录不受影响。</p>
                {[
                  { label:'能力画像数据',   key:'careerProfile',         desc:'姓名、技能、能力维度等' },
                  { label:'匹配结果缓存',   key:'matchResult',           desc:'TOP3 岗位匹配分数' },
                  { label:'匹配流程状态',   key:'personPostMatchStatus', desc:'人岗匹配页面进度' },
                  { label:'MBTI 测评结果',  key:'mbtiResult',            desc:'性格测评分析结果' },
                  { label:'生涯报告缓存',   key:'lastReportData',        desc:'最近一次生成的报告' },
                ].map(item => {
                  const hasData = typeof window !== 'undefined' && !!sessionStorage.getItem(item.key);
                  return (
                    <div key={item.key} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${hasData?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-400'}`}>
                          {hasData?'有数据':'无数据'}
                        </span>
                        {hasData && (
                          <button onClick={() => { sessionStorage.removeItem(item.key); toast.show(`${item.label}已清除`); }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">清除</button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setShowClearDlg(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-2 border-2 border-dashed border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors">
                  <Trash2 className="w-4 h-4" /> 清除全部本地数据
                </button>
              </div>
            )}

            {/* 关于 */}
            {activeTab === 'about' && (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#111827] to-[#1e293b] rounded-xl text-white">
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-black text-lg">A</div>
                  <div>
                    <p className="font-bold text-base">职业规划智能体</p>
                    <p className="text-white/50 text-xs mt-0.5">大学生职业规划 AI 辅助系统</p>
                  </div>
                </div>
                {[
                  ['版本','v1.0.0'],['框架','Next.js 16 + TypeScript'],['AI接入','文心一言 / 通义千问 / ChatGLM'],
                  ['数据库','SQLite (Prisma ORM)'],['岗位数据','10,000+ 条真实招聘数据'],
                  ['赛题编号','第十七届服务外包大赛 A13'],['技术支持','陕西明杉数据科技有限公司'],
                ].map(([k,v]) => (
                  <div key={k} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-500">{k}</span>
                    <span className="text-sm font-medium text-slate-900">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
