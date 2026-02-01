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
 * Transform tree state into React Flow nodes and edges using Vine Layout
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

    // 1. Layout Constants (Max Dimensions for stability)
    const { w: LAYOUT_W, h: DEFAULT_H } = ZOOM_DIMENSIONS[3];
    const X_GAP = 60;
    const Y_GAP = 80;

    // Helper to calculate dynamic height for Level 3 using Shadow DOM measurement
    function calculateNodeHeight(content: string, zoomLevel: ZoomLevel): number {
        if (zoomLevel !== 3) return ZOOM_DIMENSIONS[zoomLevel].h;

        const BASE_CHROME_HEIGHT = 90; // Reduced to be tighter (Header + Footer + Padding ~ 90px)

        // Safety check for SSR/Node environment
        if (typeof document === 'undefined') {
            return ZOOM_DIMENSIONS[zoomLevel].h;
        }

        // Create a shadow element for measurement if it doesn't exist
        let shadowContainer = document.getElementById('node-measurement-shadow');
        if (!shadowContainer) {
            shadowContainer = document.createElement('div');
            shadowContainer.id = 'node-measurement-shadow';
            shadowContainer.style.position = 'absolute';
            shadowContainer.style.visibility = 'hidden';
            shadowContainer.style.height = 'auto';
            shadowContainer.style.width = '752px'; // 800px - 48px padding
            shadowContainer.style.top = '-9999px';
            shadowContainer.style.left = '-9999px';

            // Base styles matching FullNode
            shadowContainer.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
            shadowContainer.style.fontSize = '14px';
            shadowContainer.style.lineHeight = '1.625'; // leading-relaxed
            shadowContainer.className = "prose prose-sm max-w-none";

            document.body.appendChild(shadowContainer);
        }

        const trimmedContent = content.trim();

        // Simulate ReactMarkdown rendering
        // Split by double newlines into paragraphs
        const paragraphs = trimmedContent.split(/\n\n+/);

        const html = paragraphs.map(p => {
            // Check if block looks like a list or headers
            if (p.match(/^(\s*[-*+]|\s*\d+\.)/m) || p.startsWith('#') || p.startsWith('```')) {
                // Preserve whitespace for lists/code/headers
                // We use inline pre-wrap to force preservation
                return `<div style="white-space: pre-wrap; margin-bottom: 1.14em;">${p}</div>`;
            }
            // Standard paragraph: collapse single newlines
            const normalized = p.replace(/\n/g, ' ');
            return `<p style="margin-bottom: 1.14em; margin-top: 1.14em;">${normalized}</p>`;
        }).join('');

        shadowContainer.innerHTML = html;

        const measuredHeight = shadowContainer.offsetHeight;

        // Clamp between 200 and 3000
        return Math.max(200, Math.min(3000, measuredHeight + BASE_CHROME_HEIGHT));
    }

    // Temporary storage for layout positions
    const layoutPositions: Record<string, { x: number; y: number; height: number }> = {};
    let currentLeafX = 0;

    /**
     * Pass 1: Post-Order Traversal to calculate X positions
     * Leaves get placed sequentially. Parents are centered over children.
     */
    function calculateXPositions(nodeId: string) {
        const node = treeNodes[nodeId];
        if (!node) return;

        // Calculate height upfront
        const height = calculateNodeHeight(node.content, zoomLevel);

        if (node.children.length === 0) {
            // Leaf node
            layoutPositions[nodeId] = { x: currentLeafX, y: 0, height };
            currentLeafX += LAYOUT_W + X_GAP;
        } else {
            // Process children first (Post-Order)
            node.children.forEach(childId => calculateXPositions(childId));

            // Calculate center based on first and last child
            const firstChild = layoutPositions[node.children[0]];
            const lastChild = layoutPositions[node.children[node.children.length - 1]];

            // Safety check in case children are missing from layoutPositions for some reason
            if (firstChild && lastChild) {
                const centerX = (firstChild.x + lastChild.x) / 2;
                layoutPositions[nodeId] = { x: centerX, y: 0, height };
            } else {
                // Fallback (should not strictly happen in valid tree)
                layoutPositions[nodeId] = { x: currentLeafX, y: 0, height };
                currentLeafX += LAYOUT_W + X_GAP;
            }
        }
    }

    /**
     * Pass 2: Pre-Order Traversal to calculate Y positions
     * Children are placed below parents regardless of neighbor heights.
     */
    function calculateYPositions(nodeId: string, currentY: number) {
        const node = treeNodes[nodeId];
        if (!node) return;

        if (layoutPositions[nodeId]) {
            layoutPositions[nodeId].y = currentY;
        }

        // Use the calculated height of the CURRENT node to determine where children start
        const currentHeight = layoutPositions[nodeId]?.height || DEFAULT_H;
        const nextY = currentY + currentHeight + Y_GAP;

        node.children.forEach(childId => calculateYPositions(childId, nextY));
    }

    // Execute Layout Passes
    calculateXPositions(rootId);
    calculateYPositions(rootId, 0);


    // 3. Highlight nodes (Exact selection only, no ancestors)
    const highlightedPaths = new Set<string>(highlightedNodeIds);

    // 4. Build Edges
    const edges: Edge[] = [];
    // We can iterate over layoutPositions or treeNodes. Iterating treeNodes ensures we check relationships.
    // Using Object.values(treeNodes) to check edges.
    Object.values(treeNodes).forEach((node) => {
        node.children.forEach((childId) => {
            // Edge exists if child exists
            if (!treeNodes[childId]) return;

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
                    // Use the prismatic gradient for all active/highlighted branches
                    stroke: (isHighlightedEdge || isOnBranch) ? 'url(#prismatic-gradient)' : '#cbd5e1',
                    // Thicker branches: 4px for highlight (was 3), 3px for active (was 2), 1px inactive
                    strokeWidth: isHighlightedEdge ? 4 : (isOnBranch ? 3 : 1),
                    filter: isHighlightedEdge ? 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.5))' : undefined,
                },
                animated: false,
            });
        });

        // NEW: Pruned edges (Visualization of summary connections)
        if (node.prunedNodeIds && node.prunedNodeIds.length > 0) {
            node.prunedNodeIds.forEach(sourceId => {
                if (!treeNodes[sourceId]) return;

                edges.push({
                    id: `prune-${sourceId}-${node.id}`,
                    source: sourceId,
                    target: node.id,
                    animated: true,
                    style: {
                        stroke: '#a855f7', // Purple-500 indicating "magic" or summary
                        strokeDasharray: '5,5',
                        strokeWidth: 2,
                        opacity: 0.6,
                    },
                    // Ensure these are behind everything else
                    zIndex: 0,
                });
            });
        }
    });

    // 5. Map to React Flow nodes with rendering offsets
    const nodeTypeMap: Record<ZoomLevel, GraphNode['type']> = {
        0: 'dot',
        1: 'label',
        2: 'preview',
        3: 'full',
    };

    // Get dimensions for actual rendering at current zoom
    const { w: RENDER_W, h: RENDER_H } = ZOOM_DIMENSIONS[zoomLevel];

    const graphNodes: Node<GraphNode['data']>[] = Object.values(treeNodes)
        .filter(node => layoutPositions[node.id]) // Only include nodes that were successfully laid out
        .map((treeNode) => {
            const pos = layoutPositions[treeNode.id];
            const isOnActiveBranch = activeBranchIds.has(treeNode.id);
            const isHighlighted = highlightedPaths.has(treeNode.id);

            // Opacity Logic: Always 1 unless in Level 3 Focus Mode
            const isDimmed = zoomLevel === 3 && focusedNodeId && !isOnActiveBranch && !isHighlighted;

            // Allow dynamic height override
            const renderHeight = zoomLevel === 3 ? pos.height : RENDER_H;

            return {
                id: treeNode.id,
                type: nodeTypeMap[zoomLevel],
                // Center the rendered node within its layout box
                // The layout position (pos.x, pos.y) is the top-left of the layout box?
                // Wait, in the previous dagre logic: x: pos.x - RENDER_W / 2
                // Dagre usually returns center coords.
                // My logic: X is centered. Y starts at 0, then 0 + H + Gap.
                // So Y is top of the node. X is center of the node (calculated from average of centers).
                // Let's verify X logic:
                // Leaf: x = currentLeafX (starts at 0). 
                // Wait, if I want to center, I should probably treat 'currentLeafX' as the "Left edge" of the next slot? 
                // Or center of the next slot?
                // `currentLeafX` initialized to 0. 
                // `layoutPositions[nodeId] = { x: currentLeafX, ... }` -> this suggests Left Edge?
                // Then `currentLeafX += LAYOUT_W + X_GAP`. 
                // If `x` is top-left, then `centerX = (leftChild.x + rightChild.x) / 2` works if width is uniform. 
                // Actually if `x` is left edge, average of left edges is the left edge of the parent (if 2 children). 
                // That aligns the Left edge of parent with the midpoint of the left edges of children. That's slightly off-center relative to the whole block.

                // Better approach for X:
                // Let `currentLeafX` be the center of the next leaf.
                // Start `currentLeafX = 0`.
                // For each leaf: `x = currentLeafX`. `currentLeafX += LAYOUT_W + X_GAP`.
                // This puts the first leaf at 0, second at width+gap, etc.
                // If we render at `x - RENDER_W/2`, it centers the ReactFlow node at `pos.x`.

                // Let's refine the Leaf X logic in the code above:
                // With `layoutPositions[nodeId] = { x: currentLeafX, ... }` and `currentLeafX` incrementing by Width+Gap.
                // This treats X as a coordinate.
                // Parent X = average of children X.
                // This works perfectly if X represents the CENTER of the node.
                // So, let's assume pos.x is CENTER.
                // But `dagre` returns Center X and Center Y.
                // My Y calculation: `currentNodeY = 0`, `childY = parentY + HEIGHT + GAP`.
                // If these are centers, distance should be `LAYOUT_H + GAP`? 
                // Distance between centers = `Height/2 + Gap + Height/2` = `Height + Gap`. 
                // Yes, that matches.

                // Correction for X:
                // `currentLeafX` starts at 0 used as center of first leaf?
                // Then next leaf is at `0 + LAYOUT_W + GAP`. Center-to-center distance is `LAYOUT_W + GAP`.
                // Distance = `Width/2 + Gap + Width/2` = `Width + Gap`.
                // Yes, that matches.

                // So: pos is CENTER.
                // React Flow position needs TOP-LEFT.
                // So `x: pos.x - RENDER_W / 2` is correct.
                //    `y: pos.y - RENDER_H / 2` is correct.

                position: {
                    x: pos.x - RENDER_W / 2, // Center alignment
                    y: pos.y, // Top alignment
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
                    // justifyContent: 'center', // Removed to prevent vertical centering issues
                    // alignItems: 'center',     // Removed so node stretches to fill layout box (fixed top alignment)
                    width: RENDER_W,
                    height: renderHeight,
                },
            };
        });

    return { nodes: graphNodes, edges };
}
