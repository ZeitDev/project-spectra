import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '../../types';

export function DotNode({ data }: NodeProps<GraphNode>) {
    const { isSelected, isHighlighted, isOnActiveBranch, treeNode } = data;

    const bgColor = treeNode.role === 'user' ? 'bg-violet-400' : 'bg-emerald-400';

    return (
        <>
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div
                className={`
          w-4 h-4 rounded-full node-transition
          ${bgColor}
          ${isHighlighted ? 'ring-2 ring-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.8)]' : ''}
          ${isSelected ? 'ring-2 ring-violet-500 ring-offset-2 scale-125' : ''}
          ${!isOnActiveBranch && isSelected ? '' : !isOnActiveBranch ? 'opacity-30' : ''}
        `}
            />
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </>
    );
}
