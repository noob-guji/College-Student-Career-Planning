'use client';

import ReportEditor from '@/features/career-blueprint/components/ReportEditor';

// ============================================================
// 功能6：智笔润色 — 重新导出，委托给新的 ReportEditor 实现
// 保留此文件以兼容现有 person-post-matching/page.tsx 的引用
// ============================================================

interface SmartEditorToolProps {
    onExport?: () => void;
}

export default function SmartEditorTool({ onExport }: SmartEditorToolProps) {
    return (
        <ReportEditor
            onExportWord={onExport}
        />
    );
}
