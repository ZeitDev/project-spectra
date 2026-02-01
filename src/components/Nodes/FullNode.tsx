import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '../../types';
import { BaseNode } from './BaseNode';
import ReactMarkdown from 'react-markdown';
import { useUIStore } from '../../store/useUIStore';
import { useCallback, useMemo } from 'react';



export function FullNode({ data }: NodeProps<GraphNode>) {
    const { isSelected, isHighlighted, isOnActiveBranch, treeNode } = data;
    const setActiveSelection = useUIStore((state) => state.setActiveSelection);

    // Debug logging


    const handleSelection = useCallback(() => {
        const selection = window.getSelection();
        const selectionText = selection?.toString() || '';

        if (selectionText.trim().length > 0) {
            setActiveSelection({
                nodeId: treeNode.id,
                text: selectionText.trim()
            });
        } else {
            // If selection was cleared (e.g. single click), clear store selection
            // This allows falling back to "Continue on node" behavior
            setActiveSelection(null);
        }
    }, [treeNode.id, setActiveSelection]);

    // Custom renderer for markdown - currently standard
    const markdownComponents = useMemo(() => {
        return {
            p: ({ children }: any) => <p className="mb-4 last:mb-0">{children}</p>,
            // Add other standard overrides if needed
        };
    }, []);


    const roleLabel = treeNode.role === 'user' ? 'You' : 'AI';
    const roleColor = treeNode.role === 'user' ? 'text-indigo-600' : 'text-emerald-600';

    return (
        <>
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <BaseNode isSelected={isSelected} isHighlighted={isHighlighted} isOnActiveBranch={isOnActiveBranch}>
                <div className="w-full h-full p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                        <span className={`text-xs font-semibold ${roleColor}`}>
                            {roleLabel}
                        </span>
                        {treeNode.status === 'streaming' && (
                            <span className="text-xs text-slate-400 animate-pulse">
                                Thinking...
                            </span>
                        )}
                    </div>
                    {/* Added nodrag class to allow text selection without panning */}
                    <div
                        className="nodrag text-sm text-slate-800 overflow-y-auto flex-1 leading-relaxed min-h-0 cursor-text select-text prose prose-sm max-w-none"
                        onMouseUp={handleSelection}
                        onKeyUp={handleSelection}
                    >
                        {treeNode.content ? (
                            <ReactMarkdown components={markdownComponents}>
                                {treeNode.content}
                            </ReactMarkdown>
                        ) : (
                            <span className="text-slate-400 italic">Empty message</span>
                        )}
                    </div>
                    {treeNode.tokenCount > 0 && (
                        <div className="mt-2 text-xs text-slate-400 flex-shrink-0">
                            {treeNode.tokenCount} tokens
                        </div>
                    )}
                </div>
            </BaseNode>
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </>
    );
}
