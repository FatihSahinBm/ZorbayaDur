"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Loader2, LogOut, MessageSquare, Plus, Clock, AlertTriangle, Trash2, Paperclip, Search, Download } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { MessageThread } from "@/components/MessageThread";

export default function StudentDashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentId, setStudentId] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const sid = localStorage.getItem('student_id');
    if (!sid) {
      router.push('/login');
      return;
    }
    setStudentId(sid);
    fetchReports(sid);
    
    const interval = setInterval(() => fetchReports(sid), 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchReports = async (sid: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("student_id", sid)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setReports(data || []);
    }
    setIsLoading(false);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!supabase) return;
    
    const confirmDelete = window.confirm("Bu ihbarı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportId);

      if (error) {
        toast.error("İhbar silinirken bir hata oluştu: " + error.message);
      } else {
        toast.success("İhbar başarıyla silindi.");
        fetchReports(studentId);
      }
    } catch (err: any) {
      toast.error("Bir hata oluştu: " + err.message);
    }
  };

  const handleUpgradeToLevel2 = async (reportId: string, trackingCode: string) => {
    if (!supabase) return;
    
    const confirmUpgrade = window.confirm(
      "Bu ihbarın gizlilik seviyesini 'Açık İhbar' (Seviye 2) olarak değiştirmek istediğinize emin misiniz? " +
      "Bu işlem sonucunda kimlik bilgileriniz okul PDR uzmanı tarafından deşifre edilip görülebilecektir."
    );
    if (!confirmUpgrade) return;

    try {
      const { error } = await supabase
        .from("reports")
        .update({ 
          identity_level: 2,
          identity_updated_at: new Date().toISOString()
        })
        .eq("id", reportId);

      if (error) {
        toast.error("Gizlilik seviyesi yükseltilemedi: " + error.message);
      } else {
        // Log to audit logs
        await supabase.from('audit_logs').insert([
          {
            log_id: `LOG-${Math.floor(Math.random() * 9000 + 1000)}`,
            action: `Gizlilik Seviyesi Açık Bildirim'e Yükseltildi: ${trackingCode}`,
            actor: "Öğrenci",
            status: "Başarılı"
          }
        ]);
        toast.success("Gizlilik seviyesi başarıyla Seviye 2 (Açık Bildirim) olarak güncellendi.");
        fetchReports(studentId);
      }
    } catch (err: any) {
      toast.error("Bir hata oluştu: " + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Yeni": return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Yeni İletildi</Badge>;
      case "İnceleniyor": return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">İnceleniyor</Badge>;
      case "Çözüldü": return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Çözüldü</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <header className="px-6 h-16 flex items-center border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-rose-500" />
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Öğrenci Paneli</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <ThemeToggle />
          <Link href="/login" onClick={() => localStorage.removeItem('student_id')}>
            <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
              <LogOut className="h-4 w-4 mr-2" /> Çıkış
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">İhbarlarım</h1>
            <p className="text-slate-600 dark:text-slate-400">Yaptığınız ihbarların durumunu ve PDR ile olan anonim mesajlarınızı buradan takip edin.</p>
          </div>
          <Link href="/report">
            <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/20">
              <Plus className="w-4 h-4 mr-2" /> Yeni İhbar Yap
            </Button>
          </Link>
        </div>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <CardTitle className="text-slate-900 dark:text-white">Geçmiş İhbarlarım</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-100/50 dark:bg-slate-950/50">
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead className="text-slate-600 dark:text-slate-400">İhbar No</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Tarih</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Kategori</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Gizlilik</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Durum</TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-400">İşlem / Mesajlaşma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-mono font-medium text-slate-700 dark:text-slate-300">{report.tracking_code}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">{new Date(report.created_at).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{report.category}</TableCell>
                      <TableCell>
                        {report.identity_level === 2 ? (
                          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs">Seviye 2: Açık İhbar</Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs">Seviye 1: Gizli İhbar</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger render={
                              <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
                                <MessageSquare className="w-4 h-4 mr-2" /> Detay & Görüş
                              </Button>
                            } />
                          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sm:max-w-xl max-h-[90vh] h-[90vh] flex flex-col overflow-hidden">
                            <DialogHeader className="shrink-0">
                              <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                                İhbar Detayı: <span className="font-mono text-rose-500">{report.tracking_code}</span>
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="flex-1 overflow-y-auto pr-2 mt-2 space-y-4 flex flex-col">
                              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-md border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 shrink-0">
                                <strong>İhbar İçeriği:</strong> {report.content}
                                {report.evidence_url && (
                                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <strong className="block mb-2">Eklenen Kanıt:</strong>
                                    {report.evidence_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                      <div className="relative group inline-block">
                                        <img src={report.evidence_url} alt="Kanıt" className="max-h-60 rounded-md border border-slate-200 dark:border-slate-700 object-contain" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-md">
                                          <a href={report.evidence_url} target="_blank" rel="noopener noreferrer" className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white backdrop-blur-sm transition-colors" title="Büyüt">
                                            <Search className="h-4 w-4" />
                                          </a>
                                          <a href={report.evidence_url} download target="_blank" rel="noopener noreferrer" className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white backdrop-blur-sm transition-colors" title="İndir">
                                            <Download className="h-4 w-4" />
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <a href={report.evidence_url} target="_blank" rel="noopener noreferrer" className="text-rose-600 hover:underline flex items-center gap-2">
                                        <Paperclip className="h-4 w-4" /> Kanıt Dosyasını Görüntüle
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="p-4 rounded-md border text-sm shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 animate-fade-in">
                                <div>
                                  <div className="flex items-center gap-2 font-semibold text-slate-850 dark:text-slate-200">
                                    <span>Gizlilik Seviyesi:</span>
                                    {report.identity_level === 2 ? (
                                      <span className="text-blue-600 dark:text-blue-400">Seviye 2 (Açık İhbar)</span>
                                    ) : (
                                      <span className="text-amber-600 dark:text-amber-400">Seviye 1 (Gizli İhbar)</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {report.identity_level === 2 
                                      ? "Kimliğiniz sadece okul PDR uzmanı tarafından görülebilir." 
                                      : "Kimliğiniz gizli tutulmaktadır. PDR uzmanı dahil kimse doğrudan göremez."}
                                  </p>
                                </div>
                                {report.identity_level !== 2 && (
                                  <Button 
                                    size="sm"
                                    onClick={() => handleUpgradeToLevel2(report.id, report.tracking_code)}
                                    className="bg-green-600 hover:bg-green-700 text-white shrink-0 self-start sm:self-center font-medium shadow-sm transition-all"
                                  >
                                    Açık İhbar'a Yükselt
                                  </Button>
                                )}
                              </div>

                              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex-1 flex flex-col min-h-0">
                                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-rose-500" />
                                  <span>PDR ile Mesajlaşma (Anonim)</span>
                                </h3>
                                <div className="flex-1 min-h-0 overflow-y-auto">
                                  <MessageThread
                                    reportId={report.id}
                                    viewerRole="student"
                                    sessionToken={report.session_token || localStorage.getItem(`anonToken_${report.id}`) || ""}
                                    compact={true}
                                  />
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteReport(report.id)}
                          className="bg-rose-600 hover:bg-rose-700 text-white h-9 px-3 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Sil
                        </Button>
                      </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center p-8 text-slate-500">
                        Henüz bir ihbarınız bulunmuyor.
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
