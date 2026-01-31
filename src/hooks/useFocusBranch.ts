import { useMemo } from 'react';
import { useTreeStore } from '../store/useTreeStore';
import { getAncestorPath } from '../store/selectors';

/**
 * Returns a Set of node IDs representing the active branch
 * (path from root to selected node)
 */
export function useFocusBranch(): Set<string> {
    const nodes = useTreeStore((state) => state.nodes);
    const selectedNodeId = useTreeStore((state) => state.selectedNodeId);

    return useMemo(() => {
        if (!selectedNodeId) return new Set<string>();
        return new Set(getAncestorPath(nodes, selectedNodeId));
    }, [nodes, selectedNodeId]);
}
