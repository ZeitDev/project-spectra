interface NodeSummaryTooltipProps {
    content: string;
}

export function NodeSummaryTooltip({ content }: NodeSummaryTooltipProps) {
    if (!content) return null;

    return (
        <div className="pointer-events-none w-[400px]">
            {/* Tooltip Arrow - pointing left */}
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-white/90 rotate-45 border-l border-b border-white/40"></div>

            <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-xl border border-white/40 px-4 py-3 text-xs text-slate-700 font-medium text-left leading-snug whitespace-pre-wrap max-h-[300px] overflow-y-hidden relative">
                {/* Visual indicator for long content overflow if needed, though we clip for cleanliness */}
                {content}
            </div>
        </div>
    );
}
