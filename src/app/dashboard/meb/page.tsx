"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Activity, FileText, Database, ShieldAlert, LogOut, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MOCK_LOGS = [
  {
    id: "LOG-0912",
    date: "2026-05-02T10:30:15",
    action: "Yeni İhbar Kaydı (Şifreli)",
    user: "Sistem Otomasyonu",
    status: "Başarılı"
  },
  {
    id: "LOG-0911",
    date: "2026-05-01T16:45:00",
    action: "YZ Analiz Tamamlandı (Kırmızı Kod)",
    user: "AI Engine",
    status: "Başarılı"
  },
  {
    id: "LOG-0910",
    date: "2026-05-01T16:46:00",
    action: "Acil Durum SMS Gönderimi (Okul Müdürü)",
    user: "Sistem Otomasyonu",
    status: "Başarılı"
  },
  {
    id: "LOG-0909",
    date: "2026-04-30T10:00:00",
    action: "Kimlik Açma Talebi (Yetkisiz)",
    user: "PDR_USER_12",
    status: "Engellendi"
  }
];

export default function MebDashboard() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 text-slate-50">
      <header className="px-6 h-16 flex items-center border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-amber-500" />
          <span className="font-bold text-lg tracking-tight">MEB Denetim Paneli</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
              <LogOut className="h-4 w-4 mr-2" /> Çıkış
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Genel İzleme & Denetim</h1>
          <p className="text-slate-400">Tüm sistem logları ve 48 saatlik eskalasyon takibi bu panelden yönetilir.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Aktif Okul Sayısı</CardTitle>
              <Database className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">1,204</div>
              <p className="text-xs text-slate-500">+12 bu ay eklendi</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Toplam İhbar</CardTitle>
              <FileText className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">45,231</div>
              <p className="text-xs text-slate-500">%100 şifrelenmiş</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Eskalasyon (48s)</CardTitle>
              <Activity className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-500">14</div>
              <p className="text-xs text-slate-500">Birimlere yönlendirildi</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">KVKK İhlali</CardTitle>
              <Shield className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">0</div>
              <p className="text-xs text-slate-500">Sistem güvenli</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900 border-slate-800 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle>Anlık Sistem Logları</CardTitle>
            <CardDescription className="text-slate-400">Sistemdeki tüm işlemler değiştirilemez şekilde (Immutable) kayıt altına alınır.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Tarih/Saat</TableHead>
                  <TableHead className="text-slate-400">Log ID</TableHead>
                  <TableHead className="text-slate-400">Aksiyon</TableHead>
                  <TableHead className="text-slate-400">Aktör</TableHead>
                  <TableHead className="text-right text-slate-400">Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_LOGS.map((log) => (
                  <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="text-slate-300 whitespace-nowrap">{new Date(log.date).toLocaleString('tr-TR')}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{log.id}</TableCell>
                    <TableCell className="text-slate-300 font-medium">{log.action}</TableCell>
                    <TableCell className="text-slate-400">{log.user}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={log.status === "Başarılı" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}>
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
