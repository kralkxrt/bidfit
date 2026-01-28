import { useState } from 'react';
import { Bot, User, FileText, Copy, RotateCw, ArrowRight, Sparkles, ChevronDown, ChevronRight, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType } from '@/types';
import { cn } from '@/lib/utils';
import { DownloadButton } from './DownloadButton';

interface ChatMessageProps {
    msg: ChatMessageType;
    isLast: boolean;
    sending: boolean;
    onCopy: (content: string, id: string) => void;
    onRegenerate: () => void;
    onContinue: () => void;
    onFeedback?: (messageId: string, content: string) => void;
}

export function ChatMessage({ msg, isLast, sending, onCopy, onRegenerate, onContinue, onFeedback }: ChatMessageProps) {
    const [showSources, setShowSources] = useState(false);
    const hasCitations = msg.citations && msg.citations.length > 0;

    // Helper to render content with download buttons and markdown
    const renderContent = (content: string) => {
        const downloadRegex = /\[Download: (.*?)\]\((.*?)\)/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = downloadRegex.exec(content)) !== null) {
            // Add markdown text before the match
            if (match.index > lastIndex) {
                const textPart = content.substring(lastIndex, match.index);
                parts.push(
                    <div key={`text-${lastIndex}`} className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                                a: ({ node, ...props }) => <a {...props} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" />,
                                ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2" />,
                                ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2" />,
                            }}
                        >
                            {textPart}
                        </ReactMarkdown>
                    </div>
                );
            }

            // Add the download button
            const filename = match[1];
            const url = match[2];
            parts.push(<DownloadButton key={`btn-${match.index}`} url={url} filename={filename} />);

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < content.length) {
            const textPart = content.substring(lastIndex);
            parts.push(
                <div key={`text-${lastIndex}`} className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                            a: ({ node, ...props }) => <a {...props} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" />,
                            ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2" />,
                            ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2" />,
                        }}
                    >
                        {textPart}
                    </ReactMarkdown>
                </div>
            );
        }

        return parts.length > 0 ? parts : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                        a: ({ node, ...props }) => <a {...props} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" />,
                        ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2" />,
                        ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2" />,
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        );
    };

    return (
        <div className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-purple-500/20 shadow-lg relative overflow-hidden">
                    <svg viewBox="0 0 48 48" className="w-5 h-5">
                        <defs>
                            <linearGradient id="roxyMsgIcon" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="white" stopOpacity="0.95" />
                                <stop offset="100%" stopColor="white" stopOpacity="0.85" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M16 20 Q24 14 32 20 Q38 26 32 32 Q24 38 16 32 Q10 26 16 20"
                            fill="url(#roxyMsgIcon)"
                        />
                    </svg>
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 rounded-full" />
                </div>
            )}

            <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                <div className="relative group">
                    {/* Roxy Message Header */}
                    {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-1.5 ml-1">
                            <span className="text-xs font-semibold font-display text-indigo-600 dark:text-indigo-400">Roxy</span>
                        </div>
                    )}

                    <div className={cn(
                        "p-4 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm font-body relative",
                        msg.role === 'user'
                            ? "bg-[#007AFF] text-white rounded-br-sm shadow-blue-500/20"
                            : "bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-900/10 dark:to-purple-900/10 border border-indigo-100 dark:border-indigo-500/20 text-slate-800 dark:text-gray-100 rounded-bl-sm"
                    )}>
                        <div className="pb-1">{renderContent(msg.content)}</div>

                        {/* Citations toggle - bottom right */}
                        {hasCitations && (
                            <div className="flex justify-end mt-3 pt-2 border-t border-slate-200/50 dark:border-white/10">
                                <button
                                    onClick={() => setShowSources(!showSources)}
                                    className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                    <FileText className="w-3 h-3" />
                                    {msg.citations!.length} sources
                                    {showSources ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>
                            </div>
                        )}

                        {/* Expanded citations list */}
                        {hasCitations && showSources && (
                            <div className="flex flex-wrap gap-1.5 mt-2 animate-in slide-in-from-top-2 duration-200">
                                {msg.citations!.map((cite, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-[11px] bg-white/80 dark:bg-white/5 px-2 py-1 rounded-md text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                                        <FileText className="w-2.5 h-2.5 text-blue-500" strokeWidth={2} />
                                        <span className="truncate max-w-[120px]">{cite.source_name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tools */}
                    {msg.role === 'assistant' && !sending && (
                        <div className="absolute -bottom-8 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onCopy(msg.content, msg.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition" title="Copy Roxy's response"><Copy className="w-3.5 h-3.5" strokeWidth={1.5} /></button>
                            {onFeedback && (
                                <button onClick={() => onFeedback(msg.id, msg.content)} className="flex items-center gap-1 pl-1.5 pr-2 py-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition text-xs" title="I edited this - teach Roxy">
                                    <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
                                    <span className="font-medium">Edited</span>
                                </button>
                            )}
                            {isLast && (
                                <>
                                    <button onClick={onRegenerate} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition" title="Ask Roxy to try again"><RotateCw className="w-3.5 h-3.5" strokeWidth={1.5} /></button>
                                    <button onClick={onContinue} className="flex items-center gap-1 pl-2 pr-2 py-1 ml-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-xs font-medium text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition">Continue <ArrowRight className="w-3 h-3" strokeWidth={1.5} /></button>
                                </>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-slate-500 dark:text-slate-400" strokeWidth={1.5} />
                </div>
            )}
        </div>
    );
}
