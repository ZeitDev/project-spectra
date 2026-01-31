import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '../../types';

export function DotNode({ data }: NodeProps<GraphNode>) {
    const { isSelected, isHighlighted, isOnActiveBranch, treeNode } = data;

    const bgColor = treeNode.role === 'user' ? 'bg-indigo-400' : 'bg-emerald-400';

    return (
        <>
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div className="relative isolate w-fit group">
                {/* Outer Glow */}
                {isHighlighted && (
                    <div className="absolute -inset-3 bg-sky-400/40 rounded-full blur-lg -z-20 transition-all duration-500" />
                )}

                {/* Gradient Outline */}
                <div className="absolute -inset-[1px] rounded-full bg-gradient-to-tr from-sky-200 via-indigo-200 to-sky-200 -z-10" />

                <div
                    className={`
              w-4 h-4 rounded-full node-transition relative
              ${bgColor}
              ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-transparent scale-125' : ''}
              ${!isOnActiveBranch && isSelected ? '' : ''}
            `}
                />
            </div>
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </>
    );
}
