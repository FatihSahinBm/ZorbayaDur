"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, Send, ShieldCheck } from "lucide-react";

interface Message {
  id: string;
  sender_role: "student" | "pdr";
  content: string;
  is_read: boolean;
  created_at: string;
}

interface MessageThreadProps {
  reportId: string;
  viewerRole: "student" | "pdr";
  sessionToken?: string; // öğrenci için zorunlu
  compact?: boolean;
}

export function MessageThread({ reportId, viewerRole, sessionToken, compact = false }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const params = new URLSearchParams({ reportId, role: viewerRole });
      if (viewerRole === "student" && sessionToken) params.set("token", sessionToken);

      const res = await fetch(`/api/messages?${params}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (e) {
      console.error("Mesajlar yüklenemedi:", e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => fetchMessages(true), 4000);
    return () => clearInterval(interval);
  }, [reportId, sessionToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    const msg = newMessage.trim();
    setNewMessage("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          token: sessionToken ?? "pdr-system",
          content: msg,
          role: viewerRole,
        }),
      });
      if (res.ok) fetchMessages(true);
    } catch (e) {
      console.error("Mesaj gönderilemedi:", e);
    } finally {
      setIsSending(false);
    }
  };

  const isStudent = viewerRole === "student";
  const msgAreaClass = compact ? "max-h-52" : "max-h-72";

  return (
    <div className="flex flex-col gap-3">
      {/* Güvenlik Notu */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/[0.06] border border-green-500/20 text-xs text-green-700 dark:text-green-400">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        {isStudent
          ? "Kimliğin gizli. PDR sana sadece bu kanal üzerinden ulaşabilir."
          : "Bu kanal uçtan uca anonimdir. Öğrencinin kimliği korunuyor."}
      </div>

      {/* Mesaj Listesi */}
      <div className={`${msgAreaClass} overflow-y-auto space-y-2 pr-1`}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
            <MessageSquare className="w-7 h-7 opacity-30" />
            <p className="text-xs">Henüz mesaj yok.</p>
            {isStudent && <p className="text-xs text-slate-500">PDR uzmanı sana mesaj gönderdiğinde burada görünecek.</p>}
          </div>
        ) : messages.map(msg => {
          const isSelf = msg.sender_role === viewerRole;
          return (
            <div key={msg.id} className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
              <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                {msg.sender_role === "pdr"
                  ? "PDR Uzmanı"
                  : isStudent ? "Sen" : "Öğrenci (Anonim)"}
              </span>
              <div className={`px-3 py-2 rounded-2xl max-w-[82%] text-xs leading-relaxed ${
                isSelf
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
              <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                {new Date(msg.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                {msg.sender_role === "pdr" && !msg.is_read && isStudent && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                )}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Mesaj Gönderme */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <Textarea
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
          placeholder={isStudent ? "PDR uzmanına anonim mesaj yaz..." : "Öğrenciye mesaj gönder (anonim kalacak)..."}
          className="resize-none h-[52px] text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
        />
        <Button type="submit" disabled={isSending || !newMessage.trim()}
          className="h-[52px] px-4 bg-blue-600 hover:bg-blue-700 text-white shrink-0">
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
