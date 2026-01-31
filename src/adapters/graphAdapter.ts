import dagre from 'dagre';
import type { TreeNode, GraphNode, GraphEdge, TreeState, ZoomLevel } from '../types';
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
    selectedNodeId: string | null
): { nodes: Node<GraphNode['data']>[]; edges: Edge[] } {
    const { nodes: treeNodes, rootId } = state;
    if (!rootId) return { nodes: [], edges: [] };

    // Get dimensions for current zoom level
    const { w: NODE_WIDTH, h: NODE_HEIGHT } = ZOOM_DIMENSIONS[zoomLevel];

    // 1. Build dagre graph for layout
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 120 });
    g.setDefaultEdgeLabel(() => ({}));

    // 2. Add all nodes with zoom-aware dimensions
    Object.values(treeNodes).forEach((node) => {
        g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    // 3. Add all edges to dagre
    const edges: Edge[] = [];
    Object.values(treeNodes).forEach((node) => {
        node.children.forEach((childId) => {
            g.setEdge(node.id, childId);
            const isOnBranch =
                activeBranchIds.has(node.id) && activeBranchIds.has(childId);
            edges.push({
                id: `${node.id}-${childId}`,
                source: node.id,
                target: childId,
                style: {
                    opacity: isOnBranch ? 1 : 0.2,
                    stroke: isOnBranch ? '#8b5cf6' : '#94a3b8',
                    strokeWidth: isOnBranch ? 2 : 1,
                },
            });
        });
    });

    // 4. Run dagre layout
    dagre.layout(g);

    // 5. Map to React Flow nodes
    const nodeTypeMap: Record<ZoomLevel, GraphNode['type']> = {
        0: 'dot',
        1: 'label',
        2: 'preview',
        3: 'full',
    };

    const graphNodes: Node<GraphNode['data']>[] = Object.values(treeNodes).map(
        (treeNode) => {
            const pos = g.node(treeNode.id);
            const isOnActiveBranch = activeBranchIds.has(treeNode.id);

            return {
                id: treeNode.id,
                type: nodeTypeMap[zoomLevel],
                position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
                data: {
                    treeNode,
                    isOnActiveBranch,
                    isSelected: treeNode.id === selectedNodeId,
                    depth: getDepth(treeNodes, treeNode.id),
                },
                style: {
                    opacity: isOnActiveBranch ? 1 : 0.3,
                },
            };
        }
    );

    return { nodes: graphNodes, edges };
}
