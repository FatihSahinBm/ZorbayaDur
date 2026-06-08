import { useEffect, useState } from "react";
import { decryptIdentity } from "@/lib/crypto";
import { Eye, EyeOff, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DecryptedIdentityViewProps {
  encryptedIdentity: string | null;
  identityLevel: number | null;
  role: "pdr" | "meb" | "teacher";
}

export function DecryptedIdentityView({
  encryptedIdentity,
  identityLevel = 1,
  role,
}: DecryptedIdentityViewProps) {
  const level = identityLevel ?? 1;
  const [decrypted, setDecrypted] = useState<{ name: string; studentClass: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function performDecryption() {
      // If there is no encrypted identity (e.g. legacy anonymous reports), it's fully anonymous
      if (!encryptedIdentity) {
        setDecrypted(null);
        return;
      }

      // Check if current role has permission to decrypt and see identity:
      // Level 1 (PDR'ye Gizli): only "pdr"
      // Level 2 (Açık Bildirim): "pdr" or "meb"
      const canAccess =
        (level === 1 && role === "pdr") ||
        (level === 2 && (role === "pdr" || role === "meb"));

      if (!canAccess) {
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
  }, [encryptedIdentity, level, role]);

  const getLevelBadge = () => {
    switch (level) {
      case 2:
        return (
          <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 font-medium text-xs flex items-center gap-1 hover:bg-green-500/20 transition-all">
            <ShieldCheck className="w-3.5 h-3.5" /> Seviye 2: Açık Bildirim
          </Badge>
        );
      default: // level 1
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium text-xs flex items-center gap-1 hover:bg-amber-500/20 transition-all">
            <ShieldAlert className="w-3.5 h-3.5" /> Seviye 1: PDR'ye Gizli
          </Badge>
        );
    }
  };

  // If there's no encrypted identity (legacy report), it is Fully Anonymous
  if (!encryptedIdentity) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/10 dark:bg-rose-500/20 p-2.5 rounded-lg border border-rose-500/20">
            <EyeOff className="w-4.5 h-4.5 text-rose-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Kimlik: Tamamen Anonim</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Bu vaka eski sistemde tamamen anonim olarak iletilmiştir.</p>
          </div>
        </div>
        <div className="self-start sm:self-center">
          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-medium text-xs">
            Tamamen Anonim
          </Badge>
        </div>
      </div>
    );
  }

  // Level 1 or 2 with encrypted identity
  const canDecrypt =
    (level === 1 && role === "pdr") ||
    (level === 2 && (role === "pdr" || role === "meb"));

  if (!canDecrypt) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-slate-200 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700">
            <EyeOff className="w-4.5 h-4.5 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-850 dark:text-slate-200">Kimlik: *** GİZLİ ***</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {level === 1 
                ? "Öğrenci kimliği sadece atanan PDR uzmanı tarafından görüntülenebilir." 
                : "Yetki yetersiz. Öğretmenler kimlik bilgilerini görüntüleyemez."}
            </p>
          </div>
        </div>
        <div className="self-start sm:self-center">
          {getLevelBadge()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-green-500/[0.02] dark:bg-green-500/[0.01] border border-green-500/20 dark:border-green-500/10 gap-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-green-500/10 dark:bg-green-500/20 p-2.5 rounded-lg border border-green-500/20">
          <Eye className="w-4.5 h-4.5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-green-500" /> Şifre çözülüyor...
            </div>
          ) : decrypted ? (
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                {decrypted.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sınıf: <span className="font-semibold text-slate-755 dark:text-slate-300">{decrypted.studentClass}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-rose-500 font-medium">Kimlik çözülemedi (Anahtar hatası)</p>
          )}
        </div>
      </div>
      <div className="self-start sm:self-center">
        {getLevelBadge()}
      </div>
    </div>
  );
}
