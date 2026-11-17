import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calendar,
  Store,
  ArrowRight,
  Plus,
  ArrowUpRight,
  DollarSign,
  ScanLine,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  ExternalLink,
  Clock,
  Tag,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { apiFetch } from '../utils/api.ts';
import { DashboardSummary, IReceipt } from '../../shared/types.ts';
import { CATEGORY_CONFIG, formatCurrency, formatDateThai } from '../utils/categories.ts';

export const DashboardPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Layout view mode: 'timeline' (matching reference image) vs 'analytics' (charts & metrics)
  const [activeTab, setActiveTab] = useState<'timeline' | 'analytics'>('timeline');
  const [periodMode, setPeriodMode] = useState<'week' | 'month'>('month');

  // Quick add search
  const [quickSearch, setQuickSearch] = useState('');

  // Summary & receipt state
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [receipts, setReceipts] = useState<IReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected date filter
  const [selectedDay, setSelectedDay] = useState<string>('');

  const frequentStores = [
    { name: '7-Eleven Thailand', category: 'food', sub: 'Convenience Store & Drinks' },
    { name: 'Cafe Amazon', category: 'food', sub: 'Coffee & Bakery' },
    { name: "Lotus's Hypermarket", category: 'groceries', sub: 'Weekly Groceries' },
    { name: 'BTS Skytrain', category: 'transport', sub: 'Public Transportation' },
    { name: 'Central Department Store', category: 'shopping', sub: 'Shopping & Retail' },
    { name: 'Grab Food', category: 'food', sub: 'Food Delivery' },
    { name: 'Shopee / Lazada', category: 'shopping', sub: 'Online Shopping' },
  ];

  const filteredStores = frequentStores.filter((s) =>
    s.name.toLowerCase().includes(quickSearch.toLowerCase()) ||
    s.sub.toLowerCase().includes(quickSearch.toLowerCase())
  );

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, recRes] = await Promise.all([
        apiFetch('/api/v1/dashboard/summary'),
        apiFetch('/api/v1/receipts?limit=20&sort=date_desc'),
      ]);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }
      if (recRes.ok) {
        const recData = await recRes.json();
        setReceipts(recData.receipts || []);
      }
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleQuickAdd = (store: { name: string; category: string }) => {
    navigate('/review', {
      state: {
        scannedData: {
          merchant: store.name,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          category: store.category,
          currency: 'THB',
          items: [{ name: 'สินค้าทั่วไป', quantity: 1, unitPrice: 0, total: 0 }],
          subtotal: 0,
          total: 0,
          confidence: 1,
        },
      },
    });
  };

  // Days of week header pills (Mon - Sun)
  const daysOfWeek = [
    { label: 'MON', dayNum: 1, fullDate: '2026-11-02' },
    { label: 'TUE', dayNum: 2, fullDate: '2026-11-03' },
    { label: 'WED', dayNum: 3, fullDate: '2026-11-04', isHighlight: true },
    { label: 'THU', dayNum: 4, fullDate: '2026-11-05' },
    { label: 'FRI', dayNum: 5, fullDate: '2026-11-06' },
    { label: 'SAT', dayNum: 6, fullDate: '2026-11-07' },
    { label: 'SUN', dayNum: 7, fullDate: '2026-11-08' },
  ];

  // Filtered receipts by selected day if any
  const displayedReceipts = selectedDay
    ? receipts.filter((r) => r.date === selectedDay)
    : receipts;

  const totalDisplayedSpend = displayedReceipts.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

  // Month target for circular insight gauge (e.g. 10,000 THB)
  const monthlyBudget = 10000;
  const currentTotal = summary?.totalSpend || 0;
  const percentOfBudget = Math.min(100, Math.round((currentTotal / monthlyBudget) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner / Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#160029] dark:text-[#F5E9E2] tracking-tight flex items-center gap-2">
            <span>ไหน Receipt</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-[#D44D5C]/15 text-[#D44D5C] dark:bg-[#D44D5C]/30 dark:text-[#E3B5A4]">
              {language === 'th' ? 'แดชบอร์ดค่าใช้จ่าย' : 'Spending Dashboard'}
            </span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#773344] dark:text-[#E3B5A4]">
            {language === 'th'
              ? 'บันทึกและสแกนใบเสร็จด้วย AI พร้อมวิเคราะห์ภาพรวมการเงินของคุณ'
              : 'Track expenses and scan receipts with Gemini AI'}
          </p>
        </div>

        {/* View Toggle (Timeline view matching reference mockup vs Charts view) */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-2xl p-1 bg-[#F5E9E2] dark:bg-[#240E38] border border-[#E3B5A4]/40 dark:border-[#773344]/50">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'bg-[#D44D5C] text-white shadow-sm'
                  : 'text-[#773344] dark:text-[#E3B5A4] hover:text-[#160029]'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Timeline</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-[#D44D5C] text-white shadow-sm'
                  : 'text-[#773344] dark:text-[#E3B5A4] hover:text-[#160029]'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>{language === 'th' ? 'กราฟวิเคราะห์' : 'Analytics'}</span>
            </button>
          </div>

          <Link
            to="/upload"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#D44D5C] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#D44D5C]/30 hover:bg-[#BF3F4E] transition"
          >
            <ScanLine className="h-4 w-4" />
            <span>{t('upload')}</span>
          </Link>
        </div>
      </div>

      {activeTab === 'timeline' ? (
        /* --- 3-COLUMN REFERENCE UI (image_a83370c4.png) --- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMN 1 (Left): Quick Add Panel (3 cols) */}
          <div className="lg:col-span-3 rounded-3xl border border-[#E3B5A4]/40 bg-white dark:border-[#773344]/40 dark:bg-[#160029] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#773344] dark:text-[#E3B5A4] flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-[#D44D5C]" />
                {t('quickAdd')}
              </span>
              <span className="text-[10px] text-[#773344]/70 dark:text-[#E3B5A4]/70">
                {filteredStores.length} stores
              </span>
            </div>

            {/* Quick search */}
            <div className="relative">
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Search merchant..."
                className="w-full rounded-2xl border border-[#E3B5A4]/50 bg-[#F5E9E2]/30 pl-8 pr-3 py-1.5 text-xs text-[#160029] placeholder-[#773344]/50 focus:border-[#D44D5C] focus:bg-white focus:outline-none dark:border-[#773344]/60 dark:bg-[#240E38] dark:text-[#F5E9E2]"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#773344]/50" />
            </div>

            <div className="text-[11px] font-bold text-[#773344]/80 dark:text-[#E3B5A4]/80 pt-1">
              {t('quickAddSub')}
            </div>

            {/* Frequent list with + buttons */}
            <div className="space-y-2">
              {filteredStores.map((store, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#F5E9E2]/50 dark:hover:bg-[#240E38] transition border border-transparent hover:border-[#E3B5A4]/30 group"
                >
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-bold text-[#160029] dark:text-[#F5E9E2] truncate group-hover:text-[#D44D5C] transition">
                      {store.name}
                    </p>
                    <p className="text-[10px] text-[#773344]/70 dark:text-[#E3B5A4]/70 truncate">
                      {store.sub}
                    </p>
                  </div>
                  <button
                    onClick={() => handleQuickAdd(store)}
                    className="h-7 w-7 rounded-xl bg-[#F5E9E2] dark:bg-[#240E38] text-[#D44D5C] hover:bg-[#D44D5C] hover:text-white flex items-center justify-center transition shadow-xs shrink-0"
                    title={`Add entry for ${store.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Manual Quick Entry Button */}
            <Link
              to="/upload"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-dashed border-[#D44D5C]/60 text-xs font-bold text-[#D44D5C] hover:bg-[#D44D5C]/10 transition mt-2"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ เพิ่มรายการด้วยตนเอง</span>
            </Link>
          </div>

          {/* COLUMN 2 (Center): Timeline / Day View (6 cols) */}
          <div className="lg:col-span-6 rounded-3xl border border-[#E3B5A4]/40 bg-white dark:border-[#773344]/40 dark:bg-[#160029] p-6 shadow-sm space-y-6">
            {/* Header: Month / Period Navigation */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E3B5A4]/30 dark:border-[#773344]/30">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded-lg text-[#773344] dark:text-[#E3B5A4] hover:bg-[#F5E9E2] dark:hover:bg-[#240E38]">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="p-1 rounded-lg text-[#773344] dark:text-[#E3B5A4] hover:bg-[#F5E9E2] dark:hover:bg-[#240E38]">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#D44D5C]" />
                  <span className="text-base font-extrabold text-[#160029] dark:text-[#F5E9E2]">
                    {language === 'th' ? 'พฤศจิกายน 2569' : 'November 2026'}
                  </span>
                </div>
              </div>

              {/* Week / Month Toggle */}
              <div className="inline-flex rounded-2xl p-1 bg-[#F5E9E2] dark:bg-[#240E38] text-[11px] font-bold">
                <button
                  onClick={() => setPeriodMode('week')}
                  className={`px-3 py-1 rounded-xl transition ${
                    periodMode === 'week'
                      ? 'bg-[#D44D5C] text-white shadow-xs'
                      : 'text-[#773344] dark:text-[#E3B5A4]'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setPeriodMode('month')}
                  className={`px-3 py-1 rounded-xl transition ${
                    periodMode === 'month'
                      ? 'bg-[#D44D5C] text-white shadow-xs'
                      : 'text-[#773344] dark:text-[#E3B5A4]'
                  }`}
                >
                  Month
                </button>
              </div>
            </div>

            {/* Days of Week Row (Pills like reference mockup) */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {daysOfWeek.map((day) => {
                const isCurrent = selectedDay === day.fullDate || (!selectedDay && day.isHighlight);
                return (
                  <button
                    key={day.dayNum}
                    onClick={() => setSelectedDay(selectedDay === day.fullDate ? '' : day.fullDate)}
                    className={`py-2 px-1 rounded-2xl transition flex flex-col items-center gap-1 ${
                      isCurrent
                        ? 'bg-[#D44D5C] text-white shadow-sm'
                        : 'hover:bg-[#F5E9E2] dark:hover:bg-[#240E38] text-[#773344] dark:text-[#E3B5A4]'
                    }`}
                  >
                    <span className="text-[10px] font-bold opacity-80">{day.label}</span>
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-black ${
                        isCurrent
                          ? 'bg-white text-[#D44D5C]'
                          : 'bg-[#F5E9E2]/60 dark:bg-[#240E38]'
                      }`}
                    >
                      {day.dayNum}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Timeline Receipts List */}
            <div className="space-y-4 pt-2">
              {loading ? (
                <div className="p-8 text-center text-slate-400 animate-pulse text-xs">
                  {t('loading')}
                </div>
              ) : displayedReceipts.length === 0 ? (
                <div className="p-8 text-center text-[#773344]/70 dark:text-[#E3B5A4]/70 text-xs">
                  ไม่พบรายการในวันที่เลือก
                </div>
              ) : (
                displayedReceipts.map((r) => {
                  const conf = CATEGORY_CONFIG[r.category] || CATEGORY_CONFIG.other;
                  const Icon = conf.icon;
                  return (
                    <div
                      key={r._id}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-[#E3B5A4]/30 hover:border-[#D44D5C]/50 bg-[#FBF6F3]/50 dark:bg-[#240E38]/50 dark:border-[#773344]/40 transition group"
                    >
                      {/* Left: Time & Details */}
                      <div className="flex items-center gap-4">
                        <div className="text-right w-14 shrink-0">
                          <span className="text-sm font-extrabold text-[#773344] dark:text-[#E3B5A4] block">
                            {r.time || '12:00'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {formatDateThai(r.date, language).split(' ')[0]}
                          </span>
                        </div>

                        <div className="h-9 w-px bg-[#E3B5A4]/40 dark:bg-[#773344]/50" />

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-[#160029] dark:text-[#F5E9E2] group-hover:text-[#D44D5C] transition">
                              {r.merchant}
                            </h4>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${conf.bgColor} ${conf.textColor}`}
                            >
                              <Icon className="h-3 w-3" />
                              <span>{t(`cat_${r.category}` as any)}</span>
                            </span>
                          </div>

                          <p className="text-[11px] text-[#773344]/80 dark:text-[#E3B5A4]/80 mt-0.5 truncate max-w-xs">
                            {r.items?.length > 0
                              ? r.items.map((it) => it.name).join(', ')
                              : r.notes || 'Receipt verified'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Amount */}
                      <div className="text-right pl-3 shrink-0">
                        <span className="text-sm sm:text-base font-black text-[#D44D5C] dark:text-[#F4DFD7] block">
                          {formatCurrency(r.total, r.currency)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {r.paymentMethod || 'Paid'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Total & Add Entry CTA Bar */}
            <div className="pt-4 border-t border-[#E3B5A4]/30 dark:border-[#773344]/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#773344] dark:text-[#E3B5A4] block">
                  Total
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#160029] dark:text-[#F5E9E2]">
                  {formatCurrency(totalDisplayedSpend, summary?.currency || 'THB')}
                </span>
              </div>

              <Link
                to="/upload"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#D44D5C] text-white text-xs font-extrabold shadow-md shadow-[#D44D5C]/35 hover:bg-[#BF3F4E] hover:scale-[1.02] transition"
              >
                <Plus className="h-4 w-4" />
                <span>{t('addNewEntry')}</span>
              </Link>
            </div>
          </div>

          {/* COLUMN 3 (Right): Insight & AI Scanner Card (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Top Promo/AI Banner Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-[#773344] via-[#9B3D4D] to-[#D44D5C] p-5 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
                  Gemini AI OCR
                </span>
                <Sparkles className="h-4 w-4 text-[#F5E9E2]" />
              </div>

              <h3 className="text-sm font-extrabold text-[#F5E9E2] mt-1">
                สแกนใบเสร็จอัตโนมัติ
              </h3>
              <p className="text-[11px] text-[#F5E9E2]/80 mt-1 leading-snug">
                ดึงวันที่ พ.ศ., ร้านค้า, และแจกแจงรายการสินค้าทันที
              </p>

              <Link
                to="/upload"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#773344] text-xs font-extrabold hover:bg-[#F5E9E2] shadow-xs transition"
              >
                <span>{language === 'th' ? 'สแกนเลย' : 'Scan Now'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Insight Card with Radial Gauge (just like image_a83370c4.png!) */}
            <div className="rounded-3xl border border-[#E3B5A4]/40 bg-white dark:border-[#773344]/40 dark:bg-[#160029] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#773344] dark:text-[#E3B5A4]">
                  {t('insight')}
                </h3>
                <Link
                  to="/receipts"
                  className="text-slate-400 hover:text-[#D44D5C] transition"
                  title="View all receipts"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Radial Donut Gauge */}
              <div className="relative flex items-center justify-center my-3">
                <div className="relative h-36 w-36 flex items-center justify-center">
                  {/* SVG Gauge */}
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                    {/* Background Track */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#F5E9E2"
                      strokeWidth="8"
                      fill="transparent"
                      className="dark:stroke-[#240E38]"
                    />
                    {/* Progress Arc in Lobster Pink */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#D44D5C"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * percentOfBudget) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>

                  {/* Center Text */}
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                      {language === 'th' ? 'ยอดรวมเดือนนี้' : 'Total spent'}
                    </span>
                    <span className="text-sm font-black text-[#160029] dark:text-[#F5E9E2]">
                      ฿{(currentTotal).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] font-semibold text-[#773344] dark:text-[#E3B5A4]">
                      /10k
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Breakdown legend */}
              <div className="space-y-2 pt-2 border-t border-[#E3B5A4]/20 dark:border-[#773344]/30 text-xs">
                {summary?.categoryBreakdown.slice(0, 4).map((entry) => {
                  const conf = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.other;
                  return (
                    <div
                      key={entry.category}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: conf.chartColor }}
                        />
                        <span className="text-[#773344] dark:text-[#E3B5A4] text-[11px] font-medium truncate max-w-[100px]">
                          {t(`cat_${entry.category}` as any)}
                        </span>
                      </div>
                      <span className="font-bold text-[#160029] dark:text-[#F5E9E2] text-[11px]">
                        {formatCurrency(entry.amount, summary.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* View all button */}
              <Link
                to="/export"
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#F5E9E2]/60 dark:bg-[#240E38] text-[11px] font-bold text-[#773344] dark:text-[#E3B5A4] hover:bg-[#E3B5A4]/40 transition"
              >
                <span>{t('exports')} (Excel/CSV)</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* --- ANALYTICS / CHARTS VIEW --- */
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-[#E3B5A4]/40 bg-white p-5 shadow-sm dark:border-[#773344]/40 dark:bg-[#160029]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#773344] dark:text-[#E3B5A4]">
                {t('totalSpend')}
              </span>
              <p className="mt-2 text-2xl font-black text-[#160029] dark:text-[#F5E9E2]">
                {formatCurrency(summary?.totalSpend || 0, summary?.currency || 'THB')}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">ทั้งหมดที่บันทึกในระบบ</p>
            </div>

            <div className="rounded-3xl border border-[#E3B5A4]/40 bg-white p-5 shadow-sm dark:border-[#773344]/40 dark:bg-[#160029]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#773344] dark:text-[#E3B5A4]">
                {t('thisMonthSpend')}
              </span>
              <p className="mt-2 text-2xl font-black text-[#D44D5C]">
                {formatCurrency(summary?.thisMonthSpend || 0, summary?.currency || 'THB')}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                เดือนก่อน: {formatCurrency(summary?.lastMonthSpend || 0, summary?.currency || 'THB')}
              </p>
            </div>

            <div className="rounded-3xl border border-[#E3B5A4]/40 bg-white p-5 shadow-sm dark:border-[#773344]/40 dark:bg-[#160029]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#773344] dark:text-[#E3B5A4]">
                {t('receiptCount')}
              </span>
              <p className="mt-2 text-2xl font-black text-[#160029] dark:text-[#F5E9E2]">
                {summary?.receiptCount || 0}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">ใบเสร็จทั้งหมด</p>
            </div>

            <div className="rounded-3xl border border-[#E3B5A4]/40 bg-white p-5 shadow-sm dark:border-[#773344]/40 dark:bg-[#160029]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#773344] dark:text-[#E3B5A4]">
                {t('averagePerReceipt')}
              </span>
              <p className="mt-2 text-2xl font-black text-[#773344] dark:text-[#E3B5A4]">
                {formatCurrency(summary?.averagePerReceipt || 0, summary?.currency || 'THB')}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">เฉลี่ยต่อหนึ่งรายการ</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Area Chart: Spend over time (7 cols) */}
            <div className="lg:col-span-7 rounded-3xl border border-[#E3B5A4]/40 bg-white p-6 shadow-sm dark:border-[#773344]/40 dark:bg-[#160029]">
              <h3 className="text-sm font-extrabold text-[#160029] dark:text-[#F5E9E2] mb-1">
                {t('spendTrendTitle')}
              </h3>
              <p className="text-xs text-[#773344] dark:text-[#E3B5A4] mb-4">
                แนวโน้มยอดเงินตามวันที่ออกใบเสร็จ
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary?.spendOverTime || []}>
                    <defs>
                      <linearGradient id="spendColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D44D5C" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#D44D5C" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      stroke={isDark ? '#E3B5A4' : '#773344'}
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(val) => val.substring(5)}
                    />
                    <YAxis
                      stroke={isDark ? '#E3B5A4' : '#773344'}
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(v) => `฿${v}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-[#E3B5A4] bg-white p-2.5 shadow-lg text-xs dark:bg-[#160029] dark:border-[#773344]">
                              <p className="font-bold text-[#160029] dark:text-[#F5E9E2]">
                                {formatDateThai(data.date, language)}
                              </p>
                              <p className="text-[#D44D5C] font-extrabold mt-0.5">
                                {formatCurrency(data.amount, summary?.currency || 'THB')}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#D44D5C"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#spendColor)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart: Category Share (5 cols) */}
            <div className="lg:col-span-5 rounded-3xl border border-[#E3B5A4]/40 bg-white p-6 shadow-sm dark:border-[#773344]/40 dark:bg-[#160029]">
              <h3 className="text-sm font-extrabold text-[#160029] dark:text-[#F5E9E2] mb-1">
                {t('categoryTitle')}
              </h3>
              <p className="text-xs text-[#773344] dark:text-[#E3B5A4] mb-2">
                สัดส่วนตามหมวดหมู่
              </p>

              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary?.categoryBreakdown || []}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {summary?.categoryBreakdown.map((entry) => {
                        const conf = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.other;
                        return <Cell key={entry.category} fill={conf.chartColor} />;
                      })}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-[#E3B5A4] bg-white p-2 shadow-lg text-xs dark:bg-[#160029] dark:border-[#773344]">
                              <p className="font-bold text-[#160029] dark:text-[#F5E9E2]">
                                {t(`cat_${data.category}` as any)}
                              </p>
                              <p className="text-[#D44D5C] font-bold">
                                {formatCurrency(data.amount, summary?.currency || 'THB')} ({data.percentage}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
