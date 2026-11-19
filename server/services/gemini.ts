import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { config } from '../config.ts';
import { GeminiExtractionResult, ReceiptCategory } from '../../shared/types.ts';

let aiClient: GoogleGenAI | null = null;
const FALLBACK_MODEL = 'gemini-3.5-flash';

function resolveMimeType(filePath: string, mimeType?: string): string {
  if (mimeType && mimeType.startsWith('image/') && mimeType !== 'image/jpg') {
    return mimeType;
  }
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.heic' || ext === '.heif') return 'image/heic';
  return 'image/jpeg';
}

function getAiClient(): GoogleGenAI {
  const apiKey = (config.geminiApiKey || process.env.gemini_api_key || process.env.GEMINI_API_KEY)?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please check your environment variables or Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
  });
}

/**
 * Normalizes dates, specifically converting Thai Buddhist Era (พ.ศ.) to Common Era (ค.ศ.)
 * e.g. 2569 -> 2026, 2568 -> 2025, 2567 -> 2024
 */
export function normalizeDate(rawDate?: string): string {
  if (!rawDate) {
    return new Date().toISOString().split('T')[0];
  }

  const clean = rawDate.trim();

  // Match YYYY-MM-DD or DD/MM/YYYY or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    if (year > 2400) {
      year -= 543; // Buddhist Era conversion
    }
    return `${year}-${month}-${day}`;
  }

  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) {
      year += 2000;
    }
    if (year > 2400) {
      year -= 543;
    }
    return `${year}-${month}-${day}`;
  }

  // Fallback: test Date parser
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    let year = parsed.getFullYear();
    if (year > 2400) year -= 543;
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split('T')[0];
}

export function validateReceiptMath(extracted: GeminiExtractionResult): {
  isBalanced: boolean;
  itemSum: number;
  grandTotal: number;
  difference: number;
} {
  const itemSum = extracted.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const grandTotal = Number(extracted.total) || 0;
  const difference = Math.round(Math.abs(itemSum - grandTotal) * 100) / 100;
  // Consider balanced if difference is negligible or items + tax - discount matches total
  const isBalanced = difference <= 1.0;
  return {
    isBalanced,
    itemSum: Math.round(itemSum * 100) / 100,
    grandTotal,
    difference,
  };
}

export async function extractReceiptData(
  filePath: string,
  mimeType: string
): Promise<GeminiExtractionResult> {
  const ai = getAiClient();
  const fileBuffer = await fs.promises.readFile(filePath);
  const base64Data = fileBuffer.toString('base64');
  const resolvedMime = resolveMimeType(filePath, mimeType);

  const systemInstruction = `You are an expert bilingual (Thai and English) Receipt OCR and Financial Extraction Specialist.
Analyze the provided receipt/invoice image meticulously.
Extract all details strictly into the requested JSON schema.
Special Instructions for Thai Receipts:
1. Thai Buddhist Era (พ.ศ.): If the year is written in Buddhist Era (e.g., 2569, 2568, 2567, 2566), convert it to Common Era (ค.ศ.) by subtracting 543 (e.g., 2569 -> 2026, 2568 -> 2025, 2567 -> 2024). Date format MUST be YYYY-MM-DD.
2. Thai Text & Merchants: Correctly read Thai and English merchant names (e.g. 7-Eleven, Lotus's, Big C, Makro, Cafe Amazon, Starbucks, Grab, Lineman, BTS, MRT, Shopee, True, AIS).
3. Line Items: Extract each individual purchased item with its accurate name in Thai or English, quantity, unit price, and line item total.
4. Financials: Accurately identify subtotal, VAT 7% (tax), discounts, service charges, and grand total. Default currency to 'THB' unless clearly indicated otherwise (USD, EUR, JPY, GBP, etc.).
5. Category: Select the best category: 'food' (restaurants, coffee, dining), 'groceries' (supermarkets, convenience stores), 'transport' (fuel, taxi, trains, parking), 'shopping' (retail, clothing, electronics), 'bills' (utilities, telecom, subscriptions), 'health' (pharmacy, hospital, medical), or 'other'.
6. Quality Check: If the image is blurry, unreadable, blank, or completely not a receipt/bill/invoice, set "isReceipt": false with a descriptive explanation in "notes".
`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      isReceipt: {
        type: Type.BOOLEAN,
        description: 'True if image is a valid, readable receipt or invoice. False if blurry or not a receipt.',
      },
      merchant: {
        type: Type.STRING,
        description: 'Name of the store or vendor in Thai or English.',
      },
      date: {
        type: Type.STRING,
        description: 'ISO Date YYYY-MM-DD. Must convert Thai Buddhist Era to Common Era (e.g. 2569 -> 2026).',
      },
      time: {
        type: Type.STRING,
        description: 'Time of purchase in 24h format HH:mm, e.g. 14:30. Blank if not found.',
      },
      items: {
        type: Type.ARRAY,
        description: 'List of purchased items on the receipt.',
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Item description or product name' },
            quantity: { type: Type.NUMBER, description: 'Quantity purchased, default 1' },
            unitPrice: { type: Type.NUMBER, description: 'Unit price' },
            total: { type: Type.NUMBER, description: 'Line total amount' },
          },
          required: ['name', 'quantity', 'unitPrice', 'total'],
        },
      },
      subtotal: {
        type: Type.NUMBER,
        description: 'Subtotal before tax/discounts, or 0 if not stated.',
      },
      tax: {
        type: Type.NUMBER,
        description: 'VAT or tax amount (e.g. VAT 7%), or 0.',
      },
      discount: {
        type: Type.NUMBER,
        description: 'Discounts applied, positive number or 0.',
      },
      serviceCharge: {
        type: Type.NUMBER,
        description: 'Service charge amount (e.g. 10%), or 0.',
      },
      total: {
        type: Type.NUMBER,
        description: 'Grand final total payable amount.',
      },
      currency: {
        type: Type.STRING,
        description: 'Currency code, default THB.',
      },
      paymentMethod: {
        type: Type.STRING,
        description: 'Payment method, e.g. Cash, Credit Card, PromptPay, QR, TrueMoney.',
      },
      category: {
        type: Type.STRING,
        description: 'Categorization: food, transport, groceries, shopping, bills, health, or other.',
      },
      confidence: {
        type: Type.NUMBER,
        description: 'Confidence score from 0.0 to 1.0 based on image clarity.',
      },
      notes: {
        type: Type.STRING,
        description: 'Any observations, error notes if unreadable, or details about the receipt.',
      },
    },
    required: [
      'isReceipt',
      'merchant',
      'date',
      'items',
      'total',
      'currency',
      'category',
      'confidence',
    ],
  };

  let modelToUse = (config.geminiModel || process.env.gemini_model || process.env.GEMINI_MODEL || FALLBACK_MODEL).trim();
  let response: any = null;
  let lastError: any = null;
  let enableThinking = modelToUse.includes('gemini-4') || modelToUse.includes('gemini-3');

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: modelToUse,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: resolvedMime,
                data: base64Data,
              },
            },
            {
              text: 'Please perform OCR and extract all structured data from this receipt.',
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
          ...(enableThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
        },
      });
      break;
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || '');
      const status = err?.status || err?.code;

      // If configured model is not found/unsupported, fall back to FALLBACK_MODEL
      if ((status === 404 || msg.includes('NOT_FOUND') || msg.includes('not found')) && modelToUse !== FALLBACK_MODEL) {
        console.warn(`[Gemini] Model "${modelToUse}" not found, falling back to ${FALLBACK_MODEL}`);
        modelToUse = FALLBACK_MODEL;
        continue;
      }

      // If thinkingConfig is not supported for this model, retry without it
      if (enableThinking && (msg.includes('thinkingConfig') || msg.includes('ThinkingLevel') || msg.includes('unknown field') || msg.includes('Invalid'))) {
        enableThinking = false;
        continue;
      }

      // Retry transient 429/5xx with backoff
      if ((status === 429 || status >= 500 || msg.includes('ECONNRESET') || msg.includes('fetch failed')) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  if (!response) {
    throw lastError || new Error('Failed to get response from Gemini AI.');
  }

  let rawJson = (response.text ?? '{}').trim();
  // Strip accidental markdown code fences
  if (rawJson.startsWith('```')) {
    rawJson = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    throw new Error('Gemini returned an invalid JSON response structure. Please retry with a clearer photo.');
  }

  // Sanitize and normalize fields
  const normalizedDate = normalizeDate(parsed.date);
  const items = Array.isArray(parsed.items)
    ? parsed.items.map((it: any) => ({
      name: String(it.name || 'Item').trim(),
      quantity: Math.max(1, Number(it.quantity) || 1),
      unitPrice: Number(it.unitPrice) || 0,
      total: Number(it.total) || (Number(it.quantity || 1) * Number(it.unitPrice || 0)),
    }))
    : [];

  const validCategories: ReceiptCategory[] = [
    'food',
    'transport',
    'groceries',
    'shopping',
    'bills',
    'health',
    'entertainment',
    'other',
  ];
  let category: ReceiptCategory = 'other';
  if (validCategories.includes(parsed.category?.toLowerCase())) {
    category = parsed.category.toLowerCase() as ReceiptCategory;
  }

  const result: GeminiExtractionResult = {
    isReceipt: parsed.isReceipt !== false,
    merchant: parsed.merchant?.trim() || 'Store / Merchant',
    date: normalizedDate,
    time: parsed.time?.trim() || '',
    items,
    subtotal: Number(parsed.subtotal) || 0,
    tax: Number(parsed.tax) || 0,
    discount: Number(parsed.discount) || 0,
    serviceCharge: Number(parsed.serviceCharge) || 0,
    total: Number(parsed.total) || items.reduce((acc: number, cur: any) => acc + cur.total, 0),
    currency: (parsed.currency || 'THB').toUpperCase(),
    paymentMethod: parsed.paymentMethod?.trim() || '',
    category,
    confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.9,
    notes: parsed.notes || '',
  };

  return result;
}
