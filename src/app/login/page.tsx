"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/lib/supabase";
import { verifyPassword } from "@/lib/auth/hash";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent, role: string) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (role === "meb") {
        const mebEmail = (document.getElementById('meb-email') as HTMLInputElement)?.value?.trim();
        const mebPass = (document.getElementById('meb-pass') as HTMLInputElement)?.value?.trim();

        // 1. Super Admin Hardcoded Bypass
        if (mebEmail === "superadmin" && mebPass === "super123") {
          localStorage.setItem('role', 'superadmin');
          router.push("/admin/dashboard");
          return;
        }

        // 2. Query school_accounts table (Prefix-based unique account)
        if (supabase) {
          const { data: acc } = await supabase
            .from("school_accounts")
            .select("*")
            .eq("user_code", mebEmail.toUpperCase())
            .maybeSingle();

          if (acc) {
            if (acc.role !== "mudur" && acc.role !== "principal" && acc.role !== "meb") {
              toast.error("Bu kullanıcı kodu İdare / MEB girişi için yetkili değildir.");
              setIsLoading(false);
              return;
            }

            const isValid = await verifyPassword(mebPass, acc.password_hash);
            if (isValid) {
              localStorage.setItem('role', 'meb');
              localStorage.setItem('school_id', acc.school_id);
              localStorage.setItem('user_code', acc.user_code);
              router.push("/yonetici/ozet-panel");
              return;
            } else {
              toast.error("Hatalı kullanıcı adı veya şifre!");
              setIsLoading(false);
              return;
            }
          }

          // Legacy school_users fallback
          const { data: legacyData } = await supabase
            .from("school_users")
            .select("*")
            .eq("username", mebEmail)
            .eq("password_plain", mebPass)
            .eq("role", "principal")
            .maybeSingle();

          if (legacyData) {
            localStorage.setItem('role', 'meb');
            localStorage.setItem('school_id', legacyData.school_id);
            localStorage.setItem('username', legacyData.username);
            router.push("/yonetici/ozet-panel");
            return;
          }
        }

        // Fallback to demo hardcoded login
        if (mebEmail === "admin@meb.gov.tr" && mebPass === "123") {
          localStorage.setItem('role', 'meb');
          router.push("/yonetici/ozet-panel");
        } else {
          toast.error("Hatalı kullanıcı adı veya şifre!");
        }
      } else if (role === "student") {
        const studentId = (document.getElementById('student-id') as HTMLInputElement)?.value?.trim();
        const studentPass = (document.getElementById('student-pass') as HTMLInputElement)?.value?.trim();
        
        // 1. Query school_accounts
        if (supabase) {
          const { data: acc } = await supabase
            .from("school_accounts")
            .select("*")
            .eq("user_code", studentId.toUpperCase())
            .maybeSingle();

          if (acc) {
            if (acc.role !== "ogrenci" && acc.role !== "student") {
              toast.error("Bu kullanıcı kodu Öğrenci girişi için yetkili değildir.");
              setIsLoading(false);
              return;
            }

            const isValid = await verifyPassword(studentPass, acc.password_hash);
            if (isValid) {
              localStorage.setItem('role', 'student');
              localStorage.setItem('student_id', acc.user_code);
              localStorage.setItem('school_id', acc.school_id);
              router.push("/dashboard/student");
              return;
            } else {
              toast.error("Hatalı kullanıcı adı veya şifre!");
              setIsLoading(false);
              return;
            }
          }

          // Legacy school_users fallback
          const { data: legacyData } = await supabase
            .from("school_users")
            .select("*")
            .eq("username", studentId)
            .eq("password_plain", studentPass)
            .eq("role", "student")
            .maybeSingle();

          if (legacyData) {
            localStorage.setItem('student_id', studentId);
            localStorage.setItem('school_id', legacyData.school_id);
            router.push("/dashboard/student");
            return;
          }
        }

        // Fallback to demo credentials
        if (studentId === "1234" && studentPass === "1234") {
          localStorage.setItem('student_id', studentId);
          router.push("/dashboard/student");
        } else {
          toast.error("Hatalı kullanıcı adı veya şifre!");
        }
      } else if (role === "pdr") {
        const pdrEmail = (document.getElementById('pdr-email') as HTMLInputElement)?.value?.trim();
        const pdrPass = (document.getElementById('pdr-pass') as HTMLInputElement)?.value?.trim();

        // 1. Query school_accounts
        if (supabase) {
          const { data: acc } = await supabase
            .from("school_accounts")
            .select("*")
            .eq("user_code", pdrEmail.toUpperCase())
            .maybeSingle();

          if (acc) {
            if (acc.role !== "pdr") {
              toast.error("Bu kullanıcı kodu PDR girişi için yetkili değildir.");
              setIsLoading(false);
              return;
            }

            const isValid = await verifyPassword(pdrPass, acc.password_hash);
            if (isValid) {
              localStorage.setItem('role', 'pdr');
              localStorage.setItem('school_id', acc.school_id);
              localStorage.setItem('user_code', acc.user_code);
              router.push("/dashboard/pdr");
              return;
            } else {
              toast.error("Hatalı kullanıcı adı veya şifre!");
              setIsLoading(false);
              return;
            }
          }

          // Legacy fallback
          const { data: legacyData } = await supabase
            .from("school_users")
            .select("*")
            .eq("username", pdrEmail)
            .eq("password_plain", pdrPass)
            .eq("role", "pdr")
            .maybeSingle();

          if (legacyData) {
            localStorage.setItem('school_id', legacyData.school_id);
            router.push("/dashboard/pdr");
            return;
          }
        }

        if (pdrEmail === "pdr@okul.k12.tr" && pdrPass === "123") {
          router.push("/dashboard/pdr");
        } else {
          toast.error("Hatalı e-posta veya şifre!");
        }
      } else if (role === "teacher") {
        const teacherEmail = (document.getElementById('teacher-email') as HTMLInputElement)?.value?.trim();
        const teacherPass = (document.getElementById('teacher-pass') as HTMLInputElement)?.value?.trim();

        // 1. Query school_accounts
        if (supabase) {
          const { data: acc } = await supabase
            .from("school_accounts")
            .select("*")
            .eq("user_code", teacherEmail.toUpperCase())
            .maybeSingle();

          if (acc) {
            if (acc.role !== "ogretmen" && acc.role !== "teacher") {
              toast.error("Bu kullanıcı kodu Öğretmen girişi için yetkili değildir.");
              setIsLoading(false);
              return;
            }

            const isValid = await verifyPassword(teacherPass, acc.password_hash);
            if (isValid) {
              localStorage.setItem('role', 'teacher');
              localStorage.setItem('school_id', acc.school_id);
              localStorage.setItem('user_code', acc.user_code);
              router.push("/dashboard/teacher");
              return;
            } else {
              toast.error("Hatalı kullanıcı adı veya şifre!");
              setIsLoading(false);
              return;
            }
          }
        }

        if (teacherEmail === "ogretmen@okul.k12.tr" && teacherPass === "123") {
          router.push("/dashboard/teacher");
        } else {
          toast.error("Hatalı e-posta veya şifre!");
        }
      }
    } catch (err: any) {
      toast.error("Giriş yapılırken bir hata oluştu: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#070D18] text-slate-900 dark:text-slate-50 items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100/40 via-slate-50 to-slate-50 dark:from-blue-950/30 dark:via-[#070D18] dark:to-[#070D18] -z-10" />
      
      <div className="absolute top-8 right-8">
        <ThemeToggle />
      </div>

      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2.5 group">
        <div className="relative w-8 h-8 rounded-lg overflow-hidden group-hover:scale-105 transition-transform">
          <Image src="/icon.png" alt="KOZA Logo" fill className="object-contain" priority />
        </div>
        <span className="font-bold tracking-tight text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-lg">KOZA</span>
      </Link>

      <div className="w-full max-w-md animate-fade-in-up">
        <Card className="bg-white/85 dark:bg-slate-900/85 border-slate-200/90 dark:border-slate-800 backdrop-blur-xl shadow-2xl shadow-blue-950/5 dark:shadow-blue-950/30">
          <CardHeader className="space-y-2 text-center pb-8">
            <div className="mx-auto w-16 h-16 relative rounded-2xl overflow-hidden mb-3 shadow-md">
              <Image src="/icon.png" alt="KOZA Logo" fill className="object-contain" priority />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Sisteme Giriş</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Lütfen giriş yapmak istediğiniz rolü seçin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8 bg-slate-100 dark:bg-slate-950/50 p-1 border border-slate-200 dark:border-slate-800 rounded-xl">
                <TabsTrigger value="student" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:text-white transition-all text-slate-600 dark:text-slate-400 font-medium">Öğrenci</TabsTrigger>
                <TabsTrigger value="teacher" className="rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white dark:data-[state=active]:text-white transition-all text-slate-600 dark:text-slate-400 font-medium">Öğretmen</TabsTrigger>
                <TabsTrigger value="pdr" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white dark:data-[state=active]:text-white transition-all text-slate-600 dark:text-slate-400 font-medium">PDR</TabsTrigger>
                <TabsTrigger value="meb" className="rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white dark:data-[state=active]:text-white transition-all text-slate-600 dark:text-slate-400 font-medium">MEB</TabsTrigger>
              </TabsList>
              
              <TabsContent value="student" className="animate-fade-in">
                <form onSubmit={(e) => handleLogin(e, "student")} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-id" className="text-slate-700 dark:text-slate-300">Öğrenci Kodu / Kullanıcı Adı</Label>
                    <Input id="student-id" placeholder="Örn: XRXF-001 veya 1234" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12 font-mono" defaultValue="1234" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-pass" className="text-slate-700 dark:text-slate-300">Şifre</Label>
                    <Input id="student-pass" type="password" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12" defaultValue="1234" />
                  </div>
                  <div className="pt-4">
                    <Button type="submit" disabled={isLoading} className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base rounded-xl transition-all shadow-lg shadow-blue-500/20 font-semibold">
                      {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><LockIcon className="mr-2 h-4 w-4" /> Güvenli Giriş Yap</>}
                    </Button>
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4 flex items-center justify-center gap-1">
                      <Shield className="h-3 w-3" /> %100 Anonim ve Güvenli
                    </p>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="teacher" className="animate-fade-in">
                <form onSubmit={(e) => handleLogin(e, "teacher")} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacher-email" className="text-slate-700 dark:text-slate-300">Öğretmen Kodu / E-posta</Label>
                    <Input id="teacher-email" placeholder="Örn: XRXF-OGR-01 veya ogretmen@okul.k12.tr" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-purple-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12 font-mono" defaultValue="ogretmen@okul.k12.tr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacher-pass" className="text-slate-700 dark:text-slate-300">Şifre</Label>
                    <Input id="teacher-pass" type="password" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-purple-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12" defaultValue="123" />
                  </div>
                  <div className="pt-4">
                    <Button type="submit" disabled={isLoading} className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white text-base rounded-xl transition-all shadow-lg shadow-purple-900/20">
                      {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Öğretmen Paneline Gir"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="pdr" className="animate-fade-in">
                <form onSubmit={(e) => handleLogin(e, "pdr")} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pdr-email" className="text-slate-700 dark:text-slate-300">PDR Kodu / E-posta</Label>
                    <Input id="pdr-email" placeholder="Örn: XRXF-PDR-01 veya pdr@okul.k12.tr" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12 font-mono" defaultValue="pdr@okul.k12.tr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pdr-pass" className="text-slate-700 dark:text-slate-300">Şifre</Label>
                    <Input id="pdr-pass" type="password" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12" defaultValue="123" />
                  </div>
                  <div className="pt-4">
                    <Button type="submit" disabled={isLoading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base rounded-xl transition-all shadow-lg shadow-blue-900/20">
                      {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "PDR Paneline Gir"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="meb" className="animate-fade-in">
                <form onSubmit={(e) => handleLogin(e, "meb")} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="meb-email" className="text-slate-700 dark:text-slate-300">İdare Kodu / MEB Sicil / Kullanıcı Adı</Label>
                    <Input id="meb-email" type="text" placeholder="Örn: XRXF-YNT-01 veya superadmin" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-amber-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12 font-mono" defaultValue="superadmin" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meb-pass" className="text-slate-700 dark:text-slate-300">Şifre</Label>
                    <Input id="meb-pass" type="password" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-amber-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12" defaultValue="super123" />
                  </div>
                  <div className="pt-4">
                    <Button type="submit" disabled={isLoading} className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white text-base rounded-xl transition-all shadow-lg shadow-amber-900/20">
                      {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Yönetim Paneline Gir"}
                    </Button>
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3 flex items-center justify-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-amber-500" /> Giriş: <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">superadmin</span> / <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">super123</span>
                    </p>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LockIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
