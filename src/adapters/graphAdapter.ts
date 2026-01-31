import dagre from 'dagre';
import type { TreeNode, GraphNode, TreeState, ZoomLevel } from '../types';
import { ZOOM_DIMENSIONS } from '../types';
import type { Node, Edge } from '@xyflow/react';

/**
 * Get depth of a node in the tree
 */
function getDepth(nodes: Record<string, TreeNode>, nodeId: string): number {
    let depth = 0;
    let current = nodes[nodeId];
    while (current?.parentId) {
        depth++;
        current = nodes[current.parentId];
    }
    return depth;
}

/**
 * Transform tree state into React Flow nodes and edges
 */
export function treeToReactFlow(
    state: Pick<TreeState, 'nodes' | 'rootId'>,
    zoomLevel: ZoomLevel,
    activeBranchIds: Set<string>,
    focusedNodeId: string | null,
    highlightedNodeIds: string[]
): { nodes: Node<GraphNode['data']>[]; edges: Edge[] } {
    const { nodes: treeNodes, rootId } = state;
    if (!rootId) return { nodes: [], edges: [] };

    // 1. Always use MAX dimensions for layout to ensure spatial stability
    const { w: LAYOUT_W, h: LAYOUT_H } = ZOOM_DIMENSIONS[3];

    // 2. Build dagre graph for layout
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 120 });
    g.setDefaultEdgeLabel(() => ({}));

    // 3. Add all nodes with FIXED layout dimensions
    Object.values(treeNodes).forEach((node) => {
        g.setNode(node.id, { width: LAYOUT_W, height: LAYOUT_H });
    });

    // 4. Calculate highlighted paths (all ancestors of highlighted IDs)
    const highlightedPaths = new Set<string>();
    highlightedNodeIds.forEach(id => {
        let current = treeNodes[id];
        while (current) {
            highlightedPaths.add(current.id);
            current = current.parentId ? treeNodes[current.parentId] : (undefined as any);
        }
    });

    // 5. Add all edges to dagre
    const edges: Edge[] = [];
    Object.values(treeNodes).forEach((node) => {
        node.children.forEach((childId) => {
            g.setEdge(node.id, childId);

            // Branch is only active if focus mode is on
            const isOnBranch = focusedNodeId ? (activeBranchIds.has(node.id) && activeBranchIds.has(childId)) : true;

            // Edge is highlighted if BOTH nodes are in a highlighted path
            const isHighlightedEdge = highlightedPaths.has(node.id) && highlightedPaths.has(childId);

            // Opacity Logic: Always 1 unless in Level 3 Focus Mode
            const isDimmed = zoomLevel === 3 && focusedNodeId && !isOnBranch && !isHighlightedEdge;

            edges.push({
                id: `${node.id}-${childId}`,
                source: node.id,
                target: childId,
                style: {
                    opacity: isDimmed ? 0.1 : 1,
                    stroke: isHighlightedEdge ? '#d8b4fe' : (isOnBranch ? '#8b5cf6' : '#94a3b8'), // Lighter violet for highlight
                    strokeWidth: isHighlightedEdge ? 3 : (isOnBranch ? 2 : 1),
                    filter: isHighlightedEdge ? 'drop-shadow(0 0 6px #a78bfa)' : undefined,
                },
                animated: false,
            });
        });
    });

    // 6. Run dagre layout
    dagre.layout(g);

    // 7. Map to React Flow nodes with rendering offsets
    const nodeTypeMap: Record<ZoomLevel, GraphNode['type']> = {
        0: 'dot',
        1: 'label',
        2: 'preview',
        3: 'full',
    };

    // Get dimensions for actual rendering at current zoom
    const { w: RENDER_W, h: RENDER_H } = ZOOM_DIMENSIONS[zoomLevel];

    const graphNodes: Node<GraphNode['data']>[] = Object.values(treeNodes).map(
        (treeNode) => {
            const pos = g.node(treeNode.id);
            const isOnActiveBranch = activeBranchIds.has(treeNode.id);
            const isHighlighted = highlightedPaths.has(treeNode.id);

            // Opacity Logic: Always 1 unless in Level 3 Focus Mode
            const isDimmed = zoomLevel === 3 && focusedNodeId && !isOnActiveBranch && !isHighlighted;

            return {
                id: treeNode.id,
                type: nodeTypeMap[zoomLevel],
                // Center the rendered node within its layout box
                position: {
                    x: pos.x - RENDER_W / 2,
                    y: pos.y - RENDER_H / 2
                },
                data: {
                    treeNode,
                    isOnActiveBranch,
                    isHighlighted,
                    isSelected: treeNode.id === focusedNodeId,
                    depth: getDepth(treeNodes, treeNode.id),
                },
                style: {
                    opacity: isDimmed ? 0.1 : 1,
                    // Bring highlighted/active nodes to front in overlap scenarios
                    zIndex: (isOnActiveBranch || isHighlighted) ? 10 : 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: RENDER_W,
                    height: RENDER_H,
                },
            };
        }
    );

    return { nodes: graphNodes, edges };
}
