import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '../../types';
import { BaseNode } from './BaseNode';

export function FullNode({ data }: NodeProps<GraphNode>) {
    const { isSelected, isOnActiveBranch, treeNode } = data;

    const roleLabel = treeNode.role === 'user' ? 'You' : 'AI';
    const roleColor = treeNode.role === 'user' ? 'text-violet-600' : 'text-emerald-600';
    const borderColor = treeNode.role === 'user' ? 'border-l-violet-400' : 'border-l-emerald-400';

    return (
        <>
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <BaseNode isSelected={isSelected} isOnActiveBranch={isOnActiveBranch}>
                <div className={`w-[400px] h-[500px] p-4 border-l-4 flex flex-col ${borderColor}`}>
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <span className={`text-xs font-semibold ${roleColor}`}>
                            {roleLabel}
                        </span>
                        {treeNode.status === 'streaming' && (
                            <span className="text-xs text-slate-400 animate-pulse">
                                Thinking...
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-slate-800 whitespace-pre-wrap overflow-y-auto flex-1 leading-relaxed min-h-0">
                        {treeNode.content || (
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
