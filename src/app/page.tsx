"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, Activity, EyeOff, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  const router = useRouter();

  const handleReportClick = () => {
    const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_id') : null;
    if (studentId) {
      router.push('/report');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#070D18] text-slate-900 dark:text-slate-100 selection:bg-blue-500/20 selection:text-blue-600">
      <header className="px-6 lg:px-14 h-20 flex items-center border-b border-slate-200/80 dark:border-blue-900/20 bg-white/80 dark:bg-[#070D18]/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <Link className="flex items-center justify-center gap-2.5 group" href="#">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden group-hover:scale-105 transition-transform">
            <Image src="/icon.png" alt="KOZA Logo" fill className="object-contain" priority />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">KOZA</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href="/istatistikler">
            İstatistikler
          </Link>
          <Link className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href="#koza-manifesto">
            KOZA Nedir?
          </Link>
          <Link className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href="#features">
            Özellikler
          </Link>
          <ThemeToggle />
          <Link href="/login">
            <Button variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 font-medium">
              Giriş Yap
            </Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-20 lg:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100/50 via-sky-50/30 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent -z-10" />
          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-4 max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 dark:bg-blue-500/15 px-4 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 border border-blue-500/20 mb-2 animate-fade-in shadow-sm shadow-blue-500/5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>KOZA — Yalnız Değilsin, Güvenli ve Korunaklı Alandasın</span>
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-300">
                  Zorbalığa Karşı <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 dark:from-sky-400 dark:via-blue-400 dark:to-amber-400">
                    KOZA ile Güvendesin
                  </span>
                </h1>
                <p className="mx-auto max-w-[700px] text-slate-600 dark:text-slate-350 md:text-xl leading-relaxed font-light">
                  Korkularını tek başına taşımak zorunda değilsin. %100 gizli, yargılamayan ve seni koruyan yapay zekâ destekli rehberlik alanında sesini güvenle duyur.
                </p>
              </div>
              <div className="space-x-4">
                <Button 
                  onClick={handleReportClick}
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white h-12 px-8 text-base md:text-lg rounded-full shadow-[0_6px_25px_rgba(37,99,235,0.35)] transition-all hover:shadow-[0_8px_35px_rgba(37,99,235,0.5)] hover:-translate-y-0.5 font-semibold"
                >
                  Güvenle Paylaş & Destek Al <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* KOZA Akronim Manifestosu */}
        <section id="koza-manifesto" className="w-full py-14 md:py-22 bg-white/70 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-blue-900/20 backdrop-blur-sm">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  KOZA FELSEFESİ
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-slate-900 dark:text-white">
                  KOZA Ne Anlama Gelir?
                </h2>
                <p className="max-w-[750px] text-slate-600 dark:text-slate-400 md:text-lg font-light">
                  Tıpkı bir tırtılın kelebeğe dönüşürken sığındığı korunaklı koza gibi; burası da korkuların aşıldığı ve güvenle kanat açıldığı yerdir.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {/* K Harfi */}
              <div className="relative group overflow-hidden rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 p-6 hover:border-blue-500/50 dark:hover:border-blue-500/50 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-blue-500/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-2xl font-mono">
                    K
                  </div>
                  <span className="text-xs font-semibold tracking-wider uppercase text-blue-600 dark:text-blue-400">Güvenli Alan</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Korkularına teslim olma
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Yalnız değilsin; sesini güvenle duyurabileceğin korunaklı bir alandasın.
                </p>
              </div>

              {/* O Harfi */}
              <div className="relative group overflow-hidden rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 p-6 hover:border-amber-500/50 dark:hover:border-amber-500/50 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-amber-500/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-2xl font-mono">
                    O
                  </div>
                  <span className="text-xs font-semibold tracking-wider uppercase text-amber-600 dark:text-amber-400">Dayanışma</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Omuzundaki yükü paylaş
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tek başına susmak ve taşımak zorunda değilsin; yaşadıklarını güvenle anlatıp yükünü hafiflet.
                </p>
              </div>

              {/* Z Harfi */}
              <div className="relative group overflow-hidden rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 p-6 hover:border-teal-500/50 dark:hover:border-teal-500/50 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-teal-500/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black text-2xl font-mono">
                    Z
                  </div>
                  <span className="text-xs font-semibold tracking-wider uppercase text-teal-600 dark:text-teal-400">Destek Ol</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Zorda kalana el ver
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Akranlarına destek ol; haksızlığa karşı sessiz kalmayarak çözümün parçası ol.
                </p>
              </div>

              {/* A Harfi */}
              <div className="relative group overflow-hidden rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 p-6 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-indigo-500/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-2xl font-mono">
                    A
                  </div>
                  <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">Özgürleş</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Aydınlığa birlikte kanat aç
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Korku ve baskıyı geride bırak; potansiyelini güvenle ve özgürce ortaya çıkar.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-[#F8FAFC] dark:bg-[#070D18] border-b border-slate-200/80 dark:border-blue-900/20">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-slate-900 dark:text-white">Gelişmiş Koruma Mimarisi</h2>
                <p className="max-w-[900px] text-slate-600 dark:text-slate-400 md:text-xl/relaxed font-light">
                  Öğrencilerimizin iç huzurunu ve güvenliğini en üstte tutan teknolojik koruma kalkanı.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3">
              <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 p-8 hover:border-blue-500/50 dark:hover:border-blue-500/50 shadow-sm transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent dark:from-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <EyeOff className="h-12 w-12 text-blue-500 mb-6" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Çift Kör Anonimlik</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                  Kimlik bilgilerin uçtan uca şifrelenir. Normal şartlarda okul personeli kimliğini göremez, kimliğin güvendedir.
                </p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 p-8 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 shadow-sm transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent dark:from-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Activity className="h-12 w-12 text-indigo-500 mb-6" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Empatik Destek & Analiz</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                  Gelen her mesaj duygu ve risk analiziyle taranır. Sana anında ilk duygusal yardım mesajı gösterilerek PDR desteği planlanır.
                </p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 p-8 hover:border-amber-500/50 dark:hover:border-amber-500/50 shadow-sm transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent dark:from-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Lock className="h-12 w-12 text-amber-500 mb-6" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">48 Saat Şeffaflık Güvencesi</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                  Olayların üstünün örtülmesine izin verilmez. Her bildirim zaman damgalıdır ve çözüme kavuşturulana dek takip edilir.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-slate-200/80 dark:border-blue-900/20 bg-white dark:bg-[#070D18] text-slate-500 dark:text-slate-400">
        <p className="text-xs">
          © 2026 KOZA Platformu. Tüm hakları saklıdır. KVKK Uyumlu Güvenli ve Korunaklı Alan.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:text-slate-900 dark:hover:text-white transition-colors" href="#">
            Gizlilik Politikası
          </Link>
          <Link className="text-xs hover:text-slate-900 dark:hover:text-white transition-colors" href="#">
            Kullanım Şartları
          </Link>
        </nav>
      </footer>
    </div>
  );
}
