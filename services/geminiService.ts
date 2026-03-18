
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const processAIPuantaj = async (rawText: string) => {
  try {
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
