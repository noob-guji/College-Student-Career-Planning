'use client';

/**
 * 功能2：岗位图谱可视化
 * 修复：@xyflow/react v12 只有命名导出，无默认导出
 * 数据：对齐真实 vertical_paths.json / lateral_paths.json 字段
 */

import { useEffect, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp, ArrowRight, Loader2, RefreshCw,
  Database, Zap, X, Info,
} from 'lucide-react';

// ─────────────────────────────────────────────
// 类型
// ─────────────────────────────────────────────
interface NodeDetail {
  type: 'vertical' | 'lateral';
  label: string;
  levelIndex?: number;
  isTop?: boolean;
  similarity?: number;
  difficulty?: string;
  skills?: string[];
  period?: string;
  action?: string;
  salary?: string;
}

// ─────────────────────────────────────────────
// 节点详情面板
// ─────────────────────────────────────────────
function NodeDetailPanel({ detail, onClose }: { detail: NodeDetail; onClose: () => void }) {
  const diffCls =
    detail.difficulty === '低' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : detail.difficulty === '高' ? 'text-red-700 bg-red-50 border-red-200'
    : 'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-4 right-4 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 pointer-events-auto"
    >
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <span className="font-bold text-slate-900 text-sm">
          {detail.type === 'vertical' ? '晋升节点' : '转岗目标'}
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <p className="font-semibold text-slate-900">{detail.label}</p>

        {detail.type === 'vertical' && detail.levelIndex !== undefined && (
          <p className="text-xs text-slate-500">
            职级层级：L{detail.levelIndex}
            {detail.isTop && (
              <span className="ml-2 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">终点</span>
            )}
          </p>
        )}

        {detail.type === 'lateral' && (
          <>
            {detail.similarity !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 shrink-0">相似度</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all"
                    style={{ width: `${Math.round(detail.similarity * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 shrink-0">
                  {Math.round(detail.similarity * 100)}%
                </span>
              </div>
            )}

            {detail.difficulty && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${diffCls}`}>
                转岗难度：{detail.difficulty}
              </span>
            )}

            {detail.period && (
              <p className="text-xs text-slate-600">⏱ 预计周期：{detail.period}</p>
            )}

            {detail.skills && detail.skills.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1.5">需补充技能</p>
                <div className="flex flex-wrap gap-1">
                  {detail.skills.map((s, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detail.action && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-800 leading-relaxed">
                💡 {detail.action}
              </div>
            )}

            {detail.salary && (
              <p className="text-xs text-slate-500">💰 薪资变化：{detail.salary}</p>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// 单图谱面板（封装 ReactFlow 实例）
// ─────────────────────────────────────────────
function GraphPanel({
  title,
  nodes: initNodes,
  edges: initEdges,
  badge,
  onNodeClick,
}: {
  title: string;
  nodes: any[];
  edges: any[];
  badge?: string;
  onNodeClick: (d: NodeDetail) => void;
}) {
  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
        <span className="font-semibold text-slate-900 text-sm">{title}</span>
        {badge && (
          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
            {badge}
          </span>
        )}
      </div>
      <div className="flex-1" style={{ minHeight: 360 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => {
            const d = node.data as any;
            if (d.isSource) return;
            onNodeClick({
              type: d.similarity !== undefined ? 'lateral' : 'vertical',
              label: String(d.label),
              levelIndex: d.levelIndex,
              isTop: d.isTop,
              similarity: d.similarity,
              difficulty: d.difficulty,
              skills: d.skills,
              period: d.period,
              action: d.action,
              salary: d.salary,
            });
          }}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          nodesDraggable
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="#f1f5f9" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              const s = (n.style as any)?.background || '#e2e8f0';
              return s;
            }}
            maskColor="rgba(248,250,252,0.7)"
            style={{ borderRadius: 8 }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────────
export default function JobGraphViewer() {
  const [availList, setAvailList] = useState<{
    categories: string[];
    coreJobs: string[];
    dataSource: string;
  } | null>(null);

  const [activeJob, setActiveJob]   = useState('');
  const [activeMode, setActiveMode] = useState<'both' | 'vertical' | 'lateral'>('both');
  const [graphData, setGraphData]   = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);

  // 加载可用列表
  useEffect(() => {
    fetch('/api/knowledge-graph?list=1')
      .then(r => r.json())
      .then(d => {
        setAvailList(d);
        if (d.coreJobs?.length) setActiveJob(d.coreJobs[0]);
      })
      .catch(console.error);
  }, []);

  // 加载图谱
  const loadGraph = useCallback(async (job: string) => {
    if (!job) return;
    setLoading(true);
    setNodeDetail(null);
    try {
      const res  = await fetch(`/api/knowledge-graph?job=${encodeURIComponent(job)}`);
      const data = await res.json();
      setGraphData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeJob) loadGraph(activeJob);
  }, [activeJob, loadGraph]);

  const showV = (activeMode === 'both' || activeMode === 'vertical') && graphData?.vertical;
  const showL = (activeMode === 'both' || activeMode === 'lateral')  && graphData?.lateral;

  return (
    <div className="flex flex-col h-full gap-4 relative">

      {/* ── 工具栏 */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        {/* 数据源标识 */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
          graphData?.dataSource === 'real'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <Database className="w-3 h-3" />
          {graphData?.dataSource === 'real' ? '数据驱动（真实数据）' : '内置示例数据'}
        </div>

        {/* 视图切换 */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {([
            { id: 'both',     icon: Zap,        label: '全览' },
            { id: 'vertical', icon: ArrowUp,     label: '晋升路径' },
            { id: 'lateral',  icon: ArrowRight,  label: '转岗路径' },
          ] as const).map(m => (
            <button
              key={m.id}
              onClick={() => setActiveMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === m.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>

        {/* 刷新 */}
        <button
          onClick={() => loadGraph(activeJob)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* ── 内容区 */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* 左侧岗位列表 */}
        <div className="w-44 shrink-0 flex flex-col gap-2 overflow-hidden">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">选择岗位</p>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {availList?.coreJobs.map(job => (
              <button
                key={job}
                onClick={() => setActiveJob(job)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  activeJob === job
                    ? 'bg-[#111827] text-amber-400 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {job}
              </button>
            ))}
            {!availList && (
              <div className="flex items-center gap-2 text-slate-400 text-xs p-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 加载中…
              </div>
            )}
          </div>
        </div>

        {/* 右侧图谱区 */}
        <div className="flex-1 min-w-0 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">图谱加载中…</span>
            </div>
          ) : !graphData ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              请在左侧选择岗位
            </div>
          ) : (
            <div className={`grid gap-4 h-full ${showV && showL ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {showV && (
                <GraphPanel
                  title={`${graphData.vertical?.category ?? activeJob} · 晋升路径`}
                  nodes={graphData.vertical.nodes}
                  edges={graphData.vertical.edges}
                  badge={graphData.vertical.dataFlag ? '数据驱动' : undefined}
                  onNodeClick={setNodeDetail}
                />
              )}
              {showL && (
                <GraphPanel
                  title={`${activeJob} · 转岗路径`}
                  nodes={graphData.lateral.nodes}
                  edges={graphData.lateral.edges}
                  onNodeClick={setNodeDetail}
                />
              )}
              {activeMode !== 'vertical' && !graphData.lateral && (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm">
                  <div className="text-center p-6">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>「{activeJob}」暂无转岗路径数据</p>
                    <p className="text-xs mt-1 opacity-70">
                      在 build_lateral_paths.py 的 CORE_JOBS 中添加后重新运行
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 节点详情浮层 */}
          <AnimatePresence>
            {nodeDetail && (
              <NodeDetailPanel detail={nodeDetail} onClose={() => setNodeDetail(null)} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 图例 */}
      <div className="shrink-0 flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span className="font-semibold text-slate-700">图例：</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-blue-300" style={{ borderStyle: 'dashed' }} />
          动画连线 = 晋升关系
        </span>
        {[['emerald', '低难度'], ['amber', '中难度'], ['red', '高难度']].map(([c, l]) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded bg-${c}-50 border border-${c}-300 inline-block`} />
            {l}转岗
          </span>
        ))}
        <span className="ml-auto opacity-70">点击节点查看详情 · 可拖拽节点</span>
      </div>
    </div>
  );
}
