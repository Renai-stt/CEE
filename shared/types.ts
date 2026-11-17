export type ReceiptCategory =
  | 'food'
  | 'transport'
  | 'groceries'
  | 'shopping'
  | 'bills'
  | 'health'
  | 'entertainment'
  | 'other';

export interface ILineItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IReceipt {
  _id: string;
  userId: string;
  merchant: string;
  date: string; // ISO YYYY-MM-DD
  time?: string; // HH:mm
  items: ILineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  serviceCharge?: number;
  total: number;
  currency: string; // e.g. THB, USD, EUR, JPY
  paymentMethod?: string;
  category: ReceiptCategory;
  imageUrl?: string;
  rawAiResponse?: any;
  status: 'pending_review' | 'confirmed' | 'failed';
  notes?: string;
  confidence?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface IUser {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalSpend: number;
  receiptCount: number;
  averagePerReceipt: number;
  thisMonthSpend: number;
  lastMonthSpend: number;
  spendChangePercent: number; // percentage change vs last month
  currency: string;
  spendOverTime: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
  categoryBreakdown: Array<{
    category: ReceiptCategory;
    amount: number;
    count: number;
    percentage: number;
  }>;
  topMerchants: Array<{
    merchant: string;
    amount: number;
    count: number;
  }>;
}

export interface GeminiExtractionResult {
  merchant: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  serviceCharge: number;
  total: number;
  currency: string;
  paymentMethod: string;
  category: ReceiptCategory;
  confidence: number;
  isReceipt: boolean;
  notes?: string;
}
