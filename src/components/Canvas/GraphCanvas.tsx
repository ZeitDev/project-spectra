import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    useReactFlow,
    ReactFlowProvider,
    useOnViewportChange,
    type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTreeStore } from '../../store/useTreeStore';
import { treeToReactFlow } from '../../adapters/graphAdapter';
import { DotNode } from '../Nodes/DotNode';
import { LabelNode } from '../Nodes/LabelNode';
import { PreviewNode } from '../Nodes/PreviewNode';
import { FullNode } from '../Nodes/FullNode';
import { type ZoomLevel, ZOOM_DIMENSIONS } from '../../types';

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

    // Local state for zoom level
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(2);
    const { fitView, setCenter, getZoom } = useReactFlow();
    const prevNodeCount = useRef(0);
    const lastPannedId = useRef<string | null>(null);

    // Handle viewport changes for zoom level
    useOnViewportChange({
        onChange: useCallback(({ zoom }: { zoom: number }) => {
            let level: ZoomLevel;
            if (zoom < 0.3) level = 0;
            else if (zoom < 0.6) level = 1;
            else if (zoom < 1.0) level = 2;
            else level = 3;
            setZoomLevel((prev) => (prev !== level ? level : prev));
        }, []),
    });

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
            toggleHighlight(node.id);
        },
        [toggleHighlight]
    );

    const onNodeDoubleClick: NodeMouseHandler = useCallback(
        (_event, node) => {
            focusNode(node.id);
        },
        [focusNode]
    );

    const onPaneClick = useCallback(() => {
        focusNode(null);
        clearHighlights();
    }, [focusNode, clearHighlights]);

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
            onPaneClick={onPaneClick}
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
        <div className="w-full h-full">
            <ReactFlowProvider>
                <GraphCanvasInner />
            </ReactFlowProvider>
        </div>
    );
}
