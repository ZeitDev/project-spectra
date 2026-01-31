import { useMemo } from 'react';
import { useTreeStore } from './useTreeStore';
import type { TreeNode } from '../types';
import { shallow } from 'zustand/shallow';

/**
 * Get all ancestor IDs from root to the given node (inclusive)
 */
export const getAncestorPath = (
    nodes: Record<string, TreeNode>,
    nodeId: string
): string[] => {
    const path: string[] = [];
    let current = nodes[nodeId];

    while (current) {
        path.unshift(current.id);
        current = current.parentId ? nodes[current.parentId] : undefined;
    }

    return path;
};

/**
 * Select the currently selected node
 */
export const useSelectedNode = () => {
    return useTreeStore((state) => {
        if (!state.selectedNodeId) return null;
        return state.nodes[state.selectedNodeId] ?? null;
    });
};

/**
 * Select the active branch path (array of IDs from root to selected node)
 * Uses shallow equality to prevent re-renders when array contents are the same
 */
export const useActiveBranchPath = (): string[] => {
    return useTreeStore((state) => {
        if (!state.selectedNodeId) return [];
        return getAncestorPath(state.nodes, state.selectedNodeId);
    }, shallow);
};

/**
 * Hook that returns active branch as a Set (memoized)
 */
export const useActiveBranch = (): Set<string> => {
    const path = useActiveBranchPath();
    return useMemo(() => new Set(path), [path]);
};

/**
 * Get all nodes as an array
 */
export const useAllNodes = () => {
    return useTreeStore((state) => Object.values(state.nodes));
};

/**
 * Get node count
 */
export const useNodeCount = () => {
    return useTreeStore((state) => Object.keys(state.nodes).length);
};
