"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Activity, FileText, Database, ShieldAlert, LogOut, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

export default function MebDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalReports: 0, escalation: 0 });

  const fetchLogs = async () => {
    if (!supabase) return;
    
    // Logları getir
    const { data: logData, error: logError } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (logError) {
      toast.error("Loglar çekilemedi: " + logError.message);
    } else {
      setLogs(logData || []);
    }

    // İstatistikleri hesaplamak için raporları getir
    const { data: reportData } = await supabase.from("reports").select("created_at, status");
    if (reportData) {
      const total = reportData.length;
      // Eskalasyon: Durumu Çözüldü OLMAYAN ve 48 saati geçenler
      const now = new Date().getTime();
      const escalated = reportData.filter(r => {
        if (r.status === 'Çözüldü') return false;
        const diff = now - new Date(r.created_at).getTime();
        return diff > 48 * 60 * 60 * 1000;
      }).length;

      setStats({ totalReports: total, escalation: escalated });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <header className="px-6 h-16 flex items-center border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-amber-500" />
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">MEB Denetim Paneli</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
              <LogOut className="h-4 w-4 mr-2" /> Çıkış
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">Genel İzleme & Denetim</h1>
          <p className="text-slate-600 dark:text-slate-400">Tüm sistem logları ve 48 saatlik eskalasyon takibi bu panelden yönetilir.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Aktif Okul Sayısı</CardTitle>
              <Database className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">1,204</div>
              <p className="text-xs text-slate-500">Sistem simülasyonu</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Toplam İhbar</CardTitle>
              <FileText className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalReports}</div>
              <p className="text-xs text-slate-500">Canlı Veri</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Eskalasyon (48s)</CardTitle>
              <Activity className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-500">{stats.escalation}</div>
              <p className="text-xs text-slate-500">Birimlere yönlendirildi</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">KVKK İhlali</CardTitle>
              <Shield className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">0</div>
              <p className="text-xs text-slate-500">Sistem güvenli</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">Anlık Sistem Logları (Canlı)</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">Sistemdeki tüm işlemler değiştirilemez şekilde (Immutable) kayıt altına alınır.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-100/50 dark:bg-slate-950/50">
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead className="text-slate-600 dark:text-slate-400">Tarih/Saat</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Log ID</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Aksiyon</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Aktör</TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-400">Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                      <TableCell className="text-slate-700 dark:text-slate-300 whitespace-nowrap">{new Date(log.created_at).toLocaleString('tr-TR')}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{log.log_id}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300 font-medium">{log.action}</TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400">{log.actor}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={log.status === "Başarılı" ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                     <TableRow>
                      <TableCell colSpan={5} className="text-center p-8 text-slate-500">
                        Henüz log kaydı bulunmuyor.
                      </TableCell>
                   </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
