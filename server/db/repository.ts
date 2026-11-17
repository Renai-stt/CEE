import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { isConnectedToMongo } from './connection.ts';
import { UserModel, IUserDocument } from './models/User.ts';
import { ReceiptModel, IReceiptDocument } from './models/Receipt.ts';
import { DashboardSummary, IReceipt, ReceiptCategory } from '../../shared/types.ts';

// File-based local datastore path for zero-config fallback
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

interface LocalDbSchema {
  users: Array<{
    _id: string;
    email: string;
    passwordHash: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  }>;
  receipts: Array<IReceipt & { updatedAt: string }>;
}

function ensureLocalDb(): LocalDbSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const generateSeedData = (): LocalDbSchema => {
    const demoUserId = 'demo-user-default-uuid';
    const demoPasswordHash = bcrypt.hashSync('demo123456', 10);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastMDate = new Date(y, now.getMonth() - 1, 15);
    const lastMonthStr = lastMDate.toISOString().split('T')[0];

    const receipts: Array<IReceipt & { updatedAt: string }> = [
      {
        _id: 'rec-seed-1',
        userId: demoUserId,
        merchant: '7-Eleven Thailand (Silom Complex)',
        date: today,
        time: '14:25',
        category: 'food',
        currency: 'THB',
        paymentMethod: 'PromptPay QR',
        subtotal: 89.72,
        tax: 6.28,
        discount: 0,
        serviceCharge: 0,
        total: 96.00,
        status: 'confirmed',
        confidence: 0.98,
        notes: 'ซื้อกาแฟและแซนด์วิชรองท้อง',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [
          { name: 'Iced Americano 16oz', quantity: 1, unitPrice: 45, total: 45 },
          { name: 'Ham & Cheese Croissant Toast', quantity: 1, unitPrice: 37, total: 37 },
          { name: 'Drinking Water 600ml', quantity: 2, unitPrice: 7, total: 14 },
        ],
      },
      {
        _id: 'rec-seed-2',
        userId: demoUserId,
        merchant: "Cafe Amazon (PTT Station)",
        date: `${y}-${m}-04`,
        time: '09:15',
        category: 'food',
        currency: 'THB',
        paymentMethod: 'Credit Card',
        subtotal: 135.00,
        tax: 0,
        discount: 0,
        serviceCharge: 0,
        total: 135.00,
        status: 'confirmed',
        confidence: 0.96,
        notes: 'กาแฟเช้าวันทำงาน',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        items: [
          { name: 'Amazon Extra Cold', quantity: 1, unitPrice: 75, total: 75 },
          { name: 'Matcha Green Tea Latte', quantity: 1, unitPrice: 60, total: 60 },
        ],
      },
      {
        _id: 'rec-seed-3',
        userId: demoUserId,
        merchant: "Lotus's Hypermarket Rama 4",
        date: `${y}-${m}-02`,
        time: '18:40',
        category: 'groceries',
        currency: 'THB',
        paymentMethod: 'TrueMoney Wallet',
        subtotal: 1380.00,
        tax: 96.60,
        discount: 50.00,
        serviceCharge: 0,
        total: 1426.60,
        status: 'confirmed',
        confidence: 0.99,
        notes: 'ซื้อของสดและของใช้เข้าบ้านประจำสัปดาห์',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        items: [
          { name: 'ข้าวหอมมะลิ 5 กก.', quantity: 1, unitPrice: 225, total: 225 },
          { name: 'อกไก่ซีพี 1 กก.', quantity: 2, unitPrice: 110, total: 220 },
          { name: 'ไข่ไก่สดเบอร์ 2 (แผง 30 ฟอง)', quantity: 1, unitPrice: 145, total: 145 },
          { name: 'นมสดเมจิ 2 ลิตร', quantity: 2, unitPrice: 96, total: 192 },
          { name: 'น้ำยาซักผ้า Breeze Excel 1400ml', quantity: 2, unitPrice: 159, total: 318 },
          { name: 'ผักและผลไม้สดรวม', quantity: 1, unitPrice: 326.60, total: 326.60 },
        ],
      },
      {
        _id: 'rec-seed-4',
        userId: demoUserId,
        merchant: 'BTS Skytrain (Siam Station)',
        date: `${y}-${m}-01`,
        time: '08:10',
        category: 'transport',
        currency: 'THB',
        paymentMethod: 'Rabbit Card',
        subtotal: 88.00,
        tax: 0,
        discount: 0,
        serviceCharge: 0,
        total: 88.00,
        status: 'confirmed',
        confidence: 0.95,
        notes: 'ค่าเดินทางรถไฟฟ้าไปทำงาน',
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        items: [
          { name: 'BTS Fare (On Nut to Asok)', quantity: 2, unitPrice: 44, total: 88 },
        ],
      },
      {
        _id: 'rec-seed-5',
        userId: demoUserId,
        merchant: 'Central Department Store (Chidlom)',
        date: lastMonthStr,
        time: '16:30',
        category: 'shopping',
        currency: 'THB',
        paymentMethod: 'Credit Card',
        subtotal: 2450.00,
        tax: 171.50,
        discount: 200.00,
        serviceCharge: 0,
        total: 2421.50,
        status: 'confirmed',
        confidence: 0.97,
        notes: 'ซื้อเสื้อเชิ้ตทำงานและเครื่องเขียน',
        createdAt: lastMDate.toISOString(),
        updatedAt: lastMDate.toISOString(),
        items: [
          { name: 'Oxford Formal Shirt Navy', quantity: 1, unitPrice: 1650, total: 1650 },
          { name: 'Notebook & Pen Set', quantity: 1, unitPrice: 800, total: 800 },
        ],
      },
    ];

    return {
      users: [
        {
          _id: demoUserId,
          email: 'demo@receipttracker.app',
          passwordHash: demoPasswordHash,
          name: 'Demo User (ผู้ใช้ทดลอง)',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      receipts,
    };
  };

  if (!fs.existsSync(DB_FILE)) {
    const initial = generateSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.users || parsed.users.length === 0) {
      const initial = generateSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    return parsed;
  } catch {
    const initial = generateSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

function saveLocalDb(data: LocalDbSchema) {
  ensureLocalDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export const UserRepository = {
  async findByEmail(email: string) {
    const normalized = email.toLowerCase().trim();
    if (isConnectedToMongo()) {
      return UserModel.findOne({ email: normalized }).lean();
    }
    const db = ensureLocalDb();
    return db.users.find((u) => u.email.toLowerCase() === normalized) || null;
  },

  async findById(id: string) {
    if (isConnectedToMongo()) {
      return UserModel.findById(id).lean();
    }
    const db = ensureLocalDb();
    return db.users.find((u) => u._id === id) || null;
  },

  async create(data: { email: string; passwordHash: string; name: string }) {
    const normalized = data.email.toLowerCase().trim();
    if (isConnectedToMongo()) {
      const created = await UserModel.create({
        email: normalized,
        passwordHash: data.passwordHash,
        name: data.name.trim(),
      });
      return created.toObject();
    }
    const db = ensureLocalDb();
    const newUser = {
      _id: crypto.randomUUID(),
      email: normalized,
      passwordHash: data.passwordHash,
      name: data.name.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveLocalDb(db);
    return newUser;
  },
};

export interface ReceiptFilter {
  userId: string;
  from?: string;
  to?: string;
  category?: string;
  merchant?: string;
  search?: string;
  sort?: string; // 'date_desc' | 'date_asc' | 'total_desc' | 'total_asc'
  page?: number;
  limit?: number;
}

export const ReceiptRepository = {
  async create(data: Partial<IReceipt>) {
    if (isConnectedToMongo()) {
      const doc = await ReceiptModel.create(data);
      return doc.toObject();
    }
    const db = ensureLocalDb();
    const newReceipt: IReceipt & { updatedAt: string } = {
      _id: crypto.randomUUID(),
      userId: data.userId!,
      merchant: data.merchant || 'Unknown',
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || '',
      items: data.items || [],
      subtotal: Number(data.subtotal || 0),
      tax: Number(data.tax || 0),
      discount: Number(data.discount || 0),
      serviceCharge: Number(data.serviceCharge || 0),
      total: Number(data.total || 0),
      currency: data.currency || 'THB',
      paymentMethod: data.paymentMethod || '',
      category: (data.category as ReceiptCategory) || 'other',
      imageUrl: data.imageUrl || '',
      rawAiResponse: data.rawAiResponse || null,
      status: data.status || 'confirmed',
      notes: data.notes || '',
      confidence: data.confidence ?? 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.receipts.push(newReceipt);
    saveLocalDb(db);
    return newReceipt;
  },

  async findById(id: string, userId: string) {
    if (isConnectedToMongo()) {
      return ReceiptModel.findOne({ _id: id, userId }).lean();
    }
    const db = ensureLocalDb();
    return db.receipts.find((r) => r._id === id && r.userId === userId) || null;
  },

  async update(id: string, userId: string, updateData: Partial<IReceipt>) {
    if (isConnectedToMongo()) {
      return ReceiptModel.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true }
      ).lean();
    }
    const db = ensureLocalDb();
    const index = db.receipts.findIndex((r) => r._id === id && r.userId === userId);
    if (index === -1) return null;
    db.receipts[index] = {
      ...db.receipts[index],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    saveLocalDb(db);
    return db.receipts[index];
  },

  async delete(id: string, userId: string) {
    if (isConnectedToMongo()) {
      const res = await ReceiptModel.deleteOne({ _id: id, userId });
      return res.deletedCount > 0;
    }
    const db = ensureLocalDb();
    const initialLen = db.receipts.length;
    db.receipts = db.receipts.filter((r) => !(r._id === id && r.userId === userId));
    saveLocalDb(db);
    return db.receipts.length < initialLen;
  },

  async find(filter: ReceiptFilter) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 15));
    const skip = (page - 1) * limit;

    if (isConnectedToMongo()) {
      const query: any = { userId: filter.userId };
      if (filter.from || filter.to) {
        query.date = {};
        if (filter.from) query.date.$gte = filter.from;
        if (filter.to) query.date.$lte = filter.to;
      }
      if (filter.category && filter.category !== 'all') {
        query.category = filter.category;
      }
      if (filter.merchant) {
        query.merchant = { $regex: filter.merchant, $options: 'i' };
      }
      if (filter.search) {
        const regex = { $regex: filter.search, $options: 'i' };
        query.$or = [
          { merchant: regex },
          { notes: regex },
          { 'items.name': regex },
        ];
      }

      let sortObj: any = { date: -1, createdAt: -1 };
      if (filter.sort === 'date_asc') sortObj = { date: 1, createdAt: 1 };
      else if (filter.sort === 'total_desc') sortObj = { total: -1 };
      else if (filter.sort === 'total_asc') sortObj = { total: 1 };
      else if (filter.sort === 'merchant_asc') sortObj = { merchant: 1 };

      const [receipts, totalCount] = await Promise.all([
        ReceiptModel.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
        ReceiptModel.countDocuments(query),
      ]);

      return {
        receipts,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit) || 1,
        },
      };
    }

    // Local DB query engine
    const db = ensureLocalDb();
    let list = db.receipts.filter((r) => r.userId === filter.userId);

    if (filter.from) {
      list = list.filter((r) => r.date >= filter.from!);
    }
    if (filter.to) {
      list = list.filter((r) => r.date <= filter.to!);
    }
    if (filter.category && filter.category !== 'all') {
      list = list.filter((r) => r.category === filter.category);
    }
    if (filter.merchant) {
      const m = filter.merchant.toLowerCase();
      list = list.filter((r) => r.merchant.toLowerCase().includes(m));
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.merchant.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q)) ||
          r.items.some((item) => item.name.toLowerCase().includes(q))
      );
    }

    if (filter.sort === 'date_asc') {
      list.sort((a, b) => a.date.localeCompare(b.date));
    } else if (filter.sort === 'total_desc') {
      list.sort((a, b) => b.total - a.total);
    } else if (filter.sort === 'total_asc') {
      list.sort((a, b) => a.total - b.total);
    } else if (filter.sort === 'merchant_asc') {
      list.sort((a, b) => a.merchant.localeCompare(b.merchant));
    } else {
      // date_desc default
      list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    }

    const totalCount = list.length;
    const paginated = list.slice(skip, skip + limit);

    return {
      receipts: paginated,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  },

  async getAllForExport(userId: string, from?: string, to?: string, category?: string) {
    if (isConnectedToMongo()) {
      const query: any = { userId };
      if (from || to) {
        query.date = {};
        if (from) query.date.$gte = from;
        if (to) query.date.$lte = to;
      }
      if (category && category !== 'all') {
        query.category = category;
      }
      return ReceiptModel.find(query).sort({ date: -1 }).lean();
    }
    const db = ensureLocalDb();
    let list = db.receipts.filter((r) => r.userId === userId);
    if (from) list = list.filter((r) => r.date >= from);
    if (to) list = list.filter((r) => r.date <= to);
    if (category && category !== 'all') list = list.filter((r) => r.category === category);
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  },

  async getDashboardSummary(userId: string, from?: string, to?: string): Promise<DashboardSummary> {
    const all = await this.getAllForExport(userId, from, to);

    // Calculate month vs last month based on today's date
    const now = new Date();
    const thisYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastYearMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Get all user receipts without date filter to compute current vs last month accurately
    const allUserReceipts = await this.getAllForExport(userId);
    let thisMonthSpend = 0;
    let lastMonthSpend = 0;

    for (const r of allUserReceipts) {
      if (r.date.startsWith(thisYearMonth)) {
        thisMonthSpend += Number(r.total) || 0;
      } else if (r.date.startsWith(lastYearMonth)) {
        lastMonthSpend += Number(r.total) || 0;
      }
    }

    let spendChangePercent = 0;
    if (lastMonthSpend > 0) {
      spendChangePercent = Math.round(((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100);
    } else if (thisMonthSpend > 0) {
      spendChangePercent = 100;
    }

    let totalSpend = 0;
    const dateMap: Record<string, { amount: number; count: number }> = {};
    const categoryMap: Record<string, { amount: number; count: number }> = {};
    const merchantMap: Record<string, { amount: number; count: number }> = {};

    for (const r of all) {
      const amount = Number(r.total) || 0;
      totalSpend += amount;

      // Group by date
      if (!dateMap[r.date]) dateMap[r.date] = { amount: 0, count: 0 };
      dateMap[r.date].amount += amount;
      dateMap[r.date].count += 1;

      // Group by category
      const cat = r.category || 'other';
      if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, count: 0 };
      categoryMap[cat].amount += amount;
      categoryMap[cat].count += 1;

      // Group by merchant
      const merchant = r.merchant.trim() || 'Unknown';
      if (!merchantMap[merchant]) merchantMap[merchant] = { amount: 0, count: 0 };
      merchantMap[merchant].amount += amount;
      merchantMap[merchant].count += 1;
    }

    const receiptCount = all.length;
    const averagePerReceipt = receiptCount > 0 ? Math.round((totalSpend / receiptCount) * 100) / 100 : 0;

    const spendOverTime = Object.keys(dateMap)
      .sort((a, b) => a.localeCompare(b))
      .map((date) => ({
        date,
        amount: Math.round(dateMap[date].amount * 100) / 100,
        count: dateMap[date].count,
      }));

    const categoryBreakdown = Object.keys(categoryMap).map((cat) => ({
      category: cat as ReceiptCategory,
      amount: Math.round(categoryMap[cat].amount * 100) / 100,
      count: categoryMap[cat].count,
      percentage: totalSpend > 0 ? Math.round((categoryMap[cat].amount / totalSpend) * 1000) / 10 : 0,
    }));
    categoryBreakdown.sort((a, b) => b.amount - a.amount);

    const topMerchants = Object.keys(merchantMap)
      .map((merchant) => ({
        merchant,
        amount: Math.round(merchantMap[merchant].amount * 100) / 100,
        count: merchantMap[merchant].count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 7);

    return {
      totalSpend: Math.round(totalSpend * 100) / 100,
      receiptCount,
      averagePerReceipt,
      thisMonthSpend: Math.round(thisMonthSpend * 100) / 100,
      lastMonthSpend: Math.round(lastMonthSpend * 100) / 100,
      spendChangePercent,
      currency: 'THB',
      spendOverTime,
      categoryBreakdown,
      topMerchants,
    };
  },
};
