
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

/**
 * Helper to summarize large business data to fit within Gemini's token limits
 */
const summarizeBusinessData = (data: any) => {
  if (!data) return null;

  // Deep clone to avoid modifying original data
  const summarized = JSON.parse(JSON.stringify(data));

  // 1. Summarize Puantaj Entries
  if (summarized.systemData?.entries) {
    const entries = summarized.systemData.entries;
    summarized.systemData.entriesSummary = {
      totalCount: entries.length,
      totalAmount: entries.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0),
      byType: entries.reduce((acc: any, e: any) => {
        acc[e.type] = (acc[e.type] || 0) + (Number(e.amount) || 0);
        return acc;
      }, {}),
      // Keep only the most recent 100 entries for context
      recentEntries: entries.slice(0, 100)
    };
    delete summarized.systemData.entries;
  }

  // 2. Summarize Inventory Orders
  if (summarized.systemData?.inventoryOrders) {
    const orders = summarized.systemData.inventoryOrders;
    summarized.systemData.inventoryOrdersSummary = {
      totalCount: orders.length,
      byStatus: orders.reduce((acc: any, o: any) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {}),
      recentOrders: orders.slice(0, 20).map((o: any) => ({
        id: o.id,
        status: o.status,
        createdAt: o.createdAt,
        itemCount: o.details?.length || 0
      }))
    };
    delete summarized.systemData.inventoryOrders;
  }

  // 3. Summarize Accounting Transactions
  if (summarized.systemData?.accTransactions) {
    const txs = summarized.systemData.accTransactions;
    summarized.systemData.accTransactionsSummary = {
      totalCount: txs.length,
      totalAmount: txs.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0),
      byType: txs.reduce((acc: any, t: any) => {
        acc[t.type] = (acc[t.type] || 0) + (Number(t.amount) || 0);
        return acc;
      }, {}),
      recentTransactions: txs.slice(0, 50)
    };
    delete summarized.systemData.accTransactions;
  }

  // 4. Summarize Adisyo Sales by Product (if too many)
  if (summarized.period?.salesByProduct && summarized.period.salesByProduct.length > 100) {
    summarized.period.salesByProduct = summarized.period.salesByProduct.slice(0, 100);
    summarized.period.salesByProductNote = "Sadece en çok satan ilk 100 ürün gösterilmektedir.";
  }

  return summarized;
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

export const parseWeeklyShift = async (rawText: string, weekStart: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Aşağıdaki haftalık shift tablosunu JSON formatına dönüştür. 
      Tablo Metni: "${rawText}"
      Hafta Başlangıç Tarihi: ${weekStart}
      
      KURALLAR:
      1. Tablo metnindeki en üstte yer alan tarih bilgisini (A1 hücresi gibi) GÖRMEZDEN GEL. 
      2. Hafta başlangıcı olarak sana verilen "${weekStart}" tarihini baz al.
      3. Tablo pzt, sal, cars, pers, cuma, cts, pazar günlerini içerir.
      4. Kategoriler (KAPI, ARACI, BAR, 5-K, 8-K) personellerin hangi görevde olduğunu belirtir.
      5. "Aracı" ve "Pazar günü Açılış" yazan shiftler daima 5K ücreti alır.
      6. "Bar" shiftlerinde isminin yanında "8k" yazıyorsa 8K ücreti alır, yazmıyorsa 5K ücreti alır.
      7. "5-K" bölümündeki personeller 5K, "8-K" bölümündekiler 8K ücreti alır.
      8. "KAPI" personelleri varsayılan olarak 8K ücreti alır.
      9. Pazar günü "Açılış [İsim]" şeklinde yazılanlar o isme Pazar günü için Açılış görevi ve 5K shift tanımlar.
      10. Çıktı JSON formatında olmalı ve her gün için o gün çalışan personellerin listesini, görevlerini ve shift tiplerini (5K veya 8K) içermelidir.
      
      JSON Yapısı:
      {
        "weekRange": "${weekStart} haftası",
        "days": {
          "pzt": [{ "name": "Ozi", "role": "KAPI", "shiftType": "8K" }, ...],
          "sal": [...],
          "cars": [...],
          "pers": [...],
          "cuma": [...],
          "cts": [...],
          "pazar": [...]
        }
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weekRange: { type: Type.STRING },
            days: {
              type: Type.OBJECT,
              properties: {
                pzt: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, role: { type: Type.STRING }, shiftType: { type: Type.STRING } } } },
                sal: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, role: { type: Type.STRING }, shiftType: { type: Type.STRING } } } },
                cars: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, role: { type: Type.STRING }, shiftType: { type: Type.STRING } } } },
                pers: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, role: { type: Type.STRING }, shiftType: { type: Type.STRING } } } },
                cuma: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, role: { type: Type.STRING }, shiftType: { type: Type.STRING } } } },
                cts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, role: { type: Type.STRING }, shiftType: { type: Type.STRING } } } },
                pazar: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, role: { type: Type.STRING }, shiftType: { type: Type.STRING } } } }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Shift Parse Error:", error);
    return null;
  }
};

export const analyzeBusinessData = async (businessData: any, trainingNotes: string[] = []) => {
  try {
    const ai = getAI();
    const summarizedData = summarizeBusinessData(businessData);
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
      ${JSON.stringify(summarizedData)}
      
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
    const summarizedData = summarizeBusinessData(businessData);
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
${JSON.stringify(summarizedData)}

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
