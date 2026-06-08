"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, ShieldAlert, LogOut, Loader2, MessageSquare, Paperclip, Download, Search, AlertTriangle, FileText, CheckCircle2, TrendingUp, BarChart2, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DecryptedIdentityView } from "@/components/DecryptedIdentityView";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from "recharts";

const RISK_COLORS: Record<string, string> = {
  Bordo: "bg-red-800 hover:bg-red-900 text-white animate-pulse",
  Kırmızı: "bg-rose-500 hover:bg-rose-600 text-white",
  Turuncu: "bg-amber-500 hover:bg-amber-600 text-white",
  Sarı: "bg-yellow-500 hover:bg-yellow-600 text-slate-800",
};

const BAR_COLORS = ["#f43f5e", "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"];

export default function SchoolManagementPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  const fetchReports = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Raporlar çekilemedi: " + error.message);
    } else {
      setReports(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, []);

  // Isı Haritası / Konum Bazlı Dağılım Grafiği Verisi
  const locationChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      const loc = r.location || "Online";
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reports]);

  // Müdahale İstatistikleri
  const statusStats = useMemo(() => {
    let solved = 0;
    let pending = 0;
    let analyzing = 0;

    reports.forEach((r) => {
      if (r.status === "Çözüldü") solved++;
      else if (r.status === "İnceleniyor") analyzing++;
      else pending++;
    });

    const total = reports.length;
    const solvedPercent = total ? Math.round((solved / total) * 100) : 0;

    return { solved, pending, analyzing, total, solvedPercent };
  }, [reports]);

  // Rapor Çıktısı (Yazdır)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      
      {/* Header - Print hide class added */}
      <header className="px-6 h-16 flex items-center border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 print:hidden">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-rose-500" />
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Okul Yönetimi Yönetim Paneli</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={handlePrint} className="border-slate-200 dark:border-slate-800">
            <Printer className="w-4 h-4 mr-2" /> PDF / Yazdır
          </Button>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <LogOut className="h-4 w-4 mr-2" /> Çıkış
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Panel Content */}
      <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        
        {/* Title Section - Print style optimized */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6 border-slate-200 dark:border-slate-800/50">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">Yönetim Analiz & Takip</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Okul geneli risk konumları, müdahale istatistikleri ve onaylanmış vakalar.</p>
          </div>
          <div className="hidden print:block text-right text-xs text-slate-400">
            <span>Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}</span>
          </div>
        </div>

        {/* KPI Panel */}
        <div className="grid gap-6 md:grid-cols-4 animate-fade-in-up">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Toplam Bildirim</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{statusStats.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">İşlem Bekleyen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-rose-500">{statusStats.pending}</div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">İncelenen Vakalar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-amber-500">{statusStats.analyzing}</div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Çözüm Oranı</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-green-500">%{statusStats.solvedPercent}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Map Overview */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Location Risk Heatmap */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-rose-500" />
                Okul Geneli Zorbalık Alan Dağılımı (Isı Haritası)
              </CardTitle>
              <CardDescription className="text-xs">Zorbalığın en sık yaşandığı okul bölümleri</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {locationChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">Veri bulunamadı.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="value" name="Vaka Sayısı" radius={[4, 4, 0, 0]}>
                      {locationChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Privacy Note */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 text-white shadow-xl flex flex-col justify-between p-6">
            <div className="space-y-4">
              <div className="p-3 bg-white/10 w-fit rounded-xl border border-white/10">
                <Shield className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="font-bold text-lg">Veri Koruma Politikası</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                KVKK ve Çift Kör Gizlilik kuralları gereği, okul yönetimi sadece **Seviye 3 (Anonim Olmayan)** ve **PDR Uzmanı tarafından onaylanmış Seviye 2** bildirimlerin kimlik bilgilerine erişebilir. 
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seviye 1 (Gizli) bildirimlerin içerikleri sistem tarafından maskelenir ve okul yönetimine gösterilmez.
              </p>
            </div>
          </Card>
        </div>

        {/* Reports Table */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white text-base">Bildirilen Zorbalık Vakaları</CardTitle>
            <CardDescription className="text-xs">
              Vakaların risk düzeyleri, konumları ve yetki bazlı gizlilik durumları listelenmektedir.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-100/50 dark:bg-slate-950/50">
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead className="text-slate-600 dark:text-slate-400">İhbar No</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Risk Derecesi</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Kategori</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Konum</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Gizlilik Seviyesi</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Durum</TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-400 print:hidden">Detay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    const isLevel1 = report.identity_level === 1;
                    return (
                      <TableRow key={report.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                        <TableCell className="font-mono font-medium text-slate-700 dark:text-slate-300">{report.tracking_code}</TableCell>
                        <TableCell>
                          <Badge className={RISK_COLORS[report.risk_level] || "bg-slate-100 text-slate-800"}>
                            {report.risk_level === "Bordo" ? "Kritik Acil" : report.risk_level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-750 dark:text-slate-300">{report.category}</TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300 font-medium">{report.location || "Online"}</TableCell>
                        <TableCell>
                          {report.identity_level === 3 ? (
                            <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 text-xs">Seviye 3: Anonim</Badge>
                          ) : report.identity_level === 2 ? (
                            <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 text-xs">Seviye 2: PDR'de</Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs">Seviye 1: Gizli</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            report.status === "Çözüldü" ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" :
                            report.status === "İnceleniyor" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
                            "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          }>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right print:hidden">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => setSelectedReport(report)}
                          >
                            Detay İncele
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {reports.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center p-8 text-slate-500">Henüz bildirilmiş vaka kaydı bulunmuyor.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Report Detail Dialog */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={(open) => { if (!open) setSelectedReport(null); }}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                İhbar Detayı: <span className="font-mono text-rose-500">{selectedReport.tracking_code}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              
              {/* Privacy Content Check: level 1 is masked completely */}
              {selectedReport.identity_level === 1 ? (
                <div className="bg-amber-500/[0.04] p-4 rounded-xl border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>🔒 İçerik gizlidir (Anonim Bildirim). Bu seviye 1 ihbarın içeriğini sadece PDR uzmanı görebilir.</span>
                </div>
              ) : (
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
                        <a href={selectedReport.evidence_url} target="_blank" rel="noopener noreferrer" className="text-rose-600 hover:underline flex items-center gap-2 text-sm">
                          <Paperclip className="h-4 w-4" /> Kanıt Dosyasını Görüntüle
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Decrypted Identity Component for Okul Yönetimi */}
              <DecryptedIdentityView
                encryptedIdentity={selectedReport.encrypted_identity ?? null}
                identityLevel={selectedReport.identity_level ?? 1}
                role="meb"
                identitySharingApproved={selectedReport.identity_sharing_approved}
              />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 text-xs">Risk Seviyesi</span>
                  <div className="mt-1">
                    <Badge className={RISK_COLORS[selectedReport.risk_level] || "bg-slate-100 text-slate-800"}>
                      {selectedReport.risk_level === "Bordo" ? "Kritik Acil" : selectedReport.risk_level}
                    </Badge>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 text-xs">Durum</span>
                  <div className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{selectedReport.status}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 text-xs">Konum</span>
                  <div className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{selectedReport.location || "Online"}</div>
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

      {/* Global CSS for Print Optimization */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          header, .print\\:hidden, button, [role="dialog"], input, select, textarea {
            display: none !important;
          }
          main {
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #ddd !important;
            padding: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
