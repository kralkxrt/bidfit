export interface Citation {
    id?: string;
    documentId: string;
    documentName?: string;
    pageNumber: number;
    section?: string;
    textSnippet?: string;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface RoxyMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations?: Citation[];
    timestamp: Date;
    toolUsed?: string;
}

interface RoxyStreamChunk {
    type: "text" | "delta" | "citation" | "done";
    content?: string;
    citation?: Citation;
    messageId?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const mockStream = async (onChunk: (chunk: RoxyStreamChunk) => void) => {
    const fakeCitation: Citation = {
        documentId: "doc-1",
        documentName: "RFP_Main.pdf",
        pageNumber: 12,
        section: "L.5.2",
        textSnippet: "Offerors must possess ISO 27001 and CMMI Level 3 certifications.",
    };

    onChunk({ type: "text", content: "Based on Section L.5.2, " });
    await sleep(300);
    onChunk({ type: "text", content: "the following certifications are required:" });
    await sleep(300);
    onChunk({ type: "text", content: "\n• ISO 27001\n• CMMI Level 3" });
    await sleep(200);
    onChunk({ type: "citation", citation: fakeCitation });
    await sleep(150);
    onChunk({ type: "done", messageId: "mock-message-id" });
};

export async function streamRoxyChat(
    opportunityId: string,
    message: string,
    context: { currentTab: string },
    onChunk: (chunk: RoxyStreamChunk) => void
): Promise<void> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/roxy/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                opportunity_id: opportunityId,
                message,
                context,
            }),
        });

        if (!response.ok || !response.body) {
            throw new Error(`Roxy chat endpoint error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const payload = trimmed.replace(/^data:\s*/, "");
                if (!payload) continue;

                try {
                    const chunk = JSON.parse(payload) as RoxyStreamChunk;
                    onChunk(chunk);
                } catch (error) {
                    console.warn("Failed to parse Roxy stream chunk", error);
                }
            }
        }
    } catch (error) {
        if (error instanceof TypeError) {
            console.warn("Network error, falling back to mock Roxy stream", error);
            await mockStream(onChunk);
            return;
        }
        throw error;
    }
}

export async function getRoxyHistory(opportunityId: string): Promise<RoxyMessage[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/roxy/history/${opportunityId}`);
        if (!response.ok) {
            throw new Error("Roxy history unavailable");
        }

        type RoxyMessageRaw = Omit<RoxyMessage, "timestamp"> & { timestamp: string };
        const data = (await response.json()) as { messages?: RoxyMessageRaw[] };

        return (data.messages ?? []).map((message) => ({
            ...message,
            timestamp: new Date(message.timestamp),
        }));
    } catch (error) {
        console.warn("Falling back to empty Roxy history", error);
        return [];
    }
}
