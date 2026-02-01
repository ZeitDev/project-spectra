import { useState, useCallback, useEffect, useRef, type KeyboardEvent, type FormEvent } from 'react';
import { useTreeStore } from '../../store/useTreeStore';
import { useUIStore } from '../../store/useUIStore';
import { useEffectiveParentId, useEffectiveParentNode, useActiveBranchPath } from '../../store/selectors';
import { streamResponse, type AppModelType } from '../../services/ai/geminiService';

export function GlassConsole() {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [input, setInput] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showCollapseButton, setShowCollapseButton] = useState(false);
    const [selectedModel, setSelectedModel] = useState<AppModelType>('debug');
    const effectiveParent = useEffectiveParentNode();
    const effectiveParentId = useEffectiveParentId();
    const branchContext = useActiveBranchPath();
    const focusedNodeId = useTreeStore((state) => state.focusedNodeId);
    // Use selector direct access for actions to avoid re-renders if possible, 
    // or just use useTreeStore for everything. 
    // Mixing patterns is fine for now but let's be consistent.
    // Use selector direct access for actions to avoid re-renders if possible, 
    // or just use useTreeStore for everything. 
    // Mixing patterns is fine for now but let's be consistent.
    const addNode = useTreeStore((state) => state.addNode);
    const setNodeStatus = useTreeStore((state) => state.setNodeStatus);
    const updateNodeContent = useTreeStore((state) => state.updateNodeContent);
    const nodes = useTreeStore((state) => state.nodes); // Need nodes to rebuild context text
    const activeSelection = useUIStore((state) => state.activeSelection);

    const handleFileAttach = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) {
                console.log('Files selected:', Array.from(files).map(f => f.name));
                // TODO: Handle file upload
            }
        };
        input.click();
    }, []);

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
                onComplete: () => {
                    setNodeStatus(assistantNodeId, 'idle');
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
                    <div className="text-xs text-slate-600 mb-2 truncate font-medium ml-1 pr-8 flex-shrink-0">
                        {contextLabel}
                    </div>

                    {/* Input area */}
                    <div className="flex items-end gap-3 flex-1">
                        {/* File attachment button */}
                        <button
                            type="button"
                            onClick={handleFileAttach}
                            className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100/50 hover:bg-slate-200/50 transition-all flex items-center justify-center text-slate-600 hover:text-slate-800"
                            title="Attach files"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                />
                            </svg>
                        </button>

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
