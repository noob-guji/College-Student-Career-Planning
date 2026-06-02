import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: '未收到补充文本' }, { status: 400 });
    }

    const prompt = `你是一名专业的简历信息提取专家。请从以下文本中提取候选人的基本信息，并严格输出JSON，不要附加任何多余说明。输出必须使用合法JSON。

文本：\n${text}\n
输出格式：
{
  "name": "",
  "education": "",
  "major": "",
  "school": "",
  "graduation_year": "",
  "target_city": "",
  "target_salary": ""
}

说明：
- 如果某个字段在文本中未明确出现，则填空字符串。
- 只提取文本中明确可识别的内容，不要推测。
- 目标城市和期望薪资应分别从文本中提取。`;

    const response = await client.chat.completions.create({
      model: 'qwen3.5-omni-flash',
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      modalities: ['text'],
      stream: false,
    });

    const raw = response.choices?.[0]?.message?.content || '';
    const cleaned = String(raw).replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ success: true, data: parsed });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || '解析失败' }, { status: 500 });
  }
}
