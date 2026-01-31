import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '../../types';

export function LabelNode({ data }: NodeProps<GraphNode>) {
    const { isSelected, isHighlighted, isOnActiveBranch, treeNode } = data;

    const bgColor = treeNode.role === 'user' ? 'bg-violet-400' : 'bg-emerald-400';
    const label = treeNode.label || treeNode.content.slice(0, 20) + (treeNode.content.length > 20 ? '...' : '');

    return (
        <>
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div className="relative isolate">
                {/* Outer Glow */}
                {isHighlighted && (
                    <div className="absolute -inset-3 bg-violet-600/50 rounded-full blur-lg -z-20" />
                )}

                {/* Gradient Outline */}
                <div className="absolute -inset-[2px] rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 -z-10" />

                <div
                    className={`
              flex items-center gap-2 px-2 py-1 rounded-full node-transition relative
              glass-node
              ${isSelected ? 'glass-node-selected scale-105' : ''}
              ${!isOnActiveBranch && isSelected ? '' : ''}
            `}
                >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${bgColor}`} />
                    <span className="text-xs text-slate-700 truncate max-w-[80px]">
                        {label}
                    </span>
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </>
    );
}
