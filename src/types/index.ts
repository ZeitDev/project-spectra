// types/index.ts

export type NodeStatus = 'idle' | 'streaming' | 'error';

/** Core tree node stored in Zustand */
export interface TreeNode {
    id: string;
    parentId: string | null;
    role: 'user' | 'assistant' | 'system';
    content: string;
    label?: string; // Auto-generated summary (Phase 3)
    summary?: string; // Cached "lite" summary for zoomed-out view
    status: NodeStatus; // AI streaming state
    tokenCount: number; // Token usage tracking
    createdAt: number;
    children: string[]; // Child node IDs (ordered)
    prunedNodeIds?: string[]; // IDs of nodes this node summarizes/prunes
}

/** Zustand store state */
export interface TreeState {
    nodes: Record<string, TreeNode>; // Flat map for O(1) lookup
    rootId: string | null;
    focusedNodeId: string | null; // For Focus Mode
    lastFocusedNodeId: string | null; // For Selection Continuity
    highlightedNodeIds: string[]; // For multi-select glowing
}

/** Zustand store actions */
export interface TreeActions {
    addNode: (
        parentId: string | null,
        role: TreeNode['role'],
        content: string,
        prunedNodeIds?: string[]
    ) => string;
    focusNode: (nodeId: string | null) => void;
    setLastFocusedNode: (nodeId: string | null) => void;
    toggleHighlight: (nodeId: string) => void;
    highlightBranch: (nodeId: string) => void;
    clearHighlights: () => void;
    deleteNode: (nodeId: string) => void;
    updateNodeContent: (nodeId: string, content: string) => void;
    setNodeSummary: (nodeId: string, summary: string) => void;
    setNodeStatus: (nodeId: string, status: NodeStatus) => void;
    clearAll: () => void;
    loadState: (state: TreeState) => void;
}

/** Combined store type */
export type TreeStore = TreeState & TreeActions;

/** React Flow node (derived via adapter) */
export interface GraphNode {
    id: string;
    type: 'dot' | 'label' | 'preview' | 'full';
    position: { x: number; y: number };
    data: {
        treeNode: TreeNode;
        isOnActiveBranch: boolean;
        isHighlighted: boolean;
        isSelected: boolean; // This maps to focus status
        depth: number;
    };
}

/** React Flow edge (derived via adapter) */
export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    animated?: boolean;
    style?: React.CSSProperties;
}

/** Zoom-level dimensions for dagre layout */
export const ZOOM_DIMENSIONS: Record<0 | 1 | 2 | 3, { w: number; h: number }> = {
    0: { w: 40, h: 40 }, // Dot
    1: { w: 200, h: 40 }, // Label
    2: { w: 400, h: 80 }, // Preview
    3: { w: 800, h: 500 }, // Full (tall for text)
};

/** Semantic zoom level type */
export type ZoomLevel = 0 | 1 | 2 | 3;
