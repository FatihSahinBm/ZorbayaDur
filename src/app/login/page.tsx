"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent, role: string) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      if (role === "student") {
        const studentId = (document.getElementById('student-id') as HTMLInputElement)?.value;
        const studentPass = (document.getElementById('student-pass') as HTMLInputElement)?.value;
        
        if (studentId === "1234" && studentPass === "1234") {
          localStorage.setItem('student_id', studentId);
          router.push("/dashboard/student");
        } else {
          toast.error("Hatalı kullanıcı adı veya şifre!");
          setIsLoading(false);
        }
      } else if (role === "pdr") {
        const pdrEmail = (document.getElementById('pdr-email') as HTMLInputElement)?.value;
        const pdrPass = (document.getElementById('pdr-pass') as HTMLInputElement)?.value;

        if (pdrEmail === "pdr@okul.k12.tr" && pdrPass === "123") {
          router.push("/dashboard/pdr");
        } else {
          toast.error("Hatalı e-posta veya şifre!");
          setIsLoading(false);
        }
      } else if (role === "teacher") {
        const teacherEmail = (document.getElementById('teacher-email') as HTMLInputElement)?.value;
        const teacherPass = (document.getElementById('teacher-pass') as HTMLInputElement)?.value;

        if (teacherEmail === "ogretmen@okul.k12.tr" && teacherPass === "123") {
          router.push("/dashboard/teacher");
        } else {
          toast.error("Hatalı e-posta veya şifre!");
          setIsLoading(false);
        }
      } else {
        const mebEmail = (document.getElementById('meb-email') as HTMLInputElement)?.value;
        const mebPass = (document.getElementById('meb-pass') as HTMLInputElement)?.value;

        if (mebEmail === "admin@meb.gov.tr" && mebPass === "123") {
          router.push("/dashboard/meb");
        } else {
          toast.error("Hatalı e-posta veya şifre!");
          setIsLoading(false);
        }
      }
    }, 800);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-100/50 via-slate-50 to-slate-50 dark:from-rose-900/20 dark:via-slate-950 dark:to-slate-950 -z-10" />
      
      <div className="absolute top-8 right-8">
        <ThemeToggle />
      </div>

      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 group">
        <Shield className="h-6 w-6 text-rose-500 group-hover:scale-110 transition-transform" />
        <span className="font-bold tracking-tight text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Zorbaya Dur</span>
      </Link>

      <div className="w-full max-w-md animate-fade-in-up">
        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 backdrop-blur-xl shadow-2xl shadow-rose-900/5 dark:shadow-rose-900/10">
          <CardHeader className="space-y-2 text-center pb-8">
            <div className="mx-auto bg-rose-500/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4 ring-1 ring-rose-500/20">
              <Shield className="h-8 w-8 text-rose-500" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Sisteme Giriş</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Lütfen giriş yapmak istediğiniz rolü seçin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8 bg-slate-100 dark:bg-slate-950/50 p-1 border border-slate-200 dark:border-slate-800 rounded-xl">
                <TabsTrigger value="student" className="rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white dark:data-[state=active]:text-white transition-all text-slate-600 dark:text-slate-400">Öğrenci</TabsTrigger>
                <TabsTrigger value="teacher" className="rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white dark:data-[state=active]:text-white transition-all text-slate-600 dark:text-slate-400">Öğretmen</TabsTrigger>
                <TabsTrigger value="pdr" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:text-white transition-all text-slate-600 dark:text-slate-400">PDR</TabsTrigger>
                <TabsTrigger value="meb" className="rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white dark:data-[state=active]:text-white transition-all text-slate-600 dark:text-slate-400">MEB</TabsTrigger>
              </TabsList>
              
              <TabsContent value="student" className="animate-fade-in">
                <form onSubmit={(e) => handleLogin(e, "student")} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-id" className="text-slate-700 dark:text-slate-300">Kullanıcı Adı</Label>
                    <Input id="student-id" placeholder="Örn: 1234" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-rose-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12" defaultValue="1234" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-pass" className="text-slate-700 dark:text-slate-300">Şifre</Label>
                    <Input id="student-pass" type="password" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-rose-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12" defaultValue="1234" />
                  </div>
                  <div className="pt-4">
                    <Button type="submit" disabled={isLoading} className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white text-base rounded-xl transition-all shadow-lg shadow-rose-900/20">
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
                    <Label htmlFor="teacher-email" className="text-slate-700 dark:text-slate-300">Kurumsal E-posta</Label>
                    <Input id="teacher-email" type="email" placeholder="ogretmen@okul.k12.tr" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-purple-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12" defaultValue="ogretmen@okul.k12.tr" />
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
                    <Label htmlFor="pdr-email" className="text-slate-700 dark:text-slate-300">Kurumsal E-posta</Label>
                    <Input id="pdr-email" type="email" placeholder="pdr@okul.k12.tr" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12" defaultValue="pdr@okul.k12.tr" />
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
                    <Label htmlFor="meb-email" className="text-slate-700 dark:text-slate-300">MEB Sicil No / E-posta</Label>
                    <Input id="meb-email" placeholder="admin@meb.gov.tr" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-amber-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12" defaultValue="admin@meb.gov.tr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meb-pass" className="text-slate-700 dark:text-slate-300">Şifre</Label>
                    <Input id="meb-pass" type="password" required className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-amber-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12" defaultValue="123" />
                  </div>
                  <div className="pt-4">
                    <Button type="submit" disabled={isLoading} className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white text-base rounded-xl transition-all shadow-lg shadow-amber-900/20">
                      {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Yönetim Paneline Gir"}
                    </Button>
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
