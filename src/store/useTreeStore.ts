import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TreeStore, TreeNode, NodeStatus } from '../types';

const generateId = () => crypto.randomUUID();

export const useTreeStore = create<TreeStore>()(
    persist(
        (set, get) => ({
            // State
            nodes: {},
            rootId: null,
            focusedNodeId: null,
            highlightedNodeIds: [],

            // Actions
            addNode: (parentId, role, content) => {
                const id = generateId();
                const newNode: TreeNode = {
                    id,
                    parentId,
                    role,
                    content,
                    status: 'idle',
                    tokenCount: 0,
                    createdAt: Date.now(),
                    children: [],
                };

                set((state) => {
                    const newNodes = { ...state.nodes, [id]: newNode };

                    // If there's a parent, add this node to parent's children
                    if (parentId && state.nodes[parentId]) {
                        newNodes[parentId] = {
                            ...state.nodes[parentId],
                            children: [...state.nodes[parentId].children, id],
                        };
                    }

                    return {
                        nodes: newNodes,
                        rootId: parentId === null ? id : state.rootId,
                        focusedNodeId: id, // Focus new message
                        highlightedNodeIds: [id], // Highlight new message
                    };
                });

                return id;
            },

            focusNode: (nodeId) => {
                set({ focusedNodeId: nodeId });
            },

            toggleHighlight: (nodeId) => {
                set((state) => {
                    const isHighlighted = state.highlightedNodeIds.includes(nodeId);
                    return {
                        highlightedNodeIds: isHighlighted
                            ? state.highlightedNodeIds.filter((id) => id !== nodeId)
                            : [...state.highlightedNodeIds, nodeId],
                    };
                });
            },

            clearHighlights: () => {
                set({ highlightedNodeIds: [] });
            },

            deleteNode: (nodeId) => {
                const state = get();
                const node = state.nodes[nodeId];
                if (!node) return;

                // Recursively collect all descendant IDs
                const collectDescendants = (id: string): string[] => {
                    const n = state.nodes[id];
                    if (!n) return [id];
                    return [id, ...n.children.flatMap(collectDescendants)];
                };

                const toDelete = new Set(collectDescendants(nodeId));

                set((state) => {
                    const newNodes = { ...state.nodes };

                    // Remove all descendants
                    toDelete.forEach((id) => delete newNodes[id]);

                    // Remove from parent's children
                    if (node.parentId && newNodes[node.parentId]) {
                        newNodes[node.parentId] = {
                            ...newNodes[node.parentId],
                            children: newNodes[node.parentId].children.filter(
                                (id) => id !== nodeId
                            ),
                        };
                    }

                    return {
                        nodes: newNodes,
                        rootId: nodeId === state.rootId ? null : state.rootId,
                        focusedNodeId:
                            state.focusedNodeId && toDelete.has(state.focusedNodeId)
                                ? node.parentId
                                : state.focusedNodeId,
                        highlightedNodeIds: state.highlightedNodeIds.filter(
                            (id) => !toDelete.has(id)
                        ),
                    };
                });
            },

            updateNodeContent: (nodeId, content) => {
                set((state) => {
                    if (!state.nodes[nodeId]) return state;
                    return {
                        nodes: {
                            ...state.nodes,
                            [nodeId]: { ...state.nodes[nodeId], content },
                        },
                    };
                });
            },

            setNodeStatus: (nodeId, status: NodeStatus) => {
                set((state) => {
                    if (!state.nodes[nodeId]) return state;
                    return {
                        nodes: {
                            ...state.nodes,
                            [nodeId]: { ...state.nodes[nodeId], status },
                        },
                    };
                });
            },

            clearAll: () => {
                set({
                    nodes: {},
                    rootId: null,
                    focusedNodeId: null,
                    highlightedNodeIds: [],
                });
            },
        }),
        {
            name: 'spectra-tree-storage',
        }
    )
);
