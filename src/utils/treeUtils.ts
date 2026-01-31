import type { TreeNode } from '../types';

/**
 * Get all ancestor IDs from root to the given node (inclusive)
 */
export function getAncestorPath(
    nodes: Record<string, TreeNode>,
    nodeId: string
): string[] {
    const path: string[] = [];
    let current = nodes[nodeId];

    while (current) {
        path.unshift(current.id);
        current = current.parentId ? nodes[current.parentId] : undefined;
    }

    return path;
}

/**
 * Get all descendant IDs of a node (including the node itself)
 */
export function getDescendants(
    nodes: Record<string, TreeNode>,
    nodeId: string
): string[] {
    const node = nodes[nodeId];
    if (!node) return [];

    return [nodeId, ...node.children.flatMap((childId) => getDescendants(nodes, childId))];
}

/**
 * Get the depth of a node in the tree
 */
export function getNodeDepth(nodes: Record<string, TreeNode>, nodeId: string): number {
    let depth = 0;
    let current = nodes[nodeId];

    while (current?.parentId) {
        depth++;
        current = nodes[current.parentId];
    }

    return depth;
}

/**
 * Get sibling nodes (nodes with the same parent)
 */
export function getSiblings(nodes: Record<string, TreeNode>, nodeId: string): TreeNode[] {
    const node = nodes[nodeId];
    if (!node || !node.parentId) return [];

    const parent = nodes[node.parentId];
    if (!parent) return [];

    return parent.children
        .filter((id) => id !== nodeId)
        .map((id) => nodes[id])
        .filter(Boolean);
}
