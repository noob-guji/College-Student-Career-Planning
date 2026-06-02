'use client';

import { useEffect } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Position,
    MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function JobKnowledgeGraph({ viewMode, graphData }: { viewMode: 'vertical' | 'horizontal', graphData?: any }) {
    const initialNodes = viewMode === 'vertical' ? graphData?.verticalNodes : graphData?.horizontalNodes;
    const initialEdges = viewMode === 'vertical' ? graphData?.verticalEdges : graphData?.horizontalEdges;

    const [nodes, setNodes, onNodesChange] = useNodesState<any>(initialNodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>(initialEdges || []);

    useEffect(() => {
        if (!graphData) return;
        if (viewMode === 'vertical') {
            setNodes(graphData.verticalNodes);
            setEdges(graphData.verticalEdges);
        } else {
            setNodes(graphData.horizontalNodes);
            setEdges(graphData.horizontalEdges);
        }
    }, [viewMode, graphData, setNodes, setEdges]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            attributionPosition="bottom-right"
            minZoom={0.2}
            maxZoom={1.5}
            className="bg-slate-50 absolute inset-0"
        >
            <Controls className="bg-white shadow-sm border border-slate-200 fill-slate-600" />
            <MiniMap
                nodeColor={(node) => {
                    if (node.style?.background) return node.style.background as string;
                    return '#e2e8f0';
                }}
                maskColor="rgba(248, 250, 252, 0.6)"
                className="border border-slate-200 rounded-lg overflow-hidden shadow-sm hidden md:block !bg-white"
                zoomable
                pannable
            />
            <Background color="#cbd5e1" gap={20} size={1.5} />
        </ReactFlow>
    );
}
