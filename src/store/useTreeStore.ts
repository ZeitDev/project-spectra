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
            selectedNodeId: null,

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
                        selectedNodeId: id, // Auto-select new node
                    };
                });

                return id;
            },

            selectNode: (nodeId) => {
                set({ selectedNodeId: nodeId });
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
                        selectedNodeId:
                            state.selectedNodeId && toDelete.has(state.selectedNodeId)
                                ? node.parentId
                                : state.selectedNodeId,
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
                set({ nodes: {}, rootId: null, selectedNodeId: null });
            },
        }),
        {
            name: 'spectra-tree-storage',
        }
    )
);
