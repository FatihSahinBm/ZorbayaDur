-- ============================================================================
-- MIGRATION: PDR-APPROVED SUPPORT MESSAGE TEMPLATES
-- Created: 2026-06-30
-- ============================================================================

-- 1. Create public.support_message_templates table
CREATE TABLE IF NOT EXISTS public.support_message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bullying_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    template_text TEXT NOT NULL,
    status TEXT CHECK (status IN ('taslak', 'onaylı')) DEFAULT 'taslak',
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial templates so that we have approved templates in database for tests/fallback
INSERT INTO public.support_message_templates (bullying_type, severity, template_text, status, version) VALUES
-- Fiziksel Zorbalık
('Fiziksel Zorbalık', 'Hafif', 'Yaşadığın bu fiziksel olayı paylaştığın için teşekkürler. Güvendesin ve yalnız değilsin. Okul yönetimi ve PDR birimi durumun tekrarlanmaması için yanındadır.', 'onaylı', 1),
('Fiziksel Zorbalık', 'Orta', 'Yaşadığın bu incitici fiziksel davranışı ciddiye alıyoruz. Okul rehberlik servisimiz senin güvenliğini sağlamak için hemen harekete geçecektir.', 'onaylı', 1),
('Fiziksel Zorbalık', 'Ağır', 'Sana yönelik bu kabul edilemez fiziksel müdahaleyi en üst düzeyde önemsiyoruz. Lütfen yalnız olmadığını ve okul yönetimi ile PDR servisinin seninle olduğunu unutma.', 'onaylı', 1),
('Fiziksel Zorbalık', 'Çok Ağır', 'Fiziksel bütünlüğüne ve güvenliğine yönelik bu çok ağır durumu en hızlı şekilde çözmek için okul PDR birimi ve yönetimi acil destek planı başlatmıştır. Yanındayız.', 'onaylı', 1),

-- Sözel Zorbalık
('Sözel Zorbalık', 'Hafif', 'Sana söylenen kırıcı sözleri bizimle paylaştığın için teşekkürler. Kimsenin seni incitmesine izin vermeyeceğiz. Rehberlik servisimiz seninle görüşecektir.', 'onaylı', 1),
('Sözel Zorbalık', 'Orta', 'Sözel olarak maruz kaldığın bu kötü lakap ve ithamların seni üzmesini çok iyi anlıyoruz. Okul PDR birimi olarak bu akran baskısını çözmek için yanındayız.', 'onaylı', 1),
('Sözel Zorbalık', 'Ağır', 'Maruz kaldığın bu ağır sözel hakaretler ve dışlama kabul edilemez. Güvenliğin ve psikososyal desteğin için rehberlik servisimiz en kısa sürede seninle olacaktır.', 'onaylı', 1),
('Sözel Zorbalık', 'Çok Ağır', 'Sözel şiddetin en ağır boyutlarını içeren bu durum için okul rehberlik birimi ve disiplin komisyonu acil takibe geçmiştir. Yalnız değilsin.', 'onaylı', 1),

-- Siber Zorbalık
('Siber Zorbalık', 'Hafif', 'Sosyal medyada/dijital alanda seni üzen bu durumu paylaştığın için teşekkürler. Lütfen ekran görüntülerini sakla, okul rehberlik servisi sana destek olacaktır.', 'onaylı', 1),
('Siber Zorbalık', 'Orta', 'İnternet ortamında maruz kaldığın bu organize rahatsız edici mesajları ciddiye alıyoruz. PDR uzmanlarımız dijital güvenliğini koruman için sana rehberlik edecektir.', 'onaylı', 1),
('Siber Zorbalık', 'Ağır', 'Siber zorbalığın bu yıpratıcı ve ağır boyutlarını paylaştığın için teşekkürler. Okul yönetimi ve PDR servisi, ilgili kişiler hakkında yasal ve idari süreçleri başlatacaktır.', 'onaylı', 1),
('Siber Zorbalık', 'Çok Ağır', 'Dijital platformlarda maruz kaldığın bu çok ağır ve sistematik baskıya karşı PDR uzmanlarımız ve okul bilişim/yönetim ekibi acil engelleme ve destek adımları atmaktadır.', 'onaylı', 1),

-- Sosyal Zorbalık
('Sosyal Zorbalık', 'Hafif', 'Gruptan dışlanma veya yalnız bırakılma hissini bizimle paylaştığın için teşekkürler. PDR öğretmenlerimiz sınıf içi uyum etkinlikleri ile sana destek olacaktır.', 'onaylı', 1),
('Sosyal Zorbalık', 'Orta', 'Arkandan yayılan asılsız dedikoduların ve dışlanmanın seni ne kadar yorduğunun farkındayız. Rehberlik birimimiz bu akran dışlamasını çözmek için yanındadır.', 'onaylı', 1),
('Sosyal Zorbalık', 'Ağır', 'Sistematik ve organize bir şekilde yürütülen bu ağır akran dışlaması ve sosyal zorbalığı çözmek için rehberlik servisimiz sınıf düzeyinde müdahalelere başlayacaktır.', 'onaylı', 1),
('Sosyal Zorbalık', 'Çok Ağır', 'Gruptan tamamen tecrit edilmene yönelik bu çok ağır psikososyal baskı durumunda, okul PDR birimi ve sınıf rehber öğretmenleri senin için özel bir destek planı uygulamaktadır.', 'onaylı', 1),

-- Diğer
('Diğer', 'Hafif', 'Yaşadığın ve seni rahatsız eden bu durumu bizimle paylaştığın için teşekkürler. Rehberlik öğretmenlerimiz en kısa sürede seninle görüşecektir.', 'onaylı', 1),
('Diğer', 'Orta', 'Güvenliğini ve huzurunu bozan bu akran baskısı durumunu ciddiye alıyoruz. Okul PDR birimimiz durumun incelenmesi için seninle iletişime geçecektir.', 'onaylı', 1),
('Diğer', 'Ağır', 'Seni derinden etkileyen bu ağır durumu paylaştığın için teşekkürler. Okul yönetimi ve rehberlik servisi tüm imkanlarıyla senin yanındadır.', 'onaylı', 1),
('Diğer', 'Çok Ağır', 'Okuldaki güvenliğini doğrudan tehdit eden bu çok ağır durum için PDR uzmanlarımız ve okul yönetimi acil koruyucu ve destekleyici eylem planı başlatmıştır.', 'onaylı', 1)
ON CONFLICT DO NOTHING;

-- Enable RLS on templates
ALTER TABLE public.support_message_templates ENABLE ROW LEVEL SECURITY;

-- Allow select to everyone (or authenticated) so that generation route can query approved templates
DROP POLICY IF EXISTS "Allow select approved templates" ON public.support_message_templates;
CREATE POLICY "Allow select approved templates" ON public.support_message_templates
    FOR SELECT TO public
    USING (status = 'onaylı');

-- Full write access for PDR
DROP POLICY IF EXISTS "Allow PDR full access to templates" ON public.support_message_templates;
CREATE POLICY "Allow PDR full access to templates" ON public.support_message_templates
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'pdr');
