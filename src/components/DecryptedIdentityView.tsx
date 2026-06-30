import { useEffect, useState } from "react";
import { decryptIdentity } from "@/lib/crypto";
import { Eye, EyeOff, ShieldAlert, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface DecryptedIdentityViewProps {
  reportId?: string; // required for emergency break-glass
  encryptedIdentity: string | null;
  identityLevel: number | null;
  role: "pdr" | "meb" | "teacher";
  identitySharingApproved?: boolean;
}

export function DecryptedIdentityView({
  reportId,
  encryptedIdentity,
  identityLevel = 1,
  role,
  identitySharingApproved = false,
}: DecryptedIdentityViewProps) {
  const level = identityLevel ?? 1;
  const [decrypted, setDecrypted] = useState<{ name: string; studentClass: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Emergency bypass state
  const [isBreakGlassOpen, setIsBreakGlassOpen] = useState(false);
  const [justification, setJustification] = useState("");
  const [isBypassing, setIsBypassing] = useState(false);
  const [bypassDecrypted, setBypassDecrypted] = useState<{ name: string; studentClass: string } | null>(null);

  // Normal decryption rule:
  // Seviye 1 (Gizli İhbar) → Kimse göremez (Sadece sistem veritabanında şifreli saklar)
  // Seviye 2 (Açık İhbar)  → Sadece PDR görebilir. Okul yönetimi ve öğretmenler göremez.
  const canDecrypt = level === 2 && role === "pdr";

  useEffect(() => {
    async function performDecryption() {
      if (!encryptedIdentity || !canDecrypt) {
        setDecrypted(null);
        return;
      }
      setIsLoading(true);
      try {
        const result = await decryptIdentity(encryptedIdentity);
        setDecrypted(result);
      } catch (err) {
        console.error("Decryption failed:", err);
      } finally {
        setIsLoading(false);
      }
    }
    performDecryption();
  }, [encryptedIdentity, level, role, canDecrypt]);

  const handleBreakGlass = async () => {
    if (!supabase) {
      toast.error("Veritabanı bağlantısı sağlanamadı.");
      return;
    }
    if (!reportId) {
      toast.error("Vaka kimliği (reportId) bulunamadı.");
      return;
    }
    if (!justification.trim()) {
      toast.error("Gerekçe girmek zorunludur.");
      return;
    }

    setIsBypassing(true);
    try {
      const { data, error } = await supabase.rpc("decrypt_identity_emergency", {
        target_report_id: reportId,
        justification: justification.trim()
      });

      if (error) {
        throw error;
      }

      if (data) {
        const parsed = JSON.parse(data);
        setBypassDecrypted(parsed);
        setIsBreakGlassOpen(false);
        toast.success("Kimlik bilgisi acil durum kapsamında başarıyla çözüldü.");
      } else {
        toast.error("Kimlik bilgisi çözülemedi.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Hata: " + (err.message || "Bilinmeyen bir hata oluştu."));
    } finally {
      setIsBypassing(false);
    }
  };

  const getLevelBadge = () => {
    if (level === 2) {
      return (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-medium text-xs flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" /> Seviye 2: Açık İhbar
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium text-xs flex items-center gap-1">
        <ShieldAlert className="w-3.5 h-3.5" /> Seviye 1: Gizli İhbar
      </Badge>
    );
  };

  // If the admin has already bypassed and decrypted, show the emergency data
  if (bypassDecrypted) {
    return (
      <div className="flex flex-col p-4 rounded-xl bg-red-500/[0.04] dark:bg-red-500/[0.06] border border-red-500/30 gap-3 shadow-sm animate-fade-in">
        <div className="flex items-center justify-between pb-2 border-b border-red-500/10">
          <div className="flex items-center gap-2 text-red-650 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" /> Acil Durum Yetki Bypassı (Break-Glass) Aktif
          </div>
          {getLevelBadge()}
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-red-500/10 p-2.5 rounded-lg border border-red-500/25">
            <ShieldCheck className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{bypassDecrypted.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sınıf: <span className="font-semibold text-slate-700 dark:text-slate-300">{bypassDecrypted.studentClass}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Seviye 1: Kimse göremez (PDR dahil) - But manager can Break-Glass
  if (level === 1) {
    return (
      <div className="flex flex-col p-4 rounded-xl bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border border-amber-500/20 gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Kimlik: Gizli İhbar</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Öğrenci kimliğini gizli tutmayı seçti. PDR ve okul yönetimi kimliği normal şartlarda göremez.
              </p>
            </div>
          </div>
          <div className="self-start sm:self-center">{getLevelBadge()}</div>
        </div>

        {role === "meb" && (
          <div className="pt-3 border-t border-amber-500/10 flex flex-col gap-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              * Eğer hayati risk barındıran acil bir durum varsa, müdür/yönetici yetkisiyle yasal sorumluluğu alarak kimliği çözebilirsiniz.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 shadow-sm text-xs rounded-lg self-start"
              onClick={() => setIsBreakGlassOpen(true)}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Acil Durum Camını Kır (Kimliği Çöz)
            </Button>
          </div>
        )}

        {/* Break Glass Dialog */}
        {renderBreakGlassDialog()}
      </div>
    );
  }

  // Seviye 2, çözme yetkisi yok (MEB ve Öğretmen rolleri için) - But manager (meb) can Break-Glass
  if (!canDecrypt) {
    return (
      <div className="flex flex-col p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-slate-200 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700">
              <EyeOff className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Kimlik: PDR'ye Açık (Yönetime Gizli)</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bu ihbarda kimlik bilgileri sadece okul PDR uzmanı tarafından görülebilir. Okul yönetimi ve öğretmenler normal şartlarda göremez.
              </p>
            </div>
          </div>
          <div className="self-start sm:self-center">{getLevelBadge()}</div>
        </div>

        {role === "meb" && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              * Eğer hayati risk barındıran acil bir durum varsa, müdür/yönetici yetkisiyle yasal sorumluluğu alarak kimliği çözebilirsiniz.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 shadow-sm text-xs rounded-lg self-start"
              onClick={() => setIsBreakGlassOpen(true)}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Acil Durum Camını Kır (Kimliği Çöz)
            </Button>
          </div>
        )}

        {/* Break Glass Dialog */}
        {renderBreakGlassDialog()}
      </div>
    );
  }

  // Seviye 2 + PDR: normal şifreyi çöz ve göster
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-green-500/[0.03] dark:bg-green-500/[0.05] border border-green-500/20 gap-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-green-500/10 p-2.5 rounded-lg border border-green-500/20">
          <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-green-500" /> Şifre çözülüyor...
            </div>
          ) : decrypted ? (
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{decrypted.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sınıf: <span className="font-semibold text-slate-700 dark:text-slate-300">{decrypted.studentClass}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-rose-500 font-medium">Kimlik çözülemedi (Anahtar hatası)</p>
          )}
        </div>
      </div>
      <div className="self-start sm:self-center">{getLevelBadge()}</div>
    </div>
  );

  function renderBreakGlassDialog() {
    return (
      <Dialog open={isBreakGlassOpen} onOpenChange={setIsBreakGlassOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-650 dark:text-red-500 font-bold">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" /> Acil Durum Yetki Bypassı (Break-Glass)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-left">
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-400 text-xs rounded-xl leading-relaxed">
              <strong>DİKKAT:</strong> Bu işlem hayati tehlike / acil durumlarda (örn. intihar riski) kimlik tespiti amacıyla tasarlanmıştır. Bu işlem yasal sorumluluk gerektirir ve kimliğinizle birlikte gerekçeniz kalıcı olarak <strong>CRITICAL_EMERGENCY_BYPASS</strong> loglarına kaydedilecektir. Bu işlem geri alınamaz.
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Zorunlu Yasal Gerekçe Metni</label>
              <textarea
                className="w-full min-h-[100px] text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="Örn: Gece saat 03:00 itibarıyla intihar riski taşıyan acil vaka uyarısı alınmıştır. Öğrencinin can güvenliği için PDR öğretmeninin uyanması beklenemediğinden kimlik tespiti yapılmıştır."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsBreakGlassOpen(false)} disabled={isBypassing}>
              İptal
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-medium text-xs py-2 px-3 rounded-lg flex items-center gap-1.5"
              onClick={handleBreakGlass}
              disabled={isBypassing || !justification.trim()}
            >
              {isBypassing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" /> Onayla ve Camı Kır
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}
