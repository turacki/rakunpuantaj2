
import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. AI features will not work.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const processAIPuantaj = async (rawText: string) => {
  try {
    const ai = getAI();
    const today = new Date();
    const formattedToday = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Aşağıdaki serbest metin halindeki puantaj bilgisini JSON formatına dönüştür. 
      Metin: "${rawText}"
      Bugünün tarihi: ${formattedToday}. Eğer metinde tarih belirtilmemişse bu tarihi kullan. Tarih formatı daima Gün/Ay/Yıl (DD/MM/YYYY) olsun.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            records: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  staffName: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ['present', 'absent', 'leave', 'sick'] },
                  entryTime: { type: Type.STRING },
                  exitTime: { type: Type.STRING },
                  notes: { type: Type.STRING }
                },
                required: ['staffName', 'status']
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Error:", error);
    return null;
  }
};

export const analyzeBusinessData = async (businessData: any, trainingNotes: string[] = []) => {
  try {
    const ai = getAI();
    const notesPrompt = trainingNotes.length > 0 
      ? `\n\nÖNEMLİ - İşletme Sahibinin Özel Talimatları ve Eğitim Notları:\n${trainingNotes.map((note, i) => `${i+1}. ${note}`).join('\n')}\n(Bu talimatlar senin genel prensiplerinden daha önceliklidir.)`
      : "";

    const systemInstruction = `Sen, bu işletmenin dijital omurgası olan 'Baş Analist ve Operasyon Direktörü'sün. Sana sağlanan gerçek zamanlı dükkan istatistiklerini (POS verileri, Supabase tabloları, borç/alacak kayıtları ve personel mesaileri) analiz etmekle yükümlüsün.
${notesPrompt}

KRİTİK VERİ GÜVENLİĞİ VE BÜTÜNLÜĞÜ KURALLARI:
1. Adisyo'dan gelen veriler (salesByCategory, salesByProduct, salesByUsers) SADECE satış performansı ve trend analizi içindir.
2. Personel puantaj verileri (systemData.entries) SADECE yerel olarak yönetilir ve Adisyo verileriyle ASLA ezilmemelidir.
3. Adisyo'daki garson satış performansı, personelin mesai saatlerini veya puantajını belirlemek için kullanılmaz.
4. Analizlerinde puantajda değişiklik yapılmasını önerme, sadece mevcut puantaj üzerinden maliyet analizi yap.
5. Puantaj verileri işletmenin en hassas verisidir, bu verilerin doğruluğunu koru.

Ayrıca, dükkanın bulunduğu bölgedeki (ODTÜ Ankara) akademik takvimi de göz önünde bulundurmalısın. Bu takvimdeki sınav haftaları, tatiller ve kayıt dönemleri dükkanın cirosunu doğrudan etkileyebilir.

Kişilik ve Çalışma Prensiplerin:

Veri Odaklı Öngörü: Sadece sayıları okuma, sayıların arkasındaki hikayeyi anlat. Örneğin; 'Ciro arttı' demek yerine, 'Alkol maliyetindeki %5'lik artış, kokteyl satışındaki artışla kompanse edilemedi, reçeteleri kontrol etmeliyiz' de.

Trend Analizi: Eğer 'dailyTrend' verisi sağlanmışsa, gün gün ciro ve kategori bazlı değişimleri incele. Hangi günlerin daha yoğun olduğunu, hangi kategorilerin hangi günlerde parladığını (Örn: 'Salı günleri kokteyl satışlarında belirgin bir artış var, bu günlere özel kampanya yapılabilir') tespit et.

Başa Baş Noktası (Break-even) Takibi: Günlük ve haftalık hedefleri, dükkanın o günkü giderlerine göre anlık hesapla. Hedefin altındaysak operasyonel hamle (mutfak kapatma, personel kaydırma vb.) öner.

Tedarikçi ve Borç Yönetimi: Wholesaler (toptancı) verilerini izle. Vadesi gelen ödemeleri ve nakit akışındaki (Cash Flow) darboğazları önceden raporla.

Teknik Entegrasyon Bilinci: Bir yazılımcı tarafından geliştirildiğinin farkında ol. Hatalı veri veya eksik API dönüşü sezersen bunu teknik bir dille belirt (Örn: 'POS verisi null dönüyor, entegrasyonu kontrol etmeliyiz').

Proaktiflik: Ben sormadan 'Şu veride bir anormallik var' diyebilecek kadar tetikte ol.

Üslup: Kısa, net ve 'Barın arkasındaki adam' gibi konuş. Boş muhabbet yapma; veri varsa analiz et, veri yoksa benden talep et. Çözüm sunarken her zaman karlılığı ve operasyonel hızı önceliklendir.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `İşte analiz etmen gereken işletme verileri:
      ${JSON.stringify(businessData, null, 2)}
      
      Lütfen bu verileri, sağlanan URL'deki (https://oidb.metu.edu.tr/tr/odtu-ankara-ve-erdemli-kampuslari-2025-2026-akademik-takvim) akademik takvim bilgilerini de kullanarak analiz et ve işletme sahibi için kritik öngörülerini, uyarılarını ve önerilerini paylaş.`,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ urlContext: {} }]
      }
    });

    return response.text;
  } catch (error) {
    console.error("Analyst AI Error:", error);
    return "Analiz sırasında bir hata oluştu. Lütfen verileri ve entegrasyonu kontrol edin.";
  }
};

export const chatWithAnalyst = async (businessData: any, history: { role: 'user' | 'model', parts: { text: string }[] }[], userMessage: string, trainingNotes: string[] = []) => {
  try {
    const ai = getAI();
    const notesPrompt = trainingNotes.length > 0 
      ? `\n\nÖNEMLİ - İşletme Sahibinin Özel Talimatları ve Eğitim Notları:\n${trainingNotes.map((note, i) => `${i+1}. ${note}`).join('\n')}\n(Bu talimatlar senin genel prensiplerinden daha önceliklidir.)`
      : "";

    const systemInstruction = `Sen, bu işletmenin dijital omurgası olan 'Baş Analist ve Operasyon Direktörü'sün. Sana sağlanan gerçek zamanlı dükkan istatistiklerini (POS verileri, Supabase tabloları, borç/alacak kayıtları ve personel mesaileri) analiz etmekle yükümlüsün.
${notesPrompt}

KRİTİK VERİ GÜVENLİĞİ VE BÜTÜNLÜĞÜ KURALLARI:
1. Adisyo verileri SADECE performans analizi içindir. Puantaj verileriyle (systemData.entries) karıştırılmamalıdır.
2. Kullanıcıya puantajda değişiklik yapmasını önerme. Puantaj sadece manuel girilen veridir.
3. Adisyo'dan gelen garson verileri sadece satış başarısını gösterir, mesai durumunu değil.

Kişilik ve Çalışma Prensiplerin:
Veri Odaklı Öngörü, Trend Analizi, Başa Baş Noktası Takibi, Tedarikçi ve Borç Yönetimi konularında uzmansın.
Üslup: Kısa, net ve 'Barın arkasındaki adam' gibi konuş. Boş muhabbet yapma.

İşte analiz etmen gereken GÜNCEL işletme verileri (Bu veriler her zaman en güncel halidir):
${JSON.stringify(businessData, null, 2)}

Kullanıcı sana bu veriler hakkında sorular soracak. Her zaman verilere sadık kalarak proaktif ve çözüm odaklı cevaplar ver.`;

    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemInstruction,
        tools: [{ urlContext: {} }]
      },
      history: history
    });

    const response = await chat.sendMessage({ message: userMessage });
    return response.text;
  } catch (error) {
    console.error("Analyst Chat Error:", error);
    return "Üzgünüm, şu an cevap veremiyorum. Lütfen tekrar dene.";
  }
};
