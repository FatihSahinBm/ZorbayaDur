"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, ShieldAlert, Send, EyeOff, Info, CheckCircle2, Loader2, ArrowLeft, Paperclip, User, GraduationCap } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/theme-toggle";

export default function StudentReportPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const studentId = localStorage.getItem('student_id');
    if (!studentId) {
      router.push('/login');
    }
  }, [router]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [showAssigneeDialog, setShowAssigneeDialog] = useState(false);
  const [tempRisk, setTempRisk] = useState("");

  const analyzeRiskLevel = (text: string) => {
    const lowerText = text.toLowerCase();
    
    // 'kantin' içinde 'kan', 'aparat' içinde 'para' geçmesi gibi hataları önlemek için kelimeleri daha belirgin yaptık
    const bordoWords = ["intihar", "ölmek", "öldür", "silah", "bıçak", "kanlar içinde", "kan revan"]; 
    const kirmiziWords = ["tehdit", "korkuyorum", "dövüyor", "dövdü", "dövecek", "şantaj"]; 
    const turuncuWords = ["hakaret", "küfür", "zorla", "dışlıyor", "dalga geç"]; 
    
    if (bordoWords.some(word => lowerText.includes(word))) return "Bordo";
    if (kirmiziWords.some(word => lowerText.includes(word))) return "Kırmızı";
    if (turuncuWords.some(word => lowerText.includes(word))) return "Turuncu";
    return "Sarı"; // Varsayılan risk (Düşük)
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Lütfen olayı anlatın.");
      return;
    }

    if (!supabase) {
      toast.error("Veritabanı bağlantısı yok. Lütfen Supabase ayarlarını yapın.");
      return;
    }

    const calculatedRisk = analyzeRiskLevel(content);
    setTempRisk(calculatedRisk);

    if (calculatedRisk === "Turuncu") {
      setShowAssigneeDialog(true);
    } else if (calculatedRisk === "Kırmızı" || calculatedRisk === "Bordo") {
      proceedWithSubmit("pdr", calculatedRisk);
    } else { // Sarı veya Bilinmiyor
      proceedWithSubmit("teacher", calculatedRisk);
    }
  };

  const proceedWithSubmit = async (assigneeRole: string, calculatedRisk: string) => {
    setIsSubmitting(true);
    setShowAssigneeDialog(false);
    
    try {
      const newTrackingCode = `ZRB-${Math.floor(100000 + Math.random() * 900000)}`;

      // Get student_id from localStorage if it exists
      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') || 'anonim' : 'anonim';

      let evidenceUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${newTrackingCode}-${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(fileName, file);

        if (uploadError) {
          toast.error("Kanıt yüklenirken bir hata oluştu: " + uploadError.message);
          setIsSubmitting(false);
          return;
        }
        
        const { data: publicUrlData } = supabase.storage.from('evidence').getPublicUrl(fileName);
        evidenceUrl = publicUrlData.publicUrl;
      }

      // Bekleyen (aktif) vaka sayısını al
      const { count: pendingCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Yeni', 'İnceleniyor', 'Kimlik Onayında']);

      let extraDays = 0;
      if (pendingCount !== null) {
        // Kota: Günde 4 vaka. Başlangıç 48 saat (2 gün) = 8 vaka.
        extraDays = Math.max(0, Math.floor(pendingCount / 4) - 1);
      }
      
      const deadlineDate = new Date();
      // 48 saat (2 gün) standart süre + ekstra yoğunluk günleri
      deadlineDate.setHours(deadlineDate.getHours() + 48 + (extraDays * 24));

      // Supabase'e kaydet
      const { error } = await supabase.from('reports').insert([
        {
          tracking_code: newTrackingCode,
          student_id: studentId,
          category: category || "Bilinmiyor",
          content: content,
          risk_level: calculatedRisk,
          status: "Yeni",
          assigned_role: assigneeRole,
          evidence_url: evidenceUrl,
          deadline_at: deadlineDate.toISOString()
        }
      ]);

      if (error) throw error;

      // Log kaydı oluştur (AI Sınıflandırması)
      await supabase.from('audit_logs').insert([
        {
          log_id: `LOG-${Math.floor(random() * 9000 + 1000)}`, // Geçici ID
          action: `Yeni İhbar YZ Sınıflandırması: ${calculatedRisk} Kod`,
          actor: "AI Engine",
          status: "Başarılı"
        }
      ]);

      setTrackingCode(newTrackingCode);
      setIsSuccess(true);
      toast.success("İhbarınız başarıyla ve anonim olarak iletildi.");
    } catch (error: any) {
      toast.error("Bir hata oluştu: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const random = () => Math.random();

  if (isSuccess) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6 animate-fade-in-up">
          <div className="mx-auto bg-green-500/10 p-4 rounded-full w-24 h-24 flex items-center justify-center ring-1 ring-green-500/20">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">İhbarınız Alındı</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Bildiriminiz şifrelenerek PDR birimine anonim olarak iletildi. Güvendesiniz. 
            Yapay zeka sistemimiz ihbarınızı aciliyet durumuna göre sınıflandırdı.
          </p>
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-left shadow-sm">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-mono">Takip Kodu:</p>
            <p className="text-xl font-bold tracking-wider text-rose-500 dark:text-rose-400">{trackingCode}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Bu kod ile ilerleyen günlerde durum sorgulaması yapabilirsiniz.</p>
          </div>
          <Button onClick={() => { setIsSuccess(false); setContent(""); setFile(null); }} variant="outline" className="w-full h-12 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white">
            Yeni Bir İhbar Yap
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <header className="px-6 lg:px-14 h-20 flex items-center border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/login" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mr-6">
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Çıkış Yap</span>
        </Link>
        <div className="flex items-center gap-2 mx-auto">
          <Shield className="h-6 w-6 text-rose-500" />
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Öğrenci Paneli</span>
        </div>
        <div className="flex justify-end w-[88px] sm:w-[100px]">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto py-8 px-4">
        <div className="mb-8 space-y-4 animate-fade-in-up">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Zorbalığı Bildir</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Yaşadığınız veya şahit olduğunuz bir zorbalık durumunu tamamen anonim olarak bildirebilirsiniz.
            Okul numaranız kimseyle paylaşılmaz.
          </p>
        </div>

        <Alert className="mb-8 bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <EyeOff className="h-5 w-5 !text-rose-500 dark:!text-rose-400" />
          <AlertTitle className="text-rose-600 dark:text-rose-400 font-semibold">Garantili Anonimlik</AlertTitle>
          <AlertDescription className="text-rose-600/80 dark:text-rose-300/80 mt-1">
            Okul müdürü dahil kimse bu ihbarı sizin yaptığınızı göremez. Verileriniz uçtan uca şifrelenmiştir.
          </AlertDescription>
        </Alert>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <CardContent className="pt-6">
            <form onSubmit={handleInitialSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="category" className="text-slate-700 dark:text-slate-300 text-base">Zorbalık Türü (İsteğe bağlı)</Label>
                <Select onValueChange={(val) => setCategory(val as string)}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 h-12 focus:ring-rose-500">
                    <SelectValue placeholder="Bir kategori seçin..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300">
                    <SelectItem value="Fiziksel Zorbalık">Fiziksel Zorbalık</SelectItem>
                    <SelectItem value="Sözel Zorbalık">Sözel Zorbalık (Hakaret, Alay)</SelectItem>
                    <SelectItem value="Siber Zorbalık">Siber Zorbalık (İnternet/Sosyal Medya)</SelectItem>
                    <SelectItem value="Psikolojik Zorbalık">Psikolojik/Duygusal Dışlama</SelectItem>
                    <SelectItem value="Diğer">Diğer / Emin Değilim</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="description" className="text-slate-700 dark:text-slate-300 text-base">Ne Oldu? <span className="text-rose-500">*</span></Label>
                <Textarea 
                  id="description" 
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Örnek: Beni tehdit ediyorlar veya korkuyorum gibi kelimeler yazarsanız sistem Kırmızı Kod verir..." 
                  className="min-h-[150px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-rose-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none text-base p-4"
                />
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Yazdıklarınız yapay zeka tarafından aciliyet durumuna göre değerlendirilir.
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="evidence" className="text-slate-700 dark:text-slate-300 text-base">Kanıt (Fotoğraf/Video/Ekran Görüntüsü) - İsteğe Bağlı</Label>
                <div className="flex items-center gap-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => document.getElementById('evidence-upload')?.click()}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Dosya Seç
                  </Button>
                  <span className="text-sm text-slate-500 truncate max-w-[200px] sm:max-w-[300px]">
                    {file ? file.name : "Dosya seçilmedi"}
                  </span>
                  <input 
                    id="evidence-upload" 
                    type="file" 
                    className="hidden" 
                    accept="image/*,video/*,audio/*,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <Button disabled={isSubmitting} type="submit" className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white text-lg rounded-xl transition-all shadow-lg shadow-rose-900/20 group">
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Şifreleniyor & YZ Analizi Yapılıyor...</>
                ) : (
                  <><Send className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /> Güvenli Olarak İhbar Et</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Dialog open={showAssigneeDialog} onOpenChange={setShowAssigneeDialog}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Yönlendirme Seçimi
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Olayın orta risk düzeyinde olduğu tespit edildi. Konuyu kime iletmek istersiniz?
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Button
                type="button"
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                onClick={() => proceedWithSubmit("teacher", tempRisk)}
              >
                <User className="h-6 w-6 text-blue-500" />
                <span>Sınıf Öğretmeni</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                onClick={() => proceedWithSubmit("pdr", tempRisk)}
              >
                <GraduationCap className="h-6 w-6 text-rose-500" />
                <span>PDR Uzmanı</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
