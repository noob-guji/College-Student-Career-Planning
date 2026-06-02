import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─────────────────────────────────────────────
// Prompt 构建
// ─────────────────────────────────────────────
function buildPrompt(req: any): string {
  const { targetRole, matchScore, userProfile } = req;
  const capStr = (userProfile.capabilities ?? [])
    .map((c: any) => `${c.subject}:${c.score}`)
    .join(', ');

  return `你是一名专业的职业规划顾问。请严格按下方 JSON 格式为以下学生生成职业生涯发展报告，不要包含 markdown 代码块，直接输出 JSON。

学生信息：
- 专业：${userProfile.major || '计算机科学'}
- 年级：${userProfile.grade || '大三'}
- 核心技能：${(userProfile.skills ?? []).join('、') || '待填写'}
- 能力自评：${capStr || '逻辑能力:75, 沟通表达:75, 执行落地:75'}
- 目标岗位：${targetRole}
- 综合匹配度：${matchScore}%

输出格式（直接输出 JSON，无任何其他文字）：
{
  "conclusion": {
    "summary": "职业探索与匹配结论（100-150字）",
    "targetRole": "${targetRole}",
    "matchScore": ${matchScore},
    "strengths": ["优势1", "优势2", "优势3"],
    "gaps": ["待提升点1", "待提升点2"]
  },
  "goals": {
    "shortTerm": { "period": "1年内", "objectives": ["目标1", "目标2", "目标3"], "milestones": ["里程碑1", "里程碑2"] },
    "midTerm":   { "period": "3-5年", "objectives": ["目标1", "目标2"], "milestones": ["里程碑1", "里程碑2"] }
  },
  "trends": {
    "marketDemand": "市场需求分析（80字）",
    "salaryRange":  "薪资区间",
    "growthRate":   "增长率描述",
    "hotSkills":    ["技能1", "技能2", "技能3"],
    "insights":     "趋势洞察（80字）"
  },
  "pathway": {
    "steps": [
      {"stage":"阶段名","role":"职位名","duration":"时长","description":"描述"},
      {"stage":"阶段名","role":"职位名","duration":"时长","description":"描述"},
      {"stage":"阶段名","role":"职位名","duration":"时长","description":"描述"}
    ],
    "alternativePaths": [{"name":"转型路径名","reason":"推荐理由"}]
  },
  "actionPlan": {
    "phases": [
      {"phase":"第一阶段","duration":"0-6个月","learning":["任务1","任务2"],"practice":["任务1"],"certificates":["证书1"]},
      {"phase":"第二阶段","duration":"6-18个月","learning":["任务1","任务2"],"practice":["任务1"],"certificates":["证书1"]}
    ]
  },
  "evaluation": {
    "checkpoints": [
      {"time":"3个月","metrics":["指标1","指标2"],"adjustTrigger":"触发条件"},
      {"time":"6个月","metrics":["指标1","指标2"],"adjustTrigger":"触发条件"},
      {"time":"1年",  "metrics":["指标1","指标2"],"adjustTrigger":"触发条件"}
    ]
  }
}`;
}

// ─────────────────────────────────────────────
// 各 Provider 调用（复用 chat route 相同逻辑）
// ─────────────────────────────────────────────
async function callLLM(prompt: string): Promise<string> {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();

  if (provider === 'mock') {
    throw new Error('__mock__'); // 走 mock 分支
  }

  // 文心一言 — 单独处理（非 OpenAI 兼容格式）
  if (provider === 'wenxin' || provider === 'ernie') {
    const apiKey    = process.env.WENXIN_API_KEY!;
    const secretKey = process.env.WENXIN_SECRET_KEY!;
    const tokenRes  = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );
    const { access_token } = await tokenRes.json();
    const MODEL_PATH: Record<string, string> = {
      'ernie-speed': 'ernie_speed', 'ernie-lite': 'ernie-lite-8k',
      'ernie-3.5': 'completions',   'ernie-4.0': 'completions_pro',
      'ernie_speed': 'ernie_speed',
    };
    const modelPath = MODEL_PATH[(process.env.AI_MODEL || 'ernie-speed').toLowerCase()] ?? 'ernie_speed';
    const res  = await fetch(
      `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${modelPath}?access_token=${access_token}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }) }
    );
    const data = await res.json();
    if (data.error_code) throw new Error(data.error_msg);
    return data.result;
  }

  // 通义千问 / OpenAI 兼容 / ChatGLM / 讯飞
  const PROVIDER_CONFIG: Record<string, { url: string; key: string; model: string }> = {
    tongyi:   { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', key: process.env.DASHSCOPE_API_KEY!, model: process.env.AI_MODEL || 'qwen-plus' },
    qwen:     { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', key: process.env.DASHSCOPE_API_KEY!, model: process.env.AI_MODEL || 'qwen-plus' },
    chatglm:  { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',              key: process.env.ZHIPU_API_KEY!,     model: process.env.AI_MODEL || 'glm-4' },
    zhipu:    { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',              key: process.env.ZHIPU_API_KEY!,     model: process.env.AI_MODEL || 'glm-4' },
    xunfei:   { url: 'https://spark-api-open.xf-yun.com/v1/chat/completions',              key: process.env.XUNFEI_API_KEY!,    model: process.env.AI_MODEL || 'generalv3.5' },
    spark:    { url: 'https://spark-api-open.xf-yun.com/v1/chat/completions',              key: process.env.XUNFEI_API_KEY!,    model: process.env.AI_MODEL || 'generalv3.5' },
    openai:   { url: `${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`, key: process.env.OPENAI_API_KEY!, model: process.env.AI_MODEL || 'gpt-4o-mini' },
    deepseek: { url: `${process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1'}/chat/completions`, key: process.env.OPENAI_API_KEY!, model: process.env.AI_MODEL || 'deepseek-chat' },
  };

  const cfg = PROVIDER_CONFIG[provider];
  if (!cfg) throw new Error(`Unknown provider: ${provider}`);

  const res  = await fetch(cfg.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.key}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: 0.7,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `${provider} 调用失败`);
  return data.choices[0].message.content;
}

// ─────────────────────────────────────────────
// Mock 数据（保底）
// ─────────────────────────────────────────────
function mockReport(targetRole: string, matchScore: number): any {
  return {
    conclusion: {
      summary: `综合能力画像数据与人岗匹配算法分析，您的综合能力与目标岗位「${targetRole}」高度契合，综合匹配度达 ${matchScore}%。建议优先布局该方向，结合行动计划逐步夯实核心竞争力。`,
      targetRole, matchScore,
      strengths: ['逻辑分析能力突出', '沟通表达与跨部门协作能力强', '学习能力快、适应性佳'],
      gaps: ['需补充行业专业认证', '建议积累更多实战项目经验'],
    },
    goals: {
      shortTerm: { period: '1年内', objectives: ['获取目标岗位实习机会', '完成核心技能体系搭建', '产出可展示的作品集'], milestones: ['实习 offer 落地（3个月）', '独立完成首个项目交付（9个月）'] },
      midTerm:   { period: '3-5年', objectives: ['晋升中级/高级职位', '主导核心业务模块'], milestones: ['独立负责 DAU 过万功能（2年）', '带领 2-3 人小组（4年）'] },
    },
    trends: {
      marketDemand: `${targetRole}岗位在数字化转型背景下持续保持旺盛需求，AI融合趋势带来新的职业增量空间。`,
      salaryRange: '应届-2年：15K-25K；3-5年：25K-45K（一线城市）',
      growthRate: '年均市场需求增长约15-20%',
      hotSkills: ['AI工具链整合', '数据驱动决策', '敏捷开发(Scrum)'],
      insights: '未来3年具备 AI 工具使用能力的复合型人才将获得显著竞争优势，建议提前布局相关方向。',
    },
    pathway: {
      steps: [
        { stage: '起步期', role: '助理/实习生', duration: '0-1年', description: '参与基础工作，建立方法论体系，积累行业认知。' },
        { stage: '成长期', role: '初级从业者', duration: '1-3年', description: '独立负责单一模块，完成从执行到交付的全流程。' },
        { stage: '精进期', role: '中级从业者', duration: '3-5年', description: '主导核心业务线，形成数据驱动的专业方法论。' },
      ],
      alternativePaths: [{ name: '转型相关岗位', reason: '现有能力可无缝迁移，3-6个月可完成过渡' }],
    },
    actionPlan: {
      phases: [
        { phase: '第一阶段', duration: '0-6个月', learning: ['系统学习领域核心知识', '掌握主流工具链'], practice: ['完成1个完整项目', '参加行业交流活动'], certificates: ['相关基础认证'] },
        { phase: '第二阶段', duration: '6-18个月', learning: ['深入学习进阶方向', '关注 AI 融合趋势'], practice: ['获取目标公司实习机会', '主导一次用户研究或技术攻关'], certificates: ['进阶认证（可选）'] },
      ],
    },
    evaluation: {
      checkpoints: [
        { time: '3个月', metrics: ['完成基础技能验证', '产出1份完整的项目成果'], adjustTrigger: '若兴趣减弱，考虑探索相邻方向' },
        { time: '6个月', metrics: ['获得实习/实践机会', '技能测评达标'], adjustTrigger: '根据实践反馈动态调整学习方向' },
        { time: '1年',  metrics: ['积累6个月以上实战经验', '建立个人作品集'], adjustTrigger: '评估是否需要深耕或跨方向拓展' },
      ],
    },
  };
}

// ─────────────────────────────────────────────
// POST /api/ai/generate-report
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetRole = '产品经理', matchScore = 85, userProfile = {}, userId } = body;

    const prompt = buildPrompt({ targetRole, matchScore, userProfile });

    let reportData: any;

    try {
      const raw  = await callLLM(prompt);
      // 提取 JSON（模型可能带有多余文字）
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('返回格式异常');
      reportData = JSON.parse(match[0]);
    } catch (e: any) {
      if (e.message !== '__mock__') {
        console.error('LLM generate-report error:', e.message, '→ 降级 mock');
      }
      reportData = mockReport(targetRole, matchScore);
    }

    // 存库
    const saved = await prisma.careerReport.create({
      data: {
        userId: userId || 'anonymous',
        targetRole,
        matchScore,
        conclusionJson:  JSON.stringify(reportData.conclusion),
        goalsJson:       JSON.stringify(reportData.goals),
        trendsJson:      JSON.stringify(reportData.trends),
        pathwayJson:     JSON.stringify(reportData.pathway),
        actionPlanJson:  JSON.stringify(reportData.actionPlan),
        evaluationJson:  JSON.stringify(reportData.evaluation),
        status: 'complete',
      },
    }).catch(() => ({ id: `tmp_${Date.now()}` }));

    return NextResponse.json({ reportId: saved.id, data: reportData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '报告生成失败' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('userId');
  try {
    const reports = await prisma.careerReport.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, title: true, targetRole: true, matchScore: true, status: true, createdAt: true },
    });
    return NextResponse.json({ reports });
  } catch {
    return NextResponse.json({ reports: [] });
  }
}
