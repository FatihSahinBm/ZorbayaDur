"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Key, AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { validatePasswordComplexity } from "@/lib/auth/passwordValidation";

interface PasswordPolicyGuardProps {
  children: React.ReactNode;
  role: "pdr" | "teacher" | "meb";
}

export function PasswordPolicyGuard({ children, role }: PasswordPolicyGuardProps) {
  const [status, setStatus] = useState<{
    daysSinceChange: number;
    daysRemaining: number;
    isExpired: boolean;
    needsWarning: boolean;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/auth/check-password-status");
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
      }
    } catch (e) {
      console.error("Şifre politikası durumu alınamadı:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent, isForced: boolean) => {
    e.preventDefault();
    setFormError(null);

    if (!newPassword) {
      setFormError("Yeni şifre gereklidir.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setFormError("Yeni şifreler uyuşmuyor.");
      return;
    }

    // Client-side complexity validation
    const validation = validatePasswordComplexity(newPassword);
    if (!validation.isValid) {
      setFormError(validation.error || "Şifre karmaşıklık kurallarına uymuyor.");
      return;
    }

    if (oldPassword && newPassword === oldPassword) {
      setFormError("Yeni şifreniz son kullandığınız şifreyle aynı olamaz.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Şifreniz başarıyla güncellendi.");
        // Clear form
        setOldPassword("");
        setNewPassword("");
        setNewPasswordConfirm("");
        setShowModal(false);
        // Refresh status
        fetchStatus();
      } else {
        setFormError(data.error || "Şifre güncellenemedi.");
      }
    } catch (err: any) {
      setFormError("Bir bağlantı hatası oluştu: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-50 dark:bg-slate-950 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">Güvenlik politikaları denetleniyor...</p>
      </div>
    );
  }

  // 1. Forced Password Renewal Screen if expired
  if (status?.isExpired) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-100/30 via-slate-50 to-slate-50 dark:from-red-900/10 dark:via-slate-950 dark:to-slate-950 -z-10" />
        
        <div className="w-full max-w-md animate-fade-in-up">
          <Card className="bg-white/80 dark:bg-slate-900/80 border-red-200 dark:border-red-900/30 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto bg-red-500/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4 ring-1 ring-red-500/20">
                <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Şifre Süreniz Doldu</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-2 leading-relaxed">
                Bilgi Güvenliği Grubu (BSG) Yönergesi Md.9 uyarınca şifrenizin kullanım süresi (180 gün) dolmuştur. Sisteme erişmeye devam edebilmek için şifrenizi yenilemeniz gerekmektedir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => handlePasswordChange(e, true)} className="space-y-4">
                {formError && (
                  <Alert variant="destructive" className="py-2.5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-xs font-bold">Hata</AlertTitle>
                    <AlertDescription className="text-xs">{formError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="forced-old-password">Eski Şifre</Label>
                  <Input
                    id="forced-old-password"
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    placeholder="Mevcut şifreniz"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forced-new-password">Yeni Şifre</Label>
                  <Input
                    id="forced-new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    placeholder="En az 8 karakter, büyük/küçük harf, rakam, özel kar."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forced-new-password-confirm">Yeni Şifre Tekrar</Label>
                  <Input
                    id="forced-new-password-confirm"
                    type="password"
                    required
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    placeholder="Yeni şifrenizi tekrar yazın"
                  />
                </div>

                <div className="text-[10px] text-slate-500 leading-relaxed bg-slate-1050/10 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="font-bold block mb-1">Güçlü Şifre Kriterleri:</span>
                  • Minimum 8 karakter uzunluğunda olmalı.<br />
                  • En az 1 büyük harf, 1 küçük harf, 1 rakam ve 1 özel karakter içermeli.<br />
                  • Son kullanılan şifreyle aynı olmamalı ve zayıf/tahmin edilebilir olmamalı.
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <><Key className="h-4 w-4 mr-2" /> Şifreyi Güncelle ve Giriş Yap</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 2. Normal View with optional Expiry Warning Banner
  return (
    <div className="flex flex-col min-h-screen">
      {status?.needsWarning && (
        <div className="bg-amber-500 text-slate-950 dark:text-black px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-b border-amber-600 font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-950 animate-bounce" />
            <span>
              <strong>Şifre Güvenlik Uyarısı:</strong> Şifrenizin kullanım süresi dolmak üzere! Kalan süre: <strong>{status.daysRemaining} gün</strong>.
              Lütfen verilerinizin güvenliği için şifrenizi yenileyin.
            </span>
          </div>
          
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogTrigger render={
              <Button size="sm" variant="outline" className="border-amber-950/40 text-amber-950 hover:bg-amber-950/10 bg-transparent shrink-0 text-xs h-7">
                Şifreyi Şimdi Güncelle
              </Button>
            } />
            <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                  <Key className="w-4 h-4 text-amber-600" /> Şifre Yenileme (BSG Yönergesi)
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={(e) => handlePasswordChange(e, false)} className="space-y-4 mt-2">
                {formError && (
                  <Alert variant="destructive" className="py-2.5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{formError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="old-password">Eski Şifre</Label>
                  <Input
                    id="old-password"
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Yeni Şifre</Label>
                  <Input
                    id="new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-9"
                    placeholder="En az 8 kar., harf, rakam, özel kar."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-password-confirm">Yeni Şifre Tekrar</Label>
                  <Input
                    id="new-password-confirm"
                    type="password"
                    required
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-9"
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-md mt-2">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Şifreyi Güncelle"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
