"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRoxyChat } from "@/hooks/useRoxyChat";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/roxyApi";
import { ChatMessage } from "@/components/roxy/ChatMessage";
import { ThinkingIndicator } from "@/components/roxy/ThinkingIndicator";
import { WelcomeScreen } from "@/components/roxy/WelcomeScreen";
 
 export interface RoxySidePanelProps {
     opportunityId: string;
     currentTab: "requirements" | "documents" | "analysis";
     onCitationClick: (citation: Citation) => void;
     isMinimized: boolean;
     onToggleMinimize: () => void;
    highlightedCitation?: Citation | null;
    externalPrompt?: string | null;
    onPromptHandled?: () => void;
    allowMinimize?: boolean;
    layout?: "widget" | "full";
 }
 
 export function RoxySidePanel({
     opportunityId,
     currentTab,
     onCitationClick,
     isMinimized,
     onToggleMinimize,
    highlightedCitation,
    externalPrompt,
    onPromptHandled,
    allowMinimize = true,
    layout = "widget",
 }: RoxySidePanelProps) {
     const [inputValue, setInputValue] = useState("");
     const [unreadCount, setUnreadCount] = useState(0);
     const listRef = useRef<HTMLDivElement>(null);
    const previousMessageCount = useRef(0);
    const { messages, isLoading, error, sendMessage } = useRoxyChat(opportunityId);
 
     useEffect(() => {
         if (!isMinimized) {
             setUnreadCount(0);
         }
     }, [isMinimized]);
 
    useEffect(() => {
        if (!isMinimized) {
            previousMessageCount.current = messages.length;
            return;
        }

        if (messages.length > previousMessageCount.current) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === "assistant") {
                setUnreadCount((prev) => prev + 1);
            }
        }

        previousMessageCount.current = messages.length;
    }, [isMinimized, messages]);

     useEffect(() => {
         if (!listRef.current) return;
         listRef.current.scrollTop = listRef.current.scrollHeight;
     }, [messages, isLoading]);

    useEffect(() => {
        if (!externalPrompt || isLoading) return;
        const sendExternal = async () => {
            await sendMessage(externalPrompt, { currentTab });
            onPromptHandled?.();
        };
        sendExternal();
        if (isMinimized) {
            onToggleMinimize();
        }
    }, [currentTab, externalPrompt, isLoading, onPromptHandled, onToggleMinimize, sendMessage, isMinimized]);
 

    const handleSendMessage = async (message?: string) => {
        const trimmed = (message ?? inputValue).trim();
         if (!trimmed || isLoading) return;
         setInputValue("");
        await sendMessage(trimmed, { currentTab });
     };

    const quickQuestions = [
        "What certifications are required?",
        "What's the evaluation criteria?",
        "Should we bid on this?",
        "What past performance is needed?",
    ];

    const handleQuickSend = async (question: string) => {
        if (isLoading) return;
        setInputValue("");
        await sendMessage(question, { currentTab });
    };
 
    if (isMinimized && allowMinimize) {
         return (
             <button
                 onClick={onToggleMinimize}
                className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25 relative"
             >
                <span className="text-lg font-bold text-white">R</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
             </button>
         );
     }
 
    return (
        <aside className={layout === "full" ? "flex flex-col h-full w-full" : "w-full lg:w-96 flex-shrink-0"}>
            <div
                className={`flex flex-col overflow-hidden ${layout === "full"
                    ? "h-full bg-white"
                    : "h-[70vh] sticky top-24 border border-gray-200 rounded-2xl shadow-sm bg-white"
                    }`}
            >
                <div
                    className={cn(
                        layout === "full"
                            ? "flex items-center gap-3 p-4 border-b border-slate-200 bg-white"
                            : "px-4 py-3 border-b border-slate-700 bg-slate-900 rounded-t-2xl"
                    )}
                >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                        <span className="text-base font-bold text-white">R</span>
                    </div>

                    <h3 className={cn("font-semibold text-lg", layout === "full" ? "text-slate-900" : "text-white")}>
                        Roxy
                    </h3>

                    <div className="ml-auto flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className={cn("text-xs", layout === "full" ? "text-slate-400" : "text-gray-400")}>
                            Online
                        </span>
                    </div>

                    {allowMinimize && layout !== "full" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white"
                            onClick={onToggleMinimize}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <div ref={listRef} className={cn("flex-1 overflow-y-auto p-4 space-y-4", layout === "full" ? "bg-white" : "")}>
                    {messages.length === 0 && !isLoading ? (
                        <WelcomeScreen onPromptClick={handleSendMessage} />
                    ) : (
                        messages.map((message) => (
                            <ChatMessage
                                key={message.id}
                                message={message}
                                onCitationClick={onCitationClick}
                            />
                        ))
                    )}

                    {isLoading && <ThinkingIndicator />}

                    {error && (
                        <div className="text-xs text-red-500">{error}</div>
                    )}
                </div>

                {highlightedCitation && (
                    <div className={`border-t px-4 py-3 text-xs ${layout === "full" ? "border-slate-200 bg-white" : "border-gray-100"}`}>
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-700">Source Reference</span>
                            <button
                                className="text-violet-600 hover:text-violet-700 font-medium"
                                onClick={() => onCitationClick({ ...highlightedCitation })}
                            >
                                View in Document
                            </button>
                        </div>
                        <div className="mt-1 text-slate-500 truncate">
                            {highlightedCitation.documentName || "Document"}{" "}
                            {highlightedCitation.pageNumber ? `• Page ${highlightedCitation.pageNumber}` : ""}
                        </div>
                    </div>
                )}

                <div className={`border-t p-4 ${layout === "full" ? "border-slate-200 bg-white" : "border-gray-100"}`}>
                    <div className="flex gap-2">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask Roxy..."
                            className="bg-white"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <Button onClick={() => handleSendMessage()} disabled={isLoading} className="bg-violet-600 hover:bg-violet-700">
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                        {quickQuestions.map((question) => (
                            <Button
                                key={question}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs bg-white"
                                onClick={() => handleQuickSend(question)}
                                disabled={isLoading}
                            >
                                {question}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );
}

