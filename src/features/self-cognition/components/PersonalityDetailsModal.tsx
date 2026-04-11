'use client';

import { X, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PersonalityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  typeId?: string | null; // 'nt' | 'nf' | 'sj' | 'sp'
}

// ─────────────────────────────────────────────
// 四大性格族群完整数据
// ─────────────────────────────────────────────
const PERSONALITY_DATA: Record<string, {
  badge: string; title: string; color: string; bg: string; border: string; textColor: string;
  tagline: string; description: string;
  types: Array<{ code:string; name:string; nickname:string; desc:string }>;
  careerAdvantages: string[];
  careerSuggestions: string[];
  learningStyle: string;
  teamRole: string;
  stressResponse: string;
}> = {
  nt: {
    badge:'NT', title:'分析家', tagline:'用逻辑重塑世界的战略家',
    color:'text-blue-700', bg:'bg-blue-50', border:'border-blue-200', textColor:'text-blue-900',
    description:'分析家族群由四种善于思考、追求创新的性格类型组成。他们以逻辑见长，热爱知识探索，擅长发现事物背后的规律与可能性。在职场中，他们往往是战略制定者和问题解决专家。',
    types: [
      { code:'INTJ', name:'建筑师',   nickname:'独立战略家', desc:'极具远见的规划者，擅长将复杂系统转化为清晰执行路径' },
      { code:'INTP', name:'逻辑学家', nickname:'逻辑探索者', desc:'对理论和抽象概念有无穷热情，善于发现他人忽视的细节' },
      { code:'ENTJ', name:'指挥官',   nickname:'天生领导者', desc:'果断自信，擅长带领团队实现宏大目标' },
      { code:'ENTP', name:'辩论家',   nickname:'创意挑战者', desc:'思维敏捷，热爱挑战既有规则，擅长头脑风暴' },
    ],
    careerAdvantages: ['战略规划与系统设计','数据分析与逻辑推理','独立解决复杂问题','技术架构与创新研究'],
    careerSuggestions: ['软件架构师','数据科学家','战略咨询顾问','研究工程师','产品架构师','量化分析师'],
    learningStyle: '偏好系统性、理论性学习，喜欢从底层原理入手，追求知识的完整性和深度而非广度',
    teamRole: '通常担任技术顾问或战略规划者，提供深度分析和创新方案，但需注意避免过于强调细节导致沟通不畅',
    stressResponse: '在压力下倾向于独立钻研，可能会变得更加孤僻，需要有意识地保持与团队的沟通',
  },
  nf: {
    badge:'NF', title:'外交家', tagline:'用同理心连接世界的理想主义者',
    color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200', textColor:'text-emerald-900',
    description:'外交家族群由四种富有同理心、追求意义的性格类型组成。他们对人际关系高度敏感，善于理解他人需求，致力于让世界变得更美好。在职场中，他们往往是团队粘合剂和文化建设者。',
    types: [
      { code:'INFJ', name:'提倡者',   nickname:'深邃理想家', desc:'罕见的洞察力与强烈的使命感，致力于启发他人成长' },
      { code:'INFP', name:'调停者',   nickname:'诗意创造者', desc:'内心世界丰富，追求真实与意义，擅长创意表达' },
      { code:'ENFJ', name:'主人公',   nickname:'天生激励者', desc:'极具感召力，善于激发他人潜能，天生的团队领袖' },
      { code:'ENFP', name:'竞选者',   nickname:'热情探索者', desc:'充满活力与创意，善于建立联系，热爱新的可能性' },
    ],
    careerAdvantages: ['人际沟通与情感理解','团队激励与文化建设','创意内容与叙事表达','用户研究与需求洞察'],
    careerSuggestions: ['产品经理','UX研究员','HR/人才发展','品牌策划','内容运营','职业咨询顾问'],
    learningStyle: '偏好意义驱动型学习，通过故事和案例更容易理解概念，喜欢探讨"为什么"而不仅是"如何做"',
    teamRole: '通常是团队的情绪稳定器和文化建设者，善于发现每个人的潜力，帮助化解冲突和增强凝聚力',
    stressResponse: '在压力下容易过度共情，承担他人情绪负担，需要设定健康边界并适时独处恢复能量',
  },
  sj: {
    badge:'SJ', title:'哨兵', tagline:'用可靠与秩序守护团队的基石',
    color:'text-amber-700', bg:'bg-amber-50', border:'border-amber-200', textColor:'text-amber-900',
    description:'哨兵族群由四种务实、可靠、注重规则的性格类型组成。他们是组织和社会的稳定力量，善于维护秩序，履行责任。在职场中，他们往往是项目执行的核心支柱和流程管理专家。',
    types: [
      { code:'ISTJ', name:'物流师',   nickname:'可靠执行者', desc:'极具责任心，严守规则，是完成复杂任务的可靠力量' },
      { code:'ISFJ', name:'守卫者',   nickname:'无声奉献者', desc:'细心体贴，默默付出，是团队中不可或缺的支持力量' },
      { code:'ESTJ', name:'总经理',   nickname:'天生管理者', desc:'条理分明，善于组织管理，能将混乱迅速变为有序' },
      { code:'ESFJ', name:'执政官',   nickname:'社交润滑剂', desc:'热情合群，极度关心他人，善于维护和谐的人际关系' },
    ],
    careerAdvantages: ['流程管理与质量控制','项目执行与风险管控','规范制定与落地推行','客户维护与服务支持'],
    careerSuggestions: ['项目经理','质量管理工程师','运营主管','财务分析师','行政管理','合规专员'],
    learningStyle: '偏好结构化、分步骤的学习方式，对有实际应用价值的知识更感兴趣，喜欢有明确目标和评估标准',
    teamRole: '通常是项目执行的核心力量，确保计划落地、流程规范，在关键时刻保持冷静和稳定',
    stressResponse: '在压力下倾向于更加严格地遵守程序和规则，可能变得过于僵硬，需要适时灵活调整',
  },
  sp: {
    badge:'SP', title:'探险家', tagline:'用灵活与激情拥抱每个当下',
    color:'text-purple-700', bg:'bg-purple-50', border:'border-purple-200', textColor:'text-purple-900',
    description:'探险家族群由四种灵活、实际、享受当下的性格类型组成。他们对外部世界高度敏感，善于快速适应变化，在实践中学习和成长。在职场中，他们往往是危机处理专家和创意执行者。',
    types: [
      { code:'ISTP', name:'鉴赏家',   nickname:'沉默实干家', desc:'冷静分析，动手能力强，善于在混乱中快速找到解决方案' },
      { code:'ISFP', name:'探险家',   nickname:'艺术感知者', desc:'审美独特，富有创造力，以温和方式表达对世界的热爱' },
      { code:'ESTP', name:'企业家',   nickname:'行动派冒险者', desc:'精力充沛，大胆果断，善于把握机会和说服他人' },
      { code:'ESFP', name:'表演者',   nickname:'快乐能量源', desc:'乐观开朗，感染力强，擅长活跃氛围和即兴发挥' },
    ],
    careerAdvantages: ['危机应对与快速决策','动手实践与工具操作','销售谈判与即兴表达','艺术创作与美学设计'],
    careerSuggestions: ['销售经理','实施工程师','创意设计师','市场活动策划','技术支持工程师','创业者'],
    learningStyle: '偏好边做边学的实践型学习，对抽象理论兴趣有限，喜欢通过真实项目和即时反馈来掌握技能',
    teamRole: '通常是团队的行动催化剂，在执行阶段发挥关键作用，善于在紧急情况下快速响应和灵活处置',
    stressResponse: '在压力下倾向于采取即时行动，可能忽略长期规划，需要有意识地放慢节奏、全面评估后再决策',
  },
};

export default function PersonalityDetailsModal({ isOpen, onClose, typeId }: PersonalityDetailsModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted || !typeId) return null;

  const data = PERSONALITY_DATA[typeId];
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity:0, scale:0.95, y:12 }}
        animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.95 }}
        className="relative w-full max-w-3xl max-h-[88vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20"
      >
        {/* Header */}
        <div className={`px-8 py-6 ${data.bg} border-b ${data.border} shrink-0`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-xs font-black tracking-[0.2em] uppercase px-2.5 py-1 rounded-full ${data.bg} ${data.color} border ${data.border}`}>
                  {data.badge}
                </span>
                <h2 className={`text-2xl font-black ${data.textColor}`}>{data.title}</h2>
              </div>
              <p className={`text-sm font-semibold ${data.color} opacity-80`}>{data.tagline}</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/60 hover:bg-white rounded-full transition-colors text-slate-500 hover:text-slate-900 shadow-sm">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-7 no-scrollbar">
          {/* 简介 */}
          <p className="text-slate-600 text-sm leading-relaxed">{data.description}</p>

          {/* 四种子类型 */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-3">包含的性格类型</h3>
            <div className="grid grid-cols-2 gap-3">
              {data.types.map(t => (
                <div key={t.code} className={`p-3.5 rounded-xl border ${data.border} ${data.bg}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-black text-base ${data.color}`}>{t.code}</span>
                    <span className="text-slate-700 font-semibold text-sm">{t.name}</span>
                    <span className={`ml-auto text-[10px] ${data.color} font-medium`}>{t.nickname}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 职场优势 */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-3">职场核心优势</h3>
            <div className="flex flex-wrap gap-2">
              {data.careerAdvantages.map((a,i) => (
                <span key={i} className={`text-xs px-3 py-1.5 rounded-full ${data.bg} ${data.color} border ${data.border} font-medium`}>
                  ✦ {a}
                </span>
              ))}
            </div>
          </div>

          {/* 推荐岗位 */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-3">适合的岗位方向</h3>
            <div className="grid grid-cols-3 gap-2">
              {data.careerSuggestions.map((s,i) => (
                <div key={i} className="flex items-center gap-1.5 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <ChevronRight className={`w-3 h-3 shrink-0 ${data.color}`} />
                  <span className="text-xs text-slate-700 font-medium">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 学习风格 / 团队角色 / 压力反应 */}
          <div className="grid grid-cols-1 gap-3">
            {[
              { label:'📚 学习风格',  content: data.learningStyle },
              { label:'👥 团队角色',  content: data.teamRole },
              { label:'⚡ 压力反应',  content: data.stressResponse },
            ].map(item => (
              <div key={item.label} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-700 mb-1.5">{item.label}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{item.content}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
