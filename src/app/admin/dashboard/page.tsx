"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, LogOut, Loader2, Download, Building, Key, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Define the shape of our generated users
interface SchoolUser {
  username: string;
  password_plain: string;
  role: string;
  full_name: string;
  student_number: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form States
  const [schoolName, setSchoolName] = useState("");
  const [studentCount, setStudentCount] = useState<number>(0);
  const [pdrCount, setPdrCount] = useState<number>(0);
  const [principalCount, setPrincipalCount] = useState<number>(0);

  // Result States
  const [generatedSchool, setGeneratedSchool] = useState<any>(null);
  const [generatedUsers, setGeneratedUsers] = useState<SchoolUser[]>([]);

  useEffect(() => {
    // Basic auth check
    const role = localStorage.getItem("role");
    if (role !== "superadmin") {
      router.push("/login");
    }
  }, [router]);

  const generateRandomCode = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    if (!schoolName.trim()) {
      toast.error("Lütfen bir okul adı girin.");
      return;
    }
    if (studentCount <= 0 && pdrCount <= 0 && principalCount <= 0) {
      toast.error("En az bir kişi (öğrenci, PDR veya müdür) oluşturmalısınız.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Generate School Code
      const schoolCode = generateRandomCode(4);

      // 2. Insert School
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .insert([{
          name: schoolName,
          school_code: schoolCode,
          student_count: studentCount,
          pdr_count: pdrCount,
          principal_count: principalCount
        }])
        .select()
        .single();

      if (schoolError) throw schoolError;

      // 3. Generate Users
      const usersToInsert = [];
      const displayUsers: SchoolUser[] = [];

      // Generate Principals
      for (let i = 1; i <= principalCount; i++) {
        const username = `${schoolCode}-MDR-${i.toString().padStart(2, '0')}`;
        const pass = generateRandomPassword();
        usersToInsert.push({
          school_id: schoolData.id,
          username,
          password_plain: pass,
          role: 'principal',
          full_name: '',
          student_number: ''
        });
        displayUsers.push({ username, password_plain: pass, role: 'Müdür', full_name: '', student_number: '' });
      }

      // Generate PDRs
      for (let i = 1; i <= pdrCount; i++) {
        const username = `${schoolCode}-PDR-${i.toString().padStart(2, '0')}`;
        const pass = generateRandomPassword();
        usersToInsert.push({
          school_id: schoolData.id,
          username,
          password_plain: pass,
          role: 'pdr',
          full_name: '',
          student_number: ''
        });
        displayUsers.push({ username, password_plain: pass, role: 'PDR', full_name: '', student_number: '' });
      }

      // Generate Students
      for (let i = 1; i <= studentCount; i++) {
        const username = `${schoolCode}-${i.toString().padStart(3, '0')}`;
        const pass = generateRandomPassword();
        usersToInsert.push({
          school_id: schoolData.id,
          username,
          password_plain: pass,
          role: 'student',
          full_name: '',
          student_number: ''
        });
        displayUsers.push({ username, password_plain: pass, role: 'Öğrenci', full_name: '', student_number: '' });
      }

      // 4. Insert Users
      if (usersToInsert.length > 0) {
        const { error: usersError } = await supabase
          .from("school_users")
          .insert(usersToInsert);

        if (usersError) throw usersError;
      }

      setGeneratedSchool(schoolData);
      setGeneratedUsers(displayUsers);
      toast.success("Okul ve kullanıcılar başarıyla oluşturuldu.");
      
      // Reset form
      setSchoolName("");
      setStudentCount(0);
      setPdrCount(0);
      setPrincipalCount(0);

    } catch (error: any) {
      toast.error("Oluşturma hatası: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadCsv = () => {
    if (generatedUsers.length === 0 || !generatedSchool) return;

    // CSV Header (BOM included for Excel UTF-8 support)
    const BOM = "\uFEFF";
    let csvContent = BOM + "Rol,Kullanici Kodu,Sifre,Ad Soyad,Okul No\n";

    generatedUsers.forEach(u => {
      // Empty fields are intentionally left blank for physical distribution
      csvContent += `${u.role},${u.username},${u.password_plain},,\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${generatedSchool.school_code}_kullanici_listesi.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = () => {
    localStorage.removeItem("role");
    router.push("/login");
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      
      {/* Header */}
      <header className="px-6 h-16 flex items-center border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-indigo-500" />
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Süper Admin Paneli</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <LogOut className="h-4 w-4 mr-1" /> Çıkış Yap
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Hoş Geldiniz, Süper Admin</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Bu ekrandan sisteme yeni okullar ekleyebilir, bu okullar için otomatik öğrenci ve idari kadro hesapları (kod/şifre) oluşturabilirsiniz. Oluşturduğunuz listeleri Excel (CSV) olarak indirip okullara dağıtımını sağlayabilirsiniz.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Form */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-1 h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-500" />
                Yeni Okul Ekle
              </CardTitle>
              <CardDescription className="text-xs">
                Okul bilgilerini ve kişi sayılarını girin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSchool} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="schoolName" className="text-xs font-bold text-slate-500 uppercase">Okul Adı</Label>
                  <Input 
                    id="schoolName" 
                    value={schoolName} 
                    onChange={e => setSchoolName(e.target.value)} 
                    placeholder="Örn: Atatürk İlkokulu" 
                    className="bg-slate-50 dark:bg-slate-950" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="studentCount" className="text-xs font-bold text-slate-500 uppercase">Öğrenci Sayısı</Label>
                    <Input 
                      id="studentCount" 
                      type="number" 
                      min="0"
                      value={studentCount} 
                      onChange={e => setStudentCount(Number(e.target.value))} 
                      className="bg-slate-50 dark:bg-slate-950" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pdrCount" className="text-xs font-bold text-slate-500 uppercase">PDR Sayısı</Label>
                    <Input 
                      id="pdrCount" 
                      type="number" 
                      min="0"
                      value={pdrCount} 
                      onChange={e => setPdrCount(Number(e.target.value))} 
                      className="bg-slate-50 dark:bg-slate-950" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="principalCount" className="text-xs font-bold text-slate-500 uppercase">Müdür Sayısı</Label>
                  <Input 
                    id="principalCount" 
                    type="number" 
                    min="0"
                    value={principalCount} 
                    onChange={e => setPrincipalCount(Number(e.target.value))} 
                    className="bg-slate-50 dark:bg-slate-950" 
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Okulu Oluştur ve Şifreleri Üret
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results Area */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2 flex flex-col h-[500px]">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-500" />
                  Üretilen Hesaplar
                </CardTitle>
                <CardDescription className="text-xs">
                  {generatedSchool ? `${generatedSchool.name} (Kod: ${generatedSchool.school_code}) için üretilen listeler` : 'Henüz bir okul oluşturulmadı.'}
                </CardDescription>
              </div>
              {generatedUsers.length > 0 && (
                <Button onClick={handleDownloadCsv} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Download className="w-4 h-4 mr-2" /> Excel (CSV) İndir
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950/50 rounded-b-xl border-t border-slate-100 dark:border-slate-800 p-0">
              {generatedUsers.length > 0 ? (
                <div className="min-w-full inline-block align-middle">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Öğrenci/Kullanıcı Kodu</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Şifre</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ad Soyad (Boş)</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Okul No (Boş)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {generatedUsers.map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-2 text-xs whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-md font-medium text-[10px] uppercase ${
                              u.role === 'Öğrenci' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              u.role === 'PDR' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{u.username}</td>
                          <td className="px-4 py-2 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">{u.password_plain}</td>
                          <td className="px-4 py-2 text-xs text-slate-400 italic whitespace-nowrap">Boş Bırakıldı</td>
                          <td className="px-4 py-2 text-xs text-slate-400 italic whitespace-nowrap">Boş Bırakıldı</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <Key className="w-12 h-12 opacity-20" />
                  <p className="text-sm">Hesaplar oluşturulduğunda burada listelenecektir.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
