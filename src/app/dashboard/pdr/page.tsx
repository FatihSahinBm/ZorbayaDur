"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Search, AlertTriangle, CheckCircle2, Clock, EyeOff, Activity, LogOut, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

const MOCK_REPORTS = [
  {
    id: "ZRB-847291",
    date: "2026-05-02T10:30:00",
    category: "Siber Zorbalık",
    content: "Bir grup öğrenci WhatsApp grubunda sürekli benim fotoğrafımla dalga geçip hakaret ediyorlar. Artık okula gelmek istemiyorum, çok kötüyüm.",
    risk: "Kırmızı",
    status: "Yeni",
    timeLeft: "22s 14d",
  },
  {
    id: "ZRB-482103",
    date: "2026-05-01T14:15:00",
    category: "Fiziksel Zorbalık",
    content: "Dün öğle arasında kantin sırasında bir üst sınıftan biri beni itti ve paramı zorla aldı. Kimseye söyleme diye tehdit etti.",
    risk: "Turuncu",
    status: "İnceleniyor",
    timeLeft: "06s 45d",
  },
  {
    id: "ZRB-910283",
    date: "2026-04-30T09:00:00",
    category: "Sözel Zorbalık",
    content: "Sınıftaki arka sıradaki çocuklar sürekli kilomla dalga geçiyorlar.",
    risk: "Sarı",
    status: "Çözüldü",
    timeLeft: "-",
  }
];

export default function PDRDashboard() {
  const [activeTab, setActiveTab] = useState("all");

  const getRiskBadge = (risk: string) => {
    switch(risk) {
      case "Kırmızı": return <Badge className="bg-rose-500 hover:bg-rose-600 text-white animate-pulse"><AlertTriangle className="w-3 h-3 mr-1"/> Kritik Acil</Badge>;
      case "Turuncu": return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Yüksek Risk</Badge>;
      case "Sarı": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Orta Risk</Badge>;
      default: return <Badge variant="outline">Bilinmiyor</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Yeni": return <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">Yeni İhbar</Badge>;
      case "İnceleniyor": return <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 hover:bg-purple-500/20">İnceleniyor</Badge>;
      case "Çözüldü": return <Badge variant="secondary" className="bg-green-500/10 text-green-400 hover:bg-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1"/> Çözüldü</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 text-slate-50">
      <header className="px-6 h-16 flex items-center border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-500" />
          <span className="font-bold text-lg tracking-tight">PDR Paneli</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
            <Activity className="h-4 w-4 text-green-500" /> Yapay Zeka Aktif
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
              <LogOut className="h-4 w-4 mr-2" /> Çıkış
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Vaka Yönetimi</h1>
            <p className="text-slate-400">Gelen anonim ihbarları ve yapay zeka analizlerini buradan takip edin.</p>
          </div>
          <div className="flex gap-4">
            <Card className="bg-slate-900 border-slate-800 flex items-center px-4 py-2 gap-3">
              <div className="bg-rose-500/20 p-2 rounded-full"><AlertTriangle className="h-5 w-5 text-rose-500"/></div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Kırmızı Kod</p>
                <p className="text-2xl font-bold text-white">1</p>
              </div>
            </Card>
            <Card className="bg-slate-900 border-slate-800 flex items-center px-4 py-2 gap-3">
              <div className="bg-amber-500/20 p-2 rounded-full"><Clock className="h-5 w-5 text-amber-500"/></div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Süre Daralıyor</p>
                <p className="text-2xl font-bold text-white">1</p>
              </div>
            </Card>
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-800 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="border-b border-slate-800 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle>Gelen İhbarlar</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input type="search" placeholder="İhbar no ile ara..." className="pl-9 bg-slate-950 border-slate-800 text-white h-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="border-slate-800 hover:bg-slate-900/50">
                  <TableHead className="text-slate-400">İhbar No</TableHead>
                  <TableHead className="text-slate-400">Risk Analizi (YZ)</TableHead>
                  <TableHead className="text-slate-400">Kategori</TableHead>
                  <TableHead className="text-slate-400">Durum</TableHead>
                  <TableHead className="text-slate-400">Kalan Süre (48s)</TableHead>
                  <TableHead className="text-right text-slate-400">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_REPORTS.map((report) => (
                  <TableRow key={report.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-mono font-medium text-slate-300">{report.id}</TableCell>
                    <TableCell>{getRiskBadge(report.risk)}</TableCell>
                    <TableCell className="text-slate-300">{report.category}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      {report.timeLeft !== "-" ? (
                        <div className="flex items-center text-amber-400 text-sm">
                          <Clock className="w-4 h-4 mr-1" /> {report.timeLeft}
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="border-slate-700 bg-slate-950 text-white hover:bg-slate-800">
                        Detay <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
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
