"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Citation } from "@/lib/roxyApi";
import { CitationHighlight } from "./CitationHighlight";

interface DocumentViewerProps {
    documentUrl?: string | null;
    documentName?: string | null;
    pageNumber: number;
    onPageChange: (page: number) => void;
    highlightedCitation?: Citation | null;
    onClearHighlight: () => void;
}

export function DocumentViewer({
    documentUrl,
    documentName,
    pageNumber,
    onPageChange,
    highlightedCitation,
    onClearHighlight,
}: DocumentViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);
    const [pageInput, setPageInput] = useState(String(pageNumber));
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        setPageInput(String(pageNumber));
    }, [pageNumber]);

    const handlePageInputChange = (value: string) => {
        setPageInput(value);
    };

    const handlePageInputBlur = () => {
        const parsed = Number(pageInput);
        if (!parsed || Number.isNaN(parsed) || parsed < 1) {
            setPageInput(String(pageNumber));
            return;
        }
        if (parsed !== pageNumber) {
            onPageChange(parsed);
        }
    };

    const handlePrevPage = () => {
        if (pageNumber > 1) {
            onPageChange(pageNumber - 1);
        }
    };

    const handleNextPage = () => {
        onPageChange(pageNumber + 1);
    };

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.1, 2));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.1, 0.5));
    };

    const viewerScale = useMemo(() => Math.max(zoom, 0.1), [zoom]);
    const viewerUrl = useMemo(() => {
        if (!documentUrl) return null;
        const suffix = `#page=${pageNumber}`;
        return documentUrl.includes("#") ? `${documentUrl}&${suffix}` : `${documentUrl}${suffix}`;
    }, [documentUrl, pageNumber]);

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
                <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-gray-900">
                        {documentName || "Document"}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handlePrevPage}
                            disabled={pageNumber <= 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Input
                            value={pageInput}
                            onChange={(event) => handlePageInputChange(event.target.value)}
                            onBlur={handlePageInputBlur}
                            className="h-7 w-12 rounded-md border-gray-200 text-center text-xs"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleNextPage}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={handleZoomOut}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-gray-500">{Math.round(viewerScale * 100)}%</span>
                    <Button type="button" variant="ghost" size="icon" onClick={handleZoomIn}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <div ref={containerRef} className="relative h-full w-full overflow-auto bg-slate-50">
                    {!viewerUrl ? (
                        <div className="flex h-full items-center justify-center text-sm text-gray-500">
                            Select a document to preview.
                        </div>
                    ) : (
                        <div className="relative h-full w-full">
                            <iframe
                                title={documentName || "Document"}
                                src={viewerUrl}
                                className="border-0"
                                style={{
                                    width: `${100 / viewerScale}%`,
                                    height: `${100 / viewerScale}%`,
                                    transform: `scale(${viewerScale})`,
                                    transformOrigin: "top left",
                                }}
                            />
                            {highlightedCitation?.boundingBox && (
                                <CitationHighlight
                                    ref={highlightRef}
                                    boundingBox={highlightedCitation.boundingBox}
                                    scale={viewerScale}
                                    onClear={onClearHighlight}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
