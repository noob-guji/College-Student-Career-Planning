import { ArrowRight, Search, Cpu, Share2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* --- 第一屏：Hero --- */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-50 via-white to-white">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-600 text-sm font-bold mb-8 animate-bounce">
          <Cpu size={16} /> 基于明杉科技 AI 大模型驱动
        </div>
        <h1 className="text-6xl font-black text-slate-900 mb-6 tracking-tight">
          定义你的 <span className="text-orange-500">数字职业蓝图</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mb-12">
          深度解析 10,000+ 行业岗位，从技能、素养等 4 大维度 ，
          为您精准定制专属的职业晋升与换岗路径。
        </p>
        <div className="flex gap-6">
          <button className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2 shadow-xl shadow-slate-200">
            开启智能规划 <ArrowRight />
          </button>
          <button className="border border-slate-200 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-colors">
            探索岗位图谱
          </button>
        </div>
      </section>

      {/* --- 第二屏：核心功能预演 (简约三格) --- */}
      <section className="py-24 bg-slate-50 px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="w-14 h-14 bg-white shadow-sm rounded-2xl flex items-center justify-center text-orange-500">
              <Search size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">岗位深度画像</h3>
            <p className="text-slate-500 leading-relaxed">
              基于 100 余个核心岗位类别 ，细化拆解专业技能、创新能力等 10+ 项关键画像指标 [cite: 53]。
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-14 h-14 bg-white shadow-sm rounded-2xl flex items-center justify-center text-blue-500">
              <Share2 size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">职业血缘关联</h3>
            <p className="text-slate-500 leading-relaxed">
              不仅仅是晋升，我们通过算法关联岗位血缘，为您提供至少 2 条以上的科学换岗路径 [cite: 59]。
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-14 h-14 bg-white shadow-sm rounded-2xl flex items-center justify-center text-green-500">
              <Cpu size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">量化匹配分析</h3>
            <p className="text-slate-500 leading-relaxed">
              匹配度不只是百分比。我们从职业技能、素养等 4 个维度进行多维度打分分析 。
            </p>
          </div>
        </div>
      </section>

      {/* --- 页脚：命题背书 --- */}
      <footer className="py-12 border-t border-slate-100 px-8 text-center text-slate-400 text-sm">
        <p>第十七届中国大学生服务外包创新创业大赛 A13 赛题 [cite: 1, 2]</p>
        <p className="mt-2 text-slate-300 tracking-widest">陕西明杉数据科技有限公司 技术支持 [cite: 2, 17]</p>
      </footer>
    </div>
  );
}