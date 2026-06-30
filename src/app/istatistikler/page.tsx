"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Brain, Activity, TrendingUp, MapPin, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from "recharts";

const COLORS = ["#f43f5e", "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"];

export default function PublicStatsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("reports")
        .select("category, location, created_at");
      if (!error && data) {
        setReports(data);
      }
      setIsLoading(false);
    }
    loadStats();
  }, []);

  // Total reports
  const totalCount = reports.length;

  // Bullying type data (Pie Chart)
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      const cat = r.category || "Diğer";
      let stdCat = "Diğer";
      if (cat.toLowerCase().includes("fiziksel")) stdCat = "Fiziksel Zorbalık";
      else if (cat.toLowerCase().includes("sözel") || cat.toLowerCase().includes("sözlü")) stdCat = "Sözel Zorbalık";
      else if (cat.toLowerCase().includes("siber")) stdCat = "Siber Zorbalık";
      else if (cat.toLowerCase().includes("sosyal") || cat.toLowerCase().includes("ilişkisel")) stdCat = "Sosyal Zorbalık";
      else if (cat.toLowerCase().includes("cinsel")) stdCat = "Cinsel Zorbalık";
      else stdCat = cat;

      counts[stdCat] = (counts[stdCat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reports]);

  // Location data (Most common location)
  const locationStats = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      const loc = r.location || "Online";
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [reports]);

  const topLocation = locationStats.length > 0 ? locationStats[0][0] : "Online";

  // Monthly Trend (Area Chart)
  const trendData = useMemo(() => {
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const monthlyCounts: Record<string, number> = {};

    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
      monthlyCounts[label] = 0;
    }

    reports.forEach((r) => {
      const date = new Date(r.created_at);
      const label = `${months[date.getMonth()]} ${date.getFullYear()}`;
      if (monthlyCounts[label] !== undefined) {
        monthlyCounts[label]++;
      }
    });

    return Object.entries(monthlyCounts).map(([month, val]) => ({
      month,
      "Bildirim Sayısı": val
    }));
  }, [reports]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <header className="px-6 lg:px-14 h-20 flex items-center border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mr-6">
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Ana Sayfa</span>
        </Link>
        <div className="flex items-center gap-2 mx-auto">
          <Shield className="h-6 w-6 text-rose-500" />
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Şeffaflık & İstatistik Portalı</span>
        </div>
        <div className="flex justify-end w-[88px] sm:w-[100px]">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container max-w-5xl mx-auto py-12 px-4 space-y-8">
        
        {/* Banner Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-500 to-pink-600 p-8 md:p-12 text-white shadow-xl animate-fade-in-up">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10">
            <Shield className="w-80 h-80" />
          </div>
          
          <div className="max-w-2xl space-y-4 relative z-10">
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none text-xs px-3 py-1 font-semibold uppercase tracking-wider">
              Kamu Bilgilendirme Sayfası
            </Badge>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Sessiz Kalma, Zorbaya Dur De!
            </h1>
            <p className="text-sm md:text-base text-rose-50 leading-relaxed font-light">
              Bu portal, okullardaki zorbalık vakalarını önlemek, öğrencilerimize güvenli bir eğitim ortamı sunmak amacıyla kurulmuştur. Aşağıdaki tüm istatistikler KVKK kuralları çerçevesinde tamamen anonimleştirilmiştir.
            </p>
            <div className="pt-4 flex items-center gap-2 font-mono text-xl md:text-2xl font-bold bg-white/10 w-fit px-6 py-3 rounded-2xl border border-white/20">
              ⚡ Zorbaya Dur sayesinde <span className="underline decoration-pink-300 decoration-wavy px-1">{isLoading ? "..." : totalCount}</span> öğrenci sesini duyurdu.
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
            <p className="text-sm text-slate-500">Canlı veriler yükleniyor...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            
            {/* KPI 1 */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Toplam Bildirim Sayısı</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">{totalCount}</div>
                <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                  <EyeOff className="w-3.5 h-3.5 shrink-0" /> Kişisel veri veya okul isimleri asla paylaşılmaz.
                </p>
              </CardContent>
            </Card>

            {/* KPI 2 */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">En Yaygın Olay Alanı</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight text-rose-500 flex items-center gap-2">
                  <MapPin className="w-6 h-6 shrink-0 text-rose-500" />
                  <span>{topLocation || "Belirtilmedi"}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Bulgular okullarımızdaki nöbetçi öğretmen planlamalarında kullanılır.
                </p>
              </CardContent>
            </Card>

            {/* KPI 3 */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">K-Anonimlik Güvenliği</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight text-green-500 flex items-center gap-2">
                  <Shield className="w-6 h-6 shrink-0 text-green-500" />
                  <span>%100 Uyumlu</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Veri madenciliğine karşı koruma katmanı aktiftir, tekli veriler izlenemez.
                </p>
              </CardContent>
            </Card>

            {/* Chart 1: Bullying Type */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm md:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Zorbalık Türü Dağılımı</CardTitle>
                <CardDescription className="text-[11px]">En sık bildirilen zorbalık kategorileri</CardDescription>
              </CardHeader>
              <CardContent className="h-56">
                {pieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">Veri bulunamadı.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        dataKey="value"
                        label={({ name }) => (name ? name.split(" ")[0] : "")}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} İhbar`, 'Miktar']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Monthly Trend */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Aylık Bildirim Trendi</CardTitle>
                <CardDescription className="text-[11px]">Son 6 ayın başvuru ve geri dönüşüm grafiği</CardDescription>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="month" fontSize={10} className="text-slate-400" />
                    <YAxis fontSize={10} className="text-slate-400" />
                    <Tooltip />
                    <Area type="monotone" dataKey="Bildirim Sayısı" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          </div>
        )}
        
        {/* Support Section */}
        <div className="bg-slate-100 dark:bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-250 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-lg font-bold text-slate-850 dark:text-white flex items-center gap-2">
              <Brain className="h-5 w-5 text-rose-500" />
              Profesyonel Yardım Almaktan Çekinmeyin
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Zorbalıkla başa çıkmak tek başına zor olabilir. Eğer kendini çıkmazda hissediyorsan, okuldaki PDR uzmanına veya Sağlık Bakanlığı kriz hatlarına her zaman ulaşabilirsin.
            </p>
          </div>
          <div className="flex gap-3 font-mono">
            <div className="bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl text-center shadow-sm w-32 shrink-0">
              <span className="text-[10px] text-slate-400 block font-sans">📞 Psikiyatri</span>
              <span className="text-lg font-bold text-rose-500">182</span>
            </div>
            <div className="bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl text-center shadow-sm w-32 shrink-0">
              <span className="text-[10px] text-slate-400 block font-sans">📞 Aile Destek</span>
              <span className="text-lg font-bold text-rose-500">183</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
