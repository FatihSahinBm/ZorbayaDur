"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Search, AlertTriangle, CheckCircle2, Clock, EyeOff, Activity, LogOut, LockKeyholeOpen, Loader2, MessageSquare, Paperclip, Download, Brain, TrendingUp, Zap, MapPin, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { DecryptedIdentityView } from "@/components/DecryptedIdentityView";

export default function PDRDashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // AI Pattern Analysis state
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [patternResult, setPatternResult] = useState<any>(null);
  const [isPatternLoading, setIsPatternLoading] = useState(false);
  
  // Messages state
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);

  const fetchReports = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("assigned_role", "pdr")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Veriler çekilemedi: " + error.message);
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

  const fetchMessages = async (reportId: string, showLoading = true) => {
    if (!supabase) return;
    if (showLoading) setIsMessagesLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });
      
    if (!error) {
      setMessages(data || []);
    }
    if (showLoading) setIsMessagesLoading(false);
  };

  // Mesajları canlı (polling) yenile
  useEffect(() => {
    if (!selectedReportId) return;
    const interval = setInterval(() => {
      fetchMessages(selectedReportId, false);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedReportId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedReportId || !supabase) return;
    
    const content = newMessage;
    setNewMessage(""); 
    
    const { error } = await supabase.from('messages').insert([
      {
        report_id: selectedReportId,
        sender_role: 'pdr',
        content: content
      }
    ]);
    
    if (error) {
      toast.error("Mesaj gönderilemedi");
    } else {
      fetchMessages(selectedReportId);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus })
      .eq("id", id);
      
    if (error) {
      toast.error("Durum güncellenemedi.");
    } else {
      toast.success("Durum başarıyla güncellendi.");
      fetchReports();
    }
  };

  const calculateTimeLeft = (deadlineAt: string, createdAt: string) => {
    let deadline;
    if (deadlineAt) {
      deadline = new Date(deadlineAt);
    } else {
      const createdDate = new Date(createdAt);
      deadline = new Date(createdDate.getTime() + 48 * 60 * 60 * 1000); // 48 hours fallback
    }
    
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) return "Süre Doldu (Eskale Edildi)";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}g ${hours}s ${minutes}d`;
    return `${hours}s ${minutes}d`;
  };

  const handlePatternAnalysis = async () => {
    setShowPatternModal(true);
    setIsPatternLoading(true);
    try {
      const res = await fetch('/api/analyze/patterns');
      const data = await res.json();
      setPatternResult(data);
    } catch {
      toast.error("Örüntü analizi başarısız oldu.");
    } finally {
      setIsPatternLoading(false);
    }
  };

  const getUrgencyColor = (score: number) => {
    if (score >= 80) return "bg-red-600";
    if (score >= 60) return "bg-rose-500";
    if (score >= 40) return "bg-amber-500";
    if (score >= 20) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getRiskBadge = (risk: string) => {
    switch(risk) {
      case "Bordo": return <Badge className="bg-red-800 hover:bg-red-900 text-white animate-pulse"><AlertTriangle className="w-3 h-3 mr-1"/> Kritik Acil</Badge>;
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
          <Shield className="h-6 w-6 text-blue-500" />
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">PDR Paneli</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Activity className="h-4 w-4 text-green-500" /> Yapay Zeka Aktif
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hidden sm:flex items-center gap-2"
            onClick={handlePatternAnalysis}
          >
            <Brain className="h-4 w-4" /> Örüntü Analizi
          </Button>
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
              <LogOut className="h-4 w-4 mr-2" /> Çıkış
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">Vaka Yönetimi</h1>
            <p className="text-slate-600 dark:text-slate-400">Gelen anonim ihbarları ve yapay zeka analizlerini buradan takip edin.</p>
          </div>
          <div className="flex gap-4">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center px-4 py-2 gap-3 shadow-sm">
              <div className="bg-rose-500/20 p-2 rounded-full"><AlertTriangle className="h-5 w-5 text-rose-500"/></div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Kırmızı Kod</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{reports.filter(r => r.risk_level === 'Kırmızı').length}</p>
              </div>
            </Card>
          </div>
        </div>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-slate-900 dark:text-white">Gelen İhbarlar (Canlı)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-100/50 dark:bg-slate-950/50">
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead className="text-slate-600 dark:text-slate-400">İhbar No</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Risk Analizi</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Kategori</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Durum</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Kalan Süre (Dinamik)</TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-400">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-mono font-medium text-slate-700 dark:text-slate-300">{report.tracking_code}</TableCell>
                      <TableCell>{getRiskBadge(report.risk_level)}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{report.category}</TableCell>
                      <TableCell>
                        <Select defaultValue={report.status} onValueChange={(val) => handleStatusChange(report.id, val as string)}>
                          <SelectTrigger className="w-[130px] h-8 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-300 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-300">
                            <SelectItem value="Yeni">Yeni</SelectItem>
                            <SelectItem value="İnceleniyor">İnceleniyor</SelectItem>
                            <SelectItem value="Çözüldü">Çözüldü</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center text-sm ${report.status === 'Çözüldü' ? 'text-green-500' : 'text-amber-500'}`}>
                          {report.status === 'Çözüldü' ? "-" : <><Clock className="w-4 h-4 mr-1" /> {calculateTimeLeft(report.deadline_at, report.created_at)}</>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog onOpenChange={(open) => {
                          if (open) {
                            setSelectedReportId(report.id);
                            fetchMessages(report.id);
                          }
                        }}>
                          <DialogTrigger render={
                            <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
                              <MessageSquare className="w-4 h-4 mr-2" /> Detay & Mesaj
                            </Button>
                          } />
                          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sm:max-w-xl max-h-[90vh] h-[90vh] flex flex-col overflow-hidden">
                            <DialogHeader className="shrink-0">
                              <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                                İhbar Detayı: <span className="font-mono text-rose-500">{report.tracking_code}</span>
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="flex-1 overflow-y-auto pr-2 mt-2 space-y-4 flex flex-col">
                              <div className="space-y-4 shrink-0">
                                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-md border border-slate-200 dark:border-slate-800">
                                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300"><strong>İhbar İçeriği:</strong> {report.content}</p>
                                  {report.evidence_url && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                      <strong className="block mb-2 text-sm">Eklenen Kanıt:</strong>
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
                                        <a href={report.evidence_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-2 text-sm">
                                          <Paperclip className="h-4 w-4" /> Kanıt Dosyasını Görüntüle
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <DecryptedIdentityView
                                  encryptedIdentity={report.encrypted_identity ?? null}
                                  identityLevel={report.identity_level ?? 1}
                                  role="pdr"
                                />

                                {/* YZ ANALİZ KARTI */}
                                {report.ai_analysis ? (
                                  <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 space-y-3">
                                    <div className="flex items-center gap-2 font-semibold text-sm text-blue-700 dark:text-blue-300">
                                      <Brain className="h-4 w-4" />
                                      YZ Analizi
                                      <span className="ml-auto text-xs text-slate-500 font-normal">
                                        {report.ai_analysis.analyzed_at ? new Date(report.ai_analysis.analyzed_at).toLocaleString('tr-TR') : ''}
                                      </span>
                                    </div>

                                    {/* Aciliyet Skoru */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1"><Zap className="h-3 w-3" /> Aciliyet Skoru</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{report.ai_analysis.urgency?.urgency_score ?? '?'}/100 — {report.ai_analysis.urgency?.urgency_label ?? ''}</span>
                                      </div>
                                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${getUrgencyColor(report.ai_analysis.urgency?.urgency_score ?? 0)}`}
                                          style={{ width: `${report.ai_analysis.urgency?.urgency_score ?? 0}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Zorbalık Tipi */}
                                    <div className="flex flex-wrap gap-2 text-xs">
                                      {report.ai_analysis.classification?.primary_type && (
                                        <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                          {report.ai_analysis.classification.primary_type}
                                        </Badge>
                                      )}
                                      {report.ai_analysis.classification?.severity && (
                                        <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                          Şiddet: {report.ai_analysis.classification.severity}
                                        </Badge>
                                      )}
                                      {report.ai_analysis.classification?.is_recurring && (
                                        <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                          Tekrarlayan
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Önerilen Aksiyon */}
                                    {report.ai_analysis.urgency?.recommended_action && (
                                      <div className="bg-white/60 dark:bg-slate-900/60 rounded-lg p-3 text-xs text-slate-700 dark:text-slate-300">
                                        <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">🎯 Önerilen Aksiyon:</p>
                                        <p>{report.ai_analysis.urgency.recommended_action}</p>
                                      </div>
                                    )}

                                    {/* Müdahale Zamanı + Eskalasyon */}
                                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                      <span>⏰ {report.ai_analysis.urgency?.intervention_timeline ?? '—'}</span>
                                      {report.ai_analysis.urgency?.escalation_needed && (
                                        <span className="text-rose-600 dark:text-rose-400 font-semibold">🚨 Eskalasyon Gerekli</span>
                                      )}
                                    </div>

                                    {/* Tespit Edilen Kelimeler */}
                                    {report.ai_analysis.urgency?.keywords_detected?.length > 0 && (
                                      <div className="text-xs text-slate-500">
                                        <span className="font-medium">Tespit Edilen: </span>
                                        {report.ai_analysis.urgency.keywords_detected.join(', ')}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 flex items-center gap-3 text-sm text-slate-500">
                                    <Brain className="h-4 w-4 animate-pulse" />
                                    YZ analizi bekleniyor veya bu eski bir rapor...
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4 flex-1 pb-4">
                                {isMessagesLoading ? (
                                  <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
                                ) : messages.length === 0 ? (
                                  <div className="text-center text-slate-500 mt-6">
                                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Henüz mesaj yok. Öğrenciyle anonim olarak iletişime geçebilirsiniz.</p>
                                  </div>
                                ) : (
                                  messages.map((msg) => (
                                    <div key={msg.id} className={`flex flex-col ${msg.sender_role === 'pdr' ? 'items-end' : 'items-start'}`}>
                                      <span className="text-xs text-slate-500 mb-1 px-1">
                                        {msg.sender_role === 'pdr' ? 'Siz (PDR)' : 'Öğrenci (Anonim)'}
                                      </span>
                                      <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${msg.sender_role === 'pdr' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-tl-sm'}`}>
                                        {msg.content}
                                      </div>
                                      <span className="text-[10px] text-slate-500 mt-1">
                                        {new Date(msg.created_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                                      </span>
                                    </div>
                                  ))
                                )}
                                <div ref={(el) => {
                                  if (el) {
                                    el.scrollIntoView({ behavior: 'smooth' });
                                  }
                                }} />
                              </div>
                            </div>

                            <form onSubmit={sendMessage} className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-2 shrink-0">
                              <Textarea 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Öğrenciye mesaj gönder (Anonim kalacak)..."
                                className="resize-none h-[60px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus-visible:ring-blue-500"
                              />
                              <Button type="submit" className="h-[60px] px-6 bg-blue-600 hover:bg-blue-700 text-white">
                                Gönder
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center p-8 text-slate-500">
                        Henüz bir kayıt bulunmuyor. Öğrenci panelinden yeni bir ihbar yapın.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* ÖRÜNTÜ ANALİZİ MODAL */}
      <Dialog open={showPatternModal} onOpenChange={setShowPatternModal}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              Son 30 Gün — Örüntü Analizi
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              YZ tüm raporları tarayarak tekrar eden davranış kalıplarını tespit etti.
            </DialogDescription>
          </DialogHeader>

          {isPatternLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Brain className="h-10 w-10 text-blue-500 animate-pulse" />
              <p className="text-sm text-slate-500">Raporlar analiz ediliyor...</p>
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

              {patternResult.result.recurring_behavior_types?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Tekrar Eden Davranışlar</p>
                  <div className="flex flex-wrap gap-2">
                    {patternResult.result.recurring_behavior_types.map((type: string, i: number) => (
                      <Badge key={i} className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20">{type}</Badge>
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
            <p className="text-sm text-slate-500 py-4">Sonuç alınamadı.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
