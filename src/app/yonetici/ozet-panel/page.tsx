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

  // Vaka sorgulama state
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

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
      const rLevel = r.risk_level as keyof typeof riskCounts;
      if (riskCounts[rLevel] !== undefined) riskCounts[rLevel]++;
      else riskCounts["Orta"]++;

      // Status
      const rStatus = r.status as keyof typeof statusCounts;
      if (statusCounts[rStatus] !== undefined) statusCounts[rStatus]++;
      
      // Category
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;

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
                <ResponsiveContainer width="100%" height="100%">
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
                  <ResponsiveContainer width="100%" height="100%">
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
                <ResponsiveContainer width="100%" height="100%">
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

          {/* Vaka Arama & Detay */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-1.5">
                <Search className="w-5 h-5 text-amber-500" /> Vaka Durumu Sorgulama (Hassas Veri Maskeli)
              </CardTitle>
              <CardDescription className="text-xs">
                Müdür/Yönetici olarak belirli bir vakanın takip durumunu, atanan rolü ve aksiyon geçmişini (kişileri görmeden) inceleyebilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleCaseSearch} className="flex gap-2 max-w-md">
                <Input
                  placeholder="Vaka Takip Kodu Girin (Örn: TRK-...)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-10"
                />
                <Button type="submit" disabled={isSearching || !searchCode.trim()} className="bg-amber-500 hover:bg-amber-600 text-white font-medium shrink-0 h-10">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sorgula"}
                </Button>
              </form>

              {searchResult && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-slate-50/50 dark:bg-slate-950/20 space-y-6 animate-fade-in">
                  {!searchResult.found ? (
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span>Aranan takip koduna ait vaka kaydı bulunamadı. Lütfen kodu kontrol edin.</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Vaka Özet Kartları */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Durum</span>
                          <div>
                            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/15 border-none px-2.5 py-0.5 text-xs font-semibold">
                              {searchResult.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Risk Seviyesi</span>
                          <div>
                            <Badge className="border-none px-2.5 py-0.5 text-xs font-semibold" style={{
                              backgroundColor: `${RISK_COLORS[searchResult.risk_level as keyof typeof RISK_COLORS] || "#ccc"}15`,
                              color: RISK_COLORS[searchResult.risk_level as keyof typeof RISK_COLORS] || "#888"
                            }}>
                              {searchResult.risk_level}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Kategori</span>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{searchResult.category}</p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Oluşturulma</span>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {new Date(searchResult.created_at).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                      </div>

                      {/* İşlem Geçmişi */}
                      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-slate-400" /> İşlem Geçmişi (Denetim Logları)
                        </h4>
                        
                        {searchResult.history && searchResult.history.length > 0 ? (
                          <div className="space-y-3 pl-2 border-l-2 border-amber-500/20">
                            {searchResult.history.map((log: any, index: number) => (
                              <div key={index} className="relative pl-6 space-y-1">
                                <div className="absolute left-[-5px] top-[6px] w-2.5 h-2.5 rounded-full bg-amber-500" />
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{log.action}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(log.created_at).toLocaleString("tr-TR")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                  <span>Aktör: <strong>{log.actor}</strong></span>
                                  <span>•</span>
                                  <span>Durum: <strong className="text-green-600 dark:text-green-400">{log.status}</strong></span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">Bu vakaya ait herhangi bir işlem geçmişi bulunmamaktadır.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </main>
      </div>
    </PasswordPolicyGuard>
  );
}
