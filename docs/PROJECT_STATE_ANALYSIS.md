# KOZA (Önceki Adıyla ZorbayaDur) — Proje Durum ve Mimari Analizi

Bu belge, projenin mevcut teknik durumunu, mimarisini, güvenlik protokollerini, yapay zeka altyapısını ve test kapsamını detaylı olarak belgelemektedir.

---

## 1. Projenin Amacı ve Vizyonu
Proje, okullarda akran zorbalığını önlemek, öğrencilerin güven içinde seslerini duyurabilmelerini sağlamak ve okul yönetimi / rehberlik birimlerine (PDR) veri odaklı, erken müdahale imkanı sunmak amacıyla geliştirilmiş akıllı bir bildirim, analiz ve kriz yönetim platformudur.

---

## 2. Teknoloji Yığını (Tech Stack)
- **Frontend & Web Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Stil & Tasarım:** Tailwind CSS v4, Radix/Base UI bileşenleri (`shadcn/ui`), Lucide Icons, Framer Motion, Dark/Light Mode (`next-themes`)
- **Veritabanı & Kimlik:** Supabase (PostgreSQL), Row-Level Security (RLS), PGCrypto uzantısı
- **Yapay Zeka (NLP & LLM):** Groq API (Llama-3 modelleri) ile anlık zorbalık sınıflandırması, aciliyet skoru üretimi, empatik destek mesajı oluşturma ve örüntü analizi
- **Grafik & Görselleştirme:** Recharts (Zorbalık türleri, zaman dağılımı, hotspot analizleri)
- **Test Altyapısı:** Vitest (Birim, entegrasyon ve PII sanitization güvenlik testleri)

---

## 3. Sayfalar ve Kullanıcı Akışları
1. **`/` (Landing Page):**
   - Modern, animasyonlu tanıtım sayfası.
   - Çift kör anonimlik, yapay zeka risk analizi ve 48 saat şeffaflık kuralı özellikleri.
   - KOZA manifestosu ve akronim kartları.
   - Hızlı bildirim butonları ve giriş bağlantısı.
2. **`/login` (Giriş Portalı):**
   - Öğrenci no veya e-posta ile giriş.
   - Rol bazlı yetkilendirme ve otomatik yönlendirme (Öğrenci -> Dashboard, Öğretmen/Rehberlik -> Yönetim, Yönetici -> Özet Panel).
3. **`/report` (İhbar / Bildirim Ekranı):**
   - Çok adımlı interaktif form: Olay türü, konum (sınıf, kantin, koridor, okul dışı, siber vb.), şiddet, sıklık, kanıt yükleme.
   - Uçtan uca şifreleme ve anonim bildirim seçeneği.
   - Gönderim anında anlık AI analizi ve öğrenciye kişiselleştirilmiş ilk yardım psikolojik destek mesajı.
4. **`/dashboard` (Öğrenci Paneli):**
   - Öğrencinin daha önce gönderdiği bildirimlerin durumunu (İnceleniyor, Rehberlikte, Çözüldü vb.) takip edebildiği panel.
   - Anonim mesajlaşma kanalı (Öğrenci kimliğini açığa çıkarmadan rehberlikle güvenli yazışabilir).
5. **`/yonetim` (Rehberlik / Okul Yönetimi Paneli):**
   - İhbar listesi, gelişmiş filtreleme (aciliyet, tür, durum, tarih).
   - Çift kör kimlik çözme modali (`DecryptedIdentityView` - sadece kırmızı kod veya resmi kriz izniyle).
   - Müdahale şablonları (`migration_support_templates.sql`) ve vaka kapatma/yönlendirme.
6. **`/yonetici/ozet-panel` (Üst Yönetim & MEB Paneli):**
   - Okul geneli risk seviyeleri, hotspot haritası (en çok vaka görülen noktalar), zamansal örüntüler ve erken uyarı sistemi.
7. **`/istatistikler` (Kamu Bilgilendirme Sayfası):**
   - Şeffaf ve anonimleştirilmiş genel sayaçlar (toplam çözülen vaka, sesini duyuran öğrenci sayısı, bilinçlendirme grafikleri).

---

## 4. Güvenlik, Gizlilik ve Uyumluluk Standartları
- **Çift Kör Anonimlik (Double-Blind Anonymity):**
  - Öğrenci kimlikleri veritabanında `pgp_sym_encrypt` ile kriptografik olarak şifrelenir.
  - Normal koşullarda okul yöneticisi veya PDR öğretmeni dahil hiç kimse bildirimi yapan öğrencinin gerçek kimliğini göremez.
  - Sadece "Kırmızı Kod" (hayati risk, ağır tehdit) durumunda resmi tutanak ve audit log kaydıyla çözülebilir.
- **PII Sanitization (Kişisel Veri Temizleyici):**
  - Bildirim metni LLM'e (Groq API) gönderilmeden önce regex tabanlı filtrelerle TC Kimlik No, telefon, isim, e-posta gibi hassas verilerden arındırılır.
- **48 Saat Kuralı ve Eskalasyon:**
  - Acil olarak işaretlenen vakalarda 48 saat içinde aksiyon alınmazsa sistem otomatik olarak üst mercilere ve MEB sistemine eskalasyon bildirimi oluşturur.
- **Parola ve Oturum Politikası:**
  - Süresi dolan şifreler, minimum karmaşıklık kontrolleri ve brute-force koruması mevcuttur.

---

## 5. Test ve Kalite Durumu
- Vitest test paketinde 7 test dosyasında toplam 48 test bulunmakta ve tümü yeşil olarak geçmektedir.

---

## 6. Yeni Marka ve Dönüşüm: KOZA
- **K – Korkularına teslim olma:** Yalnız değilsin; sesini güvenle duyurabileceğin korunaklı bir alandasın.
- **O – Omuzundaki yükü paylaş:** Tek başına susmak ve taşımak zorunda değilsin; yaşadıklarını güvenle anlatıp yükünü hafiflet.
- **Z – Zorda kalana el ver:** Akranlarına destek ol; haksızlığa karşı sessiz kalmayarak çözümün parçası ol.
- **A – Aydınlığa birlikte kanat aç:** Korku ve baskıyı geride bırak; potansiyelini güvenle ve özgürce ortaya çıkar.
