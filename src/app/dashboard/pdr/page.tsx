"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Search, AlertTriangle, CheckCircle2, Clock, EyeOff, Activity, LogOut, LockKeyholeOpen, Loader2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function PDRDashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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

  const calculateTimeLeft = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const deadline = new Date(createdDate.getTime() + 48 * 60 * 60 * 1000); // 48 hours
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) return "Süre Doldu (Eskale Edildi)";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}s ${minutes}d`;
  };

  const getRiskBadge = (risk: string) => {
    switch(risk) {
      case "Kırmızı": return <Badge className="bg-rose-500 hover:bg-rose-600 text-white animate-pulse"><AlertTriangle className="w-3 h-3 mr-1"/> Kritik Acil</Badge>;
      case "Turuncu": return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Yüksek Risk</Badge>;
      case "Sarı": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Orta Risk</Badge>;
      default: return <Badge variant="outline">Bilinmiyor</Badge>;
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 text-slate-50">
      <header className="px-6 h-16 flex items-center border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-500" />
          <span className="font-bold text-lg tracking-tight">PDR Paneli</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
            <Activity className="h-4 w-4 text-green-500" /> Yapay Zeka Aktif
          </div>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
              <LogOut className="h-4 w-4 mr-2" /> Çıkış
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Vaka Yönetimi</h1>
            <p className="text-slate-400">Gelen anonim ihbarları ve yapay zeka analizlerini buradan takip edin.</p>
          </div>
          <div className="flex gap-4">
            <Card className="bg-slate-900 border-slate-800 flex items-center px-4 py-2 gap-3">
              <div className="bg-rose-500/20 p-2 rounded-full"><AlertTriangle className="h-5 w-5 text-rose-500"/></div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Kırmızı Kod</p>
                <p className="text-2xl font-bold text-white">{reports.filter(r => r.risk_level === 'Kırmızı').length}</p>
              </div>
            </Card>
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-800 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="border-b border-slate-800 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle>Gelen İhbarlar (Canlı)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-950/50">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">İhbar No</TableHead>
                    <TableHead className="text-slate-400">Risk Analizi</TableHead>
                    <TableHead className="text-slate-400">Kategori</TableHead>
                    <TableHead className="text-slate-400">Durum</TableHead>
                    <TableHead className="text-slate-400">Kalan Süre (48s)</TableHead>
                    <TableHead className="text-right text-slate-400">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-mono font-medium text-slate-300">{report.tracking_code}</TableCell>
                      <TableCell>{getRiskBadge(report.risk_level)}</TableCell>
                      <TableCell className="text-slate-300">{report.category}</TableCell>
                      <TableCell>
                        <Select defaultValue={report.status} onValueChange={(val) => handleStatusChange(report.id, val as string)}>
                          <SelectTrigger className="w-[130px] h-8 bg-slate-950 border-slate-800 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800">
                            <SelectItem value="Yeni">Yeni</SelectItem>
                            <SelectItem value="İnceleniyor">İnceleniyor</SelectItem>
                            <SelectItem value="Çözüldü">Çözüldü</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center text-sm ${report.status === 'Çözüldü' ? 'text-green-500' : 'text-amber-400'}`}>
                          {report.status === 'Çözüldü' ? "-" : <><Clock className="w-4 h-4 mr-1" /> {calculateTimeLeft(report.created_at)}</>}
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
                            <Button variant="outline" size="sm" className="border-slate-700 bg-slate-950 text-white hover:bg-slate-800">
                              <MessageSquare className="w-4 h-4 mr-2" /> Detay & Mesaj
                            </Button>
                          } />
                          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-xl max-h-[90vh] flex flex-col">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                İhbar Detayı: <span className="font-mono text-rose-500">{report.tracking_code}</span>
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-2 shrink-0">
                              <div className="bg-slate-950 p-4 rounded-md border border-slate-800">
                                <p className="text-sm leading-relaxed">{report.content}</p>
                              </div>
                              <div className="flex items-center justify-between p-3 rounded-md bg-slate-950 border border-slate-800">
                                <div className="flex items-center gap-3">
                                  <div className="bg-slate-800 p-2 rounded-full">
                                    <EyeOff className="w-4 h-4 text-slate-400" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Kimlik: *** Anonim ***</p>
                                  </div>
                                </div>
                                {report.risk_level === 'Kırmızı' && (
                                  <Button size="sm" variant="destructive" className="bg-rose-600 hover:bg-rose-700 h-8 text-xs">
                                    <LockKeyholeOpen className="w-3 h-3 mr-2" />
                                    Kimlik Onayı İste
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 mt-2 space-y-4 min-h-[200px]">
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
                                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${msg.sender_role === 'pdr' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm'}`}>
                                      {msg.content}
                                    </div>
                                    <span className="text-[10px] text-slate-600 mt-1">
                                      {new Date(msg.created_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>

                            <form onSubmit={sendMessage} className="mt-4 pt-4 border-t border-slate-800 flex gap-2 shrink-0">
                              <Textarea 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Öğrenciye mesaj gönder (Anonim kalacak)..."
                                className="resize-none h-[60px] bg-slate-950 border-slate-800 text-white focus-visible:ring-blue-500"
                              />
                              <Button type="submit" className="h-[60px] px-6 bg-blue-600 hover:bg-blue-700">
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
    </div>
  );
}
