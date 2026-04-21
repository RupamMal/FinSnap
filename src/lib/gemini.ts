import { GoogleGenAI, Type } from "@google/genai";

// Support both AI Studio environment and standard Vite environment variables for deployment
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || '';
const ai = new GoogleGenAI({ apiKey });

export interface ParsedTransaction {
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  merchant: string;
  date: string;
  description: string;
}

export async function parseTransactionScreenshot(base64Image: string, mimeType: string): Promise<ParsedTransaction[]> {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Analyze this transaction screenshot or document and extract ALL transactions found. For each transaction, extract:
            1. amount (number)
            2. type (one of: 'credit', 'debit') - 'debit' for payments made, 'credit' for money received.
            3. category (string, e.g., Food, Transport, Rent, Shopping, Utilities, etc.)
            4. merchant (string, name of the shop or person paid/received from)
            5. date (ISO format string if possible, otherwise readable date)
            6. description (short summary of what the transaction is)
            
            Return a JSON array of objects matching the schema. If you cannot determine a field, provide a reasonable guess.`
          },
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ['credit', 'debit'] },
            category: { type: Type.STRING },
            merchant: { type: Type.STRING },
            date: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["amount", "type", "category", "merchant", "date"]
        }
      }
    }
  });

  const response = await model;
  const text = response.text;
  if (!text) throw new Error("Could not parse transactions from document");
  
  try {
    return JSON.parse(text) as ParsedTransaction[];
  } catch (e) {
    // Check if it returned a single object instead of an array
    const singleObj = JSON.parse(text) as any;
    if (singleObj && !Array.isArray(singleObj)) {
      return [singleObj as ParsedTransaction];
    }
    throw e;
  }
}
