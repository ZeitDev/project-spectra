import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '../../types';

export function DotNode({ data }: NodeProps<GraphNode>) {
    const { isSelected, isHighlighted, isOnActiveBranch, treeNode } = data;

    const bgColor = treeNode.role === 'user' ? 'bg-violet-400' : 'bg-emerald-400';

    return (
        <>
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div className="relative isolate w-fit">
                {/* Outer Glow */}
                {isHighlighted && (
                    <div className="absolute -inset-3 bg-violet-600/50 rounded-full blur-lg -z-20" />
                )}

                {/* Gradient Outline */}
                <div className="absolute -inset-[2px] rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 -z-10" />

                <div
                    className={`
              w-4 h-4 rounded-full node-transition relative
              ${bgColor}
              ${isSelected ? 'ring-2 ring-violet-500 ring-offset-2 scale-125' : ''}
              ${!isOnActiveBranch && isSelected ? '' : ''}
            `}
                />
            </div>
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </>
    );
}
