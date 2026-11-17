import mongoose, { Document, Schema } from 'mongoose';
import { ILineItem, ReceiptCategory } from '../../../shared/types.ts';

export interface IReceiptDocument extends Document {
  userId: string;
  merchant: string;
  date: string; // ISO YYYY-MM-DD
  time?: string;
  items: ILineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  serviceCharge?: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  category: ReceiptCategory;
  imageUrl?: string;
  rawAiResponse?: any;
  status: 'pending_review' | 'confirmed' | 'failed';
  notes?: string;
  confidence?: number;
  createdAt: Date;
  updatedAt: Date;
}

const LineItemSchema = new Schema<ILineItem>(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const ReceiptSchema = new Schema<IReceiptDocument>(
  {
    userId: { type: String, required: true, index: true },
    merchant: { type: String, required: true, trim: true },
    date: { type: String, required: true }, // Format YYYY-MM-DD
    time: { type: String, default: '' },
    items: { type: [LineItemSchema], default: [] },
    subtotal: { type: Number, required: true, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'THB' },
    paymentMethod: { type: String, default: '' },
    category: {
      type: String,
      enum: ['food', 'transport', 'groceries', 'shopping', 'bills', 'health', 'entertainment', 'other'],
      default: 'other',
    },
    imageUrl: { type: String, default: '' },
    rawAiResponse: { type: Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: ['pending_review', 'confirmed', 'failed'],
      default: 'confirmed',
    },
    notes: { type: String, default: '' },
    confidence: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  }
);

// Indexes per requirement: Add indexes on (userId, date) and (userId, merchant)
ReceiptSchema.index({ userId: 1, date: -1 });
ReceiptSchema.index({ userId: 1, merchant: 1 });

export const ReceiptModel = mongoose.models.Receipt || mongoose.model<IReceiptDocument>('Receipt', ReceiptSchema);
