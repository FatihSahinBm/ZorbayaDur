"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Activity, FileText, Database, ShieldAlert, LogOut, Loader2, MessageSquare, Paperclip, Download, Search, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DecryptedIdentityView } from "@/components/DecryptedIdentityView";

export default function MebDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportsLoading, setIsReportsLoading] = useState(true);
  const [stats, setStats] = useState({ totalReports: 0, escalation: 0 });
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

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

  const fetchReports = async () => {
    if (!supabase) return;
    setIsReportsLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Raporlar çekilemedi: " + error.message);
    } else {
      setReports(data || []);
    }
    setIsReportsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    fetchReports();
    const interval = setInterval(() => { fetchLogs(); fetchReports(); }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getRiskBadge = (risk: string) => {
    switch(risk) {
      case "Bordo": return <Badge className="bg-red-800 hover:bg-red-900 text-white animate-pulse"><AlertTriangle className="w-3 h-3 mr-1"/>Kritik Acil</Badge>;
      case "Kırmızı": return <Badge className="bg-rose-500 hover:bg-rose-600 text-white">Yüksek Risk</Badge>;
      case "Turuncu": return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Orta Risk</Badge>;
      case "Sarı": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-slate-800">Düşük Risk</Badge>;
      default: return <Badge variant="outline">Bilinmiyor</Badge>;
    }
  };

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

        <Tabs defaultValue="logs" className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <TabsList className="bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-1 mb-6">
            <TabsTrigger value="logs" className="rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white dark:data-[state=active]:text-white transition-all text-slate-600 dark:text-slate-400">
              Denetim Logları
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white dark:data-[state=active]:text-white transition-all text-slate-600 dark:text-slate-400">
              Okul Raporları
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Denetim Logları */}
          <TabsContent value="logs">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
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
                          <TableCell colSpan={5} className="text-center p-8 text-slate-500">Henüz log kaydı bulunmuyor.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Okul Raporları */}
          <TabsContent value="reports">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Tüm Okul Raporları (Canlı)</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Sadece "Seviye 2: Açık Bildirim" olarak işaretlenmiş raporlarda öğrenci kimliği görüntülenebilir.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isReportsLoading ? (
                  <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-100/50 dark:bg-slate-950/50">
                      <TableRow className="border-slate-200 dark:border-slate-800">
                        <TableHead className="text-slate-600 dark:text-slate-400">İhbar No</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Risk</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Kategori</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Durum</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Gizlilik</TableHead>
                        <TableHead className="text-right text-slate-600 dark:text-slate-400">Detay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                          <TableCell className="font-mono font-medium text-slate-700 dark:text-slate-300">{report.tracking_code}</TableCell>
                          <TableCell>{getRiskBadge(report.risk_level)}</TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300">{report.category}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              report.status === "Çözüldü" ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" :
                              report.status === "İnceleniyor" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
                              "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            }>
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {report.identity_level === 2 ? (
                              <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs">Seviye 2: Açık İhbar</Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs">Seviye 1: Gizli İhbar</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                              onClick={() => setSelectedReport(report)}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" /> Detay
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {reports.length === 0 && !isReportsLoading && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center p-8 text-slate-500">Henüz kayıt bulunmuyor.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Report Detail Dialog */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={(open) => { if (!open) setSelectedReport(null); }}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                İhbar Detayı: <span className="font-mono text-amber-500">{selectedReport.tracking_code}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-md border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300">
                <strong>İhbar İçeriği:</strong> {selectedReport.content}
                {selectedReport.evidence_url && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <strong className="block mb-2">Eklenen Kanıt:</strong>
                    {selectedReport.evidence_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                      <div className="relative group inline-block">
                        <img src={selectedReport.evidence_url} alt="Kanıt" className="max-h-60 rounded-md border border-slate-200 dark:border-slate-700 object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-md">
                          <a href={selectedReport.evidence_url} target="_blank" rel="noopener noreferrer" className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white backdrop-blur-sm transition-colors" title="Büyüt">
                            <Search className="h-4 w-4" />
                          </a>
                          <a href={selectedReport.evidence_url} download target="_blank" rel="noopener noreferrer" className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white backdrop-blur-sm transition-colors" title="İndir">
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <a href={selectedReport.evidence_url} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline flex items-center gap-2 text-sm">
                        <Paperclip className="h-4 w-4" /> Kanıt Dosyasını Görüntüle
                      </a>
                    )}
                  </div>
                )}
              </div>

              <DecryptedIdentityView
                encryptedIdentity={selectedReport.encrypted_identity ?? null}
                identityLevel={selectedReport.identity_level ?? 1}
                role="meb"
              />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 text-xs">Risk Seviyesi</span>
                  <div className="mt-1">{getRiskBadge(selectedReport.risk_level)}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 text-xs">Durum</span>
                  <div className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{selectedReport.status}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 text-xs">Kategori</span>
                  <div className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{selectedReport.category}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 text-xs">Tarih</span>
                  <div className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{new Date(selectedReport.created_at).toLocaleDateString('tr-TR')}</div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
