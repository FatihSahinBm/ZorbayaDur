"use client";

import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Shield, AlertTriangle, Activity, LogOut, Loader2, MessageSquare,
  Paperclip, Download, Brain, TrendingUp, Zap, MapPin, RefreshCw,
  Search, Filter, Clock, CheckCircle2, XCircle, ChevronDown, Send, FileText
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
import { MessageThread } from "@/components/MessageThread";
import { PasswordPolicyGuard } from "@/components/PasswordPolicyGuard";
import { restorePII } from "@/lib/ai/sanitizer";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Report {
  id: string;
  tracking_code: string;
  content: string;
  category: string;
  risk_level: string;
  status: string;
  assigned_role: string;
  location?: string | null;
  created_at: string;
  deadline_at?: string | null;
  evidence_url?: string | null;
  identity_level?: number | null;
  encrypted_identity?: string | null;
  identity_sharing_approved?: boolean | null;
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
  Bordo: "#991b1b",
  Kırmızı: "#f43f5e",
  Turuncu: "#f59e0b",
  Sarı: "#eab308",
};

const PIE_PALETTE = ["#f43f5e", "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899"];

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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PDRDashboard() {
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

  // Pattern analysis
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [patternResult, setPatternResult] = useState<any>(null);
  const [isPatternLoading, setIsPatternLoading] = useState(false);

  // Template CRUD states
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [formBullyingType, setFormBullyingType] = useState("Fiziksel Zorbalık");
  const [formSeverity, setFormSeverity] = useState("Hafif");
  const [formText, setFormText] = useState("");
  const [formStatus, setFormStatus] = useState<"taslak" | "onaylı">("taslak");
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const fetchTemplates = async () => {
    if (!supabase) return;
    setIsTemplatesLoading(true);
    try {
      const { data, error } = await supabase
        .from("support_message_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTemplates(data || []);
    } catch (e: any) {
      toast.error("Şablonlar yüklenemedi: " + e.message);
    } finally {
      setIsTemplatesLoading(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!formText.trim()) {
      toast.error("Şablon metni boş olamaz!");
      return;
    }

    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id || null;

      const payload: any = {
        bullying_type: formBullyingType,
        severity: formSeverity,
        template_text: formText.trim(),
        status: formStatus,
        version: selectedTemplate ? (selectedTemplate.version || 1) + 1 : 1,
        updated_at: new Date().toISOString()
      };

      if (formStatus === "onaylı") {
        payload.approved_by = userId;
        payload.approved_at = new Date().toISOString();
      } else {
        payload.approved_by = null;
        payload.approved_at = null;
      }

      if (selectedTemplate) {
        const { error } = await supabase
          .from("support_message_templates")
          .update(payload)
          .eq("id", selectedTemplate.id);
        if (error) throw error;
        toast.success("Şablon başarıyla güncellendi.");
      } else {
        const { error } = await supabase
          .from("support_message_templates")
          .insert([payload]);
        if (error) throw error;
        toast.success("Yeni şablon başarıyla oluşturuldu.");
      }

      setIsEditingTemplate(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (e: any) {
      toast.error("İşlem başarısız: " + e.message);
    }
  };

  const handleApproveTemplate = async (template: any) => {
    if (!supabase) return;
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id || null;

      const { error } = await supabase
        .from("support_message_templates")
        .update({
          status: "onaylı",
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", template.id);

      if (error) throw error;
      toast.success("Şablon başarıyla onaylandı ve canlı sisteme alındı.");
      fetchTemplates();
    } catch (e: any) {
      toast.error("Onaylama başarısız: " + e.message);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!supabase) return;
    if (!confirm("Bu şablonu silmek istediğinize emin misiniz?")) return;
    try {
      const { error } = await supabase
        .from("support_message_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Şablon silindi.");
      fetchTemplates();
    } catch (e: any) {
      toast.error("Silme işlemi başarısız: " + e.message);
    }
  };

  const fetchReports = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("assigned_role", "pdr")
      .order("created_at", { ascending: false });
    if (error) toast.error("Veriler çekilemedi: " + error.message);
    else setReports((data as any) || []);
    setIsLoading(false);
  };

  const handleReanalyze = async (report: Report) => {
    if (!supabase) return;
    setIsReanalyzing(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: report.content,
          category: report.category,
          reportId: report.id,
          location: "Okul",
          frequency: "Belirtilmemiş"
        })
      });

      if (!response.ok) {
        throw new Error("Yeniden analiz API çağrısı başarısız oldu.");
      }

      const result = await response.json();
      toast.success("Yeniden analiz başarıyla tamamlandı!");
      
      // Update selectedReport state
      const { data: updatedReport } = await supabase
        .from("reports")
        .select("*")
        .eq("id", report.id)
        .single();
      
      if (updatedReport) {
        setSelectedReport(updatedReport as any);
      }
      fetchReports();
    } catch (e: any) {
      toast.error("Yeniden analiz hatası: " + e.message);
    } finally {
      setIsReanalyzing(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 8000);
    return () => clearInterval(interval);
  }, []);



  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("reports").update({ status: newStatus }).eq("id", id);
    if (error) toast.error("Durum güncellenemedi.");
    else { toast.success("Durum güncellendi."); fetchReports(); }
  };

  const handlePatternAnalysis = async () => {
    setShowPatternModal(true);
    setIsPatternLoading(true);
    try {
      const res = await fetch("/api/analyze/patterns");
      const data = await res.json();
      setPatternResult(data);
    } catch { toast.error("Örüntü analizi başarısız."); }
    finally { setIsPatternLoading(false); }
  };

  // ─── KPI Calculations ─────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const kpi = useMemo(() => {
    const todayReports = reports.filter(r => new Date(r.created_at) >= today);
    const urgentReports = reports.filter(r => (r.ai_analysis?.urgency?.urgency_score ?? 0) >= 80);
    const weekReports = reports.filter(r => new Date(r.created_at) >= weekAgo);
    const scores = reports.filter(r => r.ai_analysis?.urgency?.urgency_score != null)
      .map(r => r.ai_analysis!.urgency!.urgency_score);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { todayCount: todayReports.length, urgentCount: urgentReports.length, weekCount: weekReports.length, avgScore };
  }, [reports]);

  // ─── Filtering ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return reports.filter(r => {
      if (searchQuery && !r.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !r.tracking_code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterUrgency !== "Tümü" && r.ai_analysis?.urgency?.urgency_label !== filterUrgency) return false;
      if (filterType !== "Tümü" && r.ai_analysis?.classification?.primary_type !== filterType) return false;
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

  // ─── Chart Data ───────────────────────────────────────────────────────────
  const weeklyChartData = useMemo(() => {
    const weeks: Record<string, { week: string; toplam: number; müdahale: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.now() - i * 7 * 86400000);
      const key = `H${Math.ceil((d.getDate()) / 7)} ${d.toLocaleDateString("tr-TR", { month: "short" })}`;
      weeks[key] = { week: key, toplam: 0, müdahale: 0 };
    }
    reports.forEach(r => {
      const d = new Date(r.created_at);
      const key = `H${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString("tr-TR", { month: "short" })}`;
      if (weeks[key]) {
        weeks[key].toplam++;
        if (r.status === "Çözüldü" || r.status === "İnceleniyor") weeks[key].müdahale++;
      }
    });
    return Object.values(weeks);
  }, [reports]);

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      const type = r.ai_analysis?.classification?.primary_type ?? r.category ?? "Diğer";
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reports]);

  const locationData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      const loc = r.location ?? "Bilinmiyor";
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [reports]);

  const LOCATION_EMOJIS: Record<string, string> = {
    Sınıf: "📚", Koridor: "🚪", Teneffüs: "⛹️", "Okul Dışı": "🏙️",
    "Okul Bahçesi": "🌳", Kantin: "🍔", Tuvalet: "🚽",
    Online: "💻", Karma: "🔀", Bilinmiyor: "❓"
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <PasswordPolicyGuard role="pdr">
      <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* HEADER */}
      <header className="px-6 h-16 flex items-center border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-500" />
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">PDR Paneli</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
            <Activity className="h-3 w-3" /> YZ Aktif
          </div>
          <Button size="sm" variant="outline"
            className="border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hidden sm:flex items-center gap-1.5"
            onClick={handlePatternAnalysis}>
            <Brain className="h-3.5 w-3.5" /> Örüntü Analizi
          </Button>
          <Button size="sm" variant="outline"
            className="border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-450 hover:bg-amber-500/10 hidden sm:flex items-center gap-1.5"
            onClick={() => {
              setShowTemplatesModal(true);
              fetchTemplates();
            }}>
            <FileText className="h-3.5 w-3.5" /> Şablon Yönetimi
          </Button>
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <LogOut className="h-4 w-4 mr-1" /> Çıkış
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Bugün", value: kpi.todayCount, sub: "yeni bildirim", icon: <Clock className="h-5 w-5 text-blue-500" />, color: "blue" },
            { label: "Acil (>80)", value: kpi.urgentCount, sub: "yüksek öncelikli", icon: <AlertTriangle className="h-5 w-5 text-red-500" />, color: "red" },
            { label: "Bu Hafta", value: kpi.weekCount, sub: "toplam bildirim", icon: <TrendingUp className="h-5 w-5 text-purple-500" />, color: "purple" },
            { label: "Ort. Aciliyet", value: `${kpi.avgScore}/100`, sub: "YZ skoru", icon: <Zap className="h-5 w-5 text-amber-500" />, color: "amber" },
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

        {/* ── MIDDLE: LIST + PATTERN PANEL ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* LEFT: Filters + Report List */}
          <div className="xl:col-span-2 space-y-3">
            {/* Filters */}
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
                        <SelectContent>
                          {f.opts.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report List */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <Filter className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>Filtrelerle eşleşen kayıt bulunamadı.</p>
                </div>
              ) : filtered.map(report => {
                const score = report.ai_analysis?.urgency?.urgency_score;
                const label = report.ai_analysis?.urgency?.urgency_label;
                const type = report.ai_analysis?.classification?.primary_type ?? report.category;
                const hasAI = !!report.ai_analysis;
                return (
                  <Card key={report.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Score Circle */}
                        <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-sm border-2 ${
                          !score ? "border-slate-200 dark:border-slate-700 text-slate-400" :
                          score >= 80 ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400" :
                          score >= 60 ? "border-rose-400 bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                          score >= 40 ? "border-amber-400 bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                          "border-green-400 bg-green-500/10 text-green-600 dark:text-green-400"
                        }`}>
                          <span className="text-base leading-none">{score ?? "?"}</span>
                          <span className="text-[9px] opacity-70">puan</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{report.tracking_code}</span>
                            {label && <Badge className={`text-[10px] px-1.5 py-0 ${URGENCY_COLORS[label] ?? "bg-slate-500 text-white"}`}>{label}</Badge>}
                            {type && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">{type}</Badge>}
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
                            {report.ai_analysis?.urgency?.intervention_timeline && (
                              <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{report.ai_analysis.urgency.intervention_timeline}</span>
                            )}
                            {report.ai_analysis?.urgency?.escalation_needed && (
                              <span className="text-rose-500 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Eskalasyon</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
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
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Pattern & Charts */}
          <div className="space-y-4">
            {/* Pie: Bullying Types */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-slate-700 dark:text-slate-300">Zorbalık Tipi Dağılımı</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} rapor`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
                    YZ analizi olan rapor yok
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Heatmap */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-rose-500" /> Risk Lokasyonları
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {locationData.length > 0 ? locationData.map(([loc, count]) => (
                  <div key={loc} className="flex items-center gap-2">
                    <span className="text-base w-6 text-center">{LOCATION_EMOJIS[loc] ?? "📍"}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-0.5">
                        <span>{loc}</span><span className="font-medium">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-rose-400"
                          style={{ width: `${(count / (locationData[0]?.[1] || 1)) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-slate-500 text-center py-4">YZ analizi bekleniyor</p>
                )}
              </CardContent>
            </Card>

            {/* Pattern Analysis Button */}
            <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-11 shadow-lg shadow-blue-500/20"
              onClick={handlePatternAnalysis}>
              <Brain className="h-4 w-4 mr-2" /> YZ Desen Raporu Oluştur
            </Button>
          </div>
        </div>

        {/* ── BOTTOM: TIMELINE ── */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-700 dark:text-slate-300">Son 12 Hafta — Bildirim Trendi</CardTitle>
            <CardDescription className="text-xs text-slate-500">Toplam bildirim vs müdahale edilen vaka karşılaştırması</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Line type="monotone" dataKey="toplam" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Toplam" />
                <Line type="monotone" dataKey="müdahale" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Müdahale" />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>

      {/* ── REPORT DETAIL DIALOG ── */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={open => { if (!open) setSelectedReport(null); }}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <span className="font-mono text-blue-500">{selectedReport.tracking_code}</span>
                {selectedReport.ai_analysis?.urgency?.urgency_label && (
                  <Badge className={`text-xs ${URGENCY_COLORS[selectedReport.ai_analysis.urgency.urgency_label] ?? ""}`}>
                    {selectedReport.ai_analysis.urgency.urgency_label}
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
                className={`flex-1 text-xs py-1.5 rounded-md transition-all ${activeTab === "ai" ? "bg-white dark:bg-slate-800 shadow font-semibold text-blue-600 dark:text-blue-400" : "text-slate-500"}`}>
                🤖 YZ Analizi
              </button>
              <button onClick={() => setActiveTab("message")}
                className={`flex-1 text-xs py-1.5 rounded-md transition-all ${activeTab === "message" ? "bg-white dark:bg-slate-800 shadow font-semibold text-blue-600 dark:text-blue-400" : "text-slate-500"}`}>
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
                reportId={selectedReport.id}
                encryptedIdentity={selectedReport.encrypted_identity ?? null}
                identityLevel={selectedReport.identity_level ?? 1}
                role="pdr"
              />



              {/* AI Tab */}
              {activeTab === "ai" && (
                selectedReport.ai_analysis ? (
                  <div className="space-y-3">
                    {/* Urgency Score */}
                    <div className="rounded-xl border border-blue-500/20 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
                      <div className="flex items-center gap-2 font-semibold text-sm text-blue-700 dark:text-blue-300 w-full">
                        <Brain className="h-4 w-4" /> YZ Analizi
                        <Button 
                          size="xs" 
                          variant="outline" 
                          className="ml-auto text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-[10px] h-6 flex items-center gap-1"
                          disabled={isReanalyzing}
                          onClick={() => handleReanalyze(selectedReport)}
                        >
                          {isReanalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          Yeniden Analiz Et
                        </Button>
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
                          <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">🎯 Önerilen Aksiyon</p>
                          <p>{restorePII(selectedReport.ai_analysis.urgency.recommended_action, selectedReport.content)}</p>
                        </div>
                      )}

                      {selectedReport.ai_analysis.urgency?.emotional_state && (
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Duygusal Durum: </span>
                          {restorePII(selectedReport.ai_analysis.urgency.emotional_state, selectedReport.content)}
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
                          {selectedReport.ai_analysis.urgency?.risk_factors?.map((f: string) => restorePII(f, selectedReport.content)).join(" · ")}
                        </div>
                      )}

                      {(selectedReport.ai_analysis?.urgency?.keywords_detected?.length ?? 0) > 0 && (
                        <div className="text-xs text-slate-500">
                          <span className="font-medium">Tespit Edilen: </span>
                          {selectedReport.ai_analysis.urgency?.keywords_detected?.map((k: string) => restorePII(k, selectedReport.content)).join(", ")}
                        </div>
                      )}
                    </div>

                    {/* Status change */}
                    <div className="flex gap-2">
                      {["Yeni", "İnceleniyor", "Çözüldü"].map(s => (
                        <Button key={s} size="sm" variant={selectedReport.status === s ? "default" : "outline"}
                          className={`flex-1 h-8 text-xs ${selectedReport.status === s ? "bg-blue-600 text-white" : ""}`}
                          onClick={() => handleStatusChange(selectedReport.id, s)}>
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6 flex flex-col items-center gap-3 text-sm text-slate-500 text-center">
                    <Brain className="h-8 w-8 animate-pulse text-blue-400" />
                    <p>YZ analizi henüz tamamlanmadı.</p>
                    <p className="text-xs text-slate-400">Yeni raporlar otomatik analiz edilir. Eski veya yarıda kalmış raporlar için analizi başlatabilirsiniz.</p>
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-white mt-2 flex items-center gap-1.5"
                      disabled={isReanalyzing}
                      onClick={() => handleReanalyze(selectedReport)}
                    >
                      {isReanalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                      YZ Analizi Başlat
                    </Button>
                  </div>
                )
              )}

              {/* Message Tab */}
              {activeTab === "message" && (
                <div className="pt-2">
                  <MessageThread reportId={selectedReport.id} viewerRole="pdr" compact={true} />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── PATTERN MODAL ── */}
      <Dialog open={showPatternModal} onOpenChange={setShowPatternModal}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" /> Son 30 Gün — Örüntü Analizi
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              YZ tüm raporları tarayarak tekrar eden davranış kalıplarını tespit etti.
            </DialogDescription>
          </DialogHeader>
          {isPatternLoading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Brain className="h-10 w-10 text-blue-500 animate-pulse" />
              <p className="text-sm text-slate-500">Raporlar analiz ediliyor...</p>
            </div>
          ) : patternResult?.error ? (
            <div className="space-y-4 my-2">
              <div className="bg-rose-500/[0.03] dark:bg-rose-500/[0.05] p-4 rounded-xl border border-rose-500/20 text-sm text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                <div>
                  <p className="font-semibold">Örüntü Analizi Tamamlanamadı</p>
                  <p className="text-xs text-rose-500/80 mt-1">{patternResult.error}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button size="sm" variant="outline" className="h-8 text-xs flex items-center gap-1.5" onClick={handlePatternAnalysis}>
                  <RefreshCw className="h-3.5 h-3.5" /> Yeniden Dene
                </Button>
              </div>
            </div>
          ) : patternResult?.result ? (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-2">
                <Badge className={patternResult.result.patterns_found ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"}>
                  {patternResult.result.patterns_found ? "Örüntü Tespit Edildi" : "Belirgin Örüntü Yok"}
                </Badge>
                <span className="text-xs text-slate-500">{patternResult.report_count} rapor analiz edildi</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                <p className="font-semibold text-blue-600 dark:text-blue-400 mb-2">📊 Genel Değerlendirme</p>
                <p>{patternResult.result.pattern_description}</p>
              </div>
              {patternResult.result.hotspot_locations?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1"><MapPin className="h-3 w-3" /> Risk Noktaları</p>
                  <div className="flex flex-wrap gap-2">
                    {patternResult.result.hotspot_locations.map((loc: string, i: number) => (
                      <Badge key={i} className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">{loc}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {patternResult.result.suggested_intervention && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm border border-blue-200 dark:border-blue-800/40">
                  <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">💡 Önerilen Müdahale</p>
                  <p className="text-slate-700 dark:text-slate-300">{patternResult.result.suggested_intervention}</p>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Zaman Kalıbı: {patternResult.result.time_pattern}</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handlePatternAnalysis}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Yenile
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4 text-center">Sonuç alınamadı.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* ── TEMPLATES MODAL ── */}
      <Dialog open={showTemplatesModal} onOpenChange={setShowTemplatesModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" /> Psikolojik Destek Şablon Yönetimi
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Canlı sistemde kullanılacak olan PDR-onaylı destek mesajı şablonlarını yönetin. Şablonlar onaylı duruma getirilmeden canlı sistemde kullanılmaz.
            </DialogDescription>
          </DialogHeader>

          {isEditingTemplate ? (
            <form onSubmit={handleSaveTemplate} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Zorbalık Türü</label>
                  <Select value={formBullyingType} onValueChange={(val) => val && setFormBullyingType(val)}>
                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fiziksel Zorbalık">Fiziksel Zorbalık</SelectItem>
                      <SelectItem value="Sözel Zorbalık">Sözel Zorbalık</SelectItem>
                      <SelectItem value="Siber Zorbalık">Siber Zorbalık</SelectItem>
                      <SelectItem value="Sosyal Zorbalık">Sosyal Zorbalık</SelectItem>
                      <SelectItem value="Diğer">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Şiddet Seviyesi</label>
                  <Select value={formSeverity} onValueChange={(val) => val && setFormSeverity(val)}>
                    <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hafif">Hafif</SelectItem>
                      <SelectItem value="Orta">Orta</SelectItem>
                      <SelectItem value="Ağır">Ağır</SelectItem>
                      <SelectItem value="Çok Ağır">Çok Ağır</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500">Şablon Metni</label>
                  <span className="text-[10px] text-slate-400">Şiddet ve kategoriye özel empati ve destek ifadesini yazın.</span>
                </div>
                <Textarea
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Yaşadığın bu durumu paylaştığın için teşekkürler..."
                  className="h-32 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="approve-template-chk"
                    checked={formStatus === "onaylı"}
                    onChange={(e) => setFormStatus(e.target.checked ? "onaylı" : "taslak")}
                    className="w-4 h-4 rounded border-slate-350"
                  />
                  <label htmlFor="approve-template-chk" className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                    Şablonu Canlı Sistem İçin Şimdi Onayla
                  </label>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    setIsEditingTemplate(false);
                    setSelectedTemplate(null);
                  }}>
                    İptal
                  </Button>
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                    Kaydet
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">Canlı Sistem Şablon Sayısı: {templates.length}</span>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => {
                  setSelectedTemplate(null);
                  setFormBullyingType("Fiziksel Zorbalık");
                  setFormSeverity("Hafif");
                  setFormText("");
                  setFormStatus("taslak");
                  setIsEditingTemplate(true);
                }}>
                  Yeni Şablon Ekle
                </Button>
              </div>

              {isTemplatesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">Kayıtlı şablon bulunamadı.</p>
              ) : (
                <div className="space-y-3">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex gap-2">
                          <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 text-xs">
                            {tpl.bullying_type}
                          </Badge>
                          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border text-xs">
                            Şiddet: {tpl.severity}
                          </Badge>
                          <Badge className={tpl.status === "onaylı" ? "bg-green-500/10 text-green-600 border-green-500/20 text-xs" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs"}>
                            {tpl.status === "onaylı" ? "Onaylı" : "Taslak"}
                          </Badge>
                        </div>
                        <div className="flex gap-1.5">
                          {tpl.status === "taslak" && (
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 h-7 px-2" onClick={() => handleApproveTemplate(tpl)}>
                              Onayla
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => {
                            setSelectedTemplate(tpl);
                            setFormBullyingType(tpl.bullying_type);
                            setFormSeverity(tpl.severity);
                            setFormText(tpl.template_text);
                            setFormStatus(tpl.status);
                            setIsEditingTemplate(true);
                          }}>
                            Düzenle
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 h-7 text-xs px-2" onClick={() => handleDeleteTemplate(tpl.id)}>
                            Sil
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-normal italic bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-2.5 rounded-lg">
                        &ldquo;{tpl.template_text}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </PasswordPolicyGuard>
  );
}
