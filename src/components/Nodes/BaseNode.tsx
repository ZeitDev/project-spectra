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
        <div className="relative isolate group w-full h-full">
            {/* Outer Glow - Lighter, more etherial Sky Blue */}
            {isHighlighted && (
                <div className="absolute inset-0 rounded-xl shadow-[0_0_30px_5px_rgba(56,189,248,0.4)] -z-20 transition-all duration-500" />
            )}



            {/* Main Content */}
            <div
                className={`
        glass-node node-transition rounded-xl h-full relative overflow-hidden
        text-slate-900 
        ${isSelected ? 'glass-node-selected' : ''}
        ${!isOnActiveBranch && isSelected ? '' : ''}
      `}
            >
                {/* Inner shine for extra "glass" feel - Reduced opacity */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

                {children}
            </div>
        </div>
    );
}
