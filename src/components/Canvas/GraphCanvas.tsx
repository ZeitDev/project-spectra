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
import { useUIStore } from '../../store/useUIStore';
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
        setLastFocusedNode,
        toggleHighlight,
        highlightBranch,
        clearHighlights
    } = store;

    // Use centralized zoom level hook
    const zoomLevel = useZoomLevel();
    const { fitView, setCenter, getZoom, zoomTo, getViewport, setViewport } = useReactFlow();
    const prevNodeCount = useRef(0);
    const lastPannedId = useRef<string | null>(null);


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
    const { isSidebarCollapsed } = useUIStore();
    useEffect(() => {
        if (focusedNodeId && focusedNodeId !== lastPannedId.current) {
            const node = flowNodes.find((n) => n.id === focusedNodeId);
            if (node) {
                lastPannedId.current = focusedNodeId;
                const currentZoom = getZoom();
                // Force Level 3 if not already deep enough
                const targetZoom = currentZoom >= 1.0 ? currentZoom : 1.1;

                const { w, h } = ZOOM_DIMENSIONS[zoomLevel];
                let centerX = node.position.x + w / 2;
                const centerY = node.position.y + h / 2;

                // Adjust for sidebar if it is OPEN
                if (!isSidebarCollapsed) {
                    const sidebarOffset = 140; // Approx half of sidebar width + margin
                    centerX = centerX - (sidebarOffset / targetZoom);
                }

                setCenter(centerX, centerY, { duration: 800, zoom: targetZoom });
            }
        } else if (!focusedNodeId) {
            lastPannedId.current = null;
        }
    }, [focusedNodeId, flowNodes, setCenter, getZoom, zoomLevel, isSidebarCollapsed]);

    const onNodeClick: NodeMouseHandler = useCallback(
        (_event, node) => {
            focusNode(null);
            setLastFocusedNode(node.id);
            clearHighlights();
            toggleHighlight(node.id);
        },
        [focusNode, setLastFocusedNode, clearHighlights, toggleHighlight]
    );

    const onNodeContextMenu: NodeMouseHandler = useCallback(
        (event, node) => {
            event.preventDefault();
            // Prevent context menu action if we just finished zooming
            if (hasZoomed.current) return;
            // Single RMB multiselects every node clicked
            toggleHighlight(node.id);
        },
        [toggleHighlight]
    );

    const onNodeDoubleClick: NodeMouseHandler = useCallback(
        (_event, node) => {
            focusNode(node.id);
            highlightBranch(node.id);
        },
        [focusNode, highlightBranch]
    );

    const onEdgeClick = useCallback(
        (_event: React.MouseEvent, edge: any) => {
            // RMB on edge is not explicitly requested, but for symmetry we can toggle highlight
            // However, the request says "Single RMB multiselects every node clicked"
            // Let's stick to the requirements.
        },
        []
    );

    const onEdgeDoubleClick = useCallback(
        (_event: React.MouseEvent, edge: any) => {
            highlightBranch(edge.target);
        },
        [highlightBranch]
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

    // Custom Zoom Logic
    const isZooming = useRef(false);
    const zoomStartMouseY = useRef(0);
    const zoomStartLevel = useRef(1);
    const hasZoomed = useRef(false);
    const zoomMouseX = useRef(0);
    const zoomMouseY = useRef(0);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isZooming.current) return;

            // Safety check: if right mouse button is not held, stop zooming
            if ((e.buttons & 2) === 0) {
                isZooming.current = false;
                return;
            }

            const deltaY = zoomStartMouseY.current - e.clientY;

            // Only consider it a zoom action if moved significantly or if already zooming
            if (!hasZoomed.current && Math.abs(deltaY) > 5) {
                hasZoomed.current = true;
            }

            if (hasZoomed.current) {
                // Dragging UP (positive delta) -> Zoom In
                const sensitivity = 0.0015;
                const newZoom = zoomStartLevel.current * Math.exp(deltaY * sensitivity);
                // Clamp zoom to reasonable limits (matching minZoom/maxZoom props)
                const clampedZoom = Math.min(Math.max(newZoom, 0.1), 2.5);


                // Zoom to cursor position
                const viewport = getViewport();
                const { x: viewportX, y: viewportY, zoom: currentZoom } = viewport;

                // Calculate the position of the mouse in the flow coordinate system
                const mouseXInFlow = (zoomMouseX.current - viewportX) / currentZoom;
                const mouseYInFlow = (zoomMouseY.current - viewportY) / currentZoom;

                // Calculate new viewport position to keep the mouse at the same point
                const newViewportX = zoomMouseX.current - mouseXInFlow * clampedZoom;
                const newViewportY = zoomMouseY.current - mouseYInFlow * clampedZoom;

                setViewport({ x: newViewportX, y: newViewportY, zoom: clampedZoom }, { duration: 0 });
            }
        };

        const handleMouseUp = () => {
            isZooming.current = false;
        };

        const handleContextMenu = (e: MouseEvent) => {
            // Prevent context menu if we're zooming or have zoomed
            if (isZooming.current || hasZoomed.current) {
                e.preventDefault();
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('contextmenu', handleContextMenu);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [zoomTo]);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        // Check for Right Click (button 2)
        if (e.button === 2) {
            e.preventDefault(); // Prevent context menu from opening
            isZooming.current = true;
            zoomStartMouseY.current = e.clientY;
            zoomStartLevel.current = getZoom();
            hasZoomed.current = false;
            // Store the mouse position for zoom-to-cursor
            zoomMouseX.current = e.clientX;
            zoomMouseY.current = e.clientY;
        }
    }, [getZoom]);

    const onPaneContextMenu = useCallback(
        (event: any) => {
            if (hasZoomed.current) {
                event.preventDefault();
            }
        },
        []
    );

    return (
        <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            onEdgeClick={onEdgeClick}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onPaneClick={onPaneClick}
            onMoveStart={onMoveStart}
            onMouseDown={onMouseDown}
            panOnScroll={true}
            zoomOnScroll={false}
            panOnDrag={[0]} // Only left click pans
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
