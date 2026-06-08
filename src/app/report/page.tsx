"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, ShieldAlert, ShieldCheck, Send, EyeOff, Info, CheckCircle2, Loader2, ArrowLeft, ArrowRight, Paperclip, User, GraduationCap, Check, X } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/theme-toggle";
import { encryptIdentity } from "@/lib/crypto";
import { Input } from "@/components/ui/input";

export default function StudentReportPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const studentId = localStorage.getItem('student_id');
    if (!studentId) {
      router.push('/login');
    }
  }, [router]);
  
  const [step, setStep] = useState(1);
  const [identityLevel, setIdentityLevel] = useState<number>(1); // 1: PDR'ye gizli, 2: açık
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [insertedReportId, setInsertedReportId] = useState<string | null>(null);

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

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Lütfen olayı anlatın.");
      return;
    }
    setStep(2);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentClass.trim()) {
      toast.error("Lütfen ad ve sınıf bilgilerinizi eksiksiz doldurun.");
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
    
    if (!supabase) {
      toast.error("Veritabanı bağlantısı yok.");
      setIsSubmitting(false);
      return;
    }

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

      // Kimliği şifrele
      let encryptedIdData = null;
      try {
        encryptedIdData = await encryptIdentity(studentName, studentClass);
      } catch (err: any) {
        toast.error("Kimlik şifrelenirken bir hata oluştu: " + err.message);
        setIsSubmitting(false);
        return;
      }

      // Supabase'e kaydet (id döndür)
      const { data: inserted, error } = await supabase.from('reports').insert([
        {
          tracking_code: newTrackingCode,
          student_id: studentId,
          category: category || "Bilinmiyor",
          content: content,
          risk_level: calculatedRisk,
          status: "Yeni",
          assigned_role: assigneeRole,
          evidence_url: evidenceUrl,
          deadline_at: deadlineDate.toISOString(),
          identity_level: identityLevel,
          encrypted_identity: encryptedIdData,
          identity_updated_at: new Date().toISOString()
        }
      ]).select('id').single();

      if (error) throw error;

      // Log kaydı oluştur
      await supabase.from('audit_logs').insert([
        {
          log_id: `LOG-${Math.floor(random() * 9000 + 1000)}`,
          action: `Yeni İhbar: ${calculatedRisk} risk - YZ analizi başlatıldı`,
          actor: "Sistem",
          status: "Başarılı"
        }
      ]);

      setTrackingCode(newTrackingCode);
      setInsertedReportId(inserted?.id ?? null);
      setIsSuccess(true);
      toast.success("İhbarınız başarıyla iletildi.");

      // YZ analizini arka planda başlat (fire-and-forget)
      if (inserted?.id) {
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            category: category || 'Bilinmiyor',
            reportId: inserted.id,
          }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.support_message) setSupportMessage(data.support_message);
          })
          .catch(() => {/* sessizce geç */});
      }
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

          {/* YZ Destek Mesajı */}
          <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl text-left shadow-sm">
            {supportMessage ? (
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                &ldquo;{supportMessage}&rdquo;
              </p>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>YZ destek mesajı hazırlanıyor...</span>
              </div>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-left shadow-sm">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-mono">Takip Kodu:</p>
            <p className="text-xl font-bold tracking-wider text-rose-500 dark:text-rose-400">{trackingCode}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Bu kod ile ilerleyen günlerde durum sorgulaması yapabilirsiniz.</p>
          </div>
          <Button onClick={() => { setIsSuccess(false); setContent(""); setFile(null); setSupportMessage(null); }} variant="outline" className="w-full h-12 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white">
            Yeni Bir İhbar Yap
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <header className="px-6 lg:px-14 h-20 flex items-center border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <Link href={step === 2 ? "#" : "/login"} onClick={(e) => {
          if (step === 2) {
            e.preventDefault();
            setStep(1);
          }
        }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mr-6">
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">{step === 2 ? "Geri Dön" : "Çıkış Yap"}</span>
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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {step === 1 ? "Zorbalığı Bildir" : "Kimlik ve Gizlilik"}
            </h1>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full">
              Adım {step} / 2
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {step === 1 
              ? "Yaşadığınız veya şahit olduğunuz bir zorbalık durumunu güvenli şekilde bildirin."
              : "Lütfen adınızı ve sınıfınızı girin, ardından kimlerin görebileceğini seçin."}
          </p>
        </div>

        {step === 1 ? (
          <Alert className="mb-8 bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <EyeOff className="h-5 w-5 !text-rose-500 dark:!text-rose-400" />
            <AlertTitle className="text-rose-600 dark:text-rose-400 font-semibold">Güvenli ve Şifreli İhbar</AlertTitle>
            <AlertDescription className="text-rose-600/80 dark:text-rose-300/80 mt-1">
              Bildirdiğiniz olaylar şifrelenerek kaydedilir. Bir sonraki adımda kimliğiniz için gizlilik seviyesini belirleyebilirsiniz.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-8 bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <ShieldCheck className="h-5 w-5 !text-blue-500 dark:!text-blue-400" />
            <AlertTitle className="text-blue-600 dark:text-blue-400 font-semibold">Gizlilik Seviyesi ve Kimlik Seçimi</AlertTitle>
            <AlertDescription className="text-blue-600/80 dark:text-blue-300/80 mt-1">
              Girdiğiniz kimlik bilgileri AES-256 ile şifrelenir. Seçtiğiniz seviyeye göre sadece yetkili kişiler görebilir.
            </AlertDescription>
          </Alert>
        )}

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <CardContent className="pt-6">
            {step === 1 ? (
              <form onSubmit={handleNextStep} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="category" className="text-slate-700 dark:text-slate-300 text-base">Zorbalık Türü (İsteğe bağlı)</Label>
                  <Select onValueChange={(val) => setCategory(val as string)} defaultValue={category}>
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

                <Button type="submit" className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white text-lg rounded-xl transition-all shadow-lg shadow-rose-900/20 group">
                  Devam Et <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentName" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Adınız Soyadınız <span className="text-rose-500">*</span></Label>
                    <Input
                      id="studentName"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Örn: Ahmet Yılmaz"
                      className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white h-12 focus-visible:ring-rose-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentClass" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Sınıfınız <span className="text-rose-500">*</span></Label>
                    <Input
                      id="studentClass"
                      required
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      placeholder="Örn: 10-A"
                      className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white h-12 focus-visible:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-700 dark:text-slate-300 text-base">Gizlilik Seviyesi Seçin</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CARD 1: PDR'ye Gizli (Level 1) */}
                    <div
                      onClick={() => setIdentityLevel(1)}
                      className={`cursor-pointer rounded-xl border p-5 transition-all flex flex-col justify-between select-none ${
                        identityLevel === 1
                          ? "border-amber-500 bg-amber-500/[0.04] dark:bg-amber-500/[0.02] ring-1 ring-amber-500/30"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                              <ShieldAlert className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">PDR'ye Gizli</h3>
                          </div>
                          {identityLevel === 1 && (
                            <div className="rounded-full bg-amber-500 text-white p-0.5">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2 text-xs">
                          <div className="text-slate-500 dark:text-slate-400 font-semibold">Kimler görebilir?</div>
                          <ul className="space-y-1">
                            <li className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> Sadece okul PDR uzmanı
                            </li>
                            <li className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                              <X className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Okul yönetimi göremez
                            </li>
                            <li className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                              <X className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Öğretmenler göremez
                            </li>
                          </ul>
                        </div>

                        <div className="space-y-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-slate-500 dark:text-slate-400 font-semibold">Ne yapabilirsin?</div>
                          <ul className="space-y-1">
                            <li className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> PDR ile anonim mesajlaşma
                            </li>
                            <li className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> Sonradan Açık Bildirim'e yükseltme
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: Açık Bildirim (Level 2) */}
                    <div
                      onClick={() => setIdentityLevel(2)}
                      className={`cursor-pointer rounded-xl border p-5 transition-all flex flex-col justify-between select-none ${
                        identityLevel === 2
                          ? "border-green-500 bg-green-500/[0.04] dark:bg-green-500/[0.02] ring-1 ring-green-500/30"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Açık Bildirim</h3>
                          </div>
                          {identityLevel === 2 && (
                            <div className="rounded-full bg-green-500 text-white p-0.5">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2 text-xs">
                          <div className="text-slate-500 dark:text-slate-400 font-semibold">Kimler görebilir?</div>
                          <ul className="space-y-1">
                            <li className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> Okul PDR uzmanı
                            </li>
                            <li className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> Okul Yönetimi (Müdür vb.)
                            </li>
                          </ul>
                        </div>

                        <div className="space-y-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-slate-500 dark:text-slate-400 font-semibold">Ne yapabilirsin?</div>
                          <ul className="space-y-1">
                            <li className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> Resmi takip ve disiplin süreci
                            </li>
                            <li className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> Süreç hakkında bilgilendirme
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
                  ℹ️ Gizlilik tercihinizi sonradan öğrenci panelinden değiştirebilirsiniz.
                </p>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="w-1/3 h-14 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    Geri Dön
                  </Button>
                  <Button 
                    disabled={isSubmitting} 
                    type="submit" 
                    className="flex-1 h-14 bg-rose-600 hover:bg-rose-700 text-white text-lg rounded-xl transition-all shadow-lg shadow-rose-900/20 group"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Şifreleniyor & İletiliyor...</>
                    ) : (
                      <><Send className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /> İhbarı Tamamla</>
                    )}
                  </Button>
                </div>
              </form>
            )}
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
