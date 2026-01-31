import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '../../types';

export function LabelNode({ data }: NodeProps<GraphNode>) {
    const { isSelected, isHighlighted, isOnActiveBranch, treeNode } = data;

    const bgColor = treeNode.role === 'user' ? 'bg-indigo-400' : 'bg-emerald-400';
    const label = treeNode.label || treeNode.content.slice(0, 20) + (treeNode.content.length > 20 ? '...' : '');

    return (
        <>
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div className="relative isolate w-fit group">
                {/* Outer Glow */}
                {isHighlighted && (
                    <div className="absolute inset-0 rounded-full shadow-[0_0_25px_5px_rgba(56,189,248,0.4)] -z-20 transition-all duration-500" />
                )}

                {/* Gradient Outline */}
                <div className="absolute -inset-[1px] rounded-full bg-gradient-to-tr from-sky-200 via-indigo-200 to-sky-200 -z-10" />

                <div
                    className={`
              flex items-center gap-2 px-2 py-1 rounded-full node-transition relative
              glass-node
              ${isSelected ? 'glass-node-selected scale-105' : ''}
              ${!isOnActiveBranch && isSelected ? '' : ''}
            `}
                >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${bgColor}`} />
                    <span className="text-xs text-slate-700 truncate max-w-[160px]">
                        {label}
                    </span>
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </>
    );
}
