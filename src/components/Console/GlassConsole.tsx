import { useState, useCallback, useEffect, useRef, useMemo, type KeyboardEvent, type FormEvent } from 'react';
import { useTreeStore } from '../../store/useTreeStore';
import { useUIStore } from '../../store/useUIStore';
import { useEffectiveParentId, useEffectiveParentNode, useActiveBranchPath } from '../../store/selectors';
import { streamResponse, generateNodeSummary, summarizeBranchContext, type AppModelType } from '../../services/ai/geminiService';
import { HealthBattery } from './HealthBattery';

export function GlassConsole() {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [input, setInput] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showCollapseButton, setShowCollapseButton] = useState(false);
    const [selectedModel, setSelectedModel] = useState<AppModelType>('debug');
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Menu state

    const effectiveParent = useEffectiveParentNode();
    const effectiveParentId = useEffectiveParentId();
    const branchContext = useActiveBranchPath();
    const focusedNodeId = useTreeStore((state) => state.focusedNodeId);

    // Selectors
    const nodes = useTreeStore((state) => state.nodes);
    const highlightedNodeIds = useTreeStore((state) => state.highlightedNodeIds);
    const addNode = useTreeStore((state) => state.addNode);
    const setNodeStatus = useTreeStore((state) => state.setNodeStatus);
    const updateNodeContent = useTreeStore((state) => state.updateNodeContent);
    const activeSelection = useUIStore((state) => state.activeSelection);
    const clearHighlights = useTreeStore((state) => state.clearHighlights);

    const handleModelSwitch = useCallback(() => {
        const models: AppModelType[] = ['debug', 'lite', 'fast', 'pro'];
        const currentIndex = models.indexOf(selectedModel);
        const nextIndex = (currentIndex + 1) % models.length;
        setSelectedModel(models[nextIndex]);
    }, [selectedModel]);

    // Format model name for display
    const getModelLabel = (model: AppModelType) => {
        switch (model) {
            case 'pro': return 'Pro';
            case 'fast': return 'Fast';
            case 'lite': return 'Lite';
            case 'debug': return 'Debug';
        }
    };

    // Validation for Pruning
    const { canPrune, sortedPrunableNodes } = useMemo(() => {
        if (highlightedNodeIds.length < 2) return { canPrune: false, sortedPrunableNodes: [] };

        const selectedNodes = highlightedNodeIds.map(id => nodes[id]).filter(Boolean);
        if (selectedNodes.length !== highlightedNodeIds.length) return { canPrune: false, sortedPrunableNodes: [] };

        // Sort by creation time as a proxy for depth usually, but let's be strict about lineage
        // or just creation time? Lineage is safer.
        // Let's sort based on finding the root of the chain.
        // 1. Must be a single chain.

        // Find node with no parent in the set
        const idsSet = new Set(highlightedNodeIds);
        const roots = selectedNodes.filter(n => !n.parentId || !idsSet.has(n.parentId));

        if (roots.length !== 1) return { canPrune: false, sortedPrunableNodes: [] }; // Disjoint or cycle (unlikely in tree)

        let current = roots[0];
        const sorted = [current];

        // Walk down the chain
        while (sorted.length < selectedNodes.length) {
            // Find child in the set
            const child = selectedNodes.find(n => n.parentId === current.id);
            if (!child) return { canPrune: false, sortedPrunableNodes: [] }; // Gap in chain
            sorted.push(child);
            current = child;
        }

        return { canPrune: true, sortedPrunableNodes: sorted };
    }, [highlightedNodeIds, nodes]);

    const handlePruneNodes = useCallback(async () => {
        if (!canPrune) return;

        setIsMenuOpen(false);
        const contents = sortedPrunableNodes.map(n => n.content);

        // Use the selected model BUT if it's debug, summarizeBranchContext handles it.
        // If user is in pro mode, we use pro model for summary? Yes.
        const summary = await summarizeBranchContext(contents, selectedModel);

        // Create new node
        // Parent is the lowest node (C) as requested
        const lastNode = sortedPrunableNodes[sortedPrunableNodes.length - 1];
        const targetParentId = lastNode.id;

        // Add node
        addNode(
            targetParentId,
            'assistant',
            summary,
            sortedPrunableNodes.map(n => n.id) // Pruned IDs
        );

        // Clear highlights after action
        clearHighlights();

    }, [canPrune, sortedPrunableNodes, selectedModel, addNode, clearHighlights]);


    const handleSubmit = useCallback(
        async (e?: FormEvent) => {
            e?.preventDefault();
            const trimmed = input.trim();
            if (!trimmed) return;

            // Determine parent node and context based on selection or focus
            let targetParentId = effectiveParentId;
            let finalContent = trimmed;

            if (activeSelection) {
                const selectedNode = nodes[activeSelection.nodeId];
                if (selectedNode && selectedNode.parentId) {
                    targetParentId = selectedNode.parentId;
                    finalContent = `> ${activeSelection.text}\n\n${trimmed}`;
                } else if (selectedNode) {
                    targetParentId = activeSelection.nodeId;
                    finalContent = `> ${activeSelection.text}\n\n${trimmed}`;
                }
            } else {
                targetParentId = effectiveParentId;
            }

            // 1. Add User Node
            const userNodeId = addNode(targetParentId, 'user', finalContent);

            // Trigger summary generation for User Node
            generateNodeSummary(finalContent, selectedModel).then(summary => {
                useTreeStore.getState().setNodeSummary(userNodeId, summary);
            });

            setInput('');
            setIsCollapsed(false); // Reset collapse on send

            // 2. Add Assistant Placehoder Node
            const assistantNodeId = addNode(userNodeId, 'assistant', '');
            setNodeStatus(assistantNodeId, 'streaming');

            // 3. Prepare Context
            const getContextContent = () => {
                const historyTexts: string[] = [];

                if (activeSelection) {
                    const ancestors: string[] = [];
                    let current: string | null | undefined = targetParentId;

                    while (current && nodes[current]) {
                        ancestors.unshift(nodes[current].content);
                        current = nodes[current].parentId;
                    }
                    historyTexts.push(...ancestors);
                } else {
                    const contextIds = [...branchContext];
                    contextIds.forEach(id => {
                        const node = nodes[id];
                        if (node) historyTexts.push(node.content);
                    });
                }

                // Add the new user message
                historyTexts.push(finalContent);

                return historyTexts;
            };

            const context = getContextContent();

            // Clear selection after sending
            if (activeSelection) {
                useUIStore.getState().clearActiveSelection();
            }

            // 4. Stream Response
            await streamResponse(finalContent, context, {
                model: selectedModel,
                onChunk: (chunk) => {
                    useTreeStore.getState().updateNodeContent(assistantNodeId,
                        useTreeStore.getState().nodes[assistantNodeId].content + chunk
                    );
                },
                onComplete: (fullText) => {
                    setNodeStatus(assistantNodeId, 'idle');
                    // Trigger summary generation for Assistant Node
                    generateNodeSummary(fullText, selectedModel).then(summary => {
                        useTreeStore.getState().setNodeSummary(assistantNodeId, summary);
                    });
                },
                onError: (err) => {
                    console.error('Streaming error', err);
                    setNodeStatus(assistantNodeId, 'error');
                    updateNodeContent(assistantNodeId, 'Error generating response: ' + err.message);
                }
            });
        },
        [input, effectiveParentId, addNode, selectedModel, branchContext, nodes, activeSelection, setNodeStatus, updateNodeContent]
    );

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
        },
        [handleSubmit]
    );

    // Auto-resize textarea and check if collapse button should show
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;

            // Show collapse button when content exceeds threshold (roughly 3+ lines)
            setShowCollapseButton(textarea.scrollHeight > 100);
        }
    }, [input]);

    // Scroll textarea to bottom when collapsing
    useEffect(() => {
        if (isCollapsed && textareaRef.current) {
            // Wait for collapse animation to complete (500ms + buffer)
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                }
            }, 550);
        }
    }, [isCollapsed]);

    const contextLabel = activeSelection
        ? `Continuing on selection: "${activeSelection.text.slice(0, 40)}${activeSelection.text.length > 40 ? '...' : ''}"`
        : effectiveParent
            ? focusedNodeId
                ? `Replying to: "${effectiveParent.content.slice(0, 40)}${effectiveParent.content.length > 40 ? '...' : ''}"`
                : `Continuing on node: "${effectiveParent.content.slice(0, 40)}${effectiveParent.content.length > 40 ? '...' : ''}"`
            : 'Start a new conversation';

    const contextTokenCount = useMemo(() => {
        let charCount = 0;
        let targetId: string | null | undefined = null;
        let extraText = 0;

        if (activeSelection) {
            // Logic mirrors handleSubmit for context generation
            const selectedNode = nodes[activeSelection.nodeId];
            targetId = selectedNode?.parentId || selectedNode?.id; // Use parent if possible to mimic "replying to" context
            // Note: activeSelection.text is part of the prompt burden.
            extraText = activeSelection.text.length;
        } else {
            // Use effectiveParentId (covers both focused node and last focused node/single selection)
            targetId = effectiveParentId;
        }

        if (targetId) {
            let current: string | null | undefined = targetId;
            while (current && nodes[current]) {
                charCount += nodes[current].content.length;
                current = nodes[current].parentId;
            }
        }

        charCount += extraText;

        // Heuristic: ~4 chars per token
        return Math.ceil(charCount / 4);
    }, [activeSelection, effectiveParentId, nodes]);

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
            <form onSubmit={handleSubmit}>
                <div className={`glass rounded-2xl p-4 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] relative ${isCollapsed ? 'h-[140px] overflow-hidden flex flex-col' : ''
                    }`}>
                    {/* Collapse/Expand Button - only show when content has expanded */}
                    {showCollapseButton && (
                        <button
                            type="button"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="absolute top-4 right-4 p-1 rounded-md hover:bg-black/5 text-slate-400 hover:text-indigo-600 transition-all z-10 animate-in fade-in duration-300"
                            title={isCollapsed ? "Expand Chat" : "Collapse Chat"}
                        >
                            <svg
                                className={`w-4 h-4 transition-transform duration-500 ${isCollapsed ? '' : 'rotate-180'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </button>
                    )}

                    {/* Context indicator */}
                    <div className="flex items-center gap-2 mb-2 ml-1">
                        <HealthBattery tokenCount={contextTokenCount} />
                        <div className="text-xs text-slate-600 truncate font-medium flex-1">
                            {contextLabel}
                        </div>
                    </div>

                    {/* Input area */}
                    <div className="flex items-end gap-3 flex-1 relative">
                        {/* Menu UI: Replace File Button */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100/50 hover:bg-slate-200/50 transition-all flex items-center justify-center text-slate-600 hover:text-slate-800"
                                title="Node Actions"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            {/* Popup Menu */}
                            {isMenuOpen && (
                                <div className="absolute bottom-12 left-0 w-48 bg-white/90 backdrop-blur-md border border-white/20 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <button
                                        type="button"
                                        onClick={handlePruneNodes}
                                        disabled={!canPrune}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${canPrune
                                            ? 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer'
                                            : 'text-slate-400 cursor-not-allowed bg-slate-50'
                                            }`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm8.486-8.486a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243z" />
                                        </svg>
                                        Prune Nodes
                                    </button>
                                    <button
                                        type="button"
                                        disabled={true}
                                        className="w-full text-left px-4 py-3 text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed flex items-center gap-2 border-t border-slate-100"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        Compare Nodes
                                    </button>
                                </div>
                            )}

                            {/* Dismiss menu on click outside (simple backdrop) */}
                            {isMenuOpen && (
                                <div
                                    className="fixed inset-0 z-40 bg-transparent"
                                    onClick={() => setIsMenuOpen(false)}
                                />
                            )}
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            rows={1}
                            className={`flex-1 resize-none bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-base leading-relaxed py-2 pr-3 overflow-y-auto gradient-scrollbar transition-all duration-500 ${isCollapsed ? 'max-h-[90px]' : 'max-h-[calc(100vh-6.5rem)]'
                                }`}
                        />

                        {/* Model switcher button */}
                        <button
                            type="button"
                            onClick={handleModelSwitch}
                            className={`flex-shrink-0 px-3 h-10 rounded-xl transition-all flex items-center justify-center font-medium text-xs border ${selectedModel === 'pro'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : selectedModel === 'fast'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : selectedModel === 'lite'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                            title={`Switch model (Current: ${getModelLabel(selectedModel)})`}
                        >
                            {getModelLabel(selectedModel)}
                        </button>

                        {/* Send button with gradient border */}
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="send-button flex-shrink-0 w-10 h-10 rounded-xl bg-white/90 hover:bg-white hover:shadow-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center relative"
                        >
                            <svg
                                className="w-5 h-5 text-slate-700 relative z-10"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
