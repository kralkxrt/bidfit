"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { Download, FileText, Paperclip, Sigma } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AttachmentItem {
    id: string;
    filename: string;
    file_url?: string;
    file_path?: string;
}

interface AttachmentsListProps {
    opportunityId: string;
    attachments: AttachmentItem[];
    selectedAttachmentId?: string | null;
    onSelectAttachment: (attachment: AttachmentItem) => void;
    onSummaryReady?: (attachmentId: string, summary: string) => void;
}

const resolveDownloadUrl = (attachment: AttachmentItem) => {
    return attachment.file_url || attachment.file_path || "";
};

export function AttachmentsList({
    opportunityId,
    attachments,
    selectedAttachmentId,
    onSelectAttachment,
    onSummaryReady,
}: AttachmentsListProps) {
    const [summarizingId, setSummarizingId] = useState<string | null>(null);
    const [errorId, setErrorId] = useState<string | null>(null);

    const handleSummarize = async (attachment: AttachmentItem) => {
        if (summarizingId) return;
        setSummarizingId(attachment.id);
        setErrorId(null);
        try {
            const response = await api.post("/api/roxy/summarize-attachment", {
                opportunity_id: opportunityId,
                attachment_id: attachment.id,
            });
            if (onSummaryReady) {
                onSummaryReady(attachment.id, response.data?.summary || "");
            }
        } catch (error) {
            console.error("Failed to summarize attachment", error);
            setErrorId(attachment.id);
        } finally {
            setSummarizingId(null);
        }
    };

    const handleDownload = (attachment: AttachmentItem, event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        const url = resolveDownloadUrl(attachment);
        if (!url) return;
        const link = document.createElement("a");
        link.href = url;
        link.download = attachment.filename;
        link.target = "_blank";
        link.rel = "noreferrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <Card className="rounded-[2rem] border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                    <Paperclip className="h-4 w-4 text-blue-600" />
                    Attachments
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {attachments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                        No attachments uploaded yet.
                    </div>
                ) : (
                    attachments.map((attachment) => {
                        const isSelected = selectedAttachmentId === attachment.id;
                        const isSummarizing = summarizingId === attachment.id;
                        const hasError = errorId === attachment.id;
                        return (
                            <button
                                key={attachment.id}
                                onClick={() => onSelectAttachment(attachment)}
                                className={cn(
                                    "w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition",
                                    isSelected
                                        ? "border-blue-200 bg-blue-50/60"
                                        : "border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                                )}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-700">
                                            {attachment.filename}
                                        </p>
                                        {hasError && (
                                            <p className="text-xs text-red-500">Summary failed. Try again.</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleSummarize(attachment);
                                        }}
                                        disabled={isSummarizing}
                                        className={cn(
                                            "h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50",
                                            isSummarizing && "animate-pulse"
                                        )}
                                    >
                                        <Sigma className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={(event) => handleDownload(attachment, event)}
                                        className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            </button>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
