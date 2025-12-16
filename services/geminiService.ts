import { GoogleGenAI } from "@google/genai";
import { IsinEntry, User, TimeFrame } from "../types";

const getPeriodName = (tf: TimeFrame) => {
    switch(tf) {
        case 'day': return 'hoy';
        case 'week': return 'esta semana';
        case 'month': return 'este mes';
        case 'quarter': return 'este trimestre';
        case 'semester': return 'este semestre';
        case 'year': return 'este año';
        default: return '';
    }
};

export const generateAnalysis = async (
    entries: IsinEntry[],
    users: User[],
    timeframe: TimeFrame,
    topUser: User | undefined,
    count: number
): Promise<string> => {
    if (!process.env.API_KEY) {
        return "Clave API no configurada. No se puede generar el análisis.";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Calculate simple metrics for context
    const totalEntries = entries.length;
    const activeUsers = new Set(entries.map(e => e.userId)).size;

    const prompt = `
        Actúa como un analista de productividad motivador para la empresa Ibspot.
        
        Datos actuales (${getPeriodName(timeframe)}):
        - Total productos subidos (ISINs): ${count}
        - Usuario más destacado: ${topUser ? topUser.name : 'Nadie aún'}
        - Total histórico de registros: ${totalEntries}
        - Usuarios activos: ${activeUsers} de ${users.length}

        Escribe un breve resumen analítico (máximo 50 palabras) en español.
        Si el rendimiento es bueno, felicítalos. Si es bajo, anímalos de forma profesional.
        Menciona al usuario destacado si existe.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "No se pudo generar el análisis.";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "Error al conectar con el asistente de IA.";
    }
};