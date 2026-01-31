import { useState, useCallback, useEffect, useRef, type KeyboardEvent, type FormEvent } from 'react';
import { useTreeStore } from '../../store/useTreeStore';
import { useEffectiveParentId, useEffectiveParentNode } from '../../store/selectors';

export function GlassConsole() {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [input, setInput] = useState('');
    const effectiveParent = useEffectiveParentNode();
    const effectiveParentId = useEffectiveParentId();
    const focusedNodeId = useTreeStore((state) => state.focusedNodeId);
    const addNode = useTreeStore((state) => state.addNode);

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
        // TODO: Implement model switcher UI
        console.log('Model switcher clicked');
    }, []);

    const handleSubmit = useCallback(
        (e?: FormEvent) => {
            e?.preventDefault();
            const trimmed = input.trim();
            if (!trimmed) return;

            // Add as child of effective parent (focused node or last selected)
            addNode(effectiveParentId, 'user', trimmed);
            setInput('');
        },
        [input, effectiveParentId, addNode]
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

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [input]);

    const contextLabel = effectiveParent
        ? focusedNodeId
            ? `Replying to: "${effectiveParent.content.slice(0, 40)}${effectiveParent.content.length > 40 ? '...' : ''}"`
            : `Continuing on: "${effectiveParent.content.slice(0, 40)}${effectiveParent.content.length > 40 ? '...' : ''}"`
        : 'Start a new conversation';

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
            <form onSubmit={handleSubmit}>
                <div className="glass rounded-2xl p-4 transition-all duration-300">
                    {/* Context indicator */}
                    <div className="text-xs text-slate-600 mb-2 truncate font-medium ml-1">
                        {contextLabel}
                    </div>

                    {/* Input area */}
                    <div className="flex items-end gap-3">
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
                            className="flex-1 resize-none bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-base leading-relaxed py-2 pr-3 max-h-[calc(100vh-6.5rem)] overflow-y-auto gradient-scrollbar"
                        />

                        {/* Model switcher button */}
                        <button
                            type="button"
                            onClick={handleModelSwitch}
                            className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100/50 hover:bg-slate-200/50 transition-all flex items-center justify-center text-slate-600 hover:text-slate-800"
                            title="Switch model"
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
                                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                                />
                            </svg>
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
