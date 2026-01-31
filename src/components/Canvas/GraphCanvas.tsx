import { useCallback, useMemo, useEffect, useRef } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    useReactFlow,
    ReactFlowProvider,
    type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTreeStore } from '../../store/useTreeStore';
import { treeToReactFlow } from '../../adapters/graphAdapter';
import { DotNode } from '../Nodes/DotNode';
import { LabelNode } from '../Nodes/LabelNode';
import { PreviewNode } from '../Nodes/PreviewNode';
import { FullNode } from '../Nodes/FullNode';
import { ZOOM_DIMENSIONS } from '../../types';
import { useZoomLevel } from '../../hooks/useZoomLevel';

const nodeTypes = {
    dot: DotNode,
    label: LabelNode,
    preview: PreviewNode,
    full: FullNode,
};

function GraphCanvasInner() {
    // Get stable references to store values
    const store = useTreeStore();
    const {
        nodes,
        rootId,
        focusedNodeId,
        highlightedNodeIds,
        focusNode,
        toggleHighlight,
        clearHighlights
    } = store;

    // Use centralized zoom level hook
    const zoomLevel = useZoomLevel();
    const { fitView, setCenter, getZoom } = useReactFlow();
    const prevNodeCount = useRef(0);
    const lastPannedId = useRef<string | null>(null);
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Compute active branch path for focused node
    const activeBranch = useMemo(() => {
        if (!focusedNodeId) return new Set<string>();
        const path: string[] = [];
        let current = nodes[focusedNodeId];
        while (current) {
            path.push(current.id);
            current = current.parentId ? nodes[current.parentId] : (undefined as any);
        }
        return new Set(path);
    }, [nodes, focusedNodeId]);

    // Transform tree to React Flow format
    const { nodes: flowNodes, edges: flowEdges } = useMemo(
        () => treeToReactFlow(
            { nodes, rootId },
            zoomLevel,
            activeBranch,
            focusedNodeId,
            highlightedNodeIds
        ),
        [nodes, rootId, zoomLevel, activeBranch, focusedNodeId, highlightedNodeIds]
    );

    // Auto-pan to FOCUSED node
    useEffect(() => {
        if (focusedNodeId && focusedNodeId !== lastPannedId.current) {
            const node = flowNodes.find((n) => n.id === focusedNodeId);
            if (node) {
                lastPannedId.current = focusedNodeId;
                const currentZoom = getZoom();
                // Force Level 3 if not already deep enough
                const targetZoom = currentZoom >= 1.0 ? currentZoom : 1.1;

                const { w, h } = ZOOM_DIMENSIONS[zoomLevel];
                const centerX = node.position.x + w / 2;
                const centerY = node.position.y + h / 2;

                setCenter(centerX, centerY, { duration: 800, zoom: targetZoom });
            }
        } else if (!focusedNodeId) {
            lastPannedId.current = null;
        }
    }, [focusedNodeId, flowNodes, setCenter, getZoom, zoomLevel]);

    const onNodeClick: NodeMouseHandler = useCallback(
        (_event, node) => {
            // Cancel any pending single click timeout
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
                return; // Let the double click handler take over
            }

            // Start a timeout for single click
            clickTimeoutRef.current = setTimeout(() => {
                toggleHighlight(node.id);
                clickTimeoutRef.current = null;
            }, 250); // 250ms delay to distinguish from double click
        },
        [toggleHighlight]
    );

    const onNodeDoubleClick: NodeMouseHandler = useCallback(
        (_event, node) => {
            // Ensure single click timeout is cleared
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
            }
            focusNode(node.id);
        },
        [focusNode]
    );

    const onEdgeClick = useCallback(
        (_event: React.MouseEvent, edge: any) => {
            toggleHighlight(edge.target);
        },
        [toggleHighlight]
    );

    const onPaneClick = useCallback(() => {
        focusNode(null);
        clearHighlights();
    }, [focusNode, clearHighlights]);

    const onMoveStart = useCallback(
        (_event: any, _viewport: any) => {
            // React Flow passes the event as the first argument.
            // If it's a user-initiated move (mouse/touch), 'event' will be defined.
            // Programmatic moves (like fitView or setCenter) usually have a null/undefined event.
            if (_event && focusedNodeId) {
                focusNode(null);
            }
        },
        [focusedNodeId, focusNode]
    );

    // Fit view when first node is added
    useEffect(() => {
        const currentCount = Object.keys(nodes).length;
        if (currentCount > 0 && prevNodeCount.current === 0) {
            setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
        }
        prevNodeCount.current = currentCount;
    }, [nodes, fitView]);

    return (
        <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onMoveStart={onMoveStart}
            panOnScroll={false}
            zoomOnScroll={true}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            className="aurora-background"
        >
            <Background
                variant={BackgroundVariant.Dots}
                gap={24}
                size={1}
                color="rgba(139, 92, 246, 0.15)"
            />

        </ReactFlow>
    );
}

export function GraphCanvas() {
    return (
        <div className="w-full h-full relative">
            <ReactFlowProvider>
                <GraphCanvasInner />
            </ReactFlowProvider>

            {/* Prismatic Gradient Definition for Edges - Global SVG */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, pointerEvents: 'none' }}>
                <defs>
                    <linearGradient
                        id="prismatic-gradient"
                        gradientUnits="userSpaceOnUse"
                        x1="0" y1="0"
                        x2="1000" y2="1000"
                        spreadMethod="repeat"
                    >
                        <stop offset="0%" stopColor="#1e1b4b" />   {/* Indigo-950 */}
                        <stop offset="50%" stopColor="#38bdf8" />   {/* Sky-400 */}
                        <stop offset="100%" stopColor="#a855f7" />  {/* Purple-500 */}
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
}
