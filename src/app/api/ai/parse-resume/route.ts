import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 👉 通义千问全模态客户端（OpenAI 兼容格式）
const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY, // 你的阿里云API Key
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    // @ts-ignore: 动态导入 pdf-parse，类型声明可通过安装或手动补充
    const pdfParse = ((await import('pdf-parse')) as any).default;
    const data = await pdfParse(Buffer.from(buffer));
    return String(data.text || '').trim();
  } catch (error) {
    console.warn('PDF 文本提取失败，回退到图像解析', error);
    return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    const docxText = formData.get('text') as string; // 👈 新增：获取前端提取的纯文本
    const type = formData.get('type') as string;     // 👈 新增：获取前端传来的类型

    if (!file) return NextResponse.json({ error: '未收到文件' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const MAX_SIZE = 10 * 1024 * 1024;
    if (bytes.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: '文件大小超过 10MB，请压缩后重试' }, { status: 413 });
    }

    const base64 = Buffer.from(bytes).toString('base64');
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    // 你的简历解析提示词（不变）
    const prompt = `你是一名专业的简历解析专家。请从简历中提取信息，严格映射到以下12个维度，输出JSON，不要输出任何其他内容。

输出JSON格式：
{
  "basic": {
    "name": "",
    "education": "",
    "major": "",
    "school": "",
    "graduation_year": "",
    "target_city": "",
    "target_salary": ""
  },
  "dimensions": {
    "professional_skills": { "score": 0-100, "tags": [], "reason": "" },
    "certificate":         { "score": 0-100, "tags": [], "reason": "" },
    "innovation":          { "score": 0-100, "tags": [], "reason": "" },
    "learning":            { "score": 0-100, "tags": [], "reason": "" },
    "stress_tolerance":    { "score": 0-100, "tags": [], "reason": "" },
    "communication":       { "score": 0-100, "tags": [], "reason": "" },
    "internship":          { "score": 0-100, "tags": [], "reason": "" },
    "leadership":          { "score": 0-100, "tags": [], "reason": "" },
    "problem_solving":     { "score": 0-100, "tags": [], "reason": "" },
    "business_acumen":     { "score": 0-100, "tags": [], "reason": "" },
    "execution":           { "score": 0-100, "tags": [], "reason": "" },
    "values_fit":          { "score": 0-100, "tags": [], "reason": "" }
  },
  "completeness": 0-100,
  "competitiveness": 0-100,
  "completeness_reason": "",
  "competitiveness_reason": "",
  "skills": [],
  "internship_detail": "",
  "project_detail": "",
  "certs_detail": ""
}

评分规则：
- score：0-100分，严格依据简历可证明内容打分，无证据则打低分
- reason：必须引用简历原文片段，15-30字，精准支撑得分
- tags：提取该维度核心关键词，简洁、专业、无冗余
- completeness：根据简历信息丰富程度，覆盖越多维度越高、内容越详实分数越高
- competitiveness：对标全国同届大学生平均水平，评估综合能力水平
- 每个维度reason字段：必须引用简历中具体内容，15-30字，精准支撑该维度得分，禁止泛泛而谈或编造信息
- 禁止编造信息，所有内容必须来自简历，严格输出JSON`;

    // 通义全模态 content 格式
    let content: any[] = [];


    if (type === 'docx_text' && docxText) {
      // ✅ 命中我们前端针对 DOCX 处理的逻辑，直接使用前端解析好的纯文本
      content = [{ type: 'text', text: prompt + '\n\n简历内容：\n' + docxText }];
    } else if (isImage) {
      content = [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}` } },
      ];
    } else if (isPDF) {
      const pdfText = await extractPdfText(bytes);
      if (pdfText.length >= 80) {
        content = [{ type: 'text', text: prompt + '\n\n简历内容：\n' + pdfText }];
      } else {
        content = [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64}` } },
        ];
      }
    } else {
      const text = await file.text();
      content = [{ type: 'text', text: prompt + '\n\n简历内容：\n' + text }];
    }

    // 👉 调用通义全模态模型
    const response = await client.chat.completions.create({
      model: 'qwen3.5-omni-flash', // 你选中的模型
      messages: [{ role: 'user', content }],
      modalities: ['text'], // 只需要文本输出
      stream: false, // 关闭流式，直接返回完整JSON
    });

    const raw = response.choices[0]?.message?.content || '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ success: true, data: parsed });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || '解析失败' }, { status: 500 });
  }
}