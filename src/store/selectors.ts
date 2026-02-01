import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTreeStore } from './useTreeStore';
import type { TreeNode } from '../types';

/**
 * Get all ancestor IDs from root to the given node (inclusive)
 */
export const getAncestorPath = (
    nodes: Record<string, TreeNode>,
    nodeId: string
): string[] => {
    const path: string[] = [];
    let current: TreeNode | undefined = nodes[nodeId];

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
        if (!state.focusedNodeId) return null;
        return state.nodes[state.focusedNodeId] ?? null;
    });
};

/**
 * Select the active branch path (array of IDs from root to selected node)
 * Uses shallow equality to prevent re-renders when array contents are the same
 */
export const useActiveBranchPath = (): string[] => {
    return useTreeStore(
        useShallow((state) => {
            if (!state.focusedNodeId) return [];
            return getAncestorPath(state.nodes, state.focusedNodeId);
        })
    );
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
 * Get the effective parent ID for new messages (focused node or last focused node)
 */
export const useEffectiveParentId = (): string | null => {
    return useTreeStore((state) => state.focusedNodeId ?? state.lastFocusedNodeId);
};

/**
 * Get the effective parent node
 */
export const useEffectiveParentNode = () => {
    const effectiveId = useEffectiveParentId();
    return useTreeStore((state) => (effectiveId ? state.nodes[effectiveId] : null));
};

/**
 * Get node count
 */
export const useNodeCount = () => {
    return useTreeStore((state) => Object.keys(state.nodes).length);
};
