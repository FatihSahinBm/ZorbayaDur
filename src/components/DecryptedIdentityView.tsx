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

  // Seviye 1: Kimse göremez (PDR dahil)
  if (level === 1) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border border-amber-500/20 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
            <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Kimlik: Gizli İhbar</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Öğrenci kimliğini gizli tutmayı seçti. PDR ve okul yönetimi kimliği göremez. Sadece iftira gibi durumlarda sistem tarafından tespit edilebilir.
            </p>
          </div>
        </div>
        <div className="self-start sm:self-center">{getLevelBadge()}</div>
      </div>
    );
  }

  // Seviye 2, çözme yetkisi yok → gizli (MEB ve Öğretmen rolleri için)
  if (!canDecrypt) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-slate-250 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700">
            <EyeOff className="w-4 h-4 text-slate-550 dark:text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Kimlik: PDR'ye Açık (Yönetime Gizli)</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bu ihbarda kimlik bilgileri sadece okul PDR uzmanı tarafından görülebilir.
            </p>
          </div>
        </div>
        <div className="self-start sm:self-center">{getLevelBadge()}</div>
      </div>
    );
  }

  // Seviye 2 + PDR: şifreyi çöz ve göster
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
