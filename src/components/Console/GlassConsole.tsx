import { useState, useCallback, type KeyboardEvent, type FormEvent } from 'react';
import { useTreeStore } from '../../store/useTreeStore';
import { useEffectiveParentId, useEffectiveParentNode } from '../../store/selectors';

export function GlassConsole() {
    const [input, setInput] = useState('');
    const effectiveParent = useEffectiveParentNode();
    const effectiveParentId = useEffectiveParentId();
    const focusedNodeId = useTreeStore((state) => state.focusedNodeId);
    const addNode = useTreeStore((state) => state.addNode);

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
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            rows={1}
                            className="flex-1 resize-none bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-base leading-relaxed"
                            style={{ minHeight: '24px', maxHeight: '120px' }}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center text-white"
                        >
                            <svg
                                className="w-5 h-5 text-white"
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
