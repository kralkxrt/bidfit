"use client";

import { useState } from "react";
import type { Citation } from "@/lib/roxyApi";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { Button } from "@/components/ui/button";

const SAMPLE_PDF_URL =
    "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";

export default function DocumentsTestPage() {
    const [pageNumber, setPageNumber] = useState(1);
    const [highlight, setHighlight] = useState<Citation | null>(null);

    const mockHighlight: Citation = {
        documentId: "sample-doc",
        documentName: "Sample PDF",
        pageNumber,
        textSnippet: "Sample highlight",
        boundingBox: {
            x: 60,
            y: 120,
            width: 220,
            height: 24,
        },
    };

    return (
        <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">PDF Viewer Test</h1>
                    <p className="text-sm text-gray-500">
                        Verifies react-pdf rendering, navigation, and highlight overlay.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}>
                        Prev
                    </Button>
                    <Button variant="outline" onClick={() => setPageNumber((prev) => prev + 1)}>
                        Next
                    </Button>
                    <Button onClick={() => setHighlight(mockHighlight)}>
                        Show Highlight
                    </Button>
                    <Button variant="ghost" onClick={() => setHighlight(null)}>
                        Clear Highlight
                    </Button>
                </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-4 bg-white">
                <DocumentViewer
                    documentUrl={SAMPLE_PDF_URL}
                    documentName="Sample PDF"
                    pageNumber={pageNumber}
                    onPageChange={setPageNumber}
                    highlightedCitation={highlight}
                    onClearHighlight={() => setHighlight(null)}
                />
            </div>
        </div>
    );
}
