import type { ZoomLevel } from '../types';

/**
 * Dagre layout configuration for different zoom levels
 */
export const LAYOUT_CONFIG = {
    rankdir: 'TB' as const, // Top to Bottom
    nodesep: 60, // Horizontal separation between nodes
    ranksep: 120, // Vertical separation between ranks
};

/**
 * Get appropriate node separation based on zoom level
 */
export function getLayoutConfig(zoomLevel: ZoomLevel) {
    const separationMultiplier = {
        0: 0.5, // Compact for dots
        1: 0.75, // Slightly compact for labels
        2: 1, // Normal for preview
        3: 1.5, // More space for full content
    };

    return {
        ...LAYOUT_CONFIG,
        nodesep: LAYOUT_CONFIG.nodesep * separationMultiplier[zoomLevel],
        ranksep: LAYOUT_CONFIG.ranksep * separationMultiplier[zoomLevel],
    };
}
