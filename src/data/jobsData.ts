import { Position, MarkerType } from '@xyflow/react';

export const jobsData: Record<string, any> = {
    '前端开发工程师': {
        profile: {
            title: '前端开发工程师',
            department: '研发线',
            industry: '互联网/软件',
            tag: '高需求',
            description: '负责Web前端及移动端H5的开发，构建高性能、高可用的应用页面，参与前端架构设计与复杂交互难题攻坚。',
            skills: ['React/Vue', 'TypeScript', '架构设计', '性能优化'],
            radarData: [
                { subject: '专业技能', A: 90, fullMark: 100, detail: '掌握React/Vue，熟悉TypeScript及前端工程化。' },
                { subject: '证书要求', A: 60, fullMark: 100, detail: '暂无硬性要求，有相关技术认证更好。' },
                { subject: '创新能力', A: 75, fullMark: 100, detail: '能够探索前端新前沿技术（如Web3, WebGL等）。' },
                { subject: '学习能力', A: 92, fullMark: 100, detail: '快速跟进前端生态的变化与框架迭代。' },
                { subject: '抗压能力', A: 88, fullMark: 100, detail: '能适应高保真UI还原与项目上线倒排期。' },
                { subject: '沟通能力', A: 85, fullMark: 100, detail: '与设计、后端及产品经理顺畅协作。' },
                { subject: '实习能力', A: 80, fullMark: 100, detail: '具备一定的大厂或开源项目实习经历。' },
                { subject: '领导力能', A: 65, fullMark: 100, detail: '能够带领小微前端团队攻坚。' },
                { subject: '解决问题能力', A: 85, fullMark: 100, detail: '快速定位线上bug，具备独立攻克难题的能力。' },
                { subject: '商业敏感度', A: 70, fullMark: 100, detail: '理解业务目标，在前端交互上限提升业务指标。' },
                { subject: '执行力', A: 95, fullMark: 100, detail: '能够像素级还原设计稿按时交付。' },
                { subject: '价值观匹配', A: 90, fullMark: 100, detail: '拥抱变化，极致的用户体验追求。' },
            ]
        },
        graph: {
            verticalNodes: [
                { id: '1', position: { x: 250, y: 50 }, data: { label: '初级前端工程师 (Junior)' }, style: { background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 220, textAlign: 'center' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
                { id: '2', position: { x: 250, y: 150 }, data: { label: '中级前端工程师 (Mid)' }, style: { background: '#eff6ff', border: '1px solid #93c5fd', color: '#1d4ed8', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 220, textAlign: 'center' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
                { id: '3', position: { x: 250, y: 250 }, data: { label: '高级前端工程师 (Senior)' }, style: { background: '#dbeafe', border: '1px solid #60a5fa', color: '#1e40af', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, width: 220, textAlign: 'center', boxShadow: '0 4px 6px -1px rgb(59 130 246 / 0.1)' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
                { id: '4', position: { x: 100, y: 380 }, data: { label: '前端架构师 (Architect)' }, style: { background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 180, textAlign: 'center' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
                { id: '5', position: { x: 400, y: 380 }, data: { label: '前端技术总监 (TL)' }, style: { background: '#ede9fe', border: '1px solid #c4b5fd', color: '#5b21b6', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 180, textAlign: 'center' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
            ],
            verticalEdges: [
                { id: 'e1-2', source: '1', target: '2', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }, style: { strokeWidth: 2, stroke: '#cbd5e1' } },
                { id: 'e2-3', source: '2', target: '3', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' }, style: { strokeWidth: 2, stroke: '#93c5fd' } },
                { id: 'e3-4', source: '3', target: '4', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#fbbf24' }, style: { strokeWidth: 2, stroke: '#fcd34d' } },
                { id: 'e3-5', source: '3', target: '5', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' }, style: { strokeWidth: 2, stroke: '#c4b5fd' } },
            ],
            horizontalNodes: [
                { id: 'h1', position: { x: 50, y: 180 }, data: { label: '前端开发工程师' }, style: { background: '#eff6ff', border: '1px solid #60a5fa', color: '#1e40af', borderRadius: '8px', padding: '15px 25px', fontSize: '15px', fontWeight: 600, width: 220, textAlign: 'center', boxShadow: '0 4px 6px -1px rgb(59 130 246 / 0.1)' }, sourcePosition: Position.Right, targetPosition: Position.Left },
                { id: 'h2', position: { x: 450, y: 50 }, data: { label: '产品经理 (PM)' }, style: { background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 200, textAlign: 'center' }, sourcePosition: Position.Left, targetPosition: Position.Right },
                { id: 'h3', position: { x: 450, y: 180 }, data: { label: '全栈开发工程师' }, style: { background: '#fdf4ff', border: '1px solid #f0abfc', color: '#86198f', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 200, textAlign: 'center' }, sourcePosition: Position.Left, targetPosition: Position.Right },
                { id: 'h4', position: { x: 450, y: 310 }, data: { label: 'UI/UX 设计师' }, style: { background: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 200, textAlign: 'center' }, sourcePosition: Position.Left, targetPosition: Position.Right },
            ],
            horizontalEdges: [
                { id: 'eh1-2', source: 'h1', target: 'h2', animated: true, label: '懂技术，转产品', labelStyle: { fill: '#166534', fontWeight: 500, fontSize: 12 }, labelBgStyle: { fill: '#f0fdf4', color: '#fff', fillOpacity: 0.8 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#4ade80' }, style: { strokeWidth: 2, stroke: '#86efac' } },
                { id: 'eh1-3', source: 'h1', target: 'h3', animated: true, label: '补充后端架构技能', labelStyle: { fill: '#86198f', fontWeight: 500, fontSize: 12 }, labelBgStyle: { fill: '#fdf4ff', color: '#fff', fillOpacity: 0.8 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#e879f9' }, style: { strokeWidth: 2, stroke: '#f0abfc' } },
                { id: 'eh1-4', source: 'h1', target: 'h4', animated: true, label: '懂实现，转交互设计', labelStyle: { fill: '#9a3412', fontWeight: 500, fontSize: 12 }, labelBgStyle: { fill: '#fff7ed', color: '#fff', fillOpacity: 0.8 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#fb923c' }, style: { strokeWidth: 2, stroke: '#fdba74' } },
            ]
        }
    },
    '后端开发工程师': {
        profile: {
            title: '后端开发工程师',
            department: '研发线',
            industry: '互联网/软件',
            tag: '核心',
            description: '负责核心业务逻辑与数据处理功能设计与开发，构建高并发、高可用后端服务架构，保障数据安全与系统稳定。',
            skills: ['Java/Go', 'Spring Boot', '微服务', '数据库设计', '高并发处理'],
            radarData: [
                { subject: '专业技能', A: 95, fullMark: 100, detail: '精通Java/Go，熟悉Spring Boot、微服务、各种数据库结构设计及缓存机制。' },
                { subject: '证书要求', A: 65, fullMark: 100, detail: '无硬性要求，云原生架构(CKA等)认证加分。' },
                { subject: '创新能力', A: 70, fullMark: 100, detail: '探索更优的高并发、高可用架构方案。' },
                { subject: '学习能力', A: 90, fullMark: 100, detail: '持续跟进云原生架构、底层基础设施生态。' },
                { subject: '抗压能力', A: 90, fullMark: 100, detail: '能应对高吞吐量大促期间各种突发容量及性能压力。' },
                { subject: '沟通能力', A: 80, fullMark: 100, detail: '能同前端约定良好API并与多服务协同开发。' },
                { subject: '实习能力', A: 85, fullMark: 100, detail: '拥有一线互联网高并发或复杂业务后台开发实习经历。' },
                { subject: '领导力能', A: 75, fullMark: 100, detail: '能推进跨部门联调，甚至作为技术PM协调项目。' },
                { subject: '解决问题能力', A: 95, fullMark: 100, detail: '具备通过看日志与监控迅速排查链路问题的能力。' },
                { subject: '商业敏感度', A: 65, fullMark: 100, detail: '对业务数据的准确性、安全性理解透彻。' },
                { subject: '执行力', A: 90, fullMark: 100, detail: '严谨细致地完成业务需求并覆盖单元测试。' },
                { subject: '价值观匹配', A: 95, fullMark: 100, detail: '具备敬畏生产环境、稳定压倒一切的心态。' },
            ]
        },
        graph: {
            verticalNodes: [
                { id: 'v1', position: { x: 250, y: 50 }, data: { label: '初级后端工程师 (Junior)' }, style: { background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 220, textAlign: 'center' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
                { id: 'v2', position: { x: 250, y: 150 }, data: { label: '中级后端工程师 (Mid)' }, style: { background: '#eff6ff', border: '1px solid #93c5fd', color: '#1d4ed8', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 220, textAlign: 'center' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
                { id: 'v3', position: { x: 250, y: 250 }, data: { label: '高级后端工程师 (Senior)' }, style: { background: '#dbeafe', border: '1px solid #60a5fa', color: '#1e40af', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, width: 220, textAlign: 'center', boxShadow: '0 4px 6px -1px rgb(59 130 246 / 0.1)' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
                { id: 'v4', position: { x: 100, y: 380 }, data: { label: '后端架构师 (Architect)' }, style: { background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 180, textAlign: 'center' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
                { id: 'v5', position: { x: 400, y: 380 }, data: { label: '后端技术总监 (TL)' }, style: { background: '#ede9fe', border: '1px solid #c4b5fd', color: '#5b21b6', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 180, textAlign: 'center' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
            ],
            verticalEdges: [
                { id: 'e1-2', source: 'v1', target: 'v2', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }, style: { strokeWidth: 2, stroke: '#cbd5e1' } },
                { id: 'e2-3', source: 'v2', target: 'v3', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' }, style: { strokeWidth: 2, stroke: '#93c5fd' } },
                { id: 'e3-4', source: 'v3', target: 'v4', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#fbbf24' }, style: { strokeWidth: 2, stroke: '#fcd34d' } },
                { id: 'e3-5', source: 'v3', target: 'v5', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' }, style: { strokeWidth: 2, stroke: '#c4b5fd' } },
            ],
            horizontalNodes: [
                { id: 'h1', position: { x: 50, y: 180 }, data: { label: '后端开发工程师' }, style: { background: '#eff6ff', border: '1px solid #60a5fa', color: '#1e40af', borderRadius: '8px', padding: '15px 25px', fontSize: '15px', fontWeight: 600, width: 220, textAlign: 'center', boxShadow: '0 4px 6px -1px rgb(59 130 246 / 0.1)' }, sourcePosition: Position.Right, targetPosition: Position.Left },
                { id: 'h2', position: { x: 450, y: 50 }, data: { label: '产品经理 (PM)' }, style: { background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 200, textAlign: 'center' }, sourcePosition: Position.Left, targetPosition: Position.Right },
                { id: 'h3', position: { x: 450, y: 180 }, data: { label: '大数据工程师' }, style: { background: '#fdf4ff', border: '1px solid #f0abfc', color: '#86198f', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 200, textAlign: 'center' }, sourcePosition: Position.Left, targetPosition: Position.Right },
                { id: 'h4', position: { x: 450, y: 310 }, data: { label: 'DevOps工程师' }, style: { background: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 200, textAlign: 'center' }, sourcePosition: Position.Left, targetPosition: Position.Right },
            ],
            horizontalEdges: [
                { id: 'eh1-2', source: 'h1', target: 'h2', animated: true, label: '懂技术，转产品', labelStyle: { fill: '#166534', fontWeight: 500, fontSize: 12 }, labelBgStyle: { fill: '#f0fdf4', color: '#fff', fillOpacity: 0.8 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#4ade80' }, style: { strokeWidth: 2, stroke: '#86efac' } },
                { id: 'eh1-3', source: 'h1', target: 'h3', animated: true, label: '进阶数据处理', labelStyle: { fill: '#86198f', fontWeight: 500, fontSize: 12 }, labelBgStyle: { fill: '#fdf4ff', color: '#fff', fillOpacity: 0.8 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#e879f9' }, style: { strokeWidth: 2, stroke: '#f0abfc' } },
                { id: 'eh1-4', source: 'h1', target: 'h4', animated: true, label: '偏向运维架构', labelStyle: { fill: '#9a3412', fontWeight: 500, fontSize: 12 }, labelBgStyle: { fill: '#fff7ed', color: '#fff', fillOpacity: 0.8 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#fb923c' }, style: { strokeWidth: 2, stroke: '#fdba74' } },
            ]
        }
    },
    '产品经理': {
        profile: {
            title: '产品经理',
            department: '产品线',
            industry: '互联网/软件',
            tag: '枢纽',
            description: '发掘用户需求，定义产品功能与体验，协调设计、研发、测试团队落地产品，并对产品生命周期负责。',
            skills: ['需求分析', '原型设计', '项目管理', '数据分析', '用户同理心'],
            radarData: [
                { subject: '专业技能', A: 85, fullMark: 100, detail: '掌握原型设计工具，精通需求分析和用户洞察。' },
                { subject: '证书要求', A: 75, fullMark: 100, detail: 'PMP、NPDP等产品/项目管理证书优先。' },
                { subject: '创新能力', A: 90, fullMark: 100, detail: '结合行业趋势，挖掘新的产品形态和商业模式。' },
                { subject: '学习能力', A: 85, fullMark: 100, detail: '快速理解所在行业及竞品、新技术的演进。' },
                { subject: '抗压能力', A: 92, fullMark: 100, detail: '处理多方需求冲突，扛住目标交付的压力。' },
                { subject: '沟通能力', A: 95, fullMark: 100, detail: '极强的向下扎根与向上汇报，甚至跨部门说服能力。' },
                { subject: '实习能力', A: 80, fullMark: 100, detail: '有互联网头部公司或核心业务线产品实习经历。' },
                { subject: '领导力能', A: 85, fullMark: 100, detail: '无授权领导力，能够驱动不归属自己的研发与设计团队。' },
                { subject: '解决问题能力', A: 90, fullMark: 100, detail: '从复杂业务背景中提炼伪需求并提出最优产品解。' },
                { subject: '商业敏感度', A: 95, fullMark: 100, detail: '极高商业嗅觉，对商业转化率负责，追求投入产出比。' },
                { subject: '执行力', A: 92, fullMark: 100, detail: '推动项目如期上线、验收并追踪上线后数据。' },
                { subject: '价值观匹配', A: 95, fullMark: 100, detail: '用户第一，具有主人翁精神，对结果负责。' },
            ]
        },
        graph: {
            verticalNodes: [
                { id: 'v1', position: { x: 250, y: 50 }, data: { label: '产品助理 (APM)' }, style: { background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 220, textAlign: 'center' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
                { id: 'v2', position: { x: 250, y: 150 }, data: { label: '产品经理 (PM)' }, style: { background: '#eff6ff', border: '1px solid #93c5fd', color: '#1d4ed8', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 220, textAlign: 'center' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
                { id: 'v3', position: { x: 250, y: 250 }, data: { label: '高级产品经理 (Senior)' }, style: { background: '#dbeafe', border: '1px solid #60a5fa', color: '#1e40af', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, width: 220, textAlign: 'center', boxShadow: '0 4px 6px -1px rgb(59 130 246 / 0.1)' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
                { id: 'v4', position: { x: 100, y: 380 }, data: { label: '产品专家/架构师' }, style: { background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 180, textAlign: 'center' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
                { id: 'v5', position: { x: 400, y: 380 }, data: { label: '产品总监 (PD)' }, style: { background: '#ede9fe', border: '1px solid #c4b5fd', color: '#5b21b6', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 180, textAlign: 'center' }, sourcePosition: Position.Bottom, targetPosition: Position.Top },
            ],
            verticalEdges: [
                { id: 'e1-2', source: 'v1', target: 'v2', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }, style: { strokeWidth: 2, stroke: '#cbd5e1' } },
                { id: 'e2-3', source: 'v2', target: 'v3', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' }, style: { strokeWidth: 2, stroke: '#93c5fd' } },
                { id: 'e3-4', source: 'v3', target: 'v4', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#fbbf24' }, style: { strokeWidth: 2, stroke: '#fcd34d' } },
                { id: 'e3-5', source: 'v3', target: 'v5', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' }, style: { strokeWidth: 2, stroke: '#c4b5fd' } },
            ],
            horizontalNodes: [
                { id: 'h1', position: { x: 50, y: 180 }, data: { label: '产品经理' }, style: { background: '#eff6ff', border: '1px solid #60a5fa', color: '#1e40af', borderRadius: '8px', padding: '15px 25px', fontSize: '15px', fontWeight: 600, width: 220, textAlign: 'center', boxShadow: '0 4px 6px -1px rgb(59 130 246 / 0.1)' }, sourcePosition: Position.Right, targetPosition: Position.Left },
                { id: 'h2', position: { x: 450, y: 50 }, data: { label: '运营经理' }, style: { background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 200, textAlign: 'center' }, sourcePosition: Position.Left, targetPosition: Position.Right },
                { id: 'h3', position: { x: 450, y: 180 }, data: { label: '项目经理 (PMP)' }, style: { background: '#fdf4ff', border: '1px solid #f0abfc', color: '#86198f', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 200, textAlign: 'center' }, sourcePosition: Position.Left, targetPosition: Position.Right },
                { id: 'h4', position: { x: 450, y: 310 }, data: { label: '商业化变现专家' }, style: { background: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, width: 200, textAlign: 'center' }, sourcePosition: Position.Left, targetPosition: Position.Right },
            ],
            horizontalEdges: [
                { id: 'eh1-2', source: 'h1', target: 'h2', animated: true, label: '产品转运营', labelStyle: { fill: '#166534', fontWeight: 500, fontSize: 12 }, labelBgStyle: { fill: '#f0fdf4', color: '#fff', fillOpacity: 0.8 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#4ade80' }, style: { strokeWidth: 2, stroke: '#86efac' } },
                { id: 'eh1-3', source: 'h1', target: 'h3', animated: true, label: '专注流程管理', labelStyle: { fill: '#86198f', fontWeight: 500, fontSize: 12 }, labelBgStyle: { fill: '#fdf4ff', color: '#fff', fillOpacity: 0.8 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#e879f9' }, style: { strokeWidth: 2, stroke: '#f0abfc' } },
                { id: 'eh1-4', source: 'h1', target: 'h4', animated: true, label: '偏向业务营收', labelStyle: { fill: '#9a3412', fontWeight: 500, fontSize: 12 }, labelBgStyle: { fill: '#fff7ed', color: '#fff', fillOpacity: 0.8 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#fb923c' }, style: { strokeWidth: 2, stroke: '#fdba74' } },
            ]
        }
    }
};

export const jobList = Object.keys(jobsData);
