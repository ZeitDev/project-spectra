import type { ReactNode } from 'react';

interface BaseNodeProps {
    children: ReactNode;
    isSelected: boolean;
    isOnActiveBranch: boolean;
}

export function BaseNode({ children, isSelected, isOnActiveBranch }: BaseNodeProps) {
    return (
        <div
            className={`
        glass-node node-transition rounded-xl
        ${isSelected ? 'glass-node-selected' : ''}
        ${!isOnActiveBranch ? 'opacity-30' : ''}
      `}
        >
            {children}
        </div>
    );
}
