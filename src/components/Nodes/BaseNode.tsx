import type { ReactNode } from 'react';

interface BaseNodeProps {
    children: ReactNode;
    isSelected: boolean;
    isHighlighted?: boolean;
    isOnActiveBranch: boolean;
}

export function BaseNode({
    children,
    isSelected,
    isHighlighted,
    isOnActiveBranch,
}: BaseNodeProps) {
    return (
        <div
            className={`
        glass-node node-transition rounded-xl
        ${isSelected ? 'glass-node-selected' : ''}
        ${isHighlighted ? 'ring-2 ring-violet-500 shadow-[0_0_25px_rgba(139,92,246,0.5)]' : ''}
        ${!isOnActiveBranch && isSelected ? '' : !isOnActiveBranch && !isHighlighted ? 'opacity-30' : ''}
      `}
        >
            {children}
        </div>
    );
}
