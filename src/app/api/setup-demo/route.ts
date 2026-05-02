import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEMO_REPORTS = [
  {
    tracking_code: "ZRB-847291",
    category: "Siber Zorbalık",
    content: "Bir grup öğrenci WhatsApp grubunda sürekli benim fotoğrafımla dalga geçip hakaret ediyorlar. Artık okula gelmek istemiyorum, çok kötüyüm.",
    risk_level: "Kırmızı",
    status: "Yeni"
  },
  {
    tracking_code: "ZRB-482103",
    category: "Fiziksel Zorbalık",
    content: "Dün öğle arasında kantin sırasında bir üst sınıftan biri beni itti ve paramı zorla aldı. Kimseye söyleme diye tehdit etti.",
    risk_level: "Turuncu",
    status: "İnceleniyor"
  },
  {
    tracking_code: "ZRB-910283",
    category: "Sözel Zorbalık",
    content: "Sınıftaki arka sıradaki çocuklar sürekli kilomla dalga geçiyorlar.",
    risk_level: "Sarı",
    status: "Çözüldü"
  }
];

const DEMO_LOGS = [
  {
    log_id: "LOG-0912",
    action: "Yeni İhbar Kaydı (Şifreli)",
    actor: "Sistem Otomasyonu",
    status: "Başarılı"
  },
  {
    log_id: "LOG-0911",
    action: "YZ Analiz Tamamlandı (Kırmızı Kod)",
    actor: "AI Engine",
    status: "Başarılı"
  },
  {
    log_id: "LOG-0910",
    action: "Acil Durum SMS Gönderimi (Okul Müdürü)",
    actor: "Sistem Otomasyonu",
    status: "Başarılı"
  },
  {
    log_id: "LOG-0909",
    action: "Kimlik Açma Talebi (Yetkisiz)",
    actor: "PDR_USER_12",
    status: "Engellendi"
  }
];

export async function POST() {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase bağlantısı kurulamadı. Lütfen ortam değişkenlerini ayarlayın." }, { status: 500 });
  }

  try {
    // Insert Demo Reports
    const { error: reportsError } = await supabase
      .from('reports')
      .insert(DEMO_REPORTS);

    if (reportsError) throw reportsError;

    // Insert Demo Logs
    const { error: logsError } = await supabase
      .from('audit_logs')
      .insert(DEMO_LOGS);

    if (logsError) throw logsError;

    return NextResponse.json({ success: true, message: "Demo veriler başarıyla veritabanına basıldı!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
