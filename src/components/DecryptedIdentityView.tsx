import { useEffect, useState } from "react";
import { decryptIdentity } from "@/lib/crypto";
import { Eye, EyeOff, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DecryptedIdentityViewProps {
  encryptedIdentity: string | null;
  identityLevel: number | null;
  role: "pdr" | "meb" | "teacher";
  identitySharingApproved?: boolean;
}

export function DecryptedIdentityView({
  encryptedIdentity,
  identityLevel = 1,
  role,
  identitySharingApproved = false,
}: DecryptedIdentityViewProps) {
  const level = identityLevel ?? 1;
  const [decrypted, setDecrypted] = useState<{ name: string; studentClass: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Erişim kuralları:
  // Seviye 1 (PDR'ye Gizli)  → Kimse göremez (PDR dahil — tamamen anonim)
  // Seviye 2 (PDR'ye Açık)  → PDR görebilir. MEB (Yönetim) ise sadece PDR onaylayınca görebilir.
  const canDecrypt = 
    (level === 2 && role === "pdr") || 
    (level === 2 && role === "meb" && !!identitySharingApproved);

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
  }, [encryptedIdentity, level, role, canDecrypt, identitySharingApproved]);

  const getLevelBadge = () => {
    if (level === 2) {
      if (identitySharingApproved) {
        return (
          <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 font-medium text-xs flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Seviye 2: Yönetimle Paylaşıldı
          </Badge>
        );
      }
      return (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-medium text-xs flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" /> Seviye 2: PDR'ye Açık
        </Badge>
      );
    }
    if (level === 1) {
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium text-xs flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" /> Seviye 1: PDR'ye Gizli
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-500/15 text-slate-655 dark:text-slate-400 border border-slate-500/30 font-medium text-xs flex items-center gap-1">
        <EyeOff className="w-3.5 h-3.5" /> Seviye 3: Tamamen Anonim
      </Badge>
    );
  };

  // Eski sistem raporu veya Seviye 3 (Tamamen Anonim) — şifrelenmiş kimlik yok
  if (!encryptedIdentity || level === 3) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-slate-500/10 p-2.5 rounded-lg border border-slate-500/20">
            <EyeOff className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Kimlik: Tamamen Anonim</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Bu bildirim tamamen anonim olarak (kimlik girişi olmadan) iletilmiştir.</p>
          </div>
        </div>
        <div className="self-start sm:self-center">{getLevelBadge()}</div>
      </div>
    );
  }

  // Seviye 1: Kimse göremez (PDR dahil)
  if (level === 1) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border border-amber-500/20 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
            <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Kimlik: PDR'ye Gizli (Anonim)</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Öğrenci kimliğini gizli tutmayı seçti. PDR ve okul yönetimi kimliği çözemez.
            </p>
          </div>
        </div>
        <div className="self-start sm:self-center">{getLevelBadge()}</div>
      </div>
    );
  }

  // Seviye 2, çözme yetkisi yok → gizli (Örn: MEB rolü henüz PDR onaylamadıysa)
  if (!canDecrypt) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-slate-200 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700">
            <EyeOff className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Kimlik: *** GİZLİ ***</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {role === "meb" 
                ? "Kimlik PDR onayından sonra okul yönetimine açılacaktır." 
                : "Bu kimlik bilgisine erişim yetkiniz bulunmuyor."}
            </p>
          </div>
        </div>
        <div className="self-start sm:self-center">{getLevelBadge()}</div>
      </div>
    );
  }

  // Seviye 2 + PDR (veya PDR Onaylı MEB): şifreyi çöz ve göster
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
}
