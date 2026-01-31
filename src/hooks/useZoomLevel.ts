import { useState, useCallback } from 'react';
import { useOnViewportChange } from '@xyflow/react';
import type { ZoomLevel } from '../types';

/**
 * Maps viewport zoom to semantic zoom level (0-3)
 *
 * Thresholds:
 * - zoom < 0.3  → Level 0 (Dot)
 * - zoom < 0.5  → Level 1 (Label)
 * - zoom < 0.8  → Level 2 (Preview)
 * - zoom >= 0.8 → Level 3 (Full)
 */
export function useZoomLevel(): ZoomLevel {
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(2);

    const onViewportChange = useCallback(
        ({ zoom }: { zoom: number }) => {
            let level: ZoomLevel;

            if (zoom < 0.4) {
                level = 0;
            } else if (zoom < 0.5) {
                level = 1;
            } else if (zoom < 0.6) {
                level = 2;
            } else {
                level = 3;
            }

            setZoomLevel((prev) => (prev !== level ? level : prev));
        },
        []
    );

    useOnViewportChange({ onChange: onViewportChange });

    return zoomLevel;
}
