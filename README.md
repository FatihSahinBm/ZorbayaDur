# KOZA 🦋

> **K** – Korkularına teslim olma: Yalnız değilsin; sesini güvenle duyurabileceğin korunaklı bir alandasın.  
> **O** – Omuzundaki yükü paylaş: Tek başına susmak ve taşımak zorunda değilsin; yaşadıklarını güvenle anlatıp yükünü hafiflet.  
> **Z** – Zorda kalana el ver: Akranlarına destek ol; haksızlığa karşı sessiz kalmayarak çözümün parçası ol.  
> **A** – Aydınlığa birlikte kanat aç: Korku ve baskıyı geride bırak; potansiyelini güvenle ve özgürce ortaya çıkar.

**KOZA**, okullarda akran zorbalığını tespit etmek, analiz etmek ve önlemek amacıyla geliştirilmiş akıllı bir bildirim ve koruma platformudur. Gelişmiş yapay zeka (AI) destekli algoritmalar sayesinde öğrencilerin anonim veya açık olarak yaptıkları bildirimleri anında analiz eder, okul yönetimlerine ve rehberlik servislerine eyleme geçirilebilir veriler sunar.

## 🚀 Temel Özellikler ve Yapay Zeka Algoritmaları

Projenin kalbinde, bildirimleri anında işleyen ve dört temel yeteneğe sahip AI motoru bulunmaktadır:

### 1. Zorbalık Sınıflandırma Algoritması (Bullying Classifier)
Bildirilen olayın metnini Doğal Dil İşleme (NLP) ile analiz ederek zorbalığın doğasını detaylıca sınıflandırır:
- **Ana ve Alt Tür Tespiti:** Fiziksel, Sözlü, Sosyal/İlişkisel, Siber veya Cinsel zorbalık türlerini belirler.
- **Şiddet Derecelendirmesi:** Olayın şiddetini (Hafif, Orta, Ağır, Çok Ağır) skorlar.
- **Bağlam Analizi:** Olayın tekrarlayan bir durum olup olmadığını, grup halinde mi yapıldığını, siber zorbalıksa hangi platformda (WhatsApp, Instagram, Oyun vb.) gerçekleştiğini ve fiziksel konumunu (Sınıf, Koridor, Okul Dışı vb.) tespit eder.

### 2. Aciliyet ve Risk Analizi (Urgency Analysis)
Sisteme düşen her yeni bildirim, aciliyet açısından anında değerlendirilir:
- İçerik, zorbalık kategorisi, konum ve sıklık parametreleri kullanılarak **Aciliyet Skoru** ve **Risk Etiketleri** oluşturulur.
- Fiziksel zarar riski, kendine zarar verme ihtimali veya ciddi siber tehditler gibi durumlarda sistem anında "Yüksek Aciliyet" uyarısı verir ve ilgili birimlerin hemen harekete geçmesini sağlar.

### 3. Kişiselleştirilmiş Psikolojik Destek (Support Message Generation)
Bildirimi yapan öğrencinin anlık psikolojik durumunu gözeterek, empatik ve destekleyici bir ilk yardım mesajı üretir:
- Öğrencinin anlattığı olayın bağlamına uygun, yargılamayan ve güven veren özel bir yanıt oluşturulur.
- Öğrenciye yalnız olmadığı ve sorunun çözümü için adımlar atılacağı hissettirilir.

### 4. Örüntü ve Hotspot Tespiti (Pattern Detection)
Bireysel bildirimlerin ötesinde, okul genelindeki büyük resmi görmek için son 30 günlük verileri kümelendirerek (clustering) analiz eder:
- **Hotspot (Riskli Bölge) Tespiti:** Okul içinde zorbalığın en çok hangi bölgelerde (örn: arka koridor, spor salonu arkası) yoğunlaştığını tespit eder.
- **Zaman ve Davranış Örüntüleri:** Belirli günlerde veya saatlerde artan davranışları, mağdur ve zorba gruplaşmalarını analiz ederek raporlar.
- **Müdahale Önerileri:** Tespit edilen örüntülere göre okul yönetimine veri odaklı önleyici stratejiler sunar.

## 🛠️ Kullanılan Teknolojiler

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend/API:** Next.js Route Handlers
- **Veritabanı ve Auth:** Supabase (PostgreSQL)
- **Yapay Zeka (LLM):** Groq API (Hızlı ve güvenilir metin analizi)

## 💻 Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyebilirsiniz:

1. Repoyu klonlayın:
   ```bash
   git clone https://github.com/kullaniciadi/ZorbayaDur.git
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   # veya yarn install / pnpm install
   ```

3. Gerekli ortam değişkenlerini ayarlayın:
   `.env.local` dosyası oluşturup aşağıdaki değişkenleri ekleyin (Gerekli anahtarları ilgili servislerden almalısınız):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GROQ_API_KEY=your_groq_api_key
   ```

4. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```

5. Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresine gidin.
