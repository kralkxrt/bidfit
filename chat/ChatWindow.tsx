import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, FileText, Loader2, Copy, Check, Zap, RotateCw, ArrowRight, Paperclip, Sparkles, Brain, ChevronDown, Square, X, Image as ImageIcon, File as FileIcon } from 'lucide-react';

interface Attachment {
    id: string;
    file: File;
    type: 'image' | 'file';
    previewUrl?: string; // For images
    extractedText?: string; // For docs
    uploading: boolean;
}
import { api } from '@/lib/api';
import { ChatSession, ChatMessage as ChatMessageType } from '@/types';
import { PromptTemplateModal, TEMPLATES } from './PromptTemplateModal';
import { WelcomeScreen } from './WelcomeScreen';
import { ChatMessage } from './ChatMessage';
import { FeedbackModal } from './FeedbackModal';
import { RoxyMemory } from '../RoxyMemory';
import { ThinkingIndicator } from './ThinkingIndicator';

// Model options for Roxy (tested & working with your API key)
const AVAILABLE_MODELS = [
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude 4.5 Sonnet (Best)' },
    { id: 'claude-opus-4-20250514', name: 'Claude 4 Opus (Most Powerful)' },
    { id: 'gpt-4o', name: 'GPT-4o (Fast & Smart)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Cheapest)' },
];

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

interface ChatWindowProps {
    clientId: string;
    companyName: string; // New prop
    sessionId?: string; // Optional now
    initialMessages?: ChatMessageType[];
    onSessionCreated?: (sessionId: string) => void;
    onFirstMessage?: () => void; // Called after first message to refresh session list
}

export function ChatWindow({ clientId, companyName, sessionId, initialMessages = [], onSessionCreated, onFirstMessage }: ChatWindowProps) {
    const [messages, setMessages] = useState<ChatMessageType[]>(initialMessages || []);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Upload State
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);



    // Tools State
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [wordCount, setWordCount] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);

    // Memory/Feedback State
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [feedbackMessageId, setFeedbackMessageId] = useState('');
    const [feedbackContent, setFeedbackContent] = useState('');
    const [memoryOpen, setMemoryOpen] = useState(false);
    const previousSessionRef = useRef<string | undefined>(undefined);

    // Model selection state
    const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL);
    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

    // Get current model object
    const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0];

    // Reset messages when sessionId changes
    useEffect(() => {
        if (sessionId) {
            // RACE CONDITION FIX: 
            // If we are currently sending (optimistic update active) and the session ID matches 
            // (e.g. we just created this session via streamMessage), DO NOT wipe the state.
            // We rely on the optimistic state + stream updates.
            if (sending && messages.length > 0 && messages[0].session_id === sessionId) {
                return;
            }

            if (initialMessages && initialMessages.length > 0) {
                setMessages(initialMessages);
            } else {
                setLoading(true);
                // Don't wipe if we are seemingly in the correct state, but standard behavior is to load
                if (!sending) setMessages([]);

                api.chat.listMessages(clientId, sessionId)
                    .then(msgs => {
                        // Only update if we aren't mid-stream or if this is a fresh load
                        if (!sending) setMessages(msgs);
                        // If sending, we assume optimistic state is fresher than DB
                    })
                    .catch(e => console.error(e))
                    .finally(() => setLoading(false));
            }
        } else {
            setMessages([]);
        }
    }, [sessionId, clientId, companyName]);

    // Scroll to bottom logic
    const scrollToBottom = () => {
        if (scrollRef.current) {
            const { scrollHeight, clientHeight } = scrollRef.current;
            scrollRef.current.scrollTop = scrollHeight - clientHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
        // Small delay to ensure render is complete for images or layout shifts
        setTimeout(scrollToBottom, 100);
    }, [messages, loading]);

    // Word count logic
    useEffect(() => {
        if (messages && messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
            const count = messages[messages.length - 1].content.split(/\s+/).filter(Boolean).length;
            setWordCount(count);
        } else {
            setWordCount(0);
        }
    }, [messages]);

    const handleCopy = async (content: string, id: string) => {
        await navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // --- UPLOAD HANDLERS ---
    const processFiles = async (files: FileList | File[]) => {
        const newAttachments: Attachment[] = [];

        for (const file of Array.from(files)) {
            const id = Math.random().toString(36).substring(7);
            const isImage = file.type.startsWith('image/');

            const attachment: Attachment = {
                id,
                file,
                type: isImage ? 'image' : 'file',
                uploading: true
            };

            // Optimistic update
            setAttachments(prev => [...prev, attachment]);

            if (isImage) {
                // Read image preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    setAttachments(prev => prev.map(a =>
                        a.id === id ? { ...a, previewUrl: e.target?.result as string, uploading: false } : a
                    ));
                };
                reader.readAsDataURL(file);
            } else {
                // Extract Text for Docs
                const formData = new FormData();
                formData.append('file', file);

                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/extract-text`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    setAttachments(prev => prev.map(a =>
                        a.id === id ? { ...a, extractedText: data.content, uploading: false } : a
                    ));
                } catch (e) {
                    console.error('Extraction failed', e);
                    setAttachments(prev => prev.map(a =>
                        a.id === id ? { ...a, extractedText: "Error reading file", uploading: false } : a
                    ));
                }
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) processFiles(e.target.files);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (e.clipboardData.files.length > 0) {
            e.preventDefault(); // Prevent double paste
            processFiles(e.clipboardData.files);
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    // Drag and Drop
    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    };



    const streamMessage = async (content: string, tempAdjustment: number = 0.0) => {
        if (sending) return;
        setSending(true);

        // CREATE SESSION IF NEEDED
        let activeSessionId = sessionId;
        if (!activeSessionId) {
            try {
                // Generate title from first few words
                const title = content.slice(0, 30) + '...';
                const newSession = await api.chat.createSession(clientId, title);
                activeSessionId = newSession.id;
                if (onSessionCreated) onSessionCreated(newSession.id);
            } catch (e) {
                alert('Failed to start chat session');
                setSending(false);
                return;
            }
        }

        const tempId = Date.now().toString();
        const optimisticMsg: ChatMessageType = {
            id: tempId,
            session_id: activeSessionId!,
            role: 'user',
            content: content,
            citations: [],
            created_at: new Date().toISOString()
        };

        const assistantMsgId = (Date.now() + 1).toString();
        const assistantPlaceholder: ChatMessageType = {
            id: assistantMsgId,
            session_id: activeSessionId!,
            role: 'assistant',
            content: '',
            citations: [],
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg, assistantPlaceholder]);

        // Init AbortController
        abortControllerRef.current = new AbortController();

        let url = '';
        try {
            url = `${api.baseUrl}/clients/${clientId}/chat/sessions/${activeSessionId}/messages/stream`;
            console.log('Stream Request URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content,
                    temperature_adjustment: tempAdjustment,
                    model: selectedModelId,
                    images: attachments.filter(a => a.type === 'image' && a.previewUrl).map(a => a.previewUrl!)
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Server error ${response.status}: ${text}`);
            }
            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop() || ''; // Keep the last partial chunk in buffer

                for (const part of parts) {
                    if (part.startsWith('data: ')) {
                        try {
                            const jsonStr = part.replace('data: ', '');
                            const event = JSON.parse(jsonStr);

                            if (event.type === 'content') {
                                accumulatedContent += event.delta;
                                setMessages(prev => prev.map(m =>
                                    m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m
                                ));
                            } else if (event.type === 'citations') {
                                setMessages(prev => prev.map(m =>
                                    m.id === assistantMsgId ? { ...m, citations: event.data } : m
                                ));
                            } else if (event.type === 'error') {
                                console.error('Stream error:', event.message);
                            }
                        } catch (e) { }
                    }
                }
            }

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Generation stopped by user');
                // Optional: append " [Stopped]" to the message?
            } else {
                console.error('Failed to send:', error);
                setMessages(prev => prev.filter(m => m.id !== tempId && m.id !== assistantMsgId));
                setInput(content);
                alert(`Failed to send message to ${url}: ${error.message || error}`);
            }
        } finally {
            setSending(false);
            abortControllerRef.current = null;
            // Trigger session list refresh after first message (to show new title)
            if (messages.length === 0 && onFirstMessage) {
                setTimeout(() => onFirstMessage(), 500); // Small delay for backend to update title
            }
        }
    };

    const handleSend = async () => {
        if (!input.trim() && attachments.length === 0) return;

        // Wait for uploads/extractions to finish?
        // For MVP we assume they are fast or user waits. 
        // Real implementation should block if uploading.

        let initialMsg = input;

        // Append text contexts
        const textFiles = attachments.filter(a => a.type === 'file' && a.extractedText);
        if (textFiles.length > 0) {
            initialMsg += "\n\n--- ATTACHED CONTEXT ---\n";
            for (const f of textFiles) {
                initialMsg += `\n[File: ${f.file.name}]\n${f.extractedText}\n`;
            }
            initialMsg += "\n------------------------\n";
        }

        const msg = initialMsg;
        setInput('');
        setAttachments([]); // Clear after sending
        await streamMessage(msg);
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const handleRegenerate = async () => {
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        if (!lastUserMsg) return;
        setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last.role === 'assistant') return prev.slice(0, -2);
            return prev.slice(0, -1);
        });
        await streamMessage(lastUserMsg.content, 0.1);
    };

    const handleContinue = async () => {
        await streamMessage("Please continue where you left off.");
    };

    const handleTemplate = (text: string) => {
        setInput(text);
    };

    // Feedback handler
    const handleFeedback = (messageId: string, content: string) => {
        setFeedbackMessageId(messageId);
        setFeedbackContent(content);
        setFeedbackModalOpen(true);
    };

    // Extract learnings when switching sessions
    useEffect(() => {
        const prevSession = previousSessionRef.current;
        if (prevSession && prevSession !== sessionId && messages.length >= 5) {
            // Fire and forget - don't block UI
            fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/clients/${clientId}/chat/sessions/${prevSession}/extract-learnings`,
                { method: 'POST' }
            ).catch(e => console.log('Learning extraction failed:', e));
        }
        previousSessionRef.current = sessionId;
    }, [sessionId]);

    const isEmpty = !messages || messages.length === 0;

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] dark:bg-[#1C1C1E] relative">
            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto w-full"
            >
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-300" strokeWidth={1.5} />
                    </div>
                ) : isEmpty ? (
                    <WelcomeScreen
                        onPromptClick={(text) => setInput(text)}
                        companyName={companyName}
                    />
                ) : (
                    <div className="flex-1 p-4 space-y-6">
                        {messages.map((msg, idx) => (
                            <ChatMessage
                                key={msg.id || idx}
                                msg={msg}
                                isLast={idx === messages.length - 1}
                                sending={sending}
                                onCopy={handleCopy}
                                onRegenerate={handleRegenerate}
                                onContinue={handleContinue}
                                onFeedback={handleFeedback}
                            />
                        ))}
                        {sending && messages.length > 0 && messages[messages.length - 1].content.length === 0 && (
                            <ThinkingIndicator />
                        )}
                    </div>
                )}
            </div>

            {/* INPUT BAR - Always visible */}
            <div className="p-4 bg-white dark:bg-[#1C1C1E] border-t border-slate-200 dark:border-slate-800">
                <div
                    className={`relative max-w-4xl mx-auto transition-all ${isDragging ? 'ring-2 ring-indigo-500 ring-offset-2 rounded-xl scale-[1.01]' : ''}`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                >
                    {/* Attachment Pills */}
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {attachments.map(att => (
                                <div key={att.id} className="flex items-center gap-2 pl-2 pr-1 py-1 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200">
                                    {att.type === 'image' ? (
                                        <ImageIcon className="w-3 h-3 text-violet-500" />
                                    ) : (
                                        <FileIcon className="w-3 h-3 text-indigo-500" />
                                    )}
                                    <span className="max-w-[150px] truncate">{att.file.name}</span>
                                    {att.uploading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                                    <button onClick={() => removeAttachment(att.id)} className="p-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full">
                                        <X className="w-3 h-3 text-slate-400" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {isDragging && (
                        <div className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-900/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl border-2 border-indigo-500 border-dashed">
                            <div className="flex flex-col items-center text-indigo-600 dark:text-indigo-400 font-medium">
                                <Sparkles className="w-8 h-8 mb-2 animate-bounce" />
                                Drop files to add context
                            </div>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        onChange={handleFileSelect}
                    />

                    <div className="absolute left-3 bottom-3 z-10">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                            title="Attach files"
                        >
                            <Paperclip className="w-4 h-4" />
                        </button>
                    </div>

                    <textarea
                        value={input}
                        onPaste={handlePaste}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask Roxy anything about your proposal..."
                        className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none min-h-[52px] max-h-[200px] text-sm leading-relaxed shadow-inner transition-all hover:bg-white dark:hover:bg-black/30 font-body"
                        rows={1}
                        disabled={sending}
                    />
                    <button
                        onClick={sending ? handleStop : handleSend}
                        disabled={!input.trim() && attachments.length === 0 && !sending}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${sending
                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                            : (!input.trim() && attachments.length === 0)
                                ? 'bg-slate-100 dark:bg-white/10 text-slate-300 dark:text-slate-600'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'
                            }`}
                        title={sending ? "Stop generating" : "Send message"}
                    >
                        {sending ? (
                            <Square className="w-3.5 h-3.5 fill-current" strokeWidth={2} />
                        ) : (
                            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                        )}
                    </button>
                </div>

                {/* Model selector and disclaimer */}
                <div className="max-w-4xl mx-auto mt-2 flex items-center justify-between">
                    {/* Model Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all"
                        >
                            <span className="font-medium">{currentModel.name}</span>
                            <ChevronDown className="w-3 h-3" />
                        </button>

                        {modelDropdownOpen && (
                            <div className="absolute bottom-full mb-1 left-0 bg-white dark:bg-[#2C2C2E] border border-slate-200 dark:border-white/10 rounded-lg shadow-xl py-1 min-w-[160px] z-50">
                                {AVAILABLE_MODELS.map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={() => {
                                            setSelectedModelId(model.id);
                                            setModelDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${selectedModelId === model.id ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10' : 'text-slate-600 dark:text-slate-300'
                                            }`}
                                    >
                                        <div className="font-medium">{model.name}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <span className="text-xs text-slate-300 dark:text-slate-600">
                        Roxy can make mistakes. Please verify important information.
                    </span>
                </div>
            </div>

            <PromptTemplateModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onGenerate={handleTemplate}
                baseTemplate={null}
            />

            {/* Feedback Modal */}
            <FeedbackModal
                isOpen={feedbackModalOpen}
                onClose={() => setFeedbackModalOpen(false)}
                originalText={feedbackContent}
                messageId={feedbackMessageId}
                clientId={clientId}
            />

            {/* Memory Viewer */}
            <RoxyMemory
                isOpen={memoryOpen}
                onClose={() => setMemoryOpen(false)}
            />

            {/* Memory button - fixed position */}
            <button
                onClick={() => setMemoryOpen(true)}
                className="fixed bottom-24 right-6 p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:scale-105 z-40"
                title="Roxy's Memory"
            >
                <Brain className="w-5 h-5" />
            </button>
        </div>
    );
}
