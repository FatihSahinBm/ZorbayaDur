"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Shield, 
  Users, 
  LogOut, 
  Loader2, 
  Download, 
  Building, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Info, 
  Calendar,
  School as SchoolIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  generateSchoolCode, 
  formatStudentCode, 
  formatPdrCode, 
  formatAdminCode,
  formatTeacherCode 
} from "@/lib/auth/codeGenerator";
import { generateSafePassword } from "@/lib/auth/passwordGenerator";
import { hashPassword } from "@/lib/auth/hash";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface School {
  id: string;
  name: string;
  code: string;
  student_count: number | null;
  teacher_count: number | null;
  pdr_count: number | null;
  admin_count: number | null;
  created_at: string;
}

interface CsvExportItem {
  role: string;
  user_code: string;
  password_plain: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);

  // Form States
  const [schoolName, setSchoolName] = useState("");
  const [studentCount, setStudentCount] = useState<number>(50);
  const [teacherCount, setTeacherCount] = useState<number>(10);
  const [pdrCount, setPdrCount] = useState<number>(2);
  const [adminCount, setAdminCount] = useState<number>(2);

  // Success Banner State
  const [createdBannerInfo, setCreatedBannerInfo] = useState<{ name: string; code: string } | null>(null);

  // Reset Confirmation Modal States
  const [schoolToReset, setSchoolToReset] = useState<School | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Auth Guard
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "superadmin") {
      router.push("/login");
    }
  }, [router]);

  // Fetch all schools from database
  const fetchSchools = useCallback(async () => {
    if (!supabase) {
      setIsSchoolsLoadingMock();
      return;
    }

    try {
      setIsLoadingSchools(true);
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Normalize code and counts
      const normalized: School[] = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code || s.school_code || "KODSUZ",
        student_count: s.student_count ?? 0,
        teacher_count: s.teacher_count ?? 0,
        pdr_count: s.pdr_count ?? 0,
        admin_count: s.admin_count ?? s.principal_count ?? 0,
        created_at: s.created_at
      }));

      setSchools(normalized);
    } catch (err: any) {
      console.error("Okul listesi alınırken hata oluştu:", err);
      toast.error("Kayıtlı okullar yüklenemedi: " + (err.message || err));
    } finally {
      setIsLoadingSchools(false);
    }
  }, []);

  const setIsSchoolsLoadingMock = () => {
    setIsLoadingSchools(false);
  };

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleLogout = () => {
    localStorage.removeItem("role");
    router.push("/login");
  };

  // CSV Generator and Downloader
  const downloadCsv = (schoolCode: string, items: CsvExportItem[]) => {
    const BOM = "\uFEFF";
    let csvContent = BOM + "Rol;Kullanici Kodu;Sifre;Ad Soyad;Sinif / Sube;Okul No\n";

    for (const item of items) {
      // Empty fields for physical distribution: Ad Soyad, Sinif / Sube, Okul No
      csvContent += `${item.role};${item.user_code};${item.password_plain};;;\n`;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${schoolCode}_kullanici_sifre_listesi.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Create School & Batch Account Generation
  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolName.trim()) {
      toast.error("Lütfen bir okul adı girin.");
      return;
    }
    if (studentCount <= 0 && teacherCount <= 0 && pdrCount <= 0 && adminCount <= 0) {
      toast.error("En az bir kişi (öğrenci, öğretmen, PDR veya idare) oluşturmalısınız.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Generate unique school code with collision check
      let schoolCode = generateSchoolCode(4);
      if (supabase) {
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
          const { data: existing } = await supabase
            .from("schools")
            .select("id")
            .eq("code", schoolCode)
            .maybeSingle();

          if (!existing) {
            isUnique = true;
          } else {
            schoolCode = generateSchoolCode(4);
            attempts++;
          }
        }
      }

      // 2. Insert School Record
      let schoolId = `mock-${Date.now()}`;
      if (supabase) {
        const { data: schoolData, error: schoolError } = await supabase
          .from("schools")
          .insert([{
            name: schoolName.trim(),
            code: schoolCode,
            student_count: studentCount,
            teacher_count: teacherCount,
            pdr_count: pdrCount,
            admin_count: adminCount
          }])
          .select()
          .single();

        if (schoolError) throw schoolError;
        schoolId = schoolData.id;
      }

      // 3. Generate Accounts in Memory
      const accountsToInsert: {
        school_id: string;
        user_code: string;
        password_hash: string;
        role: string;
      }[] = [];

      const plainExportList: CsvExportItem[] = [];

      // Generate Principals / Admins
      for (let i = 1; i <= adminCount; i++) {
        const userCode = formatAdminCode(schoolCode, i);
        const pass = generateSafePassword(8);
        const hash = await hashPassword(pass);
        accountsToInsert.push({
          school_id: schoolId,
          user_code: userCode,
          password_hash: hash,
          role: "mudur"
        });
        plainExportList.push({ role: "Müdür / Müdür Yrd.", user_code: userCode, password_plain: pass });
      }

      // Generate Teachers
      for (let i = 1; i <= teacherCount; i++) {
        const userCode = formatTeacherCode(schoolCode, i);
        const pass = generateSafePassword(8);
        const hash = await hashPassword(pass);
        accountsToInsert.push({
          school_id: schoolId,
          user_code: userCode,
          password_hash: hash,
          role: "ogretmen"
        });
        plainExportList.push({ role: "Öğretmen", user_code: userCode, password_plain: pass });
      }

      // Generate PDRs
      for (let i = 1; i <= pdrCount; i++) {
        const userCode = formatPdrCode(schoolCode, i);
        const pass = generateSafePassword(8);
        const hash = await hashPassword(pass);
        accountsToInsert.push({
          school_id: schoolId,
          user_code: userCode,
          password_hash: hash,
          role: "pdr"
        });
        plainExportList.push({ role: "PDR", user_code: userCode, password_plain: pass });
      }

      // Generate Students
      for (let i = 1; i <= studentCount; i++) {
        const userCode = formatStudentCode(schoolCode, i);
        const pass = generateSafePassword(8);
        const hash = await hashPassword(pass);
        accountsToInsert.push({
          school_id: schoolId,
          user_code: userCode,
          password_hash: hash,
          role: "ogrenci"
        });
        plainExportList.push({ role: "Öğrenci", user_code: userCode, password_plain: pass });
      }

      // 4. Batch Insert Accounts into Database (Chunks of 100)
      if (supabase && accountsToInsert.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < accountsToInsert.length; i += chunkSize) {
          const chunk = accountsToInsert.slice(i, i + chunkSize);
          const { error: accountsError } = await supabase
            .from("school_accounts")
            .insert(chunk);

          if (accountsError) throw accountsError;
        }
      }

      // 5. Instantly download plain credentials CSV
      downloadCsv(schoolCode, plainExportList);

      // 6. Set success banner and reset inputs
      setCreatedBannerInfo({ name: schoolName.trim(), code: schoolCode });
      setSchoolName("");
      setStudentCount(50);
      setTeacherCount(10);
      setPdrCount(2);
      setAdminCount(2);

      toast.success(`${schoolCode} kodlu okul ve kullanıcı şifreleri oluşturuldu!`);
      await fetchSchools();
    } catch (err: any) {
      console.error("Okul oluşturulurken hata:", err);
      toast.error("Okul oluşturulamadı: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Critical Reset & Batch Update Workflow
  const handleConfirmReset = async () => {
    if (!schoolToReset) return;
    if (confirmInput.trim().toUpperCase() !== schoolToReset.code.toUpperCase()) {
      toast.error("Doğrulama kodu eşleşmedi. Lütfen okul kodunu tam yazınız.");
      return;
    }

    setIsResetting(true);
    try {
      // 1. Fetch existing accounts for this school
      let existingAccounts: { id: string; user_code: string; role: string }[] = [];

      if (supabase) {
        const { data, error } = await supabase
          .from("school_accounts")
          .select("id, user_code, role")
          .eq("school_id", schoolToReset.id);

        if (error) throw error;
        existingAccounts = data || [];
      }

      // If no accounts exist yet in school_accounts, generate fresh ones according to counts
      if (existingAccounts.length === 0) {
        const adminC = schoolToReset.admin_count || 2;
        const teacherC = schoolToReset.teacher_count || 0;
        const pdrC = schoolToReset.pdr_count || 2;
        const studentC = schoolToReset.student_count || 50;

        const newAccountsToInsert = [];
        const plainExportList: CsvExportItem[] = [];

        for (let i = 1; i <= adminC; i++) {
          const userCode = formatAdminCode(schoolToReset.code, i);
          const pass = generateSafePassword(8);
          const hash = await hashPassword(pass);
          newAccountsToInsert.push({ school_id: schoolToReset.id, user_code: userCode, password_hash: hash, role: "mudur" });
          plainExportList.push({ role: "Müdür / Müdür Yrd.", user_code: userCode, password_plain: pass });
        }
        for (let i = 1; i <= teacherC; i++) {
          const userCode = formatTeacherCode(schoolToReset.code, i);
          const pass = generateSafePassword(8);
          const hash = await hashPassword(pass);
          newAccountsToInsert.push({ school_id: schoolToReset.id, user_code: userCode, password_hash: hash, role: "ogretmen" });
          plainExportList.push({ role: "Öğretmen", user_code: userCode, password_plain: pass });
        }
        for (let i = 1; i <= pdrC; i++) {
          const userCode = formatPdrCode(schoolToReset.code, i);
          const pass = generateSafePassword(8);
          const hash = await hashPassword(pass);
          newAccountsToInsert.push({ school_id: schoolToReset.id, user_code: userCode, password_hash: hash, role: "pdr" });
          plainExportList.push({ role: "PDR", user_code: userCode, password_plain: pass });
        }
        for (let i = 1; i <= studentC; i++) {
          const userCode = formatStudentCode(schoolToReset.code, i);
          const pass = generateSafePassword(8);
          const hash = await hashPassword(pass);
          newAccountsToInsert.push({ school_id: schoolToReset.id, user_code: userCode, password_hash: hash, role: "ogrenci" });
          plainExportList.push({ role: "Öğrenci", user_code: userCode, password_plain: pass });
        }

        if (supabase) {
          const chunkSize = 100;
          for (let i = 0; i < newAccountsToInsert.length; i += chunkSize) {
            const chunk = newAccountsToInsert.slice(i, i + chunkSize);
            await supabase.from("school_accounts").insert(chunk);
          }
        }

        downloadCsv(schoolToReset.code, plainExportList);
      } else {
        // 2. Generate new passwords for each existing account in RAM and batch upsert
        const plainExportList: CsvExportItem[] = [];
        const accountsToUpsert: {
          id: string;
          school_id: string;
          user_code: string;
          password_hash: string;
          role: string;
        }[] = [];

        for (const acc of existingAccounts) {
          const pass = generateSafePassword(8);
          const hash = await hashPassword(pass);

          let roleLabel = "Öğrenci";
          if (acc.role === "pdr") roleLabel = "PDR";
          else if (acc.role === "mudur" || acc.role === "principal") roleLabel = "Müdür / Müdür Yrd.";
          else if (acc.role === "ogretmen" || acc.role === "teacher") roleLabel = "Öğretmen";

          plainExportList.push({
            role: roleLabel,
            user_code: acc.user_code,
            password_plain: pass
          });

          accountsToUpsert.push({
            id: acc.id,
            school_id: schoolToReset.id,
            user_code: acc.user_code,
            password_hash: hash,
            role: acc.role
          });
        }

        // Toplu Güncelleme: 100'erli paketler halinde upsert işlemi
        if (supabase && accountsToUpsert.length > 0) {
          const chunkSize = 100;
          for (let i = 0; i < accountsToUpsert.length; i += chunkSize) {
            const chunk = accountsToUpsert.slice(i, i + chunkSize);
            const { error: upsertErr } = await supabase
              .from("school_accounts")
              .upsert(chunk, { onConflict: "id" });

            if (upsertErr) throw upsertErr;
          }
        }

        // 3. Immediately download CSV
        downloadCsv(schoolToReset.code, plainExportList);
      }

      toast.success(`${schoolToReset.code} için tüm şifreler sıfırlandı ve yeni şifre listesi indirildi!`);
      setSchoolToReset(null);
      setConfirmInput("");
    } catch (err: any) {
      console.error("Şifre sıfırlama hatası:", err);
      toast.error("Şifreler sıfırlanırken hata oluştu: " + (err.message || err));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-slate-50">
      
      {/* Header */}
      <header className="px-6 h-16 flex items-center border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0B132B]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white block">Süper Admin Paneli</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">KOZA Çoklu Okul Yönetimi</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout} 
            className="text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-1.5" /> Çıkış Yap
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-600/10 via-indigo-500/5 to-transparent border border-blue-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Hoş Geldiniz, Süper Admin</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              Bu ekrandan sisteme yeni okullar tanımlayabilir, her okula özel <strong>benzersiz 4 karakterli prefix</strong> ile izole hesaplar üretebilirsiniz. Güvenlik ve KVKK ilkeleri gereğince şifreler veritabanında asla açık metin tutulmaz, yalnızca SHA-256 hash ile saklanır.
            </p>
          </div>
        </div>

        {/* First School Creation Success Notification */}
        {createdBannerInfo && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-start justify-between gap-4 animate-fade-in text-emerald-900 dark:text-emerald-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold text-sm">
                  <span className="font-mono font-bold uppercase tracking-wider underline">{createdBannerInfo.code}</span> kodlu okul ({createdBannerInfo.name}) başarıyla oluşturuldu ve şifre listesi bilgisayarınıza indirildi.
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300/80 leading-relaxed">
                  Bu dosya okul idaresi için <strong>TEK kopyadır</strong>; güvenlik gereği şifreler açık halde tekrar indirilemez. Lütfen dosyayı okul müdürlüğüne iletmek üzere güvenli bir yerde saklayınız.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setCreatedBannerInfo(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-100 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              Kapat
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Create School Form */}
          <Card className="bg-white dark:bg-[#0B132B] border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-1 h-fit rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Yeni Okul Ekle
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Okul adını ve hesap kotalarını belirleyin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSchool} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="schoolName" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Okul Adı</Label>
                  <Input 
                    id="schoolName" 
                    value={schoolName} 
                    onChange={e => setSchoolName(e.target.value)} 
                    placeholder="Örn: Atatürk Anadolu Lisesi" 
                    required 
                    className="h-11 bg-slate-50 dark:bg-[#070D18] border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="studentCount" className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Öğrenci</Label>
                    <Input 
                      id="studentCount" 
                      type="number" 
                      min="0"
                      max="2000"
                      value={studentCount} 
                      onChange={e => setStudentCount(parseInt(e.target.value) || 0)} 
                      placeholder="50"
                      required
                      className="h-11 bg-slate-50 dark:bg-[#070D18] border-slate-200 dark:border-slate-800 text-center font-semibold text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherCount" className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Öğretmen</Label>
                    <Input 
                      id="teacherCount" 
                      type="number" 
                      min="0"
                      max="200"
                      value={teacherCount} 
                      onChange={e => setTeacherCount(parseInt(e.target.value) || 0)} 
                      placeholder="10"
                      required
                      className="h-11 bg-slate-50 dark:bg-[#070D18] border-slate-200 dark:border-slate-800 text-center font-semibold text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pdrCount" className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">PDR</Label>
                    <Input 
                      id="pdrCount" 
                      type="number" 
                      min="0"
                      max="50"
                      value={pdrCount} 
                      onChange={e => setPdrCount(parseInt(e.target.value) || 0)} 
                      placeholder="2"
                      required
                      className="h-11 bg-slate-50 dark:bg-[#070D18] border-slate-200 dark:border-slate-800 text-center font-semibold text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="adminCount" className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">İdare</Label>
                    <Input 
                      id="adminCount" 
                      type="number" 
                      min="0"
                      max="50"
                      value={adminCount} 
                      onChange={e => setAdminCount(parseInt(e.target.value) || 0)} 
                      placeholder="2"
                      required
                      className="h-11 bg-slate-50 dark:bg-[#070D18] border-slate-200 dark:border-slate-800 text-center font-semibold text-sm"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  * İdare kotası <strong>Müdür ve Müdür Yardımcıları</strong> için ayrılacaktır.
                </p>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-blue-600/20"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Okul Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <Building className="mr-2 h-4 w-4" /> Okulu Oluştur ve Şifreleri Üret
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Registered Schools List Area */}
          <Card className="bg-white dark:bg-[#0B132B] border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2 flex flex-col min-h-[500px] rounded-2xl">
            <CardHeader className="pb-4 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <SchoolIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Kayıtlı Okullar ve Hesaplar
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Sistemdeki tüm okullar ve prefix bazlı izolasyon listesi.
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchSchools} 
                disabled={isLoadingSchools}
                className="h-8 text-xs border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingSchools ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
            </CardHeader>

            <CardContent className="flex-1 p-5 overflow-auto">
              {isLoadingSchools ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm">Okul kayıtları yükleniyor...</p>
                </div>
              ) : schools.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-16">
                  <Key className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">Henüz bir okul oluşturulmadı.</p>
                  <p className="text-xs text-slate-500 text-center max-w-sm">
                    Sol taraftaki formu kullanarak ilk okulu ekleyin; öğrenci ve kadro hesapları otomatik olarak üretilecektir.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {schools.map(school => (
                    <div 
                      key={school.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/90 bg-slate-50/50 dark:bg-[#070D18]/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{school.name}</h4>
                          <span className="font-mono font-bold text-xs uppercase px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 tracking-wider">
                            Kod: {school.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(school.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            Öğrenci: {school.student_count || 0}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            Öğretmen: {school.teacher_count || 0}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            PDR: {school.pdr_count || 0}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            İdare: {school.admin_count || 0}
                          </span>
                        </div>
                      </div>

                      {/* Reset Actions & Security Tooltip */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full md:w-auto shrink-0">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 max-w-[220px] leading-tight order-2 sm:order-1">
                          <Info className="w-3.5 h-3.5 shrink-0 text-amber-500/80" />
                          <span>Açık şifreler DB'de tutulmaz; kayıpta yeniden üretilir.</span>
                        </div>
                        <Button 
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSchoolToReset(school);
                            setConfirmInput("");
                          }}
                          className="h-9 px-3.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm shadow-rose-600/20 order-1 sm:order-2 w-full sm:w-auto"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          Şifreleri Sıfırla ve Yeni Liste Üret
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Critical Confirmation Dialog for Resetting Passwords */}
      <Dialog open={!!schoolToReset} onOpenChange={(open) => { if (!open) setSchoolToReset(null); }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#0B132B] border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Tüm Okul Şifrelerini Sıfırla
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 space-y-2 pt-2">
              <span className="block text-rose-600 dark:text-rose-400 font-semibold leading-relaxed">
                DİKKAT: Bu işlem geri alınamaz! Mevcut tüm öğrenci ve idare şifreleri anında geçersiz kılınacak ve yeni şifreler üretilecektir.
              </span>
              <span className="block leading-relaxed">
                Yeni şifre listesi (CSV) yalnızca bu işlem tamamlandığında <strong>TEK SEFERLİK</strong> indirilebilecektir.
              </span>
            </DialogDescription>
          </DialogHeader>

          {schoolToReset && (
            <div className="space-y-3 py-2">
              <div className="p-3 bg-slate-50 dark:bg-[#070D18] rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <p className="font-semibold text-slate-900 dark:text-white">{schoolToReset.name}</p>
                <p className="text-slate-500">
                  Benzersiz Kod: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{schoolToReset.code}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmCode" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Onaylamak için okul kodunu (<span className="font-mono font-bold text-rose-600">{schoolToReset.code}</span>) yazın:
                </Label>
                <Input 
                  id="confirmCode"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
                  placeholder={`Örn: ${schoolToReset.code}`}
                  className="font-mono uppercase tracking-wider text-sm h-10 bg-slate-50 dark:bg-[#070D18]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSchoolToReset(null)}
              disabled={isResetting}
              className="text-xs h-9"
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmReset}
              disabled={isResetting || !schoolToReset || confirmInput.trim().toUpperCase() !== schoolToReset.code.toUpperCase()}
              className="text-xs h-9 font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Sıfırlanıyor ve İndiriliyor...
                </>
              ) : (
                "Evet, Şifreleri Sıfırla ve CSV İndir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
