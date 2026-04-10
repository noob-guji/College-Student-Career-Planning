/**
 * GET /api/knowledge-graph
 * 读取真实 vertical_paths.json / lateral_paths.json
 * 字段已对齐真实文件结构（经过实际数据验证）
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// ─────────────────────────────────────────────
// 文件路径（放在项目根目录 data/knowledge_graph/）
// ─────────────────────────────────────────────
const DATA_DIR  = path.join(process.cwd(), 'data', 'knowledge_graph');
const VERT_PATH = path.join(DATA_DIR, 'vertical_paths.json');
const LAT_PATH  = path.join(DATA_DIR, 'lateral_paths.json');

// 内存缓存（dev 下重启清除）
let _vp: any = null;
let _lp: any = null;

function loadVP() {
  if (_vp) return _vp;
  if (!fs.existsSync(VERT_PATH)) return null;
  _vp = JSON.parse(fs.readFileSync(VERT_PATH, 'utf-8'));
  return _vp;
}
function loadLP() {
  if (_lp) return _lp;
  if (!fs.existsSync(LAT_PATH)) return null;
  _lp = JSON.parse(fs.readFileSync(LAT_PATH, 'utf-8'));
  return _lp;
}

// ─────────────────────────────────────────────
// 节点颜色（按晋升层级深浅）
// ─────────────────────────────────────────────
const LEVEL_COLORS = [
  { bg: '#f8fafc', border: '#cbd5e1', text: '#64748b' },
  { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
  { bg: '#dbeafe', border: '#60a5fa', text: '#1e40af' },
  { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  { bg: '#fde68a', border: '#f59e0b', text: '#78350f' },
  { bg: '#fecaca', border: '#f87171', text: '#991b1b' },
];

function levelColor(idx: number, total: number) {
  const slot = total <= 1 ? 0 : Math.min(
    Math.floor((idx / (total - 1)) * LEVEL_COLORS.length),
    LEVEL_COLORS.length - 1
  );
  return LEVEL_COLORS[slot];
}

// ─────────────────────────────────────────────
// 构建垂直晋升图（xyflow 节点/边）
// ─────────────────────────────────────────────
function buildVerticalGraph(ladder: string[], category: string, dataFlag: boolean) {
  const X = 50;
  const Y0 = 40;
  const DY = 90;

  const nodes = ladder.map((name, i) => {
    const c = levelColor(i, ladder.length);
    return {
      id: `v_${i}`,
      position: { x: X, y: Y0 + i * DY },
      data: { label: name, levelIndex: i, isTop: i === ladder.length - 1, dataFlag },
      style: {
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        color: c.text,
        borderRadius: '8px',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: i === ladder.length - 1 ? 700 : 500,
        width: 220,
        textAlign: 'center',
        boxShadow: i === ladder.length - 1 ? `0 4px 12px ${c.border}55` : undefined,
      },
      sourcePosition: 'bottom',
      targetPosition: 'top',
    };
  });

  const edges = ladder.slice(0, -1).map((_, i) => {
    const c = levelColor(i + 1, ladder.length);
    return {
      id: `ve_${i}`,
      source: `v_${i}`,
      target: `v_${i + 1}`,
      animated: true,
      style: { strokeWidth: 2, stroke: c.border },
      markerEnd: { type: 'arrowclosed', color: c.border },
    };
  });

  return {
    nodes, edges, category, dataFlag,
    height: Y0 + ladder.length * DY + 80,
  };
}

// ─────────────────────────────────────────────
// 构建水平转岗图
// 字段对齐真实 lateral_paths.json：目标岗位 / 相似度得分 / 所需补充技能 / 难度 / 预计过渡周期 / 推荐行动 / 薪资变化参考
// ─────────────────────────────────────────────
function buildLateralGraph(sourceJob: string, paths: any[]) {
  const DIFF_COLOR: Record<string, { bg: string; border: string; text: string }> = {
    '低': { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
    '中': { bg: '#fefce8', border: '#fde047', text: '#854d0e' },
    '高': { bg: '#fff1f2', border: '#fda4af', text: '#9f1239' },
  };

  const SRC_X  = 40;
  const SRC_Y  = 30;
  const TGT_X  = 380;
  const Y_GAP  = 100;
  const Y_START = SRC_Y + 30 - ((paths.length - 1) / 2) * Y_GAP;

  const srcNode = {
    id: 'src',
    position: { x: SRC_X, y: SRC_Y },
    data: { label: sourceJob, isSource: true },
    style: {
      background: '#1e293b',
      border: '2px solid #f59e0b',
      color: '#f59e0b',
      borderRadius: '10px',
      padding: '10px 18px',
      fontSize: '13px',
      fontWeight: 700,
      width: 200,
      textAlign: 'center',
      boxShadow: '0 4px 16px rgba(245,158,11,0.25)',
    },
    sourcePosition: 'right',
  };

  const tgtNodes = paths.map((p, i) => {
    const c = DIFF_COLOR[p['难度']] ?? DIFF_COLOR['中'];
    return {
      id: `lat_${i}`,
      position: { x: TGT_X, y: Y_START + i * Y_GAP },
      data: {
        label:      p['目标岗位'],
        similarity: p['相似度得分'],
        difficulty: p['难度'],
        skills:     p['所需补充技能'],
        period:     p['预计过渡周期'],
        action:     p['推荐行动'],
        salary:     p['薪资变化参考'],
      },
      style: {
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        color: c.text,
        borderRadius: '8px',
        padding: '8px 14px',
        fontSize: '13px',
        fontWeight: 600,
        width: 200,
        textAlign: 'center',
      },
      targetPosition: 'left',
    };
  });

  const edges = paths.map((p, i) => ({
    id: `late_${i}`,
    source: 'src',
    target: `lat_${i}`,
    animated: true,
    label: `${Math.round(p['相似度得分'] * 100)}%`,
    labelStyle: { fontSize: 11, fill: '#64748b', fontWeight: 600 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
    style: { strokeWidth: 2, stroke: '#94a3b8' },
    markerEnd: { type: 'arrowclosed', color: '#94a3b8' },
  }));

  return {
    nodes: [srcNode, ...tgtNodes],
    edges,
    height: Math.max(420, Y_START + paths.length * Y_GAP + 100),
  };
}

// ─────────────────────────────────────────────
// Fallback（JSON 文件不存在时的示例数据）
// ─────────────────────────────────────────────
const FB_VP = {
  meta: { total_categories: 6, data_driven_categories: 0, source: 'fallback' },
  category_paths: {
    '前端开发': { full_ladder: ['前端实习生','初级前端开发工程师','前端开发工程师','高级前端开发工程师','前端架构师','前端技术经理','技术总监'], data_driven: false },
    '产品经理': { full_ladder: ['产品实习生','产品助理','产品专员','初级产品经理','产品经理','高级产品经理','产品总监','CPO'], data_driven: false },
    '数据分析师': { full_ladder: ['数据分析实习生','初级数据分析师','数据分析师','高级数据分析师','数据分析专家','数据分析经理','数据总监'], data_driven: false },
  },
  job_paths: {},
};

const FB_LP = {
  meta: { total_core_jobs: 3, source: 'fallback' },
  lateral_paths: {
    '前端开发工程师': { source_job: '前端开发工程师', paths: [
      { 目标岗位:'产品经理', 相似度得分:0.72, 所需补充技能:['用户需求分析','产品原型设计','数据驱动决策'], 难度:'中', 预计过渡周期:'6-12个月', 推荐行动:'参与产品规划，学习PRD写作', 薪资变化参考:'-10%~+5%' },
      { 目标岗位:'全栈开发工程师', 相似度得分:0.85, 所需补充技能:['Node.js','数据库设计','微服务'], 难度:'低', 预计过渡周期:'3-6个月', 推荐行动:'系统学习后端开发', 薪资变化参考:'±10%' },
    ]},
  },
};

// ─────────────────────────────────────────────
// 主处理
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobName  = searchParams.get('job');
  const catName  = searchParams.get('category');
  const listOnly = searchParams.get('list') === '1';

  const vp         = loadVP() ?? FB_VP;
  const lp         = loadLP() ?? FB_LP;
  const dataSource = loadVP() ? 'real' : 'fallback';

  // ── 返回列表
  if (listOnly) {
    return NextResponse.json({
      dataSource,
      // 转岗路径里的岗位作为主要选项
      coreJobs:   Object.keys(lp.lateral_paths),
      // 同时提供所有大类
      categories: Object.keys(vp.category_paths),
      meta: vp.meta,
      latMeta: lp.meta,
    });
  }

  // ── 按岗位名查询（同时返回晋升 + 转岗）
  if (jobName) {
    let vertGraph = null;
    let latGraph  = null;

    // 1. 先在 job_paths 精确找
    const jp = vp.job_paths?.[jobName];
    if (jp) {
      vertGraph = buildVerticalGraph(jp.full_ladder, jp.category, jp.data_driven);
    } else {
      // 2. 在 category_paths 里模糊找：岗位名包含大类名 或 大类阶梯包含岗位名
      for (const [cat, info] of Object.entries(vp.category_paths) as [string, any][]) {
        const ladder: string[] = info.full_ladder;
        if (
          jobName.includes(cat.replace('开发', '').replace('工程师', '')) ||
          ladder.some(t => t.includes(jobName) || jobName.includes(t))
        ) {
          vertGraph = buildVerticalGraph(ladder, cat, info.data_driven);
          break;
        }
      }
    }

    // 3. 转岗
    const latInfo = lp.lateral_paths[jobName];
    if (latInfo) {
      latGraph = buildLateralGraph(latInfo.source_job, latInfo.paths);
    }

    if (!vertGraph && !latGraph) {
      return NextResponse.json({ error: `未找到岗位: ${jobName}`, dataSource }, { status: 404 });
    }
    return NextResponse.json({ dataSource, jobName, vertical: vertGraph, lateral: latGraph });
  }

  // ── 按大类查询
  if (catName) {
    const info = vp.category_paths[catName];
    if (!info) {
      return NextResponse.json({ error: `未找到大类: ${catName}` }, { status: 404 });
    }
    return NextResponse.json({
      dataSource,
      category: catName,
      vertical: buildVerticalGraph(info.full_ladder, catName, info.data_driven),
    });
  }

  // ── 默认：返回所有大类 + 核心岗位列表
  return NextResponse.json({
    dataSource,
    meta: vp.meta,
    latMeta: lp.meta,
    categories: Object.keys(vp.category_paths),
    coreJobs: Object.keys(lp.lateral_paths),
  });
}
