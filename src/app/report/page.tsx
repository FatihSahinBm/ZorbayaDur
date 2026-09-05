"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, ShieldAlert, ShieldCheck, Send, EyeOff, Info, CheckCircle2, Loader2, ArrowLeft, ArrowRight, Paperclip, User, GraduationCap, Check, X, FileText, CheckCircle, AlertTriangle, MessageSquare } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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
      return;
    }
    
    // Okul numarasına göre isim ve sınıf eşleştirmesi
    const MOCK_STUDENTS: Record<string, { name: string; studentClass: string }> = {
      "1234": { name: "Ahmet Yılmaz", studentClass: "10-C" },
      "5678": { name: "Zeynep Kaya", studentClass: "11-B" },
      "9012": { name: "Can Demir", studentClass: "9-A" },
    };
    const details = MOCK_STUDENTS[studentId] || { name: `Öğrenci #${studentId}`, studentClass: "Bilinmiyor" };
    setStudentName(details.name);
    setStudentClass(details.studentClass);
  }, [router]);
  
  // Form Steps
  const [step, setStep] = useState(1);
  
  // Step 1: Ne Yaşandı?
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [frequency, setFrequency] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  // Step 2: Kimlik Tercihi
  const [identityLevel, setIdentityLevel] = useState<number>(1); // Default Level 1: Gizli İhbar
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  
  // Step 3: Onay
  const [isApproved, setIsApproved] = useState(true);
  
  // Step 4: Sonuç / Başarı
  const [trackingCode, setTrackingCode] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [insertedReportId, setInsertedReportId] = useState<string | null>(null);
  const [urgencyScore, setUrgencyScore] = useState<number | null>(null);
  const [urgencyLabel, setUrgencyLabel] = useState<string | null>(null);

  // Dialog & Temp Risk
  const [showAssigneeDialog, setShowAssigneeDialog] = useState(false);
  const [tempRisk, setTempRisk] = useState("");
  const [pdrPendingCount, setPdrPendingCount] = useState(0);
  const [teacherPendingCount, setTeacherPendingCount] = useState(0);

  useEffect(() => {
    async function fetchPendingCounts() {
      if (!supabase || !showAssigneeDialog) return;
      try {
        const [pdrRes, teacherRes] = await Promise.all([
          supabase.from("reports").select("*", { count: "exact", head: true }).eq("assigned_role", "pdr").in("status", ["Yeni", "İnceleniyor"]),
          supabase.from("reports").select("*", { count: "exact", head: true }).eq("assigned_role", "teacher").in("status", ["Yeni", "İnceleniyor"])
        ]);
        setPdrPendingCount(pdrRes.count || 0);
        setTeacherPendingCount(teacherRes.count || 0);
      } catch (err) {
        console.error("Vaka yoğunluğu sayılamadı:", err);
      }
    }
    fetchPendingCounts();
  }, [showAssigneeDialog]);

  const getEstimatedTimeText = (role: "pdr" | "teacher", pendingCount: number) => {
    const baseHours = role === "pdr" ? 1 : 2;
    const factor = role === "pdr" ? 2 : 3;
    const totalHours = baseHours + pendingCount * factor;
    if (totalHours < 24) {
      return `~${totalHours} saat (${pendingCount} bekleyen vaka)`;
    } else {
      const days = Math.floor(totalHours / 24);
      const remainingHours = totalHours % 24;
      return `~${days} gün ${remainingHours} saat (${pendingCount} bekleyen vaka)`;
    }
  };

  const analyzeRiskLevel = (text: string) => {
    const lowerText = text.toLowerCase();
    const bordoWords = ["intihar", "ölmek", "öldür", "silah", "bıçak", "kanlar içinde", "kan revan"]; 
    const kirmiziWords = ["tehdit", "korkuyorum", "dövüyor", "dövdü", "dövecek", "şantaj"]; 
    const turuncuWords = ["hakaret", "küfür", "zorla", "dışlıyor", "dalga geç"]; 
    
    if (bordoWords.some(word => lowerText.includes(word))) return "Bordo";
    if (kirmiziWords.some(word => lowerText.includes(word))) return "Kırmızı";
    if (turuncuWords.some(word => lowerText.includes(word))) return "Turuncu";
    return "Sarı";
  };

  const handleNextToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      toast.error("Lütfen zorbalık türünü seçin.");
      return;
    }
    if (content.trim().length < 50) {
      toast.error("Lütfen olayı en az 50 karakter ile daha detaylı anlatın.");
      return;
    }
    if (!location) {
      toast.error("Lütfen olayın nerede yaşandığını seçin.");
      return;
    }
    if (!frequency) {
      toast.error("Lütfen durumun tekrarlanma sıklığını belirtin.");
      return;
    }
    setStep(2);
  };

  const handleNextToStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleFormSubmit = async () => {
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
    } else {
      proceedWithSubmit("teacher", calculatedRisk);
    }
  };

  const proceedWithSubmit = async (assigneeRole: string, calculatedRisk: string) => {
    setIsSubmitting(true);
    setShowAssigneeDialog(false);
    
    const client = supabase;
    if (!client) {
      toast.error("Veritabanı bağlantısı bulunamadı.");
      setIsSubmitting(false);
      return;
    }

    try {
      const newTrackingCode = `ZRB-${Math.floor(100000 + Math.random() * 900000)}`;
      const generatedToken = crypto.randomUUID();

      const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') || 'anonim' : 'anonim';

      let evidenceUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${newTrackingCode}-${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await client.storage
          .from('evidence')
          .upload(fileName, file);

        if (uploadError) {
          toast.error("Kanıt yüklenirken bir hata oluştu: " + uploadError.message);
          setIsSubmitting(false);
          return;
        }
        
        const { data: publicUrlData } = client.storage.from('evidence').getPublicUrl(fileName);
        evidenceUrl = publicUrlData.publicUrl;
      }

      // Bekleyen (aktif) vaka sayısı ile teslim süresi hesapla
      const { count: pendingCount } = await client
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Yeni', 'İnceleniyor', 'Kimlik Onayında']);

      let extraDays = 0;
      if (pendingCount !== null) {
        extraDays = Math.max(0, Math.floor(pendingCount / 4) - 1);
      }
      
      const deadlineDate = new Date();
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

      const { data: inserted, error } = await client.from('reports').insert([
        {
          tracking_code: newTrackingCode,
          student_id: studentId,
          category: category,
          content: content,
          risk_level: calculatedRisk,
          status: "Yeni",
          assigned_role: assigneeRole,
          evidence_url: evidenceUrl,
          deadline_at: deadlineDate.toISOString(),
          identity_level: identityLevel,
          encrypted_identity: encryptedIdData,
          identity_updated_at: new Date().toISOString(),
          session_token: generatedToken,
          location: location,
          frequency: frequency,
          identity_sharing_approved: false
        }
      ]).select('id').single();

      if (error) throw error;

      // Log kaydı oluştur
      await client.from('audit_logs').insert([
        {
          log_id: `LOG-${Math.floor(Math.random() * 9000 + 1000)}`,
          action: `Yeni İhbar: ${calculatedRisk} risk - YZ analizi başlatıldı`,
          actor: "Sistem",
          status: "Başarılı"
        }
      ]);

      setTrackingCode(newTrackingCode);
      setSessionToken(generatedToken);
      setInsertedReportId(inserted?.id ?? null);
      
      if (inserted?.id) {
        localStorage.setItem(`anonToken_${inserted.id}`, generatedToken);
      }

      // YZ analizini başlat
      if (inserted?.id) {
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            category,
            reportId: inserted.id,
            location,
            frequency
          }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.support_message) setSupportMessage(data.support_message);
            if (data.urgency_score) setUrgencyScore(data.urgency_score);
            if (data.urgency_label) setUrgencyLabel(data.urgency_label);
          })
          .catch(() => {/* sessizce geç */});
      }

      toast.success("İhbarınız başarıyla iletildi.");
      setStep(4); // Advance to Teşekkür step
    } catch (error: any) {
      toast.error("Bir hata oluştu: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mask name helper
  const maskText = (text: string) => {
    if (!text) return "";
    const parts = text.split(" ");
    return parts.map(p => {
      if (p.length <= 2) return p + "*";
      return p.substring(0, 2) + "*".repeat(p.length - 2);
    }).join(" ");
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <header className="px-6 lg:px-14 h-20 flex items-center border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        {step > 1 && step < 4 ? (
          <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mr-6">
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Geri Dön</span>
          </button>
        ) : (
          <Link href="/dashboard/student" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mr-6">
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">İhbarlarıma Dön</span>
          </Link>
        )}
        <div className="flex items-center gap-2.5 mx-auto">
          <div className="relative w-7 h-7 rounded-lg overflow-hidden">
            <Image src="/icon.png" alt="KOZA Logo" fill className="object-contain" priority />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">KOZA Güvenli Bildirim Portalı</span>
        </div>
        <div className="flex justify-end w-[88px] sm:w-[100px]">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto py-8 px-4">
        {/* Step Progress Bar */}
        <div className="mb-8 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              {step === 1 && "Adım 1: Ne Yaşandı?"}
              {step === 2 && "Adım 2: Gizlilik Tercihi"}
              {step === 3 && "Adım 3: Onay ve KVKK"}
              {step === 4 && "Adım 4: Teşekkür & Destek"}
            </span>
            <span className="text-xs font-bold text-slate-500">Adım {step} / 4</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                  step === s
                    ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-900/30 scale-105"
                    : step > s
                    ? "bg-green-500 border-green-500 text-white"
                    : "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400"
                }`}>
                  {step > s ? "✓" : s}
                </div>
                {s < 4 && (
                  <div className={`flex-1 h-1 mx-2 rounded transition-all duration-300 ${
                    step > s ? "bg-green-500" : "bg-slate-200 dark:bg-slate-800"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <CardContent className="pt-6">
            
            {/* STEP 1: Ne Yaşandı? */}
            {step === 1 && (
              <form onSubmit={handleNextToStep2} className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Olay Detayları</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Zorbalık durumunu ve detaylarını eksiksiz şekilde doldurun.</p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="category" className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Zorbalık Türü <span className="text-rose-500">*</span></Label>
                  <Select onValueChange={(val) => val && setCategory(val)} value={category || undefined}>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-300 h-12">
                      <SelectValue placeholder="Zorbalık türünü seçin..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300">
                      <SelectItem value="Fiziksel Zorbalık">Fiziksel Zorbalık</SelectItem>
                      <SelectItem value="Sözel Zorbalık">Sözel Zorbalık (Hakaret, Alay)</SelectItem>
                      <SelectItem value="Siber Zorbalık">Siber Zorbalık (Sosyal Medya, WhatsApp)</SelectItem>
                      <SelectItem value="Sosyal Zorbalık">Sosyal Zorbalık (Dışlama, Dedikodu)</SelectItem>
                      <SelectItem value="Diğer">Diğer / Emin Değilim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="description" className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Ne Oldu? (Detaylı Açıklama) <span className="text-rose-500">*</span></Label>
                  <Textarea 
                    id="description" 
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Yaşadığınız veya şahit olduğunuz olayı detaylarıyla anlatın (Minimum 50 karakter)..." 
                    className="min-h-[140px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none text-sm p-4"
                  />
                  <div className="flex justify-between items-center text-xs">
                    <span className={content.trim().length >= 50 ? "text-green-500 font-medium" : "text-slate-500"}>
                      Karakter Sayısı: {content.trim().length} / 50 (min)
                    </span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <Info className="h-3.5 w-3.5" /> Yapay zeka risk derecelendirmesi yapacaktır.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="location" className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Nerede Yaşandı? <span className="text-rose-500">*</span></Label>
                    <Select onValueChange={(val) => val && setLocation(val)} value={location || undefined}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-855 h-12">
                        <SelectValue placeholder="Konum seçin..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <SelectItem value="Sınıf">Sınıf</SelectItem>
                        <SelectItem value="Koridor">Koridor</SelectItem>
                        <SelectItem value="Online">Online / İnternet</SelectItem>
                        <SelectItem value="Okul Bahçesi">Okul Bahçesi</SelectItem>
                        <SelectItem value="Kantin">Kantin</SelectItem>
                        <SelectItem value="Tuvalet">Tuvalet</SelectItem>
                        <SelectItem value="Okul Dışı">Okul Dışı / Dışarıda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="frequency" className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Ne Sıklıkla Yaşanıyor? <span className="text-rose-500">*</span></Label>
                    <Select onValueChange={(val) => val && setFrequency(val)} value={frequency || undefined}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-855 h-12">
                        <SelectValue placeholder="Sıklık seçin..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <SelectItem value="İlk kez">İlk Kez</SelectItem>
                        <SelectItem value="Ara sıra">Ara Sıra</SelectItem>
                        <SelectItem value="Sık sık">Sık Sık</SelectItem>
                        <SelectItem value="Her gün">Her Gün</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="evidence" className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Kanıt / Ek (Ekran görüntüsü, fotoğraf vb. - İsteğe Bağlı)</Label>
                  <div className="flex items-center gap-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => document.getElementById('evidence-upload')?.click()}
                      className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Dosya Ekle
                    </Button>
                    <span className="text-xs text-slate-500 truncate max-w-[250px]">
                      {file ? file.name : "Ek dosya seçilmedi"}
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

                <Button type="submit" className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-md group">
                  Devam Et <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            )}

            {/* STEP 2: Kimlik Tercihi */}
            {step === 2 && (
              <form onSubmit={handleNextToStep3} className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Kimlik ve Gizlilik Tercihiniz</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Kimlik bilgilerinizin kimler tarafından görüntülenebileceğini belirleyin.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Seviye 1: Gizli İhbar */}
                  <div
                    onClick={() => setIdentityLevel(1)}
                    className={`cursor-pointer rounded-xl border p-5 transition-all flex flex-col justify-between select-none ${
                      identityLevel === 1
                        ? "border-amber-500 bg-amber-500/[0.04] dark:bg-amber-500/[0.02] ring-1 ring-amber-500/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-350"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-600 dark:text-amber-400">Seviye 1</span>
                        {identityLevel === 1 && <Check className="w-4 h-4 text-amber-500" />}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">Gizli İhbar</h3>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Kimliğiniz AES-256 ile şifrelenir. PDR uzmanı da dahil okul personeli kimliğinizi göremez. Sadece asılsız iftira durumlarında sistem yöneticileri tarafından çözülebilir. PDR ile anonim olarak mesajlaşabilirsiniz.
                      </p>
                    </div>
                  </div>

                  {/* Seviye 2: Açık İhbar */}
                  <div
                    onClick={() => setIdentityLevel(2)}
                    className={`cursor-pointer rounded-xl border p-5 transition-all flex flex-col justify-between select-none ${
                      identityLevel === 2
                        ? "border-blue-500 bg-blue-500/[0.04] dark:bg-blue-500/[0.02] ring-1 ring-blue-500/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-350"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-blue-600 dark:text-blue-400">Seviye 2</span>
                        {identityLevel === 2 && <Check className="w-4 h-4 text-blue-500" />}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">Açık İhbar</h3>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Kimliğiniz sadece okul PDR uzmanı tarafından çözülebilir. Okul yönetimi veya öğretmenler kimliğinizi asla göremez. Sorunun daha hızlı çözülmesine yardımcı olur.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/[0.04] dark:bg-blue-500/[0.02] border border-blue-500/20 rounded-xl text-xs space-y-1">
                  <p className="font-semibold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-500" /> Kimlik Bilgisi Otomatik Eşleştirildi
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Sisteme giriş yaptığınız okul numarası (<strong>{typeof window !== 'undefined' ? localStorage.getItem('student_id') || '1234' : '1234'}</strong>) ile ilişkili kimlik bilgileriniz (<strong>{maskText(studentName)} - {studentClass}</strong>) otomatik olarak eşleştirilmiştir. Bu bilgiler AES-256 protokolü ile şifrelenerek saklanacaktır.
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3 h-12">
                    Geri
                  </Button>
                  <Button type="submit" className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl">
                    Devam Et
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 3: Onay ve KVKK */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">İhbar Özeti ve Onay</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lütfen bilgilerinizi son kez kontrol edin ve gönderimi onaylayın.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-850 space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Zorbalık Türü / Konum / Sıklık</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{category} ({location} — {frequency})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Olay Açıklaması</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300 italic whitespace-pre-line leading-relaxed">&ldquo;{content}&rdquo;</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block">Gizlilik Seviyesi</span>
                      <span className="font-semibold text-slate-850 dark:text-slate-200">
                        {identityLevel === 1 ? "Seviye 1 (Gizli İhbar)" : "Seviye 2 (Açık İhbar)"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Kimlik Bilgisi</span>
                      <span className="font-mono font-bold text-rose-500">
                        {identityLevel === 1 ? "************" : `${studentName} (${studentClass})`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/[0.05] border border-emerald-500/20 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>KOZA KVKK ve Gizlilik Güvencesi:</strong> Bildiriminiz 6698 sayılı KVKK ve MEB Okul Güvenliği Yönergesi kapsamında uçtan uca korunur. Seçtiğiniz gizlilik kademesine göre kimliğiniz asla yetkisiz kişilerle paylaşılmaz.</span>
                </div>

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-1/3 h-12">
                    Geri
                  </Button>
                  <Button 
                    disabled={isSubmitting} 
                    onClick={handleFormSubmit}
                    className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Şifreleniyor...</>
                    ) : (
                      <><Send className="w-4 h-4" /> İhbarı Gönder</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: Teşekkür & Destek */}
            {step === 4 && (
              <div className="space-y-6 text-center animate-fade-in">
                <div className="mx-auto bg-green-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center ring-1 ring-green-500/20">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bildirim Başarıyla Alındı</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Konu ilgili birimlere güvenli şekilde aktarıldı.
                  </p>
                </div>

                {/* Static Critical Warning Block */}
                {(urgencyLabel === "Kritik" || urgencyLabel === "Acil" || (urgencyScore !== null && urgencyScore >= 80)) && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-left text-xs space-y-2 border-l-4 border-l-red-600">
                    <h4 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      🚨 ACİL YARDIM VE DESTEK HATTI (ALO 183)
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                      Paylaştığın bildirim yüksek öncelikli/kritik seviyede değerlendirilmiştir. Kendine zarar verme, yoğun kriz veya acil psikososyal yardıma ihtiyaç duyduğun durumlarda lütfen anında <strong>ALO 183 Sosyal Destek Hattı</strong> veya <strong>ALO 191 / 112</strong> numaralarını arayarak profesyonel ekiplere ulaş. Okul rehberlik (PDR) servisimiz de en kısa sürede seninle olacaktır. Yalnız değilsin.
                    </p>
                  </div>
                )}

                {/* YZ Destek Mesajı */}
                <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-100 dark:border-rose-800/40 rounded-xl text-left shadow-sm">
                  <span className="text-[10px] font-bold text-rose-500 dark:text-rose-455 uppercase tracking-wider block mb-1">🤖 KOZA Psikolojik Destek Asistanı</span>
                  {supportMessage ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                        &ldquo;{supportMessage}&rdquo;
                      </p>
                      
                      {/* Safety Disclaimer */}
                      <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-450 border-t border-rose-100 dark:border-rose-900/45 pt-2 leading-relaxed">
                        ⚠️ Bu mesaj ilk duygusal destek amaçlıdır, profesyonel psikolojik danışmanlık yerine geçmez.
                      </p>

                      {/* Call-to-action Button */}
                      <div className="pt-1">
                        <Button 
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('student_id', localStorage.getItem('student_id') || '1234');
                            }
                            router.push('/dashboard/student');
                          }}
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> PDR ile Görüşme Talep Et (Mesajlaşma Paneli)
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Kişiselleştirilmiş destek mesajı hazırlanıyor...</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono">Takip Kodu:</span>
                    <div className="text-lg font-bold tracking-wider text-rose-500 dark:text-rose-455">{trackingCode}</div>
                    <p className="text-[10px] text-slate-500">Bu kod ile ileride durum sorgulaması yapabilirsiniz.</p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm space-y-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono">Anonim Mesaj Takip Linki:</span>
                      <Link href="/dashboard/student" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline block truncate mt-1">
                        /dashboard/student
                      </Link>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">Mesajları okumak için bu linki veya panelinizi kullanabilirsiniz.</p>
                  </div>
                </div>

                {/* Acil Kriz Hattı */}
                <div className="p-4 bg-blue-500/[0.04] border border-blue-500/20 rounded-xl text-left text-xs space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 text-blue-500" /> Profesyonel Destek Kanalları</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-normal text-[11px]">
                    Eğer acil bir kriz veya hayati tehlike durumu varsa, lütfen aşağıdaki MEB ve Sağlık Bakanlığı ücretsiz destek hatlarını anında arayın:
                  </p>
                  <div className="flex gap-4 font-mono font-bold text-slate-800 dark:text-slate-100">
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-center shadow-sm">
                      <span className="text-[10px] text-slate-400 block font-sans">📞 ALO Psikiyatri</span>
                      <span className="text-base text-blue-600">182</span>
                    </div>
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-center shadow-sm">
                      <span className="text-[10px] text-slate-400 block font-sans">📞 Aile Destek Hattı</span>
                      <span className="text-base text-blue-650">183</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    setStep(1);
                    setCategory("");
                    setContent("");
                    setLocation("");
                    setFrequency("");
                    setFile(null);
                    setSupportMessage(null);
                    setIsApproved(false);
                    setStudentName("");
                    setStudentClass("");
                  }} 
                  className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                >
                  Yeni Bir İhbar Oluştur
                </Button>
              </div>
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
              <div className="flex flex-col items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="h-24 w-full flex flex-col items-center justify-center gap-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => proceedWithSubmit("teacher", tempRisk)}
                >
                  <User className="h-6 w-6 text-blue-500" />
                  <span className="font-semibold text-xs">Sınıf Öğretmeni</span>
                </Button>
                <span className="text-[10px] text-slate-500 mt-2 text-center leading-normal">
                  {getEstimatedTimeText("teacher", teacherPendingCount)}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="h-24 w-full flex flex-col items-center justify-center gap-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => proceedWithSubmit("pdr", tempRisk)}
                >
                  <GraduationCap className="h-6 w-6 text-rose-500" />
                  <span className="font-semibold text-xs">PDR Uzmanı</span>
                </Button>
                <span className="text-[10px] text-slate-500 mt-2 text-center leading-normal">
                  {getEstimatedTimeText("pdr", pdrPendingCount)}
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
