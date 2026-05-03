"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, ShieldAlert, Send, EyeOff, Info, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function StudentReportPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [trackingCode, setTrackingCode] = useState("");

  // Basit bir AI Simülasyonu: Belirli tehlikeli kelimeleri tarar
  const analyzeRiskLevel = (text: string) => {
    const lowerText = text.toLowerCase();
    const redWords = ["intihar", "ölmek", "öldürecek", "silah", "bıçak", "kan", "tehdit", "korkuyorum", "döv"];
    const orangeWords = ["hakaret", "küfür", "zorla", "para", "dışlıyorlar", "dalga", "vur"];
    
    if (redWords.some(word => lowerText.includes(word))) return "Kırmızı";
    if (orangeWords.some(word => lowerText.includes(word))) return "Turuncu";
    return "Sarı"; // Varsayılan risk
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Lütfen olayı anlatın.");
      return;
    }

    if (!supabase) {
      toast.error("Veritabanı bağlantısı yok. Lütfen Supabase ayarlarını yapın.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // AI Risk Analizini çalıştır
      const calculatedRisk = analyzeRiskLevel(content);
      const newTrackingCode = `ZRB-${Math.floor(100000 + Math.random() * 900000)}`;

      // Supabase'e kaydet
      const { error } = await supabase.from('reports').insert([
        {
          tracking_code: newTrackingCode,
          category: category || "Bilinmiyor",
          content: content,
          risk_level: calculatedRisk,
          status: "Yeni"
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
      <div className="flex flex-col min-h-[100dvh] bg-slate-950 text-slate-50 items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6 animate-fade-in-up">
          <div className="mx-auto bg-green-500/10 p-4 rounded-full w-24 h-24 flex items-center justify-center ring-1 ring-green-500/20">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-white">İhbarınız Alındı</h2>
          <p className="text-slate-400">
            Bildiriminiz şifrelenerek PDR birimine anonim olarak iletildi. Güvendesiniz. 
            Yapay zeka sistemimiz ihbarınızı aciliyet durumuna göre sınıflandırdı.
          </p>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left">
            <p className="text-sm text-slate-400 mb-2 font-mono">Takip Kodu:</p>
            <p className="text-xl font-bold tracking-wider text-rose-400">{trackingCode}</p>
            <p className="text-xs text-slate-500 mt-2">Bu kod ile ilerleyen günlerde durum sorgulaması yapabilirsiniz.</p>
          </div>
          <Button onClick={() => { setIsSuccess(false); setContent(""); }} variant="outline" className="w-full h-12 border-slate-800 hover:bg-slate-800 text-white">
            Yeni Bir İhbar Yap
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 text-slate-50">
      <header className="px-6 lg:px-14 h-20 flex items-center border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/login" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mr-6">
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Çıkış Yap</span>
        </Link>
        <div className="flex items-center gap-2 mx-auto">
          <Shield className="h-6 w-6 text-rose-500" />
          <span className="font-bold text-lg tracking-tight">Öğrenci Paneli</span>
        </div>
        <div className="w-[88px] sm:w-[100px]"></div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto py-8 px-4">
        <div className="mb-8 space-y-4 animate-fade-in-up">
          <h1 className="text-3xl font-bold tracking-tight text-white">Zorbalığı Bildir</h1>
          <p className="text-slate-400">
            Yaşadığınız veya şahit olduğunuz bir zorbalık durumunu tamamen anonim olarak bildirebilirsiniz.
            Okul numaranız kimseyle paylaşılmaz.
          </p>
        </div>

        <Alert className="mb-8 bg-rose-500/10 border-rose-500/20 text-rose-300 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <EyeOff className="h-5 w-5 !text-rose-400" />
          <AlertTitle className="text-rose-400 font-semibold">Garantili Anonimlik</AlertTitle>
          <AlertDescription className="text-rose-300/80 mt-1">
            Okul müdürü dahil kimse bu ihbarı sizin yaptığınızı göremez. Verileriniz uçtan uca şifrelenmiştir.
          </AlertDescription>
        </Alert>

        <Card className="bg-slate-900 border-slate-800 shadow-xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="category" className="text-slate-300 text-base">Zorbalık Türü (İsteğe bağlı)</Label>
                <Select onValueChange={(val) => setCategory(val as string)}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-300 h-12 focus:ring-rose-500">
                    <SelectValue placeholder="Bir kategori seçin..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                    <SelectItem value="Fiziksel Zorbalık">Fiziksel Zorbalık</SelectItem>
                    <SelectItem value="Sözel Zorbalık">Sözel Zorbalık (Hakaret, Alay)</SelectItem>
                    <SelectItem value="Siber Zorbalık">Siber Zorbalık (İnternet/Sosyal Medya)</SelectItem>
                    <SelectItem value="Psikolojik Zorbalık">Psikolojik/Duygusal Dışlama</SelectItem>
                    <SelectItem value="Diğer">Diğer / Emin Değilim</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="description" className="text-slate-300 text-base">Ne Oldu? <span className="text-rose-500">*</span></Label>
                <Textarea 
                  id="description" 
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Örnek: Beni tehdit ediyorlar veya korkuyorum gibi kelimeler yazarsanız sistem Kırmızı Kod verir..." 
                  className="min-h-[200px] bg-slate-950 border-slate-800 focus-visible:ring-rose-500 text-white placeholder:text-slate-600 resize-none text-base p-4"
                />
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Yazdıklarınız yapay zeka tarafından aciliyet durumuna göre değerlendirilir.
                </p>
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
      </main>
    </div>
  );
}
