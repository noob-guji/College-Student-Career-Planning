'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Sparkles, FileCheck, Edit3, Download, Minimize2,
  Maximize2, Check, AlertCircle, FileText, FileDown, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================
// 功能6：智笔润色 — AI 报告编辑优化工具
// 包含：智能润色 / 完整性检查 / 手动编辑 / 一键导出(PDF/Word)
// ============================================================

interface Section {
  id: string;
  title: string;
  content: string;
  isComplete: boolean;
}

interface ReportEditorProps {
  reportRef?: React.RefObject<HTMLDivElement | null>;
  sections?: Section[];
  onSectionsChange?: (sections: Section[]) => void;
  onExportWord?: () => void;
  onExportPDF?: () => void;
}

const defaultSections: Section[] = [
  { id: 'conclusion', title: '职业探索与匹配结论', content: '', isComplete: false },
  { id: 'goals', title: '职业目标设定', content: '', isComplete: false },
  { id: 'trends', title: '行业趋势分析', content: '', isComplete: false },
  { id: 'pathway', title: '发展路径规划', content: '', isComplete: false },
  { id: 'action', title: '行动计划', content: '', isComplete: false },
  { id: 'evaluation', title: '评估机制', content: '', isComplete: false },
];

// 调用 AI 润色指定段落
async function polishSection(sectionTitle: string, content: string): Promise<string> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: `请对以下职业规划报告中的"${sectionTitle}"模块进行专业润色，要求：
1. 保留核心信息，提升专业表达
2. 使语言更加精准有力
3. 控制在原文字数的120%以内
4. 直接输出润色后的内容，无需解释

原文：
${content || '（该模块内容为空）'}`,
        },
      ],
      context: `正在优化职业规划报告的"${sectionTitle}"模块`,
    }),
  });
  if (!res.ok) throw new Error('润色服务暂不可用');
  const data = await res.json();
  return data.content;
}

export default function ReportEditor({
  reportRef,
  sections: externalSections,
  onSectionsChange,
  onExportWord,
  onExportPDF,
}: ReportEditorProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<{ id: string; status: 'ok' | 'missing' | 'weak' }[]>([]);
  const [showCheckPanel, setShowCheckPanel] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sections, setSections] = useState<Section[]>(externalSections || defaultSections);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showNotify = useCallback((type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handlePolish = async () => {
    setActiveAction('polish');
    try {
      // 润色所有有内容的模块
      const toPolish = sections.filter(s => s.content.trim().length > 20);
      if (toPolish.length === 0) {
        showNotify('error', '暂无可润色的内容，请先填写报告内容');
        return;
      }

      const polished = await Promise.all(
        toPolish.map(async s => ({
          id: s.id,
          content: await polishSection(s.title, s.content),
        }))
      );

      const updated = sections.map(s => {
        const p = polished.find(p => p.id === s.id);
        return p ? { ...s, content: p.content } : s;
      });
      setSections(updated);
      onSectionsChange?.(updated);
      showNotify('success', '润色完成，已提升 ' + polished.length + ' 个模块的专业度');
    } catch (e: any) {
      showNotify('error', e.message || '润色失败');
    } finally {
      setActiveAction(null);
    }
  };

  const handleCheck = () => {
    setActiveAction('check');
    setTimeout(() => {
      const results = sections.map(s => ({
        id: s.id,
        status: s.content.trim().length === 0
          ? 'missing'
          : s.content.trim().length < 50
          ? 'weak'
          : 'ok',
      }));
      setCheckResults(results as any);
      setShowCheckPanel(true);
      setActiveAction(null);
    }, 600);
  };

  const handleEditSection = (section: Section) => {
    setEditingSectionId(section.id);
    setEditContent(section.content);
  };

  const handleSaveEdit = () => {
    const updated = sections.map(s =>
      s.id === editingSectionId
        ? { ...s, content: editContent, isComplete: editContent.trim().length > 0 }
        : s
    );
    setSections(updated);
    onSectionsChange?.(updated);
    setEditingSectionId(null);
    showNotify('success', '内容已保存');
  };

  const handleExportWord = () => {
    setActiveAction('export-word');

    if (onExportWord) {
      onExportWord();
      setTimeout(() => setActiveAction(null), 1000);
      return;
    }

    // 内置导出
    const content = sections.map(s => `<h3>${s.title}</h3><p>${s.content || '（待填写）'}</p>`).join('');
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
      <head><meta charset='utf-8'><style>
        body{font-family:'Microsoft YaHei',sans-serif;padding:40px;color:#334155}
        h1{font-size:24px;border-bottom:2px solid #f59e0b;padding-bottom:8px;margin-bottom:24px}
        h3{color:#f59e0b;font-size:16px;margin:20px 0 8px}
        p{line-height:1.8;font-size:14px;color:#475569}
      </style></head>
      <body><h1>职业生涯发展报告</h1>${content}</body></html>
    `;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '职业生涯发展报告.doc';
    a.click(); URL.revokeObjectURL(url);
    setTimeout(() => setActiveAction(null), 800);
    showNotify('success', 'Word 文档导出成功');
  };

  const handleExportPDF = () => {
    setActiveAction('export-pdf');
    if (onExportPDF) {
      onExportPDF();
    } else {
      window.print();
    }
    setTimeout(() => setActiveAction(null), 800);
    showNotify('success', 'PDF 导出已发送至打印/保存');
  };

  const completedCount = sections.filter(s => s.content.trim().length > 0).length;

  return (
    <>
      {/* 通知条 */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-[100] px-4 py-2.5 rounded-lg shadow-lg text-white text-sm font-medium flex items-center gap-2 ${
              notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 手动编辑模态框 */}
      <AnimatePresence>
        {editingSectionId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  编辑：{sections.find(s => s.id === editingSectionId)?.title}
                </h3>
                <button onClick={() => setEditingSectionId(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
              </div>
              <div className="p-4">
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full h-48 p-3 border border-slate-200 rounded-xl text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`请输入${sections.find(s => s.id === editingSectionId)?.title}的内容...`}
                />
                <div className="text-xs text-slate-400 mt-1 text-right">{editContent.length} 字</div>
              </div>
              <div className="p-4 border-t border-slate-100 flex gap-2 justify-end">
                <button onClick={() => setEditingSectionId(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  取消
                </button>
                <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> 保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 完整性检查面板 */}
      <AnimatePresence>
        {showCheckPanel && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-[220px] top-24 z-[80] w-72 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
          >
            <div className="p-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <span className="font-bold text-emerald-700 text-sm flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" /> 完整性检查结果
              </span>
              <button onClick={() => setShowCheckPanel(false)} className="text-emerald-600 hover:text-emerald-800 text-lg leading-none">×</button>
            </div>
            <div className="p-3 space-y-1.5 max-h-64 overflow-y-auto">
              {checkResults.map(r => {
                const section = sections.find(s => s.id === r.id);
                const statusMap = {
                  ok: { icon: '✅', label: '完整', color: 'text-emerald-600' },
                  weak: { icon: '⚠️', label: '内容较少', color: 'text-amber-600' },
                  missing: { icon: '❌', label: '未填写', color: 'text-red-600' },
                };
                const st = statusMap[r.status];
                return (
                  <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-xs text-slate-700 flex items-center gap-1.5">
                      {st.icon} {section?.title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                      {r.status !== 'ok' && (
                        <button
                          onClick={() => { setShowCheckPanel(false); handleEditSection(section!); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          填写
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-2 bg-slate-50 text-center text-xs text-slate-500">
              已完成 {completedCount}/{sections.length} 个模块
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主工具栏 */}
      <div className="fixed right-6 top-24 z-[70] flex flex-col items-end gap-2">
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="w-8 h-8 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
          title={isMinimized ? '展开工具栏' : '收起工具栏'}
        >
          {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden w-52"
            >
              {/* 完成度 */}
              <div className="p-3 bg-slate-50 border-b border-slate-100">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">报告完成度</span>
                  <span className="text-xs font-bold text-slate-700">{Math.round(completedCount / sections.length * 100)}%</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${completedCount / sections.length * 100}%` }}
                  />
                </div>
              </div>

              {/* 工具按钮 */}
              <div className="p-2 space-y-1">
                {/* 智能润色 */}
                <button
                  onClick={handlePolish}
                  disabled={activeAction !== null}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {activeAction === 'polish' ? <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" /> : <Sparkles className="w-4 h-4 text-indigo-600" />}
                  <span className="font-medium text-slate-700">
                    {activeAction === 'polish' ? '润色中...' : '智能润色'}
                  </span>
                </button>

                {/* 完整性检查 */}
                <button
                  onClick={handleCheck}
                  disabled={activeAction !== null}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {activeAction === 'check' ? <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" /> : <FileCheck className="w-4 h-4 text-emerald-600" />}
                  <span className="font-medium text-slate-700">
                    {activeAction === 'check' ? '检查中...' : '完整性检查'}
                  </span>
                </button>

                {/* 手动编辑 */}
                <div className="px-3 pt-1 pb-0.5">
                  <div className="text-xs text-slate-400 font-medium mb-1">手动编辑模块</div>
                  <div className="space-y-0.5 max-h-32 overflow-y-auto">
                    {sections.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleEditSection(s)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <span className="text-xs text-slate-600 truncate">{s.title}</span>
                        <Edit3 className="w-3 h-3 text-blue-500 shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 导出分隔线 */}
                <div className="border-t border-slate-100 my-1" />

                {/* 导出 Word */}
                <button
                  onClick={handleExportWord}
                  disabled={activeAction !== null}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {activeAction === 'export-word' ? <Loader2 className="w-4 h-4 text-slate-600 animate-spin" /> : <FileText className="w-4 h-4 text-slate-600" />}
                  <span className="font-medium text-slate-700">
                    {activeAction === 'export-word' ? '导出中...' : '导出 Word'}
                  </span>
                </button>

                {/* 导出 PDF */}
                <button
                  onClick={handleExportPDF}
                  disabled={activeAction !== null}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {activeAction === 'export-pdf' ? <Loader2 className="w-4 h-4 text-rose-600 animate-spin" /> : <FileDown className="w-4 h-4 text-rose-600" />}
                  <span className="font-medium text-slate-700">
                    {activeAction === 'export-pdf' ? '导出中...' : '导出 PDF'}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
