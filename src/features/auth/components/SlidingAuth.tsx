"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SlidingAuth() {
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();

    // Handlers for successful form submission
    const handleSignInSuccess = () => {
        router.push('/home');
    };

    const handleSignUpSuccess = () => {
        setIsSignUp(false); // 注册成功后切换到登录界面
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans text-slate-700 overflow-hidden bg-[#f4f7f8]">
            <div className="relative w-full max-w-4xl min-h-[600px] bg-[#f4f7f8] rounded-3xl neu-flat overflow-hidden flex flex-col md:flex-row">

                {/* Mobile View: Vertical Stacked or Simple Toggle (Graceful Degradation) */}
                <div className="md:hidden flex flex-col w-full h-full p-8 transition-all duration-700 ease-in-out z-10">
                    <div className="flex justify-center mb-6 bg-neu-bg p-1 rounded-full neu-pressed">
                        <button
                            onClick={() => setIsSignUp(false)}
                            className={`flex-1 py-2 rounded-full font-semibold transition-all duration-300 ${!isSignUp ? 'neu-flat text-[#F59E0B]' : 'text-[#94A3B8]'}`}
                        >
                            登录
                        </button>
                        <button
                            onClick={() => setIsSignUp(true)}
                            className={`flex-1 py-2 rounded-full font-semibold transition-all duration-300 ${isSignUp ? 'neu-flat text-[#F59E0B]' : 'text-[#94A3B8]'}`}
                        >
                            注册
                        </button>
                    </div>

                    <div className="relative flex-1 min-h-[450px]">
                        <div className={`absolute inset-0 transition-all duration-700 ease-in-out transform ${isSignUp ? 'opacity-0 translate-x-8 pointer-events-none' : 'opacity-100 translate-x-0'}`}>
                            <SignInForm onSuccess={handleSignInSuccess} />
                        </div>
                        <div className={`absolute inset-0 transition-all duration-700 ease-in-out transform ${!isSignUp ? 'opacity-0 -translate-x-8 pointer-events-none' : 'opacity-100 translate-x-0'}`}>
                            <SignUpForm onSuccess={handleSignUpSuccess} />
                        </div>
                    </div>
                </div>

                {/* Desktop View: Sliding Dual Panel */}
                <div className="hidden md:block absolute inset-0 w-full h-full overflow-hidden">

                    {/* Sign In Container */}
                    <div
                        className={`absolute top-0 left-0 w-1/2 h-full p-12 flex flex-col justify-center transition-all duration-700 ease-in-out 
            ${isSignUp ? "translate-x-full opacity-0 z-10 pointer-events-none" : "translate-x-0 opacity-100 z-20"}`}
                    >
                        <SignInForm onSuccess={handleSignInSuccess} />
                    </div>

                    {/* Sign Up Container */}
                    <div
                        className={`absolute top-0 left-0 w-1/2 h-full p-12 flex flex-col justify-center transition-all duration-700 ease-in-out 
            ${isSignUp ? "translate-x-full opacity-100 z-20" : "translate-x-0 opacity-0 z-10 pointer-events-none"}`}
                    >
                        <SignUpForm onSuccess={handleSignUpSuccess} />
                    </div>

                    {/* Sliding Overlay Container */}
                    <div
                        className={`absolute top-0 left-0 w-1/2 h-full bg-[#111827] text-white transition-transform duration-700 ease-in-out z-30 shadow-2xl overflow-hidden
            ${isSignUp ? "translate-x-0 rounded-r-3xl" : "translate-x-full rounded-l-3xl"}`}
                    >
                        <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-12">

                            {/* Overlay Content: Left (Visible when isSignUp is true) -> Welcome Back */}
                            <div
                                className={`absolute inset-0 flex flex-col items-center justify-center px-12 text-center transition-all duration-700 ease-in-out transform
                ${isSignUp ? "translate-x-0 opacity-100 delay-100 z-10" : "-translate-x-20 opacity-0 pointer-events-none z-0"}`}
                            >
                                <h2 className="text-4xl font-bold mb-4 text-white">欢迎回来！</h2>
                                <p className="mb-8 text-[#94A3B8] font-medium">请输入您的登录信息，继续专属职业进阶之旅</p>
                                <button
                                    type="button"
                                    onClick={() => setIsSignUp(false)}
                                    className="px-10 py-3 rounded-full border-2 border-[#F59E0B] text-[#F59E0B] font-bold tracking-wider hover:bg-[#F59E0B] hover:text-[#111827] transition-colors duration-300 shadow-lg pointer-events-auto"
                                >
                                    登 录
                                </button>
                            </div>

                            {/* Overlay Content: Right (Visible when isSignUp is false) -> Hello Friend */}
                            <div
                                className={`absolute inset-0 flex flex-col items-center justify-center px-12 text-center transition-all duration-700 ease-in-out transform
                ${isSignUp ? "translate-x-20 opacity-0 pointer-events-none z-0" : "translate-x-0 opacity-100 delay-100 z-10"}`}
                            >
                                <h2 className="text-4xl font-bold mb-4 text-white">您好，朋友！</h2>
                                <p className="mb-8 text-[#94A3B8] font-medium">输入个人信息，开启量身定制的进阶之旅</p>
                                <button
                                    type="button"
                                    onClick={() => setIsSignUp(true)}
                                    className="px-10 py-3 rounded-full border-2 border-[#F59E0B] text-[#F59E0B] font-bold tracking-wider hover:bg-[#F59E0B] hover:text-[#111827] transition-colors duration-300 shadow-lg pointer-events-auto"
                                >
                                    注 册
                                </button>
                            </div>

                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("邮箱或密码错误");
            } else {
                onSuccess();
            }
        } catch (err) {
            setError("登录时发生错误，请稍后再试");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col items-center justify-center w-full h-full px-8">
            <h1 className="text-4xl font-bold mb-10 text-[#111827]">欢迎登录</h1>

            {error && <div className="w-full p-3 mb-4 text-sm text-red-500 bg-red-100 rounded-lg">{error}</div>}

            <div className="w-full space-y-6 mb-8">
                <InputField
                    type="email"
                    placeholder="电子邮箱"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <InputField
                    type="password"
                    placeholder="密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className={`px-12 py-3 rounded-full bg-neu-bg text-[#F59E0B] font-bold tracking-wider 
        neu-flat active:neu-pressed hover:brightness-95 transition-all duration-300 pointer-events-auto ${loading ? 'opacity-50' : ''}`}
            >
                {loading ? '正在登录...' : '登 录'}
            </button>
        </form>
    );
}

function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "注册失败");
            } else {
                alert("注册成功！请登录。");
                onSuccess();
            }
        } catch (err) {
            setError("注册时发生错误，请稍后再试");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col items-center justify-center w-full h-full px-8">
            <h1 className="text-4xl font-bold mb-10 text-[#111827]">创建账号</h1>

            {error && <div className="w-full p-3 mb-4 text-sm text-red-500 bg-red-100 rounded-lg">{error}</div>}

            <div className="w-full space-y-6 mb-12">
                <InputField
                    type="text"
                    placeholder="姓名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <InputField
                    type="email"
                    placeholder="电子邮箱"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <InputField
                    type="password"
                    placeholder="密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className={`px-12 py-3 rounded-full bg-neu-bg text-[#F59E0B] font-bold tracking-wider 
        neu-flat active:neu-pressed hover:brightness-95 transition-all duration-300 pointer-events-auto ${loading ? 'opacity-50' : ''}`}
            >
                {loading ? '正在注册...' : '注 册'}
            </button>
        </form>
    );
}

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
}

function InputField({ error, className, ...props }: InputFieldProps) {
    return (
        <div className="w-full flex flex-col text-left">
            <input
                {...props}
                className={`w-full px-5 py-4 rounded-xl text-[#111827] placeholder-[#94A3B8] font-medium
      neu-pressed focus:outline-none transition-all duration-300
      ${error ? 'bg-red-50/50 ring-1 ring-red-400/50 focus:ring-red-400/60' : 'bg-neu-bg focus:ring-2 focus:ring-[#F59E0B]/40'}
      ${className || ''}`}
            />
            {error && <span className="text-red-500 text-sm mt-1.5 ml-2 font-medium">{error}</span>}
        </div>
    );
}
