"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface CitationHighlightProps {
    boundingBox: { x: number; y: number; width: number; height: number };
    scale: number;
    onClear: () => void;
}

export const CitationHighlight = forwardRef<HTMLDivElement, CitationHighlightProps>(
    ({ boundingBox, scale, onClear }, ref) => {
        const [visible, setVisible] = useState(true);

        useEffect(() => {
            setVisible(true);
            const timeout = setTimeout(() => {
                setVisible(false);
                onClear();
            }, 5000);
            return () => clearTimeout(timeout);
        }, [boundingBox, onClear]);

        const style = useMemo(() => ({
            left: boundingBox.x * scale,
            top: boundingBox.y * scale,
            width: boundingBox.width * scale,
            height: boundingBox.height * scale,
        }), [boundingBox, scale]);

        return (
            <div
                ref={ref}
                className={cn(
                    "absolute rounded-sm border-2 border-yellow-500 bg-yellow-300/50 transition-opacity duration-300 pointer-events-none",
                    visible ? "opacity-100" : "opacity-0"
                )}
                style={style}
            />
        );
    }
);

CitationHighlight.displayName = "CitationHighlight";
