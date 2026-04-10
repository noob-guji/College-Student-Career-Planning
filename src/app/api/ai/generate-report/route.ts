import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ============================================================
// 功能5：生涯蓝图 — 职业生涯发展报告生成接口
// POST /api/ai/generate-report
// ============================================================

interface ReportRequest {
  userId?: string;
  targetRole: string;
  matchScore: number;
  userProfile: {
    name?: string;
    major?: string;
    grade?: string;
    skills: string[];
    capabilities: Array<{ subject: string; score: number }>;
    mbtiType?: string;
  };
  matchData?: Array<{ subject: string; userScore: number; postScore: number }>;
}

// 构建报告生成提示词
function buildReportPrompt(req: ReportRequest): string {
  const { targetRole, matchScore, userProfile, matchData } = req;
  const capSummary = userProfile.capabilities
    .map(c => `${c.subject}:${c.score}`)
    .join(', ');

  return `你是一名专业的职业规划顾问，请为以下学生生成一份完整的职业生涯发展报告。

【学生基本信息】
- 专业：${userProfile.major || '计算机科学'}
- 年级：${userProfile.grade || '大三'}
- 核心技能：${userProfile.skills.join('、')}
- 能力雷达：${capSummary}
${userProfile.mbtiType ? `- MBTI类型：${userProfile.mbtiType}` : ''}

【人岗匹配结果】
- 目标岗位：${targetRole}
- 综合匹配度：${matchScore}%

请严格按照以下JSON格式生成报告，不要包含任何markdown代码块，直接输出JSON：
{
  "conclusion": {
    "summary": "职业探索与匹配结论的概要段落（100-150字）",
    "targetRole": "${targetRole}",
    "matchScore": ${matchScore},
    "strengths": ["优势1", "优势2", "优势3"],
    "gaps": ["待提升点1", "待提升点2"]
  },
  "goals": {
    "shortTerm": {
      "period": "1年内",
      "objectives": ["目标1", "目标2", "目标3"],
      "milestones": ["里程碑1", "里程碑2"]
    },
    "midTerm": {
      "period": "3-5年",
      "objectives": ["目标1", "目标2"],
      "milestones": ["里程碑1", "里程碑2"]
    }
  },
  "trends": {
    "marketDemand": "行业市场需求分析（80-100字）",
    "salaryRange": "薪资区间描述",
    "growthRate": "岗位增长率描述",
    "hotSkills": ["热门技能1", "热门技能2", "热门技能3"],
    "insights": "未来趋势洞察（100字）"
  },
  "pathway": {
    "steps": [
      {"stage": "阶段名", "role": "职位名", "duration": "时间", "description": "描述"},
      {"stage": "阶段名", "role": "职位名", "duration": "时间", "description": "描述"},
      {"stage": "阶段名", "role": "职位名", "duration": "时间", "description": "描述"}
    ],
    "alternativePaths": [
      {"name": "转型路径名", "reason": "推荐理由"}
    ]
  },
  "actionPlan": {
    "phases": [
      {
        "phase": "第一阶段",
        "duration": "0-6个月",
        "learning": ["学习任务1", "学习任务2"],
        "practice": ["实践任务1", "实践任务2"],
        "certificates": ["证书或认证1"]
      },
      {
        "phase": "第二阶段",
        "duration": "6-18个月",
        "learning": ["学习任务1", "学习任务2"],
        "practice": ["实践任务1", "实践任务2"],
        "certificates": ["证书或认证1"]
      }
    ]
  },
  "evaluation": {
    "checkpoints": [
      {"time": "3个月", "metrics": ["指标1", "指标2"], "adjustTrigger": "调整触发条件"},
      {"time": "6个月", "metrics": ["指标1", "指标2"], "adjustTrigger": "调整触发条件"},
      {"time": "1年", "metrics": ["指标1", "指标2"], "adjustTrigger": "调整触发条件"}
    ]
  }
}`;
}

// 调用 LLM 生成报告
async function generateWithLLM(prompt: string): Promise<any> {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();

  if (provider === 'mock') {
    // Mock 生成报告数据
    await new Promise(r => setTimeout(r, 2000));
    return {
      conclusion: {
        summary: '综合您的能力雷达数据与人岗匹配算法分析，您在沟通表达（90分）、抗压能力（95分）方面展现出突出优势。目标岗位"产品经理"与您的逻辑分析能力和用户需求洞察潜质高度契合，综合匹配度达到92%，属于强推荐优先级。',
        targetRole: '产品经理',
        matchScore: 92,
        strengths: ['沟通表达能力突出', '逻辑分析与问题拆解能力强', '抗压能力极强，适应高节奏工作'],
        gaps: ['需补强数据分析与SQL技能', '建议积累跨部门项目协作经验'],
      },
      goals: {
        shortTerm: {
          period: '1年内',
          objectives: ['通过产品经理助理实习积累核心业务经验', '系统学习用户研究方法论与竞品分析框架', '完成至少1个完整产品需求文档(PRD)的独立输出'],
          milestones: ['实习offer 落地（第3个月）', '独立主导第一个需求评审会（第8个月）'],
        },
        midTerm: {
          period: '3-5年',
          objectives: ['晋升为中级产品经理，负责核心业务模块', '主导至少2个从0到1的产品孵化项目'],
          milestones: ['独立负责DAU过万的功能模块（第2年）', '带领2-3人小组推动版本迭代（第4年）'],
        },
      },
      trends: {
        marketDemand: '产品经理岗位在互联网、金融科技、企业SaaS等行业持续保持旺盛需求。随着AI融入产品开发流程，AI产品经理方向尤为热门，企业对"懂技术+懂业务"的复合型PM需求大幅增加。',
        salaryRange: '应届-2年：15K-25K；3-5年：25K-45K（一线城市）',
        growthRate: '年均市场需求增长约18%，AI方向增速超40%',
        hotSkills: ['数据分析(SQL/Python)', 'AI产品设计', '用户增长策略', '敏捷开发(Scrum)'],
        insights: '未来3年内，具备AI工具使用能力（Copilot、AI原型设计）的产品经理将获得显著竞争优势。建议提前布局LLM应用产品方向，这是当前市场最大的增量空间。',
      },
      pathway: {
        steps: [
          { stage: '起步期', role: '产品助理 / 实习生', duration: '0-1年', description: '参与需求调研、竞品分析、数据报表等基础工作，建立产品思维体系。' },
          { stage: '成长期', role: '初级产品经理', duration: '1-3年', description: '独立负责单一功能模块或子系统，完成需求分析→原型设计→迭代验证全流程。' },
          { stage: '精进期', role: '中级产品经理', duration: '3-5年', description: '主导核心业务线产品，参与商业决策，形成数据驱动的产品方法论。' },
        ],
        alternativePaths: [
          { name: '转型增长运营', reason: '沟通与数据分析能力可无缝迁移，增长运营注重用户洞察与策略落地' },
          { name: '转型项目经理(PMP)', reason: '执行力与跨部门协作能力是项目管理的核心，可平行发展' },
        ],
      },
      actionPlan: {
        phases: [
          {
            phase: '第一阶段',
            duration: '0-6个月',
            learning: ['系统学习《人人都是产品经理》及《启示录》', '掌握Axure/Figma原型设计工具', '学习基础SQL数据查询能力'],
            practice: ['在校园完成一个微信小程序产品的从0到1设计', '参加1次产品行业交流活动/Hackathon'],
            certificates: ['Axure产品原型设计认证'],
          },
          {
            phase: '第二阶段',
            duration: '6-18个月',
            learning: ['深入学习用户增长方法论(AARRR模型)', '研究AI产品设计方向，了解大模型应用场景', '学习数据分析工具(Excel高级/Tableau)'],
            practice: ['争取互联网公司产品实习(≥3个月)', '主导一次真实用户访谈，输出用户研究报告'],
            certificates: ['PMP项目管理认证(选修)'],
          },
        ],
      },
      evaluation: {
        checkpoints: [
          { time: '3个月', metrics: ['完成1份完整竞品分析报告', '学会使用原型工具输出中保真原型'], adjustTrigger: '若对产品方向兴趣减弱，可考虑切换至运营方向' },
          { time: '6个月', metrics: ['获得实习offer', '完成至少3个产品需求文档输出'], adjustTrigger: '根据实习岗位反馈动态调整技能补强方向' },
          { time: '1年', metrics: ['积累至少6个月产品实习经验', '建立可展示的产品作品集'], adjustTrigger: '若无法进入目标公司，考虑积累2年后再冲击大厂' },
        ],
      },
    };
  }

  // 真实 LLM 调用 (通义千问示例)
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY || process.env.ZHIPU_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const model = process.env.AI_MODEL || 'qwen-plus';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'LLM 调用失败');
  }

  const data = await res.json();
  const text = data.choices[0].message.content;

  // 解析 JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('LLM 返回格式不正确');
  return JSON.parse(jsonMatch[0]);
}

export async function POST(req: NextRequest) {
  try {
    const body: ReportRequest = await req.json();
    const { targetRole, matchScore, userProfile, userId } = body;

    if (!targetRole) {
      return NextResponse.json({ error: '目标岗位不能为空' }, { status: 400 });
    }

    const prompt = buildReportPrompt(body);
    const reportData = await generateWithLLM(prompt);

    // 保存到数据库
    const saved = await prisma.careerReport.create({
      data: {
        userId: userId || 'anonymous',
        targetRole,
        matchScore,
        conclusionJson: JSON.stringify(reportData.conclusion),
        goalsJson: JSON.stringify(reportData.goals),
        trendsJson: JSON.stringify(reportData.trends),
        pathwayJson: JSON.stringify(reportData.pathway),
        actionPlanJson: JSON.stringify(reportData.actionPlan),
        evaluationJson: JSON.stringify(reportData.evaluation),
        status: 'complete',
      },
    }).catch((e) => {
      console.error('DB save error:', e);
      return { id: `temp_${Date.now()}` };
    });

    return NextResponse.json({
      reportId: saved.id,
      data: reportData,
    });
  } catch (error: any) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: error.message || '报告生成失败，请稍后重试' }, { status: 500 });
  }
}

// 获取报告列表
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  try {
    const reports = await prisma.careerReport.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        targetRole: true,
        matchScore: true,
        status: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ reports });
  } catch (error) {
    return NextResponse.json({ reports: [] });
  }
}
