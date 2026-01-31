import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '../../types';
import { BaseNode } from './BaseNode';

export function PreviewNode({ data }: NodeProps<GraphNode>) {
    const { isSelected, isHighlighted, isOnActiveBranch, treeNode } = data;

    const roleLabel = treeNode.role === 'user' ? 'You' : 'AI';
    const roleColor = treeNode.role === 'user' ? 'text-indigo-600' : 'text-emerald-600';

    // Get first 2 lines of content
    const lines = treeNode.content.split('\n').slice(0, 2);
    const preview = lines.join('\n');
    const hasMore = treeNode.content.split('\n').length > 2 || treeNode.content.length > 100;

    return (
        <>
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <BaseNode isSelected={isSelected} isHighlighted={isHighlighted} isOnActiveBranch={isOnActiveBranch}>
                <div className="w-full p-3">
                    <div className={`text-xs font-medium mb-1 ${roleColor}`}>
                        {roleLabel}
                    </div>
                    <div className="text-sm text-slate-700 line-clamp-2">
                        {preview}
                        {hasMore && <span className="text-slate-400"> ...</span>}
                    </div>
                </div>
            </BaseNode>
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </>
    );
}
