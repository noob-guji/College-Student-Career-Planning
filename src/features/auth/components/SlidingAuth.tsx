"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, CheckCircle, XCircle, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────
interface Toast { id: number; type: "success" | "error"; msg: string }

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border backdrop-blur-sm ${
              t.type === "success" ? "bg-emerald-950/90 border-emerald-700/50 text-emerald-200" : "bg-red-950/90 border-red-700/50 text-red-200"
            }`}>
            {t.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = (type: Toast["type"], msg: string) => {
    const id = Date.now();
    setToasts(p => [...p, { id, type, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };
  return { toasts, success: (m: string) => add("success", m), error: (m: string) => add("error", m) };
}

// ─────────────────────────────────────────────
// 密码强度
// ─────────────────────────────────────────────
function PasswordStrength({ pwd }: { pwd: string }) {
  const checks = [
    { label: "≥ 8位", ok: pwd.length >= 8 },
    { label: "含数字", ok: /\d/.test(pwd) },
    { label: "含字母", ok: /[a-zA-Z]/.test(pwd) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["bg-red-500", "bg-amber-400", "bg-emerald-400"];
  const labels = ["弱", "一般", "强"];
  if (!pwd) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0,1,2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score-1] : "bg-white/10"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map(c => (
            <span key={c.label} className={`text-[10px] font-medium transition-colors ${c.ok ? "text-emerald-400" : "text-white/30"}`}>{c.label}</span>
          ))}
        </div>
        {score > 0 && <span className={`text-[10px] font-bold ${colors[score-1].replace("bg-","text-")}`}>{labels[score-1]}</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 输入框
// ─────────────────────────────────────────────
interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string; error?: string; showToggle?: boolean;
}
function Field({ label, error, showToggle, type, ...rest }: FieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="relative">
      <label className="block text-[11px] font-bold tracking-widest text-white/40 uppercase mb-2">{label}</label>
      <div className="relative">
        <input {...rest} type={isPassword && visible ? "text" : type}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 outline-none transition-all duration-200
            ${error ? "border-red-500/60 focus:border-red-400" : "border-white/10 focus:border-amber-500/60 focus:bg-white/8"}`} />
        {isPassword && showToggle && (
          <button type="button" tabIndex={-1} onClick={() => setVisible(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="mt-1.5 text-xs text-red-400 font-medium">{error}</motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// 登录表单
// ─────────────────────────────────────────────
function SignInForm({ onSuccess, onSwitch, toast }: { onSuccess:()=>void; onSwitch:()=>void; toast:ReturnType<typeof useToast> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{email?:string;password?:string}>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "请输入邮箱";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "邮箱格式不正确";
    if (!password) e.password = "请输入密码";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) { toast.error("邮箱或密码错误，请重试"); }
      else { toast.success("登录成功，正在跳转…"); onSuccess(); }
    } catch { toast.error("登录时发生错误，请稍后再试"); }
    finally { setLoading(false); }
  };

  return (
    <motion.form onSubmit={handleSubmit} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
      className="flex flex-col h-full justify-center gap-5">
      <div className="mb-2">
        <p className="text-[11px] font-bold tracking-[0.2em] text-amber-500/80 uppercase mb-2">Welcome back</p>
        <h2 className="text-3xl font-black text-white tracking-tight">欢迎回来</h2>
      </div>
      <Field label="电子邮箱" type="email" placeholder="your@email.com" value={email}
        onChange={e => { setEmail(e.target.value); setErrors(p=>({...p,email:undefined})); }} error={errors.email} />
      <div>
        <Field label="密码" type="password" placeholder="••••••••" showToggle value={password}
          onChange={e => { setPassword(e.target.value); setErrors(p=>({...p,password:undefined})); }} error={errors.password} />
      </div>
      <button type="submit" disabled={loading}
        className="group relative w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed mt-2">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />登录中…</> : <><span>登 录</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
      </button>
      <p className="text-center text-sm text-white/30">
        还没有账号？<button type="button" onClick={onSwitch} className="text-amber-400 font-semibold ml-1.5 hover:text-amber-300 transition-colors">立即注册</button>
      </p>
    </motion.form>
  );
}

// ─────────────────────────────────────────────
// 注册表单
// ─────────────────────────────────────────────
function SignUpForm({ onSuccess, onSwitch, toast }: { onSuccess:()=>void; onSwitch:()=>void; toast:ReturnType<typeof useToast> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{name?:string;email?:string;password?:string}>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "请输入姓名";
    if (!email) e.email = "请输入邮箱";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "邮箱格式不正确";
    if (!password) e.password = "请输入密码";
    else if (password.length < 8) e.password = "密码至少需要8位";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email, password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "注册失败，请重试"); }
      else { toast.success("注册成功！请使用账号登录"); onSuccess(); }
    } catch { toast.error("注册时发生错误，请稍后再试"); }
    finally { setLoading(false); }
  };

  return (
    <motion.form onSubmit={handleSubmit} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
      className="flex flex-col h-full justify-center gap-4">
      <div className="mb-1">
        <p className="text-[11px] font-bold tracking-[0.2em] text-amber-500/80 uppercase mb-2">Get started</p>
        <h2 className="text-3xl font-black text-white tracking-tight">创建账号</h2>
      </div>
      <Field label="姓名" type="text" placeholder="你的名字" value={name}
        onChange={e => { setName(e.target.value); setErrors(p=>({...p,name:undefined})); }} error={errors.name} />
      <Field label="电子邮箱" type="email" placeholder="your@email.com" value={email}
        onChange={e => { setEmail(e.target.value); setErrors(p=>({...p,email:undefined})); }} error={errors.email} />
      <div>
        <Field label="密码" type="password" placeholder="至少8位" showToggle value={password}
          onChange={e => { setPassword(e.target.value); setErrors(p=>({...p,password:undefined})); }} error={errors.password} />
        <PasswordStrength pwd={password} />
      </div>
      <button type="submit" disabled={loading}
        className="group relative w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed mt-1">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />注册中…</> : <><span>创建账号</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
      </button>
      <p className="text-center text-sm text-white/30">
        已有账号？<button type="button" onClick={onSwitch} className="text-amber-400 font-semibold ml-1.5 hover:text-amber-300 transition-colors">直接登录</button>
      </p>
    </motion.form>
  );
}

// ─────────────────────────────────────────────
// 修复水合错误：Particles 在 mount 后才生成随机值
// ─────────────────────────────────────────────
function Particles() {
  const [dots, setDots] = useState<Array<{id:number;x:number;y:number;size:number;delay:number;dur:number}>>([]);

  useEffect(() => {
    // 仅在客户端 mount 后生成，避免 SSR/Client 不一致
    setDots(Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 4,
      dur: Math.random() * 3 + 3,
    })));
  }, []);

  if (dots.length === 0) return null; // SSR 时渲染空

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map(d => (
        <div key={d.id} className="absolute rounded-full bg-amber-400/20 animate-pulse"
          style={{
            left: `${d.x}%`, top: `${d.y}%`,
            width: d.size, height: d.size,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.dur}s`,
          }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────────
export default function SlidingAuth() {
  const [mode, setMode] = useState<"signin"|"signup">("signin");
  const router = useRouter();
  const toast = useToast();

  const features = [
    { icon: "🎯", text: "10,000+ 岗位数据驱动匹配" },
    { icon: "🗺️", text: "可视化职业发展路径图谱" },
    { icon: "🤖", text: "AI 大模型个性化规划报告" },
    { icon: "📊", text: "多维能力画像精准分析" },
  ];

  return (
    <>
      <ToastContainer toasts={toast.toasts} />
      <div className="min-h-screen w-full flex items-center justify-center bg-[#080c14] font-sans overflow-hidden relative">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-amber-500/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/6 rounded-full blur-[100px] pointer-events-none" />
        <Particles />

        <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, ease:[0.16,1,0.3,1] }}
          className="relative w-full max-w-5xl mx-4 grid grid-cols-1 lg:grid-cols-2 min-h-[620px] rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)] border border-white/8">

          {/* 左侧表单 */}
          <div className="relative bg-[#0d1117] px-10 py-12 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-slate-950 font-black text-sm">A</div>
              <span className="text-white/70 font-semibold text-sm tracking-wide">职业规划智能体</span>
            </div>
            <AnimatePresence mode="wait">
              {mode === "signin"
                ? <SignInForm key="signin" onSuccess={() => setTimeout(() => router.push("/home"), 800)} onSwitch={() => setMode("signup")} toast={toast} />
                : <SignUpForm key="signup" onSuccess={() => setMode("signin")} onSwitch={() => setMode("signin")} toast={toast} />}
            </AnimatePresence>
          </div>

          {/* 右侧品牌 */}
          <div className="hidden lg:flex relative bg-gradient-to-br from-[#111827] via-[#0f1929] to-[#080c14] flex-col justify-between p-12 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 border border-amber-500/10 rounded-full translate-x-1/3 -translate-y-1/3" />
            <div className="absolute top-16 right-16 w-32 h-32 border border-amber-500/15 rounded-full" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full -translate-x-1/3 translate-y-1/3 blur-2xl" />
            <div className="absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize:'40px 40px' }} />

            <div className="relative z-10">
              <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3, duration:0.6 }}>
                <p className="text-amber-500/80 text-xs font-bold tracking-[0.3em] uppercase mb-4">Career Intelligence Platform</p>
                <h1 className="text-4xl font-black text-white leading-[1.15] mb-5">
                  定义你的<br /><span className="text-amber-400">数字职业</span><br />蓝图
                </h1>
                <p className="text-white/40 text-sm leading-relaxed max-w-xs">深度解析行业岗位数据，从技能、素养等多维度，为你精准定制专属职业发展路径。</p>
              </motion.div>
            </div>

            <div className="relative z-10 space-y-3">
              {features.map((f, i) => (
                <motion.div key={i} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4+i*0.08, duration:0.4 }}
                  className="flex items-center gap-3 bg-white/4 border border-white/6 rounded-xl px-4 py-3 backdrop-blur-sm">
                  <span className="text-base">{f.icon}</span>
                  <span className="text-white/60 text-xs font-medium">{f.text}</span>
                </motion.div>
              ))}
            </div>

            <div className="relative z-10 flex gap-8 pt-4 border-t border-white/6">
              {[['10,000+','岗位数据'],['46','职能大类'],['AI','智能规划']].map(([val,label]) => (
                <div key={label}>
                  <div className="text-amber-400 font-black text-lg">{val}</div>
                  <div className="text-white/30 text-[10px] font-medium mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
