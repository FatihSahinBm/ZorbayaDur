"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Loader2, LogOut, MessageSquare, Plus, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function StudentDashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentId, setStudentId] = useState<string>('');
  
  // Mesajlaşma state'leri
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
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

  const fetchMessages = async (reportId: string) => {
    if (!supabase) return;
    setIsMessagesLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });
      
    if (!error) {
      setMessages(data || []);
    }
    setIsMessagesLoading(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedReportId || !supabase) return;
    
    const content = newMessage;
    setNewMessage(""); // Hızlı UI geri bildirimi için
    
    const { error } = await supabase.from('messages').insert([
      {
        report_id: selectedReportId,
        sender_role: 'student',
        content: content
      }
    ]);
    
    if (error) {
      toast.error("Mesaj gönderilemedi");
    } else {
      fetchMessages(selectedReportId);
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
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 text-slate-50">
      <header className="px-6 h-16 flex items-center border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-rose-500" />
          <span className="font-bold text-lg tracking-tight">Öğrenci Paneli</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/login" onClick={() => localStorage.removeItem('student_id')}>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
              <LogOut className="h-4 w-4 mr-2" /> Çıkış
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">İhbarlarım</h1>
            <p className="text-slate-400">Yaptığınız ihbarların durumunu ve PDR ile olan anonim mesajlarınızı buradan takip edin.</p>
          </div>
          <Link href="/report">
            <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/20">
              <Plus className="w-4 h-4 mr-2" /> Yeni İhbar Yap
            </Button>
          </Link>
        </div>

        <Card className="bg-slate-900 border-slate-800 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle>Geçmiş İhbarlarım</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-950/50">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">İhbar No</TableHead>
                    <TableHead className="text-slate-400">Tarih</TableHead>
                    <TableHead className="text-slate-400">Kategori</TableHead>
                    <TableHead className="text-slate-400">Durum</TableHead>
                    <TableHead className="text-right text-slate-400">İşlem / Mesajlaşma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-mono font-medium text-slate-300">{report.tracking_code}</TableCell>
                      <TableCell className="text-slate-400">{new Date(report.created_at).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell className="text-slate-300">{report.category}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-right">
                        <Dialog onOpenChange={(open) => {
                          if (open) {
                            setSelectedReportId(report.id);
                            fetchMessages(report.id);
                          }
                        }}>
                          <DialogTrigger render={
                            <Button variant="outline" size="sm" className="border-slate-700 bg-slate-950 text-white hover:bg-slate-800">
                              <MessageSquare className="w-4 h-4 mr-2" /> Detay & PDR ile Görüş
                            </Button>
                          } />
                          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-xl max-h-[80vh] flex flex-col">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                İhbar Detayı: <span className="font-mono text-rose-500">{report.tracking_code}</span>
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="bg-slate-950 p-4 rounded-md border border-slate-800 mt-2 text-sm text-slate-300">
                              <strong>İhbar İçeriği:</strong> {report.content}
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-4 min-h-[250px]">
                              {isMessagesLoading ? (
                                <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
                              ) : messages.length === 0 ? (
                                <div className="text-center text-slate-500 mt-10">
                                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                  <p>Henüz mesaj yok. PDR birimine anonim mesaj gönderebilirsiniz.</p>
                                </div>
                              ) : (
                                messages.map((msg) => (
                                  <div key={msg.id} className={`flex flex-col ${msg.sender_role === 'student' ? 'items-end' : 'items-start'}`}>
                                    <span className="text-xs text-slate-500 mb-1 px-1">
                                      {msg.sender_role === 'student' ? 'Siz (Anonim)' : 'PDR Uzmanı'}
                                    </span>
                                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${msg.sender_role === 'student' ? 'bg-rose-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm'}`}>
                                      {msg.content}
                                    </div>
                                    <span className="text-[10px] text-slate-600 mt-1">
                                      {new Date(msg.created_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>

                            <form onSubmit={sendMessage} className="mt-4 pt-4 border-t border-slate-800 flex gap-2">
                              <Textarea 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="PDR uzmanına anonim olarak yaz..."
                                className="resize-none h-[60px] bg-slate-950 border-slate-800 text-white focus-visible:ring-rose-500"
                              />
                              <Button type="submit" className="h-[60px] px-6 bg-rose-600 hover:bg-rose-700">
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
