/**
 * GET /api/knowledge-hub
 * 从真实 JSON 文件中读取知识库条目，供知识中枢页面展示
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const DATA_DIR  = path.join(process.cwd(), 'data', 'knowledge_graph');
const VERT_PATH = path.join(DATA_DIR, 'vertical_paths.json');
const LAT_PATH  = path.join(DATA_DIR, 'lateral_paths.json');

function safeLoad(p: string) {
  try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null; }
  catch { return null; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') ?? 'all';
  const search   = searchParams.get('search') ?? '';

  const vp = safeLoad(VERT_PATH);
  const lp = safeLoad(LAT_PATH);
  const hasRealData = !!(vp || lp);

  const entries: any[] = [];

  // ── 从 category_paths 生成「岗位画像」条目
  if (vp?.category_paths) {
    for (const [cat, info] of Object.entries(vp.category_paths) as [string, any][]) {
      const ladder: string[] = info.full_ladder ?? [];
      entries.push({
        id: `vp_${cat}`,
        category: 'job_profile',
        title: `${cat} 岗位晋升画像`,
        content: `晋升阶梯（${ladder.length}级）：${ladder.join(' → ')}。${info.data_driven ? '路径基于真实招聘数据薪资排序验证。' : '路径基于职级规则推断。'}`,
        tags: [cat, '晋升路径', info.data_driven ? '数据驱动' : '规则推断'],
        source: 'vertical_paths.json',
        updatedAt: new Date().toISOString().slice(0, 10),
        ladder,
        levelCount: ladder.length,
        dataFlag: info.data_driven,
      });
    }
  }

  // ── 从 lateral_paths 生成「转岗路径」条目
  if (lp?.lateral_paths) {
    for (const [job, info] of Object.entries(lp.lateral_paths) as [string, any][]) {
      const paths: any[] = info.paths ?? [];
      const targets = paths.map((p: any) => p['目标岗位']);
      const difficulties = [...new Set(paths.map((p: any) => p['难度']))];
      entries.push({
        id: `lp_${job}`,
        category: 'lateral_path',
        title: `${job} 转岗路径`,
        content: `可转岗至 ${targets.join('、')}，共 ${paths.length} 条路径。难度分布：${difficulties.join('/')}。数据来源：${lp.meta?.vector_source ?? '向量相似度'}。`,
        tags: [job, '转岗', ...targets.slice(0, 3)],
        source: 'lateral_paths.json',
        updatedAt: new Date().toISOString().slice(0, 10),
        paths: paths.map((p: any) => ({
          target: p['目标岗位'],
          similarity: p['相似度得分'],
          difficulty: p['难度'],
          period: p['预计过渡周期'],
        })),
      });
    }
  }

  // ── 如无真实数据，返回 fallback
  if (!hasRealData) {
    return NextResponse.json({ entries: FALLBACK_ENTRIES, dataSource: 'fallback', stats: FALLBACK_STATS });
  }

  // ── 过滤
  const filtered = entries.filter(e => {
    const matchCat = category === 'all' || e.category === category;
    const matchSearch = !search || e.title.includes(search) || e.tags.some((t: string) => t.includes(search));
    return matchCat && matchSearch;
  });

  // ── 统计
  const stats = {
    job_profile:  entries.filter(e => e.category === 'job_profile').length,
    lateral_path: entries.filter(e => e.category === 'lateral_path').length,
    total:        entries.length,
    dataSource: 'real',
    vpMeta: vp?.meta,
    lpMeta: lp?.meta,
  };

  return NextResponse.json({ entries: filtered, stats, dataSource: 'real' });
}

// ─────────────────────────────────────────────
// Fallback（JSON 文件未放置时的占位数据）
// ─────────────────────────────────────────────
const FALLBACK_ENTRIES = [
  { id: 'f1', category: 'job_profile', title: '前端开发 岗位晋升画像', content: '晋升阶梯（7级）：前端实习生 → 初级前端开发工程师 → 前端开发工程师 → 高级前端开发工程师 → 前端架构师 → 前端技术经理 → 技术总监', tags: ['前端开发','晋升路径','规则推断'], source: 'fallback', updatedAt: '2025-04-01', levelCount: 7 },
  { id: 'f2', category: 'lateral_path', title: '前端开发工程师 转岗路径', content: '可转岗至 产品经理、全栈开发工程师，共 2 条路径。', tags: ['前端开发工程师','转岗','产品经理'], source: 'fallback', updatedAt: '2025-04-01' },
];

const FALLBACK_STATS = {
  job_profile: 1, lateral_path: 1, total: 2,
  dataSource: 'fallback',
  note: '请将 vertical_paths.json / lateral_paths.json 放入 data/knowledge_graph/ 目录',
};
