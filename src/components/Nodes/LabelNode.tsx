import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '../../types';

export function LabelNode({ data }: NodeProps<GraphNode>) {
    const { isSelected, isHighlighted, isOnActiveBranch, treeNode } = data;

    const bgColor = treeNode.role === 'user' ? 'bg-violet-400' : 'bg-emerald-400';
    const label = treeNode.label || treeNode.content.slice(0, 20) + (treeNode.content.length > 20 ? '...' : '');

    return (
        <>
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div
                className={`
          flex items-center gap-2 px-2 py-1 rounded-full node-transition
          glass-node
          ${isHighlighted ? 'ring-2 ring-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.6)]' : ''}
          ${isSelected ? 'glass-node-selected scale-105' : ''}
          ${!isOnActiveBranch && isSelected ? '' : !isOnActiveBranch ? 'opacity-30' : ''}
        `}
            >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${bgColor}`} />
                <span className="text-xs text-slate-700 truncate max-w-[80px]">
                    {label}
                </span>
            </div>
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </>
    );
}
