import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ============================================================
// 功能8：智脑引擎 — 统一大模型调度层
// 支持: 通义千问 / 文心一言 / 讯飞星火 / ChatGLM / OpenAI 兼容接口
// 通过环境变量 AI_PROVIDER 切换，默认 mock
// ============================================================

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
  userId?: string;
  stream?: boolean;
  context?: string;
}

// ---------- Provider 适配器 ----------

async function callTongyi(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY not configured');

  const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'qwen-plus',
      messages,
      max_tokens: 2000,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || '通义千问调用失败');
  return data.choices[0].message.content;
}

// ─────────────────────────────────────────────────────────────
// 文心一言 修复说明：
//
// 百度 API 的 URL 路径名 ≠ 模型显示名，必须做映射：
//
//  显示名（AI_MODEL填这个）  →  URL路径名（代码内部用）
//  ernie-speed              →  ernie_speed          ✅ 免费，推荐默认
//  ernie-lite               →  ernie-lite-8k        ✅ 免费
//  ernie-3.5                →  completions          💰 付费
//  ernie-4.0                →  completions_pro      💰 付费
//
// 另外：文心一言不支持 role:'system'，需单独传 system 字段。
// ─────────────────────────────────────────────────────────────
async function callWenxin(messages: ChatMessage[]): Promise<string> {
  const apiKey   = process.env.WENXIN_API_KEY;
  const secretKey = process.env.WENXIN_SECRET_KEY;
  if (!apiKey || !secretKey) throw new Error('WENXIN_API_KEY / WENXIN_SECRET_KEY not configured');

  // Step 1：获取 access_token
  const tokenRes = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  );
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`获取 access_token 失败: ${tokenData.error_description || JSON.stringify(tokenData)}`);
  }
  const accessToken = tokenData.access_token;

  // Step 2：模型显示名 → URL路径名 映射
  const MODEL_PATH: Record<string, string> = {
    'ernie-speed':    'ernie_speed',      // 免费，推荐
    'ernie-lite':     'ernie-lite-8k',    // 免费
    'ernie-3.5':      'completions',      // 付费
    'ernie-4.0':      'completions_pro',  // 付费
    // 兜底：如果直接写路径名也能用
    'ernie_speed':    'ernie_speed',
    'ernie-lite-8k':  'ernie-lite-8k',
    'completions':    'completions',
    'completions_pro': 'completions_pro',
  };

  const modelInput = (process.env.AI_MODEL || 'ernie-speed').toLowerCase();
  const modelPath  = MODEL_PATH[modelInput] ?? 'ernie_speed'; // 找不到映射时降级到免费版

  // Step 3：分离 system 消息（文心不支持 role:'system'）
  const systemMsg  = messages.find(m => m.role === 'system')?.content;
  const chatMsgs   = messages.filter(m => m.role !== 'system');

  const body: Record<string, any> = { messages: chatMsgs };
  if (systemMsg) body.system = systemMsg; // 单独字段传递

  // Step 4：调用模型
  const res = await fetch(
    `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${modelPath}?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();

  if (data.error_code) {
    throw new Error(`文心一言 [${data.error_code}] ${data.error_msg}`);
  }
  return data.result;
}

async function callChatGLM(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) throw new Error('ZHIPU_API_KEY not configured');

  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'glm-4',
      messages,
      max_tokens: 2000,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'ChatGLM调用失败');
  return data.choices[0].message.content;
}

async function callXunfei(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.XUNFEI_API_KEY;
  if (!apiKey) throw new Error('XUNFEI_API_KEY not configured');

  const res = await fetch('https://spark-api-open.xf-yun.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'generalv3.5',
      messages,
      max_tokens: 2000,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || '讯飞星火调用失败');
  return data.choices[0].message.content;
}

async function callOpenAICompat(messages: ChatMessage[]): Promise<string> {
  const apiKey  = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: 2000,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'OpenAI 调用失败');
  return data.choices[0].message.content;
}

// ---------- Mock ----------
function getMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes('岗位') || lower.includes('职业')) {
    return '根据您的能力画像分析，我推荐您关注**产品经理**、**项目管理**和**运营策划**三类岗位。这些岗位对沟通能力和逻辑能力要求较高，与您的能力模型高度吻合。\n\n您是否希望我重点分析某一个具体方向？';
  }
  if (lower.includes('技能') || lower.includes('学习')) {
    return '提升建议：\n1. **短期(3个月)**：完成 PMP 项目管理认证备考\n2. **中期(6个月)**：参与实际项目实习，积累案例\n3. **长期(1年)**：建立个人作品集和行业人脉网络\n\n需要我为某个方向制定更详细的学习计划吗？';
  }
  if (lower.includes('报告') || lower.includes('生成')) {
    return '我已收到您的请求，正在根据您的能力画像和岗位匹配结果生成个性化职业生涯发展报告。\n\n⚡ 提示：请前往「生涯蓝图」模块查看完整报告。';
  }
  return '感谢您的提问！我是智脑引擎助手，专注于职业规划方向的智能咨询。我可以帮您：\n• 分析岗位匹配度\n• 制定职业发展计划\n• 提供行业趋势洞察\n\n请告诉我您最关心的方向！';
}

// ---------- 缓存 ----------
const responseCache = new Map<string, { result: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(messages: ChatMessage[]): string {
  return JSON.stringify(messages.slice(-3));
}

// ---------- 主路由 ----------
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: ChatRequest = await req.json();
    const { messages, sessionId = 'anon', userId, context } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
    }

    const systemPrompt = `你是一个专业的职业规划AI助手，名叫"智脑引擎"。你专注于帮助大学生进行职业规划，包括岗位匹配分析、职业目标设定、行业趋势解读和发展路径规划。
${context ? `\n当前上下文信息：\n${context}` : ''}
回答要求：
- 回答简洁专业，每次回答不超过300字
- 提供具体可操作的建议
- 使用Markdown格式增强可读性
- 语气亲切，鼓励用户探索职业发展可能性`;

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // 缓存检查
    const cacheKey = getCacheKey(fullMessages);
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json({ content: cached.result, cached: true });
    }

    const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();
    let result: string;

    try {
      switch (provider) {
        case 'tongyi': case 'qwen':
          result = await callTongyi(fullMessages); break;
        case 'wenxin': case 'ernie':
          result = await callWenxin(fullMessages); break;
        case 'chatglm': case 'zhipu':
          result = await callChatGLM(fullMessages); break;
        case 'xunfei': case 'spark':
          result = await callXunfei(fullMessages); break;
        case 'openai': case 'deepseek':
          result = await callOpenAICompat(fullMessages); break;
        default:
          await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
          result = getMockResponse(messages[messages.length - 1].content);
      }
    } catch (providerError: any) {
      console.error(`AI Provider [${provider}] error:`, providerError.message);
      await new Promise(r => setTimeout(r, 500));
      result = getMockResponse(messages[messages.length - 1].content);
    }

    responseCache.set(cacheKey, { result, ts: Date.now() });

    const latency = Date.now() - startTime;
    prisma.chatLog.create({
      data: { sessionId, userId: userId || null, role: 'assistant', content: result, model: provider, latencyMs: latency },
    }).catch(console.error);

    return NextResponse.json({ content: result, latencyMs: latency });
  } catch (error: any) {
    console.error('AI chat route error:', error);
    return NextResponse.json({ error: '服务暂时不可用，请稍后重试' }, { status: 500 });
  }
}
