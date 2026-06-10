import { callGroq } from "./groqClient";

const SUPPORT_PROMPT = `
Sen "Zorbaya Dur" platformunun duyarlı, şefkatli ve profesyonel Yapay Zeka Psikolojik Destek Asistanısın.
Zorbalığa maruz kalan ya da bir zorbalık durumunu bildiren 18 yaş altı bir öğrenciye; durumunu gerçekten anladığını hissettiren, baştan sağma olmayan, detaylı, samimi, güven verici ve çok güzel Türkçe bir destek mesajı yazacaksın.

Aşağıdaki bilgileri kullanarak tamamen bu duruma özel bir mesaj oluştur:
- Bildirilen Zorbalık Türü: {BULLYING_TYPE}
- Bildirilen Olay Özeti: {REPORT_SUMMARY}

Mesajı oluştururken şu kurallara kesinlikle uy:
1. **Empati ve Doğrulama**: Öğrencinin yaşadığı duygusal zorluğu (üzüntü, korku, yalnızlık veya öfke) anladığını belirt. Bu durumu bildirmesinin ne kadar büyük ve cesurca bir adım olduğunu vurgula.
2. **Kişiselleştirme**: Bildirilen zorbalık türüne ve içeriğe göre özel cümleler kur. Örneğin; siber zorbalıksa dijital ortamın getirdiği baskıdan, sözel/akran zorbalığıysa söylenen kelimelerin inciticiliğinden veya sosyal dışlanmanın hissettirdiği yalnızlıktan bahset. Olayın özetindeki detaylara (ör. nerede yaşandığı, ne sıklıkla olduğu veya durumun hissettirdikleri) çok ince, hassas ve doğrudan atıfta bulunarak mesajın tamamen ona özel olduğunu hissettir.
3. **Güven ve Gizlilik**: Seçtiği gizlilik seviyesine ve bu bilgilerin sadece onun iyiliği için değerlendirileceğine değin.
4. **Çözüm Odaklı ve Destekleyici**: Okul rehberlik (PDR) biriminin/öğretmeninin bu durumu çözmek için harekete geçeceğini, yalnız olmadığını ve güvende olduğunu hissettir.
5. **Ton ve Dil**: Sıcak, samimi, şefkatli, yargılamayan ve kucaklayıcı bir dil kullan. Klişe "güçlü ol", "takma kafana" veya "geçer" gibi değersizleştirici ifadeler KESİNLİKLE KULLANMA.
6. **Uzunluk ve Format**: Baştan sağma, tek cümlelik veya 2-3 kelimelik kısa mesajlar olmasın. Okunması kolay, paragraflara bölünmüş, akıcı, toplamda 5 ila 8 cümle arasında (yaklaşık 100-150 kelime) detaylı ve doyurucu bir metin oluştur.
7. **Çıktı Kısıtı**: Sadece öğrenciye iletilecek destek mesajını yaz. Başlangıçta "Merhaba", "Sevgili Öğrenci" gibi ifadeler kullanabilirsin. Mesajın sonuna ekleme yapma, açıklama veya analiz ekleme. Sadece öğrenciye gidecek metni dön.
`;

export function getFallbackMessage(bullyingType: string): string {
  const base = "Zorbaya Dur platformu üzerinden durumunu bizimle paylaştığın ve bu cesur adımı attığın için teşekkür ederiz. ";
  
  let customPart = "";
  const lowerType = bullyingType.toLowerCase();
  
  if (lowerType.includes("fiziksel")) {
    customPart = "Yaşadığın fiziksel zorbalık ve kendini güvende hissetmeme durumunu ciddiyetle ele alıyoruz. Fiziksel güvenliğin ve huzurun bizim için her şeyden önemli. ";
  } else if (lowerType.includes("siber")) {
    customPart = "Dijital platformlarda maruz kaldığın siber zorbalık, dışlama veya rahatsız edilme durumunun seni ne kadar yorduğunun farkındayız. Bu süreçte dijital delilleri (ekran görüntülerini vb.) koruman harika bir adım. ";
  } else if (lowerType.includes("sözel") || lowerType.includes("sozel")) {
    customPart = "Sözel olarak maruz kaldığın kırıcı kelimelerin, hakaretlerin veya alayların sende bıraktığı izleri anlıyoruz. Kimsenin sana bu şekilde hitap etmeye ve seni değersiz hissettirmeye hakkı yok. ";
  } else if (lowerType.includes("sosyal")) {
    customPart = "Sosyal olarak gruptan dışlanmanın, arkandan dedikodu yapılmasının veya yalnız bırakılmanın hissettirdiği üzüntüyü kalpten paylaşıyoruz. Unutma ki senin değerin başkalarının davranışlarıyla ölçülemez. ";
  } else {
    customPart = "Yaşadığın ve seni rahatsız eden bu durumu bizimle paylaşarak çok doğru bir karar verdin. ";
  }

  return (
    base +
    customPart +
    "Bildirimin rehberlik (PDR) birimimize ve ilgili öğretmenlerimize güvenli şekilde ulaştırıldı. Gizlilik tercihlerine tamamen saygı duyarak bu süreci titizlikle takip edeceğiz. Yalnız değilsin, senin yanındayız ve bu durumu birlikte aşacağız. En kısa sürede seninle iletişime geçilecektir."
  );
}

export async function generateSupportMessage(
  bullyingType: string,
  reportSummary: string
): Promise<string> {
  const prompt = SUPPORT_PROMPT
    .replace("{BULLYING_TYPE}", bullyingType)
    .replace("{REPORT_SUMMARY}", reportSummary.slice(0, 300));

  try {
    const text = await callGroq(prompt, { temperature: 0.7 });
    return text.trim();
  } catch (err) {
    console.error("generateSupportMessage failed, using fallback:", err);
    return getFallbackMessage(bullyingType);
  }
}
