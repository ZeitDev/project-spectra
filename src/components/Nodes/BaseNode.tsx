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
        <div className="relative isolate">
            {/* Outer Glow */}
            {isHighlighted && (
                <div className="absolute -inset-4 bg-violet-600/40 rounded-xl blur-xl -z-20 transition-all duration-500" />
            )}

            {/* Gradient Outline */}
            <div className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 -z-10 opacity-100" />

            {/* Main Content */}
            <div
                className={`
        glass-node node-transition rounded-xl h-full relative
        ${isSelected ? 'glass-node-selected' : ''}
        ${!isOnActiveBranch && isSelected ? '' : ''}
      `}
            >
                {children}
            </div>
        </div>
    );
}
