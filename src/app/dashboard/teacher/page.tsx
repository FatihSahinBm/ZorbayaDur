"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Shield, AlertTriangle, Activity, LogOut, Loader2, MessageSquare,
  Paperclip, Download, Brain, TrendingUp, Zap,
  Search, Filter, Clock, CheckCircle2, ChevronDown, Send, ShieldAlert
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { DecryptedIdentityView } from "@/components/DecryptedIdentityView";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Report {
  id: string;
  tracking_code: string;
  content: string;
  category: string;
  risk_level: string;
  status: string;
  assigned_role: string;
  created_at: string;
  deadline_at?: string | null;
  evidence_url?: string | null;
  identity_level?: number | null;
  encrypted_identity?: string | null;
  ai_analysis?: {
    urgency?: {
      urgency_score: number;
      urgency_label: string;
      risk_factors: string[];
      recommended_action: string;
      emotional_state: string;
      intervention_timeline: string;
      escalation_needed: boolean;
      keywords_detected: string[];
    };
    classification?: {
      primary_type: string;
      secondary_types: string[];
      severity: string;
      is_recurring: boolean;
      involves_group: boolean;
      platform_if_cyber: string | null;
      location_type: string;
      confidence_score: number;
    };
    analyzed_at?: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const URGENCY_COLORS: Record<string, string> = {
  Acil: "bg-red-600 text-white",
  Yüksek: "bg-rose-500 text-white",
  Orta: "bg-amber-500 text-white",
  Düşük: "bg-green-500 text-white",
};

const RISK_COLORS: Record<string, string> = {
  Bordo: "bg-red-800 text-white animate-pulse",
  Kırmızı: "bg-rose-500 text-white",
  Turuncu: "bg-amber-500 text-white",
  Sarı: "bg-yellow-500 text-slate-800",
};

function urgencyBar(score: number) {
  const color =
    score >= 80 ? "bg-red-600" :
    score >= 60 ? "bg-rose-500" :
    score >= 40 ? "bg-amber-500" :
    score >= 20 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300 w-8 text-right">{score}</span>
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}d önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s önce`;
  return `${Math.floor(h / 24)}g önce`;
}

function calculateTimeLeft(deadlineAt?: string | null, createdAt?: string | null) {
  if (!createdAt) return "-";
  let deadline;
  if (deadlineAt) {
    deadline = new Date(deadlineAt);
  } else {
    const createdDate = new Date(createdAt);
    deadline = new Date(createdDate.getTime() + 48 * 60 * 60 * 1000); // 48 saat fallback
  }
  
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  
  if (diff <= 0) return "Süre Doldu";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}g ${hours}s ${minutes}d`;
  return `${hours}s ${minutes}d`;
}

const getDisplayScore = (report: Report) => {
  if (report.ai_analysis?.urgency?.urgency_score !== undefined) {
    return report.ai_analysis.urgency.urgency_score;
  }
  switch (report.risk_level) {
    case "Bordo": return 95;
    case "Kırmızı": return 75;
    case "Turuncu": return 45;
    case "Sarı": return 20;
    default: return 0;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterUrgency, setFilterUrgency] = useState("Tümü");
  const [filterType, setFilterType] = useState("Tümü");
  const [filterLevel, setFilterLevel] = useState("Tümü");
  const [filterDate, setFilterDate] = useState("Tümü");
  const [filterStatus, setFilterStatus] = useState("Tümü");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState<"ai" | "message">("ai");

  // Messages state
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchReports = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("assigned_role", "teacher")
      .order("created_at", { ascending: false });
    if (error) toast.error("Veriler çekilemedi: " + error.message);
    else setReports((data as any) || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async (reportId: string, showLoading = true) => {
    if (!supabase) return;
    if (showLoading) setIsMessagesLoading(true);
    const { data, error } = await supabase
      .from("anonymous_messages")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });
      
    if (!error) {
      setMessages(data || []);
    }
    if (showLoading) setIsMessagesLoading(false);
  };

  // Poll messages when a report is selected and active tab is message
  useEffect(() => {
    if (!selectedReport || activeTab !== "message") return;
    fetchMessages(selectedReport.id, true);
    const interval = setInterval(() => {
      fetchMessages(selectedReport.id, false);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedReport, activeTab]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedReport || !supabase) return;
    
    const msgContent = newMessage.trim();
    setNewMessage(""); 
    
    const { error } = await supabase.from('anonymous_messages').insert([
      {
        report_id: selectedReport.id,
        session_token: 'teacher-system',
        sender_role: 'teacher',
        content: msgContent
      }
    ]);
    
    if (error) {
      toast.error("Mesaj gönderilemedi");
    } else {
      fetchMessages(selectedReport.id, false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("reports").update({ status: newStatus }).eq("id", id);
    if (error) toast.error("Durum güncellenemedi.");
    else {
      toast.success("Durum güncellendi.");
      fetchReports();
      if (selectedReport?.id === id) {
        setSelectedReport(prev => prev ? { ...prev, status: newStatus } : null);
      }
    }
  };

  const handleEscalateToPDR = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("reports")
      .update({ assigned_role: "pdr" })
      .eq("id", id);
      
    if (error) {
      toast.error("Vaka PDR'ye sevk edilemedi.");
    } else {
      toast.success("Vaka başarıyla PDR uzmanına sevk edildi.");
      fetchReports();
      setSelectedReport(null);
    }
  };

  // ─── KPI Calculations ─────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const kpi = useMemo(() => {
    const todayReports = reports.filter(r => new Date(r.created_at) >= today);
    const orangeReports = reports.filter(r => r.risk_level === "Turuncu");
    const weekReports = reports.filter(r => new Date(r.created_at) >= weekAgo);
    const scores = reports.map(r => getDisplayScore(r));
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { todayCount: todayReports.length, orangeCount: orangeReports.length, weekCount: weekReports.length, avgScore };
  }, [reports]);

  // ─── Filtering ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return reports.filter(r => {
      if (searchQuery && !r.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !r.tracking_code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      const urgencyLabel = r.ai_analysis?.urgency?.urgency_label;
      if (filterUrgency !== "Tümü" && urgencyLabel !== filterUrgency) return false;
      
      const type = r.ai_analysis?.classification?.primary_type ?? r.category;
      if (filterType !== "Tümü" && type !== filterType) return false;
      
      if (filterLevel !== "Tümü") {
        if (filterLevel === "Seviye 1" && r.identity_level !== 1) return false;
        if (filterLevel === "Seviye 2" && r.identity_level !== 2) return false;
      }
      if (filterStatus !== "Tümü") {
        if (filterStatus === "Beklemede" && r.status !== "Yeni") return false;
        if (filterStatus === "İşlemde" && r.status !== "İnceleniyor") return false;
        if (filterStatus === "Kapatıldı" && r.status !== "Çözüldü") return false;
      }
      if (filterDate !== "Tümü") {
        const t = new Date(r.created_at).getTime();
        if (filterDate === "Bugün" && t < today.getTime()) return false;
        if (filterDate === "Bu Hafta" && t < weekAgo.getTime()) return false;
        if (filterDate === "Bu Ay" && t < Date.now() - 30 * 86400000) return false;
      }
      return true;
    });
  }, [reports, searchQuery, filterUrgency, filterType, filterLevel, filterDate, filterStatus]);

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* HEADER */}
      <header className="px-6 h-16 flex items-center border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Sınıf Öğretmeni Paneli</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
            <Activity className="h-3 w-3 animate-pulse" /> Yapay Zeka Aktif
          </div>
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <LogOut className="h-4 w-4 mr-1" /> Çıkış
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 space-y-6 max-w-[1100px] mx-auto w-full">
        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Bugün", value: kpi.todayCount, sub: "yeni bildirim", icon: <Clock className="h-5 w-5 text-purple-500" />, color: "purple" },
            { label: "Orta Risk", value: kpi.orangeCount, sub: "yönlendirilen vaka", icon: <AlertTriangle className="h-5 w-5 text-amber-500" />, color: "amber" },
            { label: "Bu Hafta", value: kpi.weekCount, sub: "toplam bildirim", icon: <TrendingUp className="h-5 w-5 text-blue-500" />, color: "blue" },
            { label: "Ort. Aciliyet", value: `${kpi.avgScore}/100`, sub: "ciddiyet skoru", icon: <Zap className="h-5 w-5 text-rose-500" />, color: "rose" },
          ].map((k) => (
            <Card key={k.label} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`mt-0.5 p-2 rounded-lg bg-${k.color}-500/10 border border-${k.color}-500/20 shrink-0`}>
                  {k.icon}
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{k.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{k.value}</p>
                  <p className="text-xs text-slate-500">{k.sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── FILTERS AND SEARCH ── */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="İhbar ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-9 text-sm" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { val: filterUrgency, set: setFilterUrgency, opts: ["Tümü","Acil","Yüksek","Orta","Düşük"], ph: "Aciliyet" },
                  { val: filterType, set: setFilterType, opts: ["Tümü","Fiziksel","Sözlü","Siber","Sosyal/İlişkisel"], ph: "Tip" },
                  { val: filterLevel, set: setFilterLevel, opts: ["Tümü","Seviye 1","Seviye 2"], ph: "Gizlilik" },
                  { val: filterDate, set: setFilterDate, opts: ["Tümü","Bugün","Bu Hafta","Bu Ay"], ph: "Tarih" },
                  { val: filterStatus, set: setFilterStatus, opts: ["Tümü","Beklemede","İşlemde","Kapatıldı"], ph: "Durum" },
                ].map(f => (
                  <Select key={f.ph} value={f.val} onValueChange={(v) => v && f.set(v)}>
                    <SelectTrigger className="h-9 w-[100px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
                      <SelectValue placeholder={f.ph} />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                      {f.opts.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── REPORT LIST ── */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <Filter className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Filtrelerle eşleşen kayıt bulunamadı.</p>
            </div>
          ) : filtered.map(report => {
            const score = getDisplayScore(report);
            const urgencyLabel = report.ai_analysis?.urgency?.urgency_label ?? report.risk_level;
            const primaryType = report.ai_analysis?.classification?.primary_type ?? report.category;
            return (
              <Card key={report.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Score Circle */}
                    <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-sm border-2 ${
                      score >= 80 ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400" :
                      score >= 60 ? "border-rose-400 bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                      score >= 40 ? "border-amber-400 bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                      "border-green-400 bg-green-500/10 text-green-600 dark:text-green-400"
                    }`}>
                      <span className="text-base leading-none">{score}</span>
                      <span className="text-[9px] opacity-70">skor</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{report.tracking_code}</span>
                        {urgencyLabel && (
                          <Badge className={`text-[10px] px-1.5 py-0 ${URGENCY_COLORS[urgencyLabel] ?? RISK_COLORS[urgencyLabel] ?? "bg-slate-500 text-white"}`}>
                            {urgencyLabel}
                          </Badge>
                        )}
                        {primaryType && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">{primaryType}</Badge>}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                          report.status === "Çözüldü" ? "border-green-500/30 text-green-600 dark:text-green-400" :
                          report.status === "İnceleniyor" ? "border-amber-500/30 text-amber-600 dark:text-amber-400" :
                          "border-slate-300 dark:border-slate-600 text-slate-500"
                        }`}>{report.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">{report.content}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span>{timeAgo(report.created_at)}</span>
                        {report.status !== "Çözüldü" && (
                          <span className={`flex items-center gap-1 font-medium ${
                            calculateTimeLeft(report.deadline_at, report.created_at) === "Süre Doldu" 
                              ? "text-rose-500 animate-pulse" 
                              : "text-amber-500"
                          }`}>
                            <Clock className="h-3 w-3" />
                            Kalan Süre: {calculateTimeLeft(report.deadline_at, report.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button size="sm" variant="outline"
                      className="h-8 text-xs border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex-1"
                      onClick={() => { setSelectedReport(report); setActiveTab("ai"); }}>
                      <Brain className="h-3.5 w-3.5 mr-1" /> YZ Analizi
                    </Button>
                    <Button size="sm" variant="outline"
                      className="h-8 text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex-1"
                      onClick={() => { setSelectedReport(report); setActiveTab("message"); }}>
                      <MessageSquare className="h-3.5 w-3.5 mr-1" /> Yanıtla
                    </Button>
                    
                    {report.status === "Yeni" && (
                      <Button size="sm" variant="outline"
                        className="h-8 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                        onClick={() => handleStatusChange(report.id, "İnceleniyor")}>
                        <Activity className="h-3.5 w-3.5 mr-1" /> İncele
                      </Button>
                    )}
                    {report.status === "İnceleniyor" && (
                      <Button size="sm" variant="outline"
                        className="h-8 text-xs border-green-500/30 text-green-600 hover:bg-green-500/10"
                        onClick={() => handleStatusChange(report.id, "Çözüldü")}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Çözüldü
                      </Button>
                    )}

                    <Button size="sm" variant="outline"
                      className="h-8 text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                      onClick={() => handleEscalateToPDR(report.id)}>
                      <ShieldAlert className="h-3.5 w-3.5 mr-1" /> PDR'ye Sevk Et
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* ── REPORT DETAIL DIALOG ── */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={open => { if (!open) setSelectedReport(null); }}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sm:max-w-xl max-h-[90vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <span className="font-mono text-purple-600 dark:text-purple-400">{selectedReport.tracking_code}</span>
                {selectedReport.risk_level && (
                  <Badge className={`text-xs ${URGENCY_COLORS[selectedReport.risk_level] ?? RISK_COLORS[selectedReport.risk_level] ?? ""}`}>
                    {selectedReport.risk_level}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                <span>{new Date(selectedReport.created_at).toLocaleString("tr-TR")}</span>
                <span>•</span>
                <span>{selectedReport.category}</span>
                {selectedReport.status !== "Çözüldü" && (
                  <>
                    <span>•</span>
                    <span className={`font-semibold ${calculateTimeLeft(selectedReport.deadline_at, selectedReport.created_at) === "Süre Doldu" ? "text-rose-500" : "text-amber-500"}`}>
                      Kalan Süre: {calculateTimeLeft(selectedReport.deadline_at, selectedReport.created_at)}
                    </span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 rounded-lg p-1 shrink-0">
              <button onClick={() => setActiveTab("ai")}
                className={`flex-1 text-xs py-1.5 rounded-md transition-all ${activeTab === "ai" ? "bg-white dark:bg-slate-800 shadow font-semibold text-purple-600 dark:text-purple-400" : "text-slate-500"}`}>
                🤖 YZ Analizi
              </button>
              <button onClick={() => setActiveTab("message")}
                className={`flex-1 text-xs py-1.5 rounded-md transition-all ${activeTab === "message" ? "bg-white dark:bg-slate-800 shadow font-semibold text-purple-600 dark:text-purple-400" : "text-slate-500"}`}>
                💬 Mesajlar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {/* İhbar içeriği */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300">
                {selectedReport.content}
                {selectedReport.evidence_url && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    {selectedReport.evidence_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                      <div className="relative group inline-block">
                        <img src={selectedReport.evidence_url} alt="Kanıt" className="max-h-48 rounded-md border border-slate-200 dark:border-slate-700 object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-md">
                          <a href={selectedReport.evidence_url} target="_blank" rel="noopener noreferrer" className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white backdrop-blur-sm"><Search className="h-4 w-4" /></a>
                          <a href={selectedReport.evidence_url} download className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white backdrop-blur-sm"><Download className="h-4 w-4" /></a>
                        </div>
                      </div>
                    ) : (
                      <a href={selectedReport.evidence_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1.5 text-xs">
                        <Paperclip className="h-3.5 w-3.5" /> Kanıt Dosyasını Görüntüle
                      </a>
                    )}
                  </div>
                )}
              </div>

              <DecryptedIdentityView
                encryptedIdentity={selectedReport.encrypted_identity ?? null}
                identityLevel={selectedReport.identity_level ?? 1}
                role="teacher"
              />

              {/* AI Tab */}
              {activeTab === "ai" && (
                selectedReport.ai_analysis ? (
                  <div className="space-y-3">
                    {/* Urgency Score */}
                    <div className="rounded-xl border border-purple-500/20 bg-purple-50 dark:bg-purple-950/30 p-4 space-y-3">
                      <div className="flex items-center gap-2 font-semibold text-sm text-purple-700 dark:text-purple-300">
                        <Brain className="h-4 w-4" /> YZ Analizi
                        <span className="ml-auto text-xs text-slate-500 font-normal">
                          {selectedReport.ai_analysis.analyzed_at ? new Date(selectedReport.ai_analysis.analyzed_at).toLocaleString("tr-TR") : ""}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Aciliyet Skoru</span>
                          <span className="font-bold text-slate-800 dark:text-white">
                            {selectedReport.ai_analysis.urgency?.urgency_score}/100 — {selectedReport.ai_analysis.urgency?.urgency_label}
                          </span>
                        </div>
                        {urgencyBar(selectedReport.ai_analysis.urgency?.urgency_score ?? 0)}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {selectedReport.ai_analysis.classification?.primary_type && (
                          <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-xs">
                            {selectedReport.ai_analysis.classification.primary_type}
                          </Badge>
                        )}
                        {selectedReport.ai_analysis.classification?.severity && (
                          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border text-xs">
                            Şiddet: {selectedReport.ai_analysis.classification.severity}
                          </Badge>
                        )}
                        {selectedReport.ai_analysis.classification?.is_recurring && (
                          <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-xs">Tekrarlayan</Badge>
                        )}
                        {selectedReport.ai_analysis.classification?.involves_group && (
                          <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-xs">Grup</Badge>
                        )}
                      </div>

                      {selectedReport.ai_analysis.urgency?.recommended_action && (
                        <div className="bg-white/60 dark:bg-slate-900/60 rounded-lg p-3 text-xs text-slate-700 dark:text-slate-300">
                          <p className="font-semibold text-purple-700 dark:text-purple-300 mb-1">🎯 Önerilen Aksiyon</p>
                          <p>{selectedReport.ai_analysis.urgency.recommended_action}</p>
                        </div>
                      )}

                      {selectedReport.ai_analysis.urgency?.emotional_state && (
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Duygusal Durum: </span>
                          {selectedReport.ai_analysis.urgency.emotional_state}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span>⏰ {selectedReport.ai_analysis.urgency?.intervention_timeline}</span>
                        {selectedReport.ai_analysis.urgency?.escalation_needed && (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">🚨 Eskalasyon Gerekli</span>
                        )}
                      </div>

                      {(selectedReport.ai_analysis?.urgency?.risk_factors?.length ?? 0) > 0 && (
                        <div className="text-xs">
                          <span className="font-medium text-slate-600 dark:text-slate-400">Risk Faktörleri: </span>
                          {selectedReport.ai_analysis?.urgency?.risk_factors?.join(" · ")}
                        </div>
                      )}

                      {(selectedReport.ai_analysis?.urgency?.keywords_detected?.length ?? 0) > 0 && (
                        <div className="text-xs text-slate-500">
                          <span className="font-medium">Tespit Edilen: </span>
                          {selectedReport.ai_analysis?.urgency?.keywords_detected?.join(", ")}
                        </div>
                      )}
                    </div>

                    {/* Status change */}
                    <div className="flex gap-2">
                      {["Yeni", "İnceleniyor", "Çözüldü"].map(s => (
                        <Button key={s} size="sm" variant={selectedReport.status === s ? "default" : "outline"}
                          className={`flex-1 h-8 text-xs ${selectedReport.status === s ? "bg-purple-600 text-white hover:bg-purple-700" : ""}`}
                          onClick={() => handleStatusChange(selectedReport.id, s)}>
                          {s}
                        </Button>
                      ))}
                    </div>

                    {/* Transfer to PDR Button */}
                    <Button size="sm" variant="outline"
                      className="w-full h-9 text-xs border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 mt-2"
                      onClick={() => handleEscalateToPDR(selectedReport.id)}>
                      <ShieldAlert className="h-4 w-4 mr-2" /> PDR Uzmanına Sevk Et
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6 flex flex-col items-center gap-3 text-sm text-slate-500">
                      <Brain className="h-8 w-8 animate-pulse text-purple-400" />
                      <p>YZ analizi henüz tamamlanmadı.</p>
                    </div>
                    {/* Transfer to PDR Button even without AI */}
                    <Button size="sm" variant="outline"
                      className="w-full h-9 text-xs border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                      onClick={() => handleEscalateToPDR(selectedReport.id)}>
                      <ShieldAlert className="h-4 w-4 mr-2" /> PDR Uzmanına Sevk Et
                    </Button>
                  </div>
                )
              )}

              {/* Message Tab */}
              {activeTab === "message" && (
                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/[0.06] border border-green-500/20 text-xs text-green-700 dark:text-green-400">
                    <Shield className="h-3.5 w-3.5 shrink-0" />
                    Bu kanal uçtan uca anonimdir. Öğrencinin kimliği korunuyor.
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                    {isMessagesLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                        <MessageSquare className="w-7 h-7 opacity-30" />
                        <p className="text-xs">Henüz mesaj yok.</p>
                      </div>
                    ) : messages.map(msg => {
                      const isSelf = msg.sender_role === "teacher";
                      return (
                        <div key={msg.id} className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
                          <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                            {msg.sender_role === "teacher"
                              ? "Siz (Öğretmen)"
                              : msg.sender_role === "pdr"
                                ? "PDR Uzmanı"
                                : "Öğrenci (Anonim)"}
                          </span>
                          <div className={`px-3 py-2 rounded-2xl max-w-[82%] text-xs leading-relaxed ${
                            isSelf
                              ? "bg-purple-600 text-white rounded-tr-sm"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-tl-sm"
                          }`}>
                            {msg.content}
                          </div>
                          <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                            {new Date(msg.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={sendMessage} className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Öğrenciye mesaj gönder (anonim kalacak)..."
                      className="resize-none h-[52px] text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-purple-500"
                    />
                    <Button type="submit" disabled={!newMessage.trim()}
                      className="h-[52px] px-4 bg-purple-600 hover:bg-purple-700 text-white shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
