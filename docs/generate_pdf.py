# -*- coding: utf-8 -*-
import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfgen import canvas

# Font Kaydı (Windows varsayılan Arial fontunu kullanarak Türkçe karakter sorununu tamamen çözüyoruz)
try:
    pdfmetrics.registerFont(TTFont('Arial', 'C:\\Windows\\Fonts\\arial.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:\\Windows\\Fonts\\arialbd.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-Italic', 'C:\\Windows\\Fonts\\ariali.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-BoldItalic', 'C:\\Windows\\Fonts\\arialbi.ttf'))
    registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial-Italic', boldItalic='Arial-BoldItalic')
    FONT_NAME = 'Arial'
    FONT_BOLD = 'Arial-Bold'
    FONT_ITALIC = 'Arial-Italic'
except Exception as e:
    print(f"Arial font kaydı başarısız oldu: {e}. Varsayılan Helvetica kullanılacak. Türkçe karakterler bozulabilir.")
    FONT_NAME = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'
    FONT_ITALIC = 'Helvetica-Oblique'

class NumberedCanvas(canvas.Canvas):
    """Her sayfaya dinamik olarak 'Sayfa X / Y' ve Running Header/Footer ekleyen özel Canvas sınıfı"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_elements(num_pages)
            super().showPage()
        super().save()

    def draw_page_elements(self, page_count):
        self.saveState()
        
        # 1. Sayfa (Kapak Sayfası) ise header/footer ekleme
        if self._pageNumber == 1:
            # Arka plan süslemesi (Sol tarafta renkli şerit)
            self.setFillColor(colors.HexColor('#1E3A8A')) # Koyu Mavi
            self.rect(0, 0, 30, 841.89, fill=True, stroke=False)
            self.setFillColor(colors.HexColor('#0D9488')) # Turkuaz
            self.rect(30, 0, 10, 841.89, fill=True, stroke=False)
            self.restoreState()
            return

        # Üst Bilgi (Running Header)
        self.setFont(FONT_NAME, 8)
        self.setFillColor(colors.HexColor('#4B5563')) # Gri
        self.drawString(54, 800, "ZORBAYA DUR — Teknik Sistem Mimarisi ve Yapay Zeka Algoritmaları Raporu")
        
        # Üst Çizgi
        self.setStrokeColor(colors.HexColor('#E5E7EB'))
        self.setLineWidth(0.75)
        self.line(54, 792, 541.27, 792)
        
        # Alt Çizgi
        self.line(54, 55, 541.27, 55)
        
        # Alt Bilgi (Running Footer)
        self.drawString(54, 40, "Gizli & Okul Yönetimi ve Rehberlik Servisi (PDR) Kullanımına Özeldir")
        
        # Sayfa Numarası (Sağa Yaslı)
        page_str = f"Sayfa {self._pageNumber} / {page_count}"
        self.drawRightString(541.27, 40, page_str)
        
        self.restoreState()

def make_callout(text, style, bg_color=colors.HexColor('#F3F4F6'), border_color=colors.HexColor('#E5E7EB')):
    p = Paragraph(text, style)
    t = Table([[p]], colWidths=[480])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_color),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    return t

def make_styled_table(headers, rows, widths=None):
    header_style = ParagraphStyle(
        'HeaderStyle',
        fontName='Arial-Bold',
        fontSize=9.5,
        textColor=colors.white,
        leading=13
    )
    cell_style = ParagraphStyle(
        'CellStyle',
        fontName='Arial',
        fontSize=8.5,
        textColor=colors.HexColor('#1F2937'),
        leading=12
    )
    
    table_data = []
    # Headers
    table_data.append([Paragraph(h, header_style) for h in headers])
    # Rows
    for r in rows:
        table_data.append([Paragraph(str(cell), cell_style) if not isinstance(cell, Paragraph) else cell for cell in r])
        
    t = Table(table_data, colWidths=widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9FAFB')]),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    return t

def build_pdf(filename="ZorbayaDur_Sistem_Mimarisi_ve_Algoritmalar.pdf"):
    # Doküman Ayarları
    # A4: 595.27 x 841.89 pt. 54 pt margin = 0.75 inç.
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=72,
        bottomMargin=72
    )

    # Renk Paleti
    PRIMARY_COLOR = colors.HexColor('#1E3A8A')   # Navy Blue
    SECONDARY_COLOR = colors.HexColor('#0D9488') # Teal
    DARK_TEXT = colors.HexColor('#1F2937')       # Charcoal
    LIGHT_BG = colors.HexColor('#F9FAFB')        # Off-white
    BORDER_COLOR = colors.HexColor('#E5E7EB')    # Light gray
    ACCENT_RED = colors.HexColor('#E11D48')      # Rose/Red for risks
    
    # Stiller
    styles = getSampleStyleSheet()
    
    # Yeni ve benzersiz isimlerle stiller ekliyoruz
    title_style = ParagraphStyle(
        'DocTitle',
        fontName=FONT_BOLD,
        fontSize=24,
        leading=30,
        textColor=PRIMARY_COLOR,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        fontName=FONT_NAME,
        fontSize=12,
        leading=16,
        textColor=SECONDARY_COLOR,
        spaceAfter=40
    )
    
    metadata_style = ParagraphStyle(
        'DocMetadata',
        fontName=FONT_NAME,
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#4B5563'),
        spaceAfter=8
    )
    
    h1_style = ParagraphStyle(
        'DocH1',
        fontName=FONT_BOLD,
        fontSize=15,
        leading=19,
        textColor=PRIMARY_COLOR,
        spaceBefore=20,
        spaceAfter=10,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'DocH2',
        fontName=FONT_BOLD,
        fontSize=12,
        leading=16,
        textColor=SECONDARY_COLOR,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    
    h3_style = ParagraphStyle(
        'DocH3',
        fontName=FONT_BOLD,
        fontSize=10,
        leading=14,
        textColor=DARK_TEXT,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        fontName=FONT_NAME,
        fontSize=9,
        leading=13.5,
        textColor=DARK_TEXT,
        spaceAfter=8
    )
    
    bullet_style = ParagraphStyle(
        'DocBullet',
        fontName=FONT_NAME,
        fontSize=9,
        leading=13.5,
        textColor=DARK_TEXT,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=5
    )
    
    code_style = ParagraphStyle(
        'DocCode',
        fontName=FONT_NAME,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=0
    )
    
    callout_style = ParagraphStyle(
        'DocCallout',
        fontName=FONT_NAME,
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#1E293B')
    )

    story = []

    # --- KAPAK SAYFASI ---
    story.append(Spacer(1, 100))
    story.append(Paragraph("🛑 ZORBAYA DUR", ParagraphStyle('CoverLogo', fontName=FONT_BOLD, fontSize=32, leading=38, textColor=ACCENT_RED, spaceAfter=20)))
    story.append(Paragraph("Sistem Mimarisi, Teknolojik Altyapı ve Yapay Zeka Algoritmaları", title_style))
    story.append(Paragraph("Okullarda Akran Zorbalığını Önleme ve Analiz Platformu Teknik Dokümantasyonu", subtitle_style))
    
    story.append(Spacer(1, 150))
    
    # Kapak Bilgi Kutusu (Table)
    metadata_data = [
        [Paragraph("<b>Hazırlayan:</b> Geliştirici ve Sistem Mimarı Ekibi", metadata_style)],
        [Paragraph("<b>Proje Adı:</b> Zorbaya Dur De (ZorbayaDur)", metadata_style)],
        [Paragraph("<b>Tarih:</b> 30 Haziran 2026", metadata_style)],
        [Paragraph("<b>Sürüm:</b> v1.0.0", metadata_style)],
        [Paragraph("<b>Erişim Seviyesi:</b> PDR, Okul Yönetimi ve MEB Yetkilileri (Gizli)", metadata_style)],
    ]
    metadata_table = Table(metadata_data, colWidths=[380])
    metadata_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 12),
        ('LINELEFT', (0,0), (-1,-1), 4, SECONDARY_COLOR), # Sol kenarda kalın yeşil çizgi
    ]))
    story.append(metadata_table)
    
    story.append(PageBreak())

    # --- İÇİNDEKİLER VE GİRİŞ ---
    story.append(Paragraph("1. Giriş ve Proje Özeti", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph(
        "Akran zorbalığı (peer bullying), okullarda öğrencilerin psikolojik, akademik ve sosyal gelişimlerini son derece "
        "olumsuz etkileyen, kimi zaman fiziksel ve hayati riskler barındıran kritik bir toplumsal sorundur. Öğrenciler "
        "çoğu zaman hedef olma korkusu, dışlanma endişesi veya PDR (Psikolojik Danışmanlık ve Rehberlik) servisine "
        "fiziksel olarak başvurmanın getirdiği damgalanma (stigma) hissi nedeniyle maruz kaldıkları veya tanık oldukları "
        "zorbalıkları bildirmekten çekinmektedirler.", body_style))
        
    story.append(Paragraph(
        "<b>Zorbaya Dur De</b> platformu, bu engelleri aşmak amacıyla geliştirilmiş web tabanlı, uçtan uca güvenli ve yapay zeka "
        "destekli bir akran zorbalığı tespit ve erken uyarı sistemidir. Öğrencilerin tamamen güvenli ve kendi belirledikleri "
        "gizlilik kademelerine uygun olarak (anonim veya kimlik kontrollü) ihbarlar yapabilmelerini sağlar. Eş zamanlı olarak, "
        "sisteme düşen bildirimler gelişmiş yapay zeka modelleri tarafından anlık olarak işlenerek kategorize edilir, risk derecelendirmesi "
        "yapılır ve okul psikolojik danışmanlarına (PDR) eyleme geçirilebilir içgörüler sunulur.", body_style))

    story.append(Paragraph("Platformun 4 Temel Direği:", h2_style))
    story.append(Paragraph("• <b>Gizlilik Güvencesi:</b> Öğrenci kimlik bilgileri istemci tarafında şifrelenir ve kademeli yetkilendirme ile saklanır.", bullet_style))
    story.append(Paragraph("• <b>Anlık Risk Sınıflandırması:</b> AI motoru olay metninden zorbalığın alt türünü ve şiddetini anında tespit eder.", bullet_style))
    story.append(Paragraph("• <b>İlk Empatik Yardım:</b> Bildirim yapan öğrenciye durumun özel detaylarına atıfta bulunan, yapay zeka üretimi empatik ilk destek mesajı gösterilir.", bullet_style))
    story.append(Paragraph("• <b>Sistemik Örüntü Keşfi:</b> Bireysel ihbarlar birleştirilerek okul genelinde zorbalığın yoğunlaştığı fiziksel/dijital sıcak noktalar (hotspots) ve fail/mağdur grupları kümelenerek raporlanır.", bullet_style))

    # --- SİSTEM MİMARİSİ ---
    story.append(Paragraph("2. Sistem Mimarisi", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph(
        "Zorbaya Dur, modern bulut teknolojileri ve sunucusuz (serverless) mimari prensipleri doğrultusunda modüler bir yapıda tasarlanmıştır. "
        "Sistem katmanları, verilerin maksimum gizliliğini ve yapay zeka isteklerinin minimum gecikme süresi ile çalışmasını garanti edecek şekilde bölünmüştür.", body_style))

    # Mimari Tablosu
    mimari_headers = ["Katman", "Kullanılan Teknoloji", "Sorumluluk ve Görev"]
    mimari_rows = [
        ["İstemci (Client)", "Next.js 16 (App Router), TypeScript, Tailwind CSS, Framer Motion", "Kullanıcı arayüzlerinin sunulması, Web Crypto API ile yerel kimlik şifreleme, etkileşimli grafikler."],
        ["API & Sunucu", "Next.js Route Handlers (Edge-ready Node.js/Deno)", "İstemciden gelen istekleri karşılama, veritabanı sorgularını yönetme, Groq API entegrasyonu ve güvenlik doğrulamaları."],
        ["Veritabanı (Database)", "Supabase (PostgreSQL), Row Level Security (RLS)", "İhbar, mesaj ve denetim kayıtlarının saklanması. RLS politikaları ile yetkisiz veritabanı erişimlerinin PostgreSQL seviyesinde engellenmesi."],
        ["AI İşlem Servisi", "Groq API Cloud, Meta Llama-3.1 & Llama-3.3 LLM", "Zorbalık sınıflandırması, aciliyet skoru hesaplama, empatik ilk yanıt üretimi ve 30 günlük veri kümelerinde örüntü algılama."],
    ]
    story.append(make_styled_table(mimari_headers, mimari_rows, widths=[80, 150, 250]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Dosya Yapısı ve Modülerlik:", h2_style))
    story.append(Paragraph(
        "Proje, 'Tek Sorumluluk Prensibi' (Single Responsibility Principle) esas alınarak yapılandırılmıştır. "
        "İstemci bileşenleri (`components`), iş mantığı (`lib`), API yönlendiricileri (`app/api`) ve stil şablonları birbirinden tamamen izoledir. "
        "Yapay zeka işlevleri `src/lib/ai/` klasörü altında her algoritma için ayrı modüller olarak (`bullyingClassifier.ts`, `urgencyAnalysis.ts`, vb.) yazılmıştır. "
        "Bu sayede yarın bir gün kullanılan LLM modeli veya API sağlayıcısı değiştiğinde arayüz kodlarının hiçbirinin etkilenmemesi sağlanmıştır.", body_style))

    story.append(PageBreak())

    # --- TEKNOLOJİK ALTYAPI VE BAĞIMLILIKLAR ---
    story.append(Paragraph("3. Teknolojik Altyapı ve Bağımlılıklar", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph(
        "Projenin teknoloji yığını seçilirken güvenlik, performans, veri bütünlüğü ve hızlı prototipleme hedefleri göz önünde bulundurulmuştur.", body_style))

    story.append(Paragraph("Detaylı Teknoloji Analizi:", h2_style))
    
    story.append(Paragraph("<b>Next.js (React 19 & TypeScript):</b> Projenin frontend ve backend katmanı Next.js ile birleştirilmiştir. Next.js App Router sayesinde sunucu tarafında işlenen (Server Components) güvenli sayfalar ile hızlı istemci etkileşimleri (Client Components) bir arada kullanılmaktadır. TypeScript statik tip kontrolü sunarak kod kalitesini artırır ve çalışma zamanı hatalarını en aza indirir.", body_style))
    
    story.append(Paragraph("<b>Supabase (PostgreSQL BaaS):</b> Açık kaynaklı PostgreSQL veritabanı üzerine kurulu olan Supabase, kullanıcı yönetimi (Auth), gerçek zamanlı veri senkronizasyonu (Realtime) ve dosya depolama (Storage) ihtiyaçlarını karşılar. Veri tutarlılığı ilişkisel model ile korunmaktadır.", body_style))
    
    story.append(Paragraph("<b>Tailwind CSS & Framer Motion:</b> Minimalist, göz yormayan, rehberlik servisine uygun açık ve güven veren renk tonlarına sahip bir arayüz tasarlanmıştır. Framer Motion kütüphanesiyle sayfa geçişlerinde ve form adımlarında mikro animasyonlar kullanılarak kullanıcı deneyimi üst düzeye çıkarılmıştır.", body_style))
    
    story.append(Paragraph("<b>Groq Cloud API:</b> Yapay zeka çıkarımlarının neredeyse anlık (0.5 saniyenin altında) gerçekleşmesi amacıyla Groq altyapısı tercih edilmiştir. Bu sayede öğrenci formu gönderdikten hemen sonra yapay zeka analizi tamamlanır ve gecikme yaşanmadan empatik destek mesajı ekrana basılır.", body_style))

    # --- VERİTABANI MODELİ VE GÜVENLİK ---
    story.append(Paragraph("4. Veritabanı Modeli ve RLS Güvenliği", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph(
        "Sistem veritabanı şeması, PostgreSQL ilişkisel modeli üzerine inşa edilmiştir. "
        "Veritabanı güvenliği, veritabanı motoru seviyesinde <b>Row Level Security (RLS)</b> politikalarıyla sağlanır.", body_style))

    story.append(Paragraph("Veritabanı Tablo Şemaları:", h2_style))
    
    # Reports Tablosu Açıklaması
    story.append(Paragraph("<b>1. reports (İhbarlar Tablosu):</b> Öğrencilerin oluşturduğu tüm ihbarları saklar.", h3_style))
    reports_cols = ["Kolon Adı", "Veri Tipi", "Açıklama"]
    reports_rows = [
        ["id", "UUID (Primary Key)", "Her ihbar için otomatik üretilen benzersiz tanımlayıcı."],
        ["tracking_code", "VARCHAR(20) (Unique)", "Öğrencinin ihbar durumunu sorgulamak için kullandığı takip kodu."],
        ["category", "VARCHAR(100)", "Zorbalık ana türü (Fiziksel, Siber, Sözel, vb.)."],
        ["content", "TEXT", "İhbarın detaylı metin içeriği."],
        ["risk_level", "VARCHAR(20)", "AI tarafından belirlenen risk derecesi (Düşük, Orta, Yüksek, Kritik)."],
        ["status", "VARCHAR(20)", "İhbarın güncel durumu (Yeni, İnceleniyor, Tamamlandı)."],
        ["identity_level", "INTEGER", "Gizlilik kademesi (1: PDR'ye tamamen gizli/anonim, 2: Kademeli açık)."],
        ["encrypted_identity", "TEXT", "İstemcide AES-256 ile şifrelenmiş öğrenci ad, soyad ve sınıf bilgileri."],
        ["location", "TEXT", "Zorbalığın yaşandığı konum (A Blok, Koridor, Spor Salonu, vb.)."],
        ["frequency", "TEXT", "Olayın sıklığı (İlk defa, Haftada birkaç kez, Her gün, vb.)."],
        ["created_at", "TIMESTAMPTZ", "İhbarın oluşturulma zaman damgası."],
    ]
    story.append(make_styled_table(reports_cols, reports_rows, widths=[100, 120, 260]))
    story.append(Spacer(1, 10))

    story.append(PageBreak())

    # Diğer tablolar
    story.append(Paragraph("<b>2. anonymous_messages (Anonim Mesajlaşma Tablosu):</b> Öğrenci ile PDR arasındaki iki yönlü güvenli yazışmaları tutar.", h3_style))
    msg_cols = ["Kolon Adı", "Veri Tipi", "Açıklama"]
    msg_rows = [
        ["id", "UUID (Primary Key)", "Mesajın benzersiz kimliği."],
        ["report_id", "UUID (Foreign Key)", "İlgili ihbar kaydına (reports.id) bağlanan dış anahtar."],
        ["session_token", "TEXT", "Öğrencinin tarayıcısındaki anonim oturum anahtarı. Kimliği açığa çıkarmadan doğrular."],
        ["sender_role", "TEXT", "Mesajı gönderenin rolü ('student' veya 'pdr')."],
        ["content", "TEXT", "Yazışma içeriği."],
        ["created_at", "TIMESTAMPTZ", "Mesajın gönderilme zamanı."],
    ]
    story.append(make_styled_table(msg_cols, msg_rows, widths=[100, 120, 260]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Veritabanı Tetikleyicileri (Triggers):", h2_style))
    story.append(Paragraph(
        "Okul yönetiminin ve MEB denetçilerinin sistem üzerindeki hareketleri, izlenebilirlik ve şeffaflık amacıyla PostgreSQL trigger mekanizmasıyla loglanır. "
        "Örneğin, `reports` tablosundaki bir ihbarın `status` (durum) alanı bir PDR kullanıcısı tarafından güncellendiğinde, "
        "veritabanı düzeyindeki `on_report_status_change` tetikleyicisi otomatik olarak devreye girer. "
        "Bu tetikleyici, `public.log_report_change()` PL/pgSQL fonksiyonunu çalıştırarak `audit_logs` (denetim kayıtları) tablosuna "
        "hangi ihbarın durumunun ne zaman değiştirildiğine dair kriptografik olarak takip edilebilir bir log kaydeder.", body_style))

    # Code block for PL/pgSQL
    trigger_sql = """CREATE OR REPLACE FUNCTION public.log_report_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (log_id, action, actor, status)
    VALUES (
        'LOG-' || floor(random() * 9000 + 1000)::text,
        'İhbar Durumu Güncellendi: ' || NEW.tracking_code,
        'PDR_USER',
        'Başarılı'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;"""
    
    sql_p = Paragraph(trigger_sql.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)
    sql_table = Table([[sql_p]], colWidths=[480])
    sql_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(Paragraph("<b>PL/pgSQL Log Tetikleyici Fonksiyonu:</b>", h3_style))
    story.append(sql_table)
    story.append(Spacer(1, 10))

    story.append(PageBreak())

    # --- YAPAY ZEKA ALGORİTMALARI VE AKIŞLARI ---
    story.append(Paragraph("5. Yapay Zeka Algoritmaları ve Akışları", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph(
        "Platformun temel yeniliği ve zekası, Groq altyapısı üzerinde çalışan özelleştirilmiş 4 ana yapay zeka algoritması modülünden oluşur. "
        "Aşağıda bu algoritmaların girdi parametreleri, prompts şablonları ve çıktı şemaları detaylandırılmıştır.", body_style))

    # 1. Zorbalık Sınıflandırma Algoritması
    story.append(Paragraph("1. Zorbalık Sınıflandırma Algoritması (Bullying Classifier)", h2_style))
    story.append(Paragraph(
        "Öğrencinin girdiği serbest metin halindeki ihbarı Doğal Dil İşleme (NLP) yöntemleriyle analiz eder. "
        "Olayın temel doğasını belirler, böylece PDR uzmanı panelde ihbarları türe göre filtreleyebilir.", body_style))
    
    classifier_callout = """<b>Bullying Classifier Çıktı Şeması (JSON):</b><br/>
• <b>primary_type:</b> "Fiziksel" | "Sözlü" | "Sosyal/İlişkisel" | "Siber" | "Cinsel" | "Karma"<br/>
• <b>secondary_types:</b> Diğer eşlik eden zorbalık türleri (Dizi şeklinde).<br/>
• <b>severity:</b> "Hafif" | "Orta" | "Ağır" | "Çok Ağır" (Şiddet derecesi).<br/>
• <b>is_recurring:</b> Olayın tekrarlayan/süreğen karakterde olup olmadığı (boolean).<br/>
• <b>involves_group:</b> Zorbalığı yapanların bir grup/çete olup olmadığı (boolean).<br/>
• <b>platform_if_cyber:</b> Siber zorbalık ise yaşandığı yer (WhatsApp, Instagram, TikTok, Oyun, Diğer).<br/>
• <b>location_type:</b> "Sınıf" | "Koridor" | "Teneffüs" | "Okul Dışı" | "Online" | "Karma".<br/>
• <b>confidence_score:</b> AI'ın bu karara dair güven skoru (0-100 arası)."""
    
    story.append(make_callout(classifier_callout, callout_style, LIGHT_BG, BORDER_COLOR))
    story.append(Spacer(1, 10))

    # 2. Aciliyet ve Risk Analizi
    story.append(Paragraph("2. Aciliyet ve Risk Analizi (Urgency Analysis)", h2_style))
    story.append(Paragraph(
        "Özellikle fiziksel zarar, kendine zarar verme (intihar eğilimi) veya şiddetli tehdit içeren yüksek riskli durumları "
        "anında filtrelemek ve kırmızı bayrak (red flag) kaldırmak için tasarlanmış bir güvenlik algoritmasıdır.", body_style))
    
    urgency_callout = """<b>Aciliyet Skoru Grubu Değerlendirme Kriterleri:</b><br/>
• <b>80 - 100 (Kritik / Acil):</b> Fiziksel şiddet, intihar iması veya kendine zarar verme tehlikesi içeren vakalar. Sistemsel alarm verilir.<br/>
• <b>60 - 79 (Yüksek):</b> Yoğun psikolojik zarar, sistematik dışlanma veya şantaj. Müdahale süresi maksimum 24 saattir.<br/>
• <b>40 - 59 (Orta):</b> Siber zorbalık, hakaret veya lakap takma. Müdahale süresi bu hafta içindedir.<br/>
• <b>20 - 39 (Düşük):</b> Tek seferlik sürtüşmeler veya hafif sözlü tartışmalar. Planlı takip listesine alınır.<br/>
• <b>0 - 19 (Belirsiz):</b> Anlamsız veya net olmayan ihbarlar."""
    
    story.append(make_callout(urgency_callout, callout_style, LIGHT_BG, BORDER_COLOR))
    story.append(Spacer(1, 10))

    story.append(PageBreak())

    # 3. Empatik Psikolojik Destek Algoritması
    story.append(Paragraph("3. Kişiselleştirilmiş Psikolojik Destek Algoritması (Support Message)", h2_style))
    story.append(Paragraph(
        "Zorbalığı bildiren öğrenciye anında empatik, şefkatli, suçlamayan ve profesyonel bir destek mesajı üretir. "
        "Mesaj, bildirimin içeriğine ve zorbalık türüne özel olarak şekillenir.", body_style))
    
    support_callout = """<b>Algoritma Kuralları:</b><br/>
1. <b>Doğrulama ve Cesaretlendirme:</b> Öğrenciye bu bildirimi yaptığı için teşekkür edilir ve ne kadar büyük bir adım attığı söylenir.<br/>
2. <b>Duruma Özel Atıf:</b> Eğer siber zorbalıksa dijital dünyanın baskısından, sosyal dışlanmaysa yalnızlık hissinden bahsedilir.<br/>
3. <b>Çözüm Güvencesi:</b> PDR biriminin bu konuyla ilgileneceği belirtilerek yalnız olmadığı hissettirilir.<br/>
4. <b>Sağlam Fallback Sistemi:</b> İnternet kesintisi veya Groq API limit aşımı durumlarında sistem çökmek yerine, "getFallbackMessage(bullyingType)" fonksiyonu ile önceden yazılmış, yüksek empati içeren statik şablonları devreye alır."""
    
    story.append(make_callout(support_callout, callout_style, LIGHT_BG, BORDER_COLOR))
    story.append(Spacer(1, 10))

    # 4. Örüntü ve Hotspot Tespiti
    story.append(Paragraph("4. Örüntü ve Sıcak Nokta Tespiti Algoritması (Pattern Detection)", h2_style))
    story.append(Paragraph(
        "Bireysel ihbarların tekil olarak çözülmesinin ötesinde, okul genelindeki kronik sorunları çözmeyi amaçlayan "
        "bir toplu analiz ve veri kümeleme (clustering) algoritmasıdır. Son 30 güne ait tüm anonim bildirimlerin özetlerini alıp "
        "korelasyon analizi yapar.", body_style))
    
    pattern_callout = """<b>Pattern Detection Analiz Çıktıları:</b><br/>
• <b>patterns_found (boolean):</b> Son 30 günde benzer konum, kişi veya yöntemlerle tekrarlayan bir örüntü var mı?<br/>
• <b>hotspot_locations (array):</b> Olayların en sık yaşandığı fiziksel alanlar (örn: 'Arka kantin merdivenleri', 'B Blok soyunma odası').<br/>
• <b>victim_cluster / perpetrator_cluster (boolean):</b> Belirli bir öğrenciye sistematik saldırı ya da belirli bir fail grubunun organize eylemleri tespit edildi mi?<br/>
• <b>suggested_intervention (text):</b> Okul yönetimine veri odaklı proaktif çözüm önerileri (örn: 'Spor salonu arkasındaki nöbetçi öğretmen sayısını artırma', 'A Sınıfı için akran arabuluculuğu semineri düzenleme')."""
    
    story.append(make_callout(pattern_callout, callout_style, LIGHT_BG, BORDER_COLOR))
    story.append(Spacer(1, 10))

    story.append(PageBreak())

    # --- GÜVENLİK VE KRİPTOGRAFİ ---
    story.append(Paragraph("6. Güvenlik ve Kriptografik Kimlik Yönetimi", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph(
        "Platformda öğrencilerin güvenliğini tam olarak sağlamak amacıyla 'Kademeli Kimlik Açıklama' (Graduated Identity Disclosure) "
        "ve yerel şifreleme (client-side cryptography) protokolleri tasarlanmıştır.", body_style))

    story.append(Paragraph("AES-256-CBC Şifreleme Akışı:", h2_style))
    story.append(Paragraph(
        "Öğrenci ihbar formunda kendi adını ve sınıfını belirtmek istediğinde, bu bilgiler sunucuya asla açık metin (cleartext) olarak gitmez. "
        "Tarayıcı içerisinde <b>Web Crypto API</b> kullanılarak şu adımlar yürütülür:", body_style))
        
    story.append(Paragraph("1. <b>Anahtar Türetimi (Key Derivation):</b> Sistemde tanımlı `NEXT_PUBLIC_CRYPTO_KEY` anahtar kelimesi, 32-byte (256-bit) uzunluğa tamamlanarak AES-CBC algoritması için içe aktarılır.", bullet_style))
    story.append(Paragraph("2. <b>IV Oluşturma:</b> Her şifreleme işlemi için benzersiz ve rastgele 16-byte'lık bir Başlangıç Vektörü (Initialization Vector - IV) üretilir.", bullet_style))
    story.append(Paragraph("3. <b>Şifreleme (Encryption):</b> Öğrencinin adı ve sınıfı JSON formatına getirilir (`{name, studentClass}`), ardından AES-CBC modu ile şifrelenir.", bullet_style))
    story.append(Paragraph("4. <b>Birleştirme ve Base64:</b> Üretilen 16-byte IV ve şifreli veri baytları uç uca eklenir. Elde edilen birleşik veri Base64 metnine dönüştürülerek `encrypted_identity` kolonu olarak veritabanına kaydedilir.", bullet_style))

    # Kripto Akış Şeması (Basit tablo olarak)
    flow_headers = ["Aşama", "İşlem Yeri", "Veri Formatı", "Açıklama"]
    flow_rows = [
        ["1. Giriş", "Tarayıcı (Client)", "Açık Metin", "Öğrenci adını ve sınıfını forma yazar."],
        ["2. Şifreleme", "Tarayıcı (Client)", "Base64 (IV + Ciphertext)", "Web Crypto API ile şifrelenir, anahtarı olmayan kimse okuyamaz."],
        ["3. Saklama", "Supabase (Database)", "Şifreli String", "reports tablosundaki encrypted_identity alanında saklanır."],
        ["4. Çözme", "PDR Paneli (Client)", "Açık Metin", "PDR yetkisi ve onayı olduğunda, şifre çözme anahtarı ile tarayıcıda çözülür."],
    ]
    story.append(make_styled_table(flow_headers, flow_rows, widths=[80, 110, 130, 160]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Kademeli Onay Sistemi:", h2_style))
    story.append(Paragraph(
        "Öğrencinin şifrelenmiş kimliği, PDR paneline doğrudan açık olarak düşmez. Öğrenci eğer 'identity_level = 1' seçmişse, "
        "kimlik bilgileri PDR uzmanı için tamamen maskelenmiştir ve çözülemez. Ancak öğrenci rehberlik görüşmesinden sonra veya "
        "mesajlaşma kısmında kimliğini açıklamaya onay verirse (`identity_sharing_approved = true`), şifreli veri PDR ekranındaki "
        "kripto modülü tarafından çözülerek rehberlik servisinin öğrenciye ismiyle ulaşması sağlanır. Bu mekanizma öğrencilere "
        "süreç üzerinde tam bir kontrol ve psikolojik güvenlik hissi vermektedir.", body_style))

    # --- SONUÇ VE GELECEK ÇALIŞMALAR ---
    story.append(Paragraph("7. Sonuç ve Gelecek Yol Haritası", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph(
        "Zorbaya Dur De platformu; Next.js modüler yapısı, Supabase'in güçlü ilişkisel veritabanı ve PostgreSQL RLS koruması, "
        "istemci tarafı AES şifreleme güvenliği ve Groq altyapısının sağladığı yüksek hızlı LLM analiz yetenekleri ile "
        "akran zorbalığıyla mücadelede modern, hızlı ve güvenli bir dijital çözümdür.", body_style))

    story.append(Paragraph("Gelecek Yol Haritası ve Geliştirmeler:", h2_style))
    story.append(Paragraph("• <b>Çoklu Ortam Analizi (Multimodal Evidence Processing):</b> Öğrencilerin kanıt olarak yüklediği ekran görüntülerindeki ( WhatsApp, Instagram yazışmaları vb.) metinleri OCR ve vizyon modelleriyle tarayarak siber zorbalık tespitinin otomatikleştirilmesi.", bullet_style))
    story.append(Paragraph("• <b>Mobil Bildirim Entegrasyonu:</b> Acil durum etiketi alan vakalarda ilgili PDR öğretmenlerine şifreli anlık mobil bildirim (Push Notification) gönderilmesi.", bullet_style))
    story.append(Paragraph("• <b>MEB İl/İlçe Raporlama Modülü:</b> Okullar arası anonim istatistiklerin karşılaştırılarak bölgesel zorbalık haritalarının çıkarılması ve MEB düzeyinde önleyici politikalar oluşturulması.", bullet_style))

    # Doküman Sonu Süslemesi
    story.append(Spacer(1, 40))
    story.append(HRFlowable(width="30%", thickness=1.5, color=SECONDARY_COLOR, hAlign='CENTER'))
    story.append(Spacer(1, 10))
    story.append(Paragraph("RAPORUN SONU", ParagraphStyle('EndDoc', fontName=FONT_BOLD, fontSize=10, textColor=SECONDARY_COLOR, alignment=1)))

    # PDF Oluşturma
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Rapor başarıyla oluşturuldu: {filename}")

if __name__ == "__main__":
    output_pdf = "ZorbayaDur_Sistem_Mimarisi_ve_Algoritmalar.pdf"
    if len(sys.argv) > 1:
        output_pdf = sys.argv[1]
    build_pdf(output_pdf)
