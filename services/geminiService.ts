
import { GoogleGenAI, Type } from "@google/genai";
import { Genre, BookMetadata } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Using gemini-3-flash-preview for better stability
const DEFAULT_MODEL = 'gemini-3-flash-preview';

export const analyzeBookContent = async (textSample: string): Promise<BookMetadata> => {
  if (!textSample || textSample.trim().length === 0) {
    throw new Error("Analysis failed: Input text is empty.");
  }

  const prompt = `Analyze this book excerpt and provide metadata in JSON format.
    Text: ${textSample.substring(0, 5000)}`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          author: { type: Type.STRING },
          detectedLanguage: { type: Type.STRING },
          genre: { 
            type: Type.STRING, 
            description: "Choose from: fiction, romance, fantasy, sci-fi, self-help, psychology, business, academic, religious, biography, children" 
          },
          summary: { type: Type.STRING }
        },
        required: ["title", "author", "detectedLanguage", "genre", "summary"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const translateChapter = async (
  text: string, 
  genre: Genre, 
  context: string
): Promise<string> => {
  if (!text || text.trim().length === 0) {
    throw new Error("Translation failed: Chapter text is empty.");
  }

  const systemPrompt = `You are a world-class literary translator specializing in Uzbek.
  Your goal is to translate the following text into natural, fluent Uzbek.
  
  Genre: ${genre}
  Context: ${context}
  
  Guidelines:
  - Avoid literal machine translation feel.
  - Preserve the emotional tone and literary style.
  - Adapt idioms naturally for Uzbek culture.
  - Maintain formatting like dialogues and paragraphs.
  - Write as if the book was originally written in Uzbek.`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [{ role: 'user', parts: [{ text: text }] }],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.7,
    }
  });

  return response.text || "Translation failed.";
};

export const splitIntoChapters = async (fullText: string): Promise<{ title: string; content: string }[]> => {
  if (!fullText || fullText.trim().length === 0) {
    return [];
  }

  // Use a smaller chunk of text for splitting to prevent RPC payload size issues
  const textSample = fullText.substring(0, 30000);
  const prompt = `Split the following book text into logical chapters or parts. Return an array of objects.
    Text: ${textSample}`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING }
          }
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
};
