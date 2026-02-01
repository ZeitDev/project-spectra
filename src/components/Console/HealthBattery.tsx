
interface HealthBatteryProps {
    tokenCount: number;
    maxTokens?: number;
}

export function HealthBattery({ tokenCount, maxTokens = 4000 }: HealthBatteryProps) {
    const usagePercentage = Math.min(100, (tokenCount / maxTokens) * 100);
    const batteryLevel = Math.max(0, 100 - usagePercentage);

    let colorClass = 'bg-emerald-500';
    let textColorClass = 'text-slate-400';

    if (usagePercentage > 90) { // < 10% battery
        colorClass = 'bg-rose-500';
        textColorClass = 'text-rose-500';
    } else if (usagePercentage > 50) { // < 50% battery
        colorClass = 'bg-amber-500';
        textColorClass = 'text-amber-600';
    } else {
        textColorClass = 'text-slate-400';
    }

    return (
        <div
            className="flex items-center gap-1.5"
            title={`Health: ${Math.round(batteryLevel)}% (Used: ${tokenCount} / ${maxTokens} tokens)`}
        >
            <div className="relative w-6 h-3 border border-slate-300 rounded-[2px] p-0.5">
                <div
                    className={`h-full rounded-[1px] transition-all duration-500 ${colorClass}`}
                    style={{ width: `${batteryLevel}%` }}
                />
                {/* Battery tip */}
                <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[2px] h-1.5 bg-slate-300 rounded-r-[1px]" />
            </div>
            <span className={`text-[10px] font-medium transition-colors ${textColorClass}`}>
                {Math.round(batteryLevel)}%
            </span>
        </div>
    );
}
