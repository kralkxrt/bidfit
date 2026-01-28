'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalText: string;
    messageId: string;
    clientId: string;
}

export function FeedbackModal({ isOpen, onClose, originalText, messageId, clientId }: FeedbackModalProps) {
    const [editedText, setEditedText] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [lesson, setLesson] = useState('');

    const handleSubmit = async () => {
        if (!editedText.trim()) return;

        setLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/clients/${clientId}/chat/messages/${messageId}/feedback`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        original_text: originalText,
                        edited_text: editedText
                    })
                }
            );

            if (res.ok) {
                const data = await res.json();
                setLesson(data.lesson_learned || 'Lesson recorded');
                setSuccess(true);
            }
        } catch (e) {
            console.error('Feedback submission failed:', e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-display font-semibold text-slate-900 dark:text-white">
                                Teach Roxy
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Help her learn from your edit
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {success ? (
                        <div className="text-center py-6 space-y-3">
                            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <p className="font-display font-semibold text-slate-900 dark:text-white">
                                Thanks! Roxy learned:
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 rounded-lg p-3 italic">
                                "{lesson}"
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Original Text
                                </label>
                                <div className="bg-slate-100 dark:bg-white/5 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-400 max-h-24 overflow-y-auto font-body">
                                    {originalText.slice(0, 300)}{originalText.length > 300 ? '...' : ''}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Your Edited Version
                                </label>
                                <textarea
                                    value={editedText}
                                    onChange={(e) => setEditedText(e.target.value)}
                                    placeholder="Paste your edited version here..."
                                    rows={6}
                                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-body resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !editedText.trim()}
                                    className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Learning...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Teach Roxy
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
