import { useCallback, useEffect, useRef, useState } from "react";
import { getRoxyHistory, streamRoxyChat, type Citation, type RoxyMessage } from "@/lib/roxyApi";

interface SendContext {
    currentTab: string;
}

export function useRoxyChat(opportunityId: string) {
    const [messages, setMessages] = useState<RoxyMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const activeAssistantId = useRef<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const loadHistory = async () => {
            const history = await getRoxyHistory(opportunityId);
            if (isMounted) {
                setMessages(history);
            }
        };
        if (opportunityId) {
            loadHistory();
        }
        return () => {
            isMounted = false;
        };
    }, [opportunityId]);

    const appendTextToAssistant = useCallback((content: string) => {
        setMessages((prev) =>
            prev.map((message) =>
                message.id === activeAssistantId.current
                    ? { ...message, content: message.content + content }
                    : message
            )
        );
    }, []);

    const appendCitationToAssistant = useCallback((citation: Citation) => {
        setMessages((prev) =>
            prev.map((message) =>
                message.id === activeAssistantId.current
                    ? { ...message, citations: [...(message.citations || []), citation] }
                    : message
            )
        );
    }, []);

    const sendMessage = useCallback(
        async (message: string, context: SendContext) => {
            const trimmed = message.trim();
            if (!trimmed || isLoading) return;

            setError(null);
            setIsLoading(true);

            const userMessage: RoxyMessage = {
                id: `user-${Date.now()}`,
                role: "user",
                content: trimmed,
                timestamp: new Date(),
            };

            const assistantMessage: RoxyMessage = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: "",
                citations: [],
                timestamp: new Date(),
            };

            activeAssistantId.current = assistantMessage.id;
            setMessages((prev) => [...prev, userMessage, assistantMessage]);

            try {
                await streamRoxyChat(opportunityId, trimmed, context, (chunk) => {
                    if ((chunk.type === "text" || chunk.type === "delta") && chunk.content) {
                        appendTextToAssistant(chunk.content);
                    }
                    if (chunk.type === "citation" && chunk.citation) {
                        appendCitationToAssistant(chunk.citation);
                    }
                    if (chunk.type === "done") {
                        setIsLoading(false);
                    }
                });
            } catch (error) {
                console.error("Roxy chat failed", error);
                setError("Roxy is unavailable right now.");
                setIsLoading(false);
            }
        },
        [appendCitationToAssistant, appendTextToAssistant, isLoading, opportunityId]
    );

    return {
        messages,
        isLoading,
        error,
        sendMessage,
    };
}
