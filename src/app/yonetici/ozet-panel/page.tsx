"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ShieldAlert, LogOut, Loader2, Search, AlertTriangle, FileText, CheckCircle2, TrendingUp, BarChart2, Activity, HelpCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { PasswordPolicyGuard } from "@/components/PasswordPolicyGuard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, AreaChart, Area
} from "recharts";

// Summary view row shape
interface SummaryReport {
  id: string;
  category: string;
  risk_level: string;
  status: string;
  assigned_role: string;
  created_at: string;
  deadline_at: string | null;
  resolution_time_hours: number | null;
}

export default function ManagerSummaryPanel() {
  const [reports, setReports] = useState<SummaryReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subtab State
  const [activeSubTab, setActiveSubTab] = useState<"summary" | "escalation">("summary");
  
  // Working Hours States
  const [workingHours, setWorkingHours] = useState<any[]>([]);
  const [isHoursLoading, setIsHoursLoading] = useState(false);
  
  // Roster States
  const [roster, setRoster] = useState<any[]>([]);
  const [isRosterLoading, setIsRosterLoading] = useState(false);

  // Form inputs for roster/working hours editing
  const [editingHours, setEditingHours] = useState<any | null>(null);
  const [hoursStartTime, setHoursStartTime] = useState("09:00:00");
  const [hoursEndTime, setHoursEndTime] = useState("15:00:00");

  const [editingRoster, setEditingRoster] = useState<any | null>(null);
  const [isAddingRoster, setIsAddingRoster] = useState(false);
  const [rosterDay, setRosterDay] = useState(1);
  const [rosterStart, setRosterStart] = useState("00:00:00");
  const [rosterEnd, setRosterEnd] = useState("23:59:59");
  const [rosterName, setRosterName] = useState("");
  const [rosterChannel, setRosterChannel] = useState("email");
  const [rosterAddress, setRosterAddress] = useState("");
  const [rosterBackupName, setRosterBackupName] = useState("");
  const [rosterBackupAddress, setRosterBackupAddress] = useState("");

  // Vaka sorgulama state
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const fetchWorkingHoursAndRoster = async () => {
    if (!supabase) return;
    setIsHoursLoading(true);
    setIsRosterLoading(true);
    try {
      const { data: wh, error: whErr } = await supabase.from("pdr_working_hours").select("*").order("day_of_week", { ascending: true });
      if (whErr) throw whErr;
      setWorkingHours(wh || []);

      const { data: ros, error: rosErr } = await supabase.from("on_call_roster").select("*").order("day_of_week", { ascending: true });
      if (rosErr) throw rosErr;
      setRoster(ros || []);
    } catch (e: any) {
      toast.error("Ayarlar yüklenemedi: " + e.message);
    } finally {
      setIsHoursLoading(false);
      setIsRosterLoading(false);
    }
  };

  // Calculate total weekly working hours
  const totalWeeklyHours = useMemo(() => {
    let total = 0;
    workingHours.forEach(wh => {
      const [sh, sm] = wh.start_time.split(":").map(Number);
      const [eh, em] = wh.end_time.split(":").map(Number);
      const diffHours = (eh + em/60) - (sh + sm/60);
      if (diffHours > 0) total += diffHours;
    });
    return total;
  }, [workingHours]);

  const handleSaveWorkingHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !editingHours) return;

    let total = 0;
    workingHours.forEach(wh => {
      if (wh.id === editingHours.id) {
        const [sh, sm] = hoursStartTime.split(":").map(Number);
        const [eh, em] = hoursEndTime.split(":").map(Number);
        total += (eh + em/60) - (sh + sm/60);
      } else {
        const [sh, sm] = wh.start_time.split(":").map(Number);
        const [eh, em] = wh.end_time.split(":").map(Number);
        total += (eh + em/60) - (sh + sm/60);
      }
    });

    if (total > 30) {
      toast.error(`Hatalı işlem: Haftalık toplam çalışma süresi ${total} saat oluyor ve 30 saati aşamaz! (Md.25 Sınırı)`);
      return;
    }

    try {
      const { error } = await supabase
        .from("pdr_working_hours")
        .update({
          start_time: hoursStartTime,
          end_time: hoursEndTime
        })
        .eq("id", editingHours.id);

      if (error) throw error;
      toast.success("Çalışma saatleri güncellendi.");
      setEditingHours(null);
      fetchWorkingHoursAndRoster();
    } catch (e: any) {
      toast.error("Güncelleme hatası: " + e.message);
    }
  };

  const handleSaveRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!rosterName.trim() || !rosterAddress.trim()) {
      toast.error("Nöbetçi ismi ve iletişim adresi zorunludur!");
      return;
    }

    const payload = {
      day_of_week: rosterDay,
      start_time: rosterStart,
      end_time: rosterEnd,
      assigned_name: rosterName.trim(),
      contact_channel: rosterChannel,
      contact_address: rosterAddress.trim(),
      escalation_target_name: rosterBackupName.trim() || null,
      escalation_contact_address: rosterBackupAddress.trim() || null
    };

    try {
      if (editingRoster) {
        const { error } = await supabase
          .from("on_call_roster")
          .update(payload)
          .eq("id", editingRoster.id);
        if (error) throw error;
        toast.success("Nöbet kaydı güncellendi.");
      } else {
        const { error } = await supabase
          .from("on_call_roster")
          .insert([payload]);
        if (error) throw error;
        toast.success("Yeni nöbet kaydı eklendi.");
      }
      setEditingRoster(null);
      setIsAddingRoster(false);
      setRosterName("");
      setRosterAddress("");
      setRosterBackupName("");
      setRosterBackupAddress("");
      fetchWorkingHoursAndRoster();
    } catch (e: any) {
      toast.error("Nöbet kaydetme hatası: " + e.message);
    }
  };

  const handleDeleteRoster = async (id: string) => {
    if (!supabase) return;
    if (!confirm("Nöbet kaydını silmek istediğinize emin misiniz?")) return;
    try {
      const { error } = await supabase.from("on_call_roster").delete().eq("id", id);
      if (error) throw error;
      toast.success("Nöbet kaydı silindi.");
      fetchWorkingHoursAndRoster();
    } catch (e: any) {
      toast.error("Silme hatası: " + e.message);
    }
  };

  const fetchSummaryData = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("reports_summary_view")
        .select("*");
      
      if (error) throw error;
      setReports((data as any) || []);
    } catch (e: any) {
      toast.error("Özet veriler yüklenemedi: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, []);

  // 1. Calculations & Metrics
  const metrics = useMemo(() => {
    const total = reports.length;
    
    // Risk levels
    const riskCounts = { Düşük: 0, Orta: 0, Yüksek: 0, Kritik: 0 };
    // Status counts
    const statusCounts = { Yeni: 0, İnceleniyor: 0, Tamamlandı: 0 };
    // Categories
    const categoryCounts: Record<string, number> = {};
    // Resolution times
    let totalResTime = 0;
    let resTimeCount = 0;

    reports.forEach(r => {
      // Risk
      let mappedLevel: "Düşük" | "Orta" | "Yüksek" | "Kritik" = "Orta";
      if (r.risk_level === "Sarı" || r.risk_level === "Düşük") mappedLevel = "Düşük";
      else if (r.risk_level === "Turuncu" || r.risk_level === "Orta") mappedLevel = "Orta";
      else if (r.risk_level === "Kırmızı" || r.risk_level === "Yüksek") mappedLevel = "Yüksek";
      else if (r.risk_level === "Bordo" || r.risk_level === "Kritik" || r.risk_level === "Acil") mappedLevel = "Kritik";
      riskCounts[mappedLevel]++;

      // Status
      const rStatus = r.status as keyof typeof statusCounts;
      if (statusCounts[rStatus] !== undefined) statusCounts[rStatus]++;
      
      // Category
      const rawCat = r.category || "Diğer";
      let stdCat = "Diğer";
      if (rawCat.toLowerCase().includes("fiziksel")) stdCat = "Fiziksel Zorbalık";
      else if (rawCat.toLowerCase().includes("sözel") || rawCat.toLowerCase().includes("sözlü")) stdCat = "Sözel Zorbalık";
      else if (rawCat.toLowerCase().includes("siber")) stdCat = "Siber Zorbalık";
      else if (rawCat.toLowerCase().includes("sosyal") || rawCat.toLowerCase().includes("ilişkisel")) stdCat = "Sosyal Zorbalık";
      else if (rawCat.toLowerCase().includes("cinsel")) stdCat = "Cinsel Zorbalık";
      else stdCat = rawCat;
      
      categoryCounts[stdCat] = (categoryCounts[stdCat] || 0) + 1;

      // Resolution duration
      if (r.resolution_time_hours !== null && r.resolution_time_hours !== undefined) {
        totalResTime += r.resolution_time_hours;
        resTimeCount++;
      }
    });

    const avgResolutionTime = resTimeCount > 0 
      ? (totalResTime / resTimeCount).toFixed(1) 
      : "-";

    // Format categories for chart
    const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
      name,
      value
    }));

    // Trend chart (weekly distribution of last 4 weeks)
    // For demo, we group by week number
    const weeklyDataMap: Record<string, number> = {};
    reports.forEach(r => {
      const date = new Date(r.created_at);
      const weekLabel = `Hafta ${Math.ceil(date.getDate() / 7)}`;
      weeklyDataMap[weekLabel] = (weeklyDataMap[weekLabel] || 0) + 1;
    });

    const trendData = Object.entries(weeklyDataMap).map(([name, count]) => ({
      name,
      "Rapor Sayısı": count
    })).reverse();

    return {
      total,
      riskCounts,
      statusCounts,
      categoryData,
      trendData,
      avgResolutionTime
    };
  }, [reports]);

  // 2. Case Search / RPC call
  const handleCaseSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !searchCode.trim()) return;

    setIsSearching(true);
    setSearchResult(null);

    try {
      const { data, error } = await supabase.rpc("get_case_status_by_code", {
        target_code: searchCode.trim()
      });

      if (error) throw error;
      setSearchResult(data);
    } catch (e: any) {
      toast.error("Vaka sorgulama hatası: " + e.message);
    } finally {
      setIsSearching(false);
    }
  };

  const RISK_COLORS = {
    Düşük: "#10B981", // Emerald
    Orta: "#F59E0B", // Amber
    Yüksek: "#EF4444", // Red
    Kritik: "#7F1D1D" // Dark Red
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-50 dark:bg-slate-950 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-slate-500">Panel yükleniyor...</p>
      </div>
    );
  }

  return (
    <PasswordPolicyGuard role="meb">
      <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        
        {/* Header */}
        <header className="px-6 h-16 flex items-center border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-amber-500" />
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Yönetici Özet İstatistik Paneli</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <LogOut className="h-4 w-4 mr-1" /> Çıkış Yap
              </Button>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* Subtabs sub-navigation */}
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
            <button 
              onClick={() => setActiveSubTab("summary")}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
                activeSubTab === "summary"
                  ? "border-amber-500 text-amber-500"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              İstatistikler & Durum Sorgu
            </button>
            <button 
              onClick={() => {
                setActiveSubTab("escalation");
                fetchWorkingHoursAndRoster();
              }}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
                activeSubTab === "escalation"
                  ? "border-amber-500 text-amber-500"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Nöbet Çizelgesi & PDR Mesai (Md.25)
            </button>
          </div>

          {activeSubTab === "summary" ? (
            <>
              {/* Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Hoş Geldiniz, Okul Müdürü</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                Bu panel KVKK ve BSG Yönergeleri Md.9 gereğince tamamen kişisel verilerden (PII) arındırılmıştır. İsimler, konum detayları ve ihbar içerikleri veritabanı seviyesinde filtrelenerek sadece sayısal istatistikler ve işlem geçmişleri sunulmaktadır.
              </p>
            </div>
            <div className="bg-amber-500 text-white rounded-xl px-4 py-2.5 flex flex-col items-center shrink-0 shadow-lg shadow-amber-900/10">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">Toplam Rapor</span>
              <span className="text-2xl font-black">{metrics.total}</span>
            </div>
          </div>

          {/* Cards metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="pt-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kritik & Yüksek Seviye</span>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {metrics.riskCounts.Kritik + metrics.riskCounts.Yüksek}
                  </p>
                </div>
                <div className="bg-red-500/10 p-2.5 rounded-lg">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="pt-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Aktif Çözüm Sürecinde</span>
                  <p className="text-2xl font-bold text-amber-500">
                    {metrics.statusCounts.İnceleniyor}
                  </p>
                </div>
                <div className="bg-amber-500/10 p-2.5 rounded-lg">
                  <Activity className="h-5 w-5 text-amber-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="pt-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tamamlanan Vakalar</span>
                  <p className="text-2xl font-bold text-emerald-500">
                    {metrics.statusCounts.Tamamlandı}
                  </p>
                </div>
                <div className="bg-emerald-500/10 p-2.5 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="pt-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ortalama Çözüm Süresi</span>
                  <p className="text-2xl font-bold text-blue-500">
                    {metrics.avgResolutionTime} {metrics.avgResolutionTime !== "-" ? "Saat" : ""}
                  </p>
                </div>
                <div className="bg-blue-500/10 p-2.5 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Risk Breakdown Chart */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-rose-500" /> Risk Seviyesi Dağılımı
                </CardTitle>
                <CardDescription className="text-xs">Raporların risk seviyesi ağırlığı</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={[
                    { name: "Düşük", value: metrics.riskCounts.Düşük, fill: RISK_COLORS.Düşük },
                    { name: "Orta", value: metrics.riskCounts.Orta, fill: RISK_COLORS.Orta },
                    { name: "Yüksek", value: metrics.riskCounts.Yüksek, fill: RISK_COLORS.Yüksek },
                    { name: "Kritik", value: metrics.riskCounts.Kritik, fill: RISK_COLORS.Kritik }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={25} />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {
                        [RISK_COLORS.Düşük, RISK_COLORS.Orta, RISK_COLORS.Yüksek, RISK_COLORS.Kritik].map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Breakdown Chart */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-500" /> Kategori Dağılımı
                </CardTitle>
                <CardDescription className="text-xs">Konularına göre ihbar oranları</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px]">
                {metrics.categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <BarChart layout="vertical" data={metrics.categoryData}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366F1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">Yeterli kategori verisi yok.</div>
                )}
              </CardContent>
            </Card>

            {/* Time Trend Chart */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Haftalık Trend
                </CardTitle>
                <CardDescription className="text-xs">Haftalık ihbar sıklığı gelişimi</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <AreaChart data={metrics.trendData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={20} />
                    <Tooltip />
                    <Area type="monotone" dataKey="Rapor Sayısı" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          </>
          ) : (
            <div className="space-y-6">
              
              {/* PDR Çalışma Saatleri (Md.25) */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span>PDR Haftalık Çalışma Saatleri (Md.25 Uyumlu)</span>
                    <Badge className={totalWeeklyHours > 30 ? "bg-red-500 text-white" : "bg-green-500 text-white"}>
                      Toplam: {totalWeeklyHours} Saat / 30 Saat Limit
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Rehber öğretmenlerin (PDR) haftalık çalışma süresi 30 saati aşamaz. Bu saatlerin dışındaki ihbarlar otomatik olarak eskalasyona yönlendirilir.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isHoursLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                  ) : (
                    <div className="space-y-4">
                      {/* Hours Editing Form */}
                      {editingHours && (
                        <form onSubmit={handleSaveWorkingHours} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 space-y-4 max-w-md">
                          <h4 className="text-xs font-bold uppercase text-slate-400">Çalışma Saatlerini Güncelle: Gün {editingHours.day_of_week}</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-500">Giriş Saati</label>
                              <Input type="text" placeholder="09:00:00" value={hoursStartTime} onChange={e => setHoursStartTime(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-500">Çıkış Saati</label>
                              <Input type="text" placeholder="15:00:00" value={hoursEndTime} onChange={e => setHoursEndTime(e.target.value)} />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" size="sm" onClick={() => setEditingHours(null)}>Vazgeç</Button>
                            <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">Kaydet</Button>
                          </div>
                        </form>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {[1, 2, 3, 4, 5, 6, 7].map(day => {
                          const daysName = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
                          const match = workingHours.find(w => w.day_of_week === day);
                          return (
                            <div key={day} className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/20 dark:bg-slate-950/10 flex flex-col justify-between h-28">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400">{daysName[day - 1]}</span>
                                <p className="text-sm font-semibold mt-1 text-slate-800 dark:text-slate-200">
                                  {match ? `${match.start_time.substring(0, 5)} - ${match.end_time.substring(0, 5)}` : "Mesai Dışı"}
                                </p>
                              </div>
                              {match && (
                                <Button size="xs" variant="outline" className="h-7 text-xs self-start" onClick={() => {
                                  setEditingHours(match);
                                  setHoursStartTime(match.start_time);
                                  setHoursEndTime(match.end_time);
                                }}>
                                  Düzenle
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Nöbet Çizelgesi (on_call_roster) */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span>Nöbetçi İdareci Çizelgesi (Mesai Dışı Bildirim)</span>
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => {
                      setEditingRoster(null);
                      setIsAddingRoster(true);
                      setRosterDay(1);
                      setRosterStart("00:00:00");
                      setRosterEnd("23:59:59");
                      setRosterName("");
                      setRosterChannel("email");
                      setRosterAddress("");
                      setRosterBackupName("");
                      setRosterBackupAddress("");
                    }}>
                      Nöbetçi Ekle
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    PDR çalışma saatleri dışında oluşan Kritik riskli vakalar için anlık eskalasyon bildiriminin yönlendirileceği idari kadroyu ve nöbet günlerini yönetin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Roster Edit/Create Form */}
                  {(editingRoster !== null || isAddingRoster) && (
                    <form onSubmit={handleSaveRoster} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 space-y-4 max-w-2xl animate-fade-in">
                      <h4 className="text-xs font-bold uppercase text-slate-400">
                        {editingRoster ? "Nöbet Kaydını Düzenle" : "Yeni Nöbet Kaydı Ekle"}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Nöbet Günü</label>
                          <Select value={String(rosterDay)} onValueChange={v => setRosterDay(Number(v))}>
                            <SelectTrigger className="h-10 bg-white dark:bg-slate-900">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Pazartesi</SelectItem>
                              <SelectItem value="2">Salı</SelectItem>
                              <SelectItem value="3">Çarşamba</SelectItem>
                              <SelectItem value="4">Perşembe</SelectItem>
                              <SelectItem value="5">Cuma</SelectItem>
                              <SelectItem value="6">Cumartesi</SelectItem>
                              <SelectItem value="7">Pazar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Başlangıç Saati</label>
                          <Input type="text" placeholder="00:00:00" value={rosterStart} onChange={e => setRosterStart(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Bitiş Saati</label>
                          <Input type="text" placeholder="23:59:59" value={rosterEnd} onChange={e => setRosterEnd(e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Nöbetçi Ad-Soyad</label>
                          <Input type="text" placeholder="Müdür Yrd. Mehmet Gök" value={rosterName} onChange={e => setRosterName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Kanal</label>
                          <Select value={rosterChannel} onValueChange={(val) => val && setRosterChannel(val)}>
                            <SelectTrigger className="h-10 bg-white dark:bg-slate-900">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">E-posta</SelectItem>
                              <SelectItem value="sms">SMS</SelectItem>
                              <SelectItem value="push">Push Notification</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-500">İletişim Adresi</label>
                          <Input type="text" placeholder="mehmet.gok@school.edu.tr" value={rosterAddress} onChange={e => setRosterAddress(e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200/50 dark:border-slate-800/50 pt-3">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Yedek Yetkili (İkinci Eskalasyon)</label>
                          <Input type="text" placeholder="Okul Müdürü Ahmet Yıldız" value={rosterBackupName} onChange={e => setRosterBackupName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Yedek İletişim Adresi</label>
                          <Input type="text" placeholder="ahmet.yildiz@school.edu.tr" value={rosterBackupAddress} onChange={e => setRosterBackupAddress(e.target.value)} />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          setEditingRoster(null);
                          setIsAddingRoster(false);
                          setRosterName("");
                        }}>İptal</Button>
                        <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">Nöbetçiyi Kaydet</Button>
                      </div>
                    </form>
                  )}

                  {isRosterLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                  ) : roster.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">Tanımlı nöbetçi bulunmamaktadır.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {roster.map(r => {
                        const daysName = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
                        return (
                          <div key={r.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/20 dark:bg-slate-950/10 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{daysName[r.day_of_week - 1]}</span>
                              <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 text-xs">
                                {r.start_time.substring(0, 5)} - {r.end_time.substring(0, 5)}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-xs">
                              <p>Adı: <strong>{r.assigned_name}</strong></p>
                              <p>İletişim: <strong>{r.contact_address}</strong> ({r.contact_channel.toUpperCase()})</p>
                              {r.escalation_target_name && (
                                <p className="text-[10px] text-slate-500">Yedek: {r.escalation_target_name} ({r.escalation_contact_address})</p>
                              )}
                            </div>
                            <div className="flex gap-2 justify-end pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                              <Button size="xs" variant="outline" className="h-7 text-xs" onClick={() => {
                                setEditingRoster(r);
                                setRosterDay(r.day_of_week);
                                setRosterStart(r.start_time);
                                setRosterEnd(r.end_time);
                                setRosterName(r.assigned_name);
                                setRosterChannel(r.contact_channel);
                                setRosterAddress(r.contact_address);
                                setRosterBackupName(r.escalation_target_name || "");
                                setRosterBackupAddress(r.escalation_contact_address || "");
                              }}>
                                Düzenle
                              </Button>
                              <Button size="xs" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 h-7 text-xs" onClick={() => handleDeleteRoster(r.id)}>
                                Sil
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          )}

        </main>
      </div>
    </PasswordPolicyGuard>
  );
}
