import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Lock, ArrowRight, Activity, EyeOff } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 text-slate-50">
      <header className="px-6 lg:px-14 h-20 flex items-center border-b border-white/10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2" href="#">
          <Shield className="h-8 w-8 text-rose-500" />
          <span className="font-bold text-xl tracking-tight">Zorbaya Dur</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:text-rose-400 transition-colors" href="#features">
            Özellikler
          </Link>
          <Link className="text-sm font-medium hover:text-rose-400 transition-colors" href="#how-it-works">
            Nasıl Çalışır
          </Link>
          <Link href="/login">
            <Button variant="outline" className="border-rose-500/50 text-rose-400 hover:bg-rose-500/10">
              Giriş Yap
            </Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-900/20 via-slate-950 to-slate-950 -z-10" />
          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-4 max-w-3xl">
                <div className="inline-block rounded-full bg-rose-500/10 px-3 py-1 text-sm text-rose-400 border border-rose-500/20 mb-4 animate-fade-in">
                  Güvenli, Anonim ve Şeffaf
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  Okullarda Zorbalığa <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-600">Birlikte Dur Diyelim</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-slate-400 md:text-xl leading-relaxed">
                  Öğrenciler için %100 anonim ihbar, yönetim için yapay zeka destekli anında kriz analizi ve 48 saatlik şeffaflık kuralıyla yepyeni bir güvenlik standartı.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/report">
                  <Button size="lg" className="bg-rose-600 hover:bg-rose-700 text-white h-12 px-8 text-lg rounded-full shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all hover:shadow-[0_0_30px_rgba(225,29,72,0.6)] hover:-translate-y-1">
                    Hemen İhbar Et <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-slate-900/50 border-y border-white/5">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Gelişmiş Koruma Mimarisi</h2>
                <p className="max-w-[900px] text-slate-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  En son teknoloji ile donatılmış altyapımız sayesinde hiçbir vaka gözden kaçmaz, hiçbir öğrencinin kimliği tehlikeye atılmaz.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3">
              <div className="group relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-8 hover:border-rose-500/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <EyeOff className="h-12 w-12 text-rose-500 mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">Çift Kör Anonimlik</h3>
                <p className="text-slate-400 leading-relaxed">
                  Kimlik bilgileri uçtan uca şifrelenir. Yalnızca kritik "Kırmızı Kod" krizlerinde resmi onay ile kimlik açılabilir. Okul yönetimi bile anonimliği bozamaz.
                </p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-8 hover:border-blue-500/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Activity className="h-12 w-12 text-blue-500 mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">Yapay Zeka Risk Analizi</h3>
                <p className="text-slate-400 leading-relaxed">
                  Gelen her mesaj anında NLP algoritmalarıyla analiz edilir. Tehdit seviyesi belirlenerek acil durumlarda otomatik SMS ve Push bildirimleri tetiklenir.
                </p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-8 hover:border-amber-500/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Lock className="h-12 w-12 text-amber-500 mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">48 Saat Şeffaflık Kuralı</h3>
                <p className="text-slate-400 leading-relaxed">
                  Sistem, olayların üstünün örtülmesini engeller. Her ihbar zaman damgalıdır ve 48 saat içinde aksiyon alınmazsa MEB birimlerine otomatik eskalasyon yapılır.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-white/10 bg-slate-950 text-slate-400">
        <p className="text-xs">
          © 2026 Zorbaya Dur Platformu. Tüm hakları saklıdır. KVKK Uyumlu Güvenli Sistem.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:text-white transition-colors" href="#">
            Gizlilik Politikası
          </Link>
          <Link className="text-xs hover:text-white transition-colors" href="#">
            Kullanım Şartları
          </Link>
        </nav>
      </footer>
    </div>
  );
}
