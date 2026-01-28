 "use client";
 
 import { useMemo, useState } from "react";
 import ReactMarkdown from "react-markdown";
 import { useRoxyChat } from "@/hooks/useRoxyChat";
 import type { Citation } from "@/lib/roxyApi";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 
 const TEST_OPPORTUNITY_ID = "4ee143cc-b927-4341-926e-1a83087f0c1e";
 
 export default function RoxyTestPage() {
     const { messages, isLoading, error, sendMessage } = useRoxyChat(TEST_OPPORTUNITY_ID);
     const [inputValue, setInputValue] = useState("");
     const [lastCitation, setLastCitation] = useState<Citation | null>(null);
     const [lastClickLog, setLastClickLog] = useState<string | null>(null);
 
     const handleSend = async () => {
         const trimmed = inputValue.trim();
         if (!trimmed || isLoading) return;
         setInputValue("");
         await sendMessage(trimmed, { currentTab: "documents" });
     };
 
     const handleCitationClick = (citation: Citation) => {
         setLastCitation(citation);
         const log = `citation-clicked:${citation.documentName || citation.documentId}`;
         setLastClickLog(log);
         console.log(log, citation);
     };
 
     const hasCitations = useMemo(
         () => messages.some((message) => (message.citations || []).length > 0),
         [messages]
     );
 
     return (
         <div className="max-w-4xl mx-auto p-8 space-y-6">
             <header className="space-y-2">
                 <h1 className="text-2xl font-bold text-gray-900">Roxy Integration Test</h1>
                 <p className="text-sm text-gray-600">
                     Opportunity ID: {TEST_OPPORTUNITY_ID}
                 </p>
                 <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                     <span>Streaming: {isLoading ? "active" : "idle"}</span>
                     <span>Messages: {messages.length}</span>
                     <span>Citations: {hasCitations ? "yes" : "no"}</span>
                 </div>
                 {error && <p className="text-sm text-red-600">{error}</p>}
             </header>
 
             <section className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white shadow-sm">
                 <div className="flex gap-2">
                     <Input
                         value={inputValue}
                         onChange={(e) => setInputValue(e.target.value)}
                         placeholder="Ask Roxy..."
                         onKeyDown={(e) => {
                             if (e.key === "Enter") {
                                 e.preventDefault();
                                 handleSend();
                             }
                         }}
                     />
                     <Button onClick={handleSend} disabled={isLoading}>
                         Send
                     </Button>
                 </div>
 
                 <div className="text-xs text-gray-500">
                     {isLoading ? "Streaming response..." : "Idle"}
                 </div>
             </section>
 
             <section className="space-y-4">
                 {messages.map((message) => (
                     <div
                         key={message.id}
                         className={`rounded-xl border px-4 py-3 ${message.role === "user"
                             ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                             : "bg-gray-50 border-gray-200 text-gray-900"
                             }`}
                     >
                        <div className="text-xs uppercase tracking-widest text-gray-400 mb-2">
                            {message.role}
                        </div>
                        <div className="prose prose-sm max-w-none prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        {message.citations && message.citations.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                 {message.citations.map((citation, idx) => (
                                     <Button
                                         key={`${citation.documentId}-${idx}`}
                                         variant="outline"
                                         size="sm"
                                         className="text-xs"
                                         onClick={() => handleCitationClick(citation)}
                                     >
                                         {citation.documentName || "Document"}{" "}
                                         {citation.pageNumber ? `p.${citation.pageNumber}` : ""}
                                     </Button>
                                 ))}
                             </div>
                         )}
                     </div>
                 ))}
             </section>
 
             <section className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm space-y-2">
                 <div className="text-sm font-semibold text-gray-900">Citation Click Log</div>
                 <div className="text-xs text-gray-600">
                     {lastClickLog || "No citation clicks yet."}
                 </div>
                 <Button
                     variant="outline"
                     size="sm"
                     onClick={() =>
                         handleCitationClick({
                             documentId: "mock-doc",
                             documentName: "Mock Document",
                             pageNumber: 12,
                             textSnippet: "Mock citation snippet.",
                         })
                     }
                 >
                     Simulate Citation Click
                 </Button>
                 {lastCitation && (
                     <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto">
                         {JSON.stringify(lastCitation, null, 2)}
                     </pre>
                 )}
             </section>
         </div>
     );
 }
