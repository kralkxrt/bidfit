"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Copy, FileText, User, ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Citation, RoxyMessage } from "@/lib/roxyApi";
import { DownloadButton } from "@/components/roxy/DownloadButton";

interface ChatMessageProps {
    message: RoxyMessage;
    onCitationClick?: (citation: Citation) => void;
    showTools?: boolean;
}

export function ChatMessage({ message, onCitationClick, showTools = true }: ChatMessageProps) {
    const [showSources, setShowSources] = useState(false);
    const hasCitations = (message.citations?.length ?? 0) > 0;

    const renderContent = useMemo(() => {
        // Optional: render [Download: filename](url) as a DownloadButton.
        const downloadRegex = /\[Download: (.*?)\]\((.*?)\)/g;
        const parts: ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = downloadRegex.exec(message.content)) !== null) {
            if (match.index > lastIndex) {
                const textPart = message.content.substring(lastIndex, match.index);
                parts.push(
                    <div key={`text-${lastIndex}`} className="prose prose-slate prose-sm max-w-none prose-p:my-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{textPart}</ReactMarkdown>
                    </div>
                );
            }

            const filename = match[1];
            const url = match[2];
            parts.push(<DownloadButton key={`btn-${match.index}`} url={url} filename={filename} />);

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < message.content.length) {
            const textPart = message.content.substring(lastIndex);
            parts.push(
                <div key={`text-${lastIndex}`} className="prose prose-slate prose-sm max-w-none prose-p:my-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{textPart}</ReactMarkdown>
                </div>
            );
        }

        if (parts.length > 0) return parts;

        return (
            <div className="prose prose-slate prose-sm max-w-none prose-p:my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
        );
    }, [message.content]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
        } catch {
            // ignore
        }
    };

    return (
        <div className={cn("flex gap-4", message.role === "user" ? "justify-end" : "justify-start")}>
            {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-purple-500/20 shadow-lg relative overflow-hidden">
                    <svg viewBox="0 0 48 48" className="w-5 h-5">
                        <defs>
                            <linearGradient id="roxyMsgIcon" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="white" stopOpacity="0.95" />
                                <stop offset="100%" stopColor="white" stopOpacity="0.85" />
                            </linearGradient>
                        </defs>
                        <path d="M16 20 Q24 14 32 20 Q38 26 32 32 Q24 38 16 32 Q10 26 16 20" fill="url(#roxyMsgIcon)" />
                    </svg>
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 rounded-full" />
                </div>
            )}

            <div className={cn("max-w-[85%] space-y-2", message.role === "user" ? "items-end flex flex-col" : "")}> 
                <div className="relative group">
                    {message.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-1.5 ml-1">
                            <span className="text-xs font-semibold text-indigo-600">Roxy</span>
                        </div>
                    )}

                    <div
                        className={cn(
                            "p-4 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm relative",
                            message.role === "user"
                                ? "bg-slate-100 text-slate-700 rounded-br-sm"
                                : "bg-gradient-to-br from-indigo-50/50 to-purple-50/30 border border-indigo-100 text-slate-800 rounded-bl-sm"
                        )}
                    >
                        <div className="pb-1">{renderContent}</div>

                        {hasCitations && (
                            <div className="flex justify-end mt-3 pt-2 border-t border-slate-200/50">
                                <button
                                    type="button"
                                    onClick={() => setShowSources((prev) => !prev)}
                                    className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                                >
                                    <FileText className="w-3 h-3" />
                                    {message.citations!.length} sources
                                    {showSources ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>
                            </div>
                        )}

                        {hasCitations && showSources && (
                            <div className="flex flex-wrap gap-1.5 mt-2 animate-in slide-in-from-top-2 duration-200">
                                {message.citations!.map((cite, i) => (
                                    <button
                                        key={`${cite.documentId}-${cite.pageNumber}-${cite.section || "na"}-${i}`}
                                        type="button"
                                        onClick={() => onCitationClick?.(cite)}
                                        className="flex items-center gap-1.5 text-[11px] bg-white/80 px-2 py-1 rounded-md text-slate-600 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                    >
                                        <FileText className="w-2.5 h-2.5 text-blue-500" strokeWidth={2} />
                                        <span className="truncate max-w-[160px]">{cite.documentName || "Document"}</span>
                                        <span className="text-slate-400">p.{cite.pageNumber}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {showTools && message.role === "assistant" && (
                        <div className="absolute -bottom-8 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                                title="Copy Roxy's response"
                            >
                                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
                </div>
            )}
        </div>
    );
}
