import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Sparkles,
  Calculator,
  X,
  CreditCard,
  Calendar,
  Store,
  Tag,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { ReceiptCategory, ILineItem } from '../../shared/types.ts';
import { CATEGORY_CONFIG, formatCurrency } from '../utils/categories.ts';
import { apiFetch } from '../utils/api.ts';

export const ReviewReceiptPage: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const stateData = location.state || {};
  const initialData = stateData.scannedData || {};
  const receiptImageUrl = stateData.imageUrl || '';

  // Form states
  const [merchant, setMerchant] = useState(initialData.merchant || '');
  const [date, setDate] = useState(initialData.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialData.time || '');
  const [category, setCategory] = useState<ReceiptCategory>(initialData.category || 'other');
  const [currency, setCurrency] = useState(initialData.currency || 'THB');
  const [paymentMethod, setPaymentMethod] = useState(initialData.paymentMethod || '');
  const [subtotal, setSubtotal] = useState<number>(initialData.subtotal || 0);
  const [tax, setTax] = useState<number>(initialData.tax || 0);
  const [discount, setDiscount] = useState<number>(initialData.discount || 0);
  const [serviceCharge, setServiceCharge] = useState<number>(initialData.serviceCharge || 0);
  const [grandTotal, setGrandTotal] = useState<number>(initialData.total || 0);
  const [notes, setNotes] = useState(initialData.notes || '');
  const [confidence] = useState(initialData.confidence ?? 0.95);

  const [items, setItems] = useState<ILineItem[]>(() => {
    if (Array.isArray(initialData.items) && initialData.items.length > 0) {
      return initialData.items.map((it: any, idx: number) => ({
        id: `item-${idx}-${Date.now()}`,
        name: it.name || '',
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        total: Number(it.total) || (Number(it.quantity || 1) * Number(it.unitPrice || 0)),
      }));
    }
    return [{ id: 'item-1', name: '', quantity: 1, unitPrice: 0, total: 0 }];
  });

  // Image controls
  const [zoom, setZoom] = useState(1);
  const [fullscreenModal, setFullscreenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate items sum
  const itemsSum = items.reduce((acc, cur) => acc + (Number(cur.total) || 0), 0);
  const isMathMismatch = Math.abs(itemsSum - grandTotal) > 1.0;

  const handleItemChange = (
    index: number,
    field: keyof ILineItem,
    value: string | number
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value };

      if (field === 'quantity' || field === 'unitPrice') {
        const q = field === 'quantity' ? Number(value) : target.quantity;
        const p = field === 'unitPrice' ? Number(value) : target.unitPrice;
        target.total = Math.round(q * p * 100) / 100;
      }
      updated[index] = target;
      return updated;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRecalculateTotal = () => {
    // If tax or service charge is set, calculate grand total
    const computedTotal = Math.round((itemsSum + tax + serviceCharge - discount) * 100) / 100;
    setGrandTotal(computedTotal > 0 ? computedTotal : itemsSum);
    setSubtotal(itemsSum);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);

    try {
      const payload = {
        merchant: merchant.trim() || 'Store',
        date,
        time,
        items: items.filter((it) => it.name.trim().length > 0),
        subtotal: Number(subtotal) || 0,
        tax: Number(tax) || 0,
        discount: Number(discount) || 0,
        serviceCharge: Number(serviceCharge) || 0,
        total: Number(grandTotal) || itemsSum,
        currency,
        paymentMethod,
        category,
        imageUrl: receiptImageUrl,
        notes,
        confidence,
        status: 'confirmed',
      };

      const res = await apiFetch('/api/v1/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save receipt');
      }

      setSaveSuccess(true);
      setTimeout(() => {
        navigate('/receipts');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving receipt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {t('reviewTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {t('reviewSubtitle')}
            </p>
          </div>
        </div>

        {/* Header Actions: Confidence + Prominent Top Save CTA */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="tabular-nums">AI Confidence: {Math.round(confidence * 100)}%</span>
          </div>

          <button
            type="submit"
            form="review-receipt-form"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-2xl bg-[#D44D5C] text-sm font-extrabold text-white shadow-lg shadow-[#D44D5C]/30 hover:bg-[#BF3F4E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D44D5C] disabled:opacity-50 transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="h-4 w-4 shrink-0" />
            <span>{saving ? t('savingReceipt') : t('saveReceiptBtn')}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>บันทึกใบเสร็จเรียบร้อยแล้ว กำลังนำท่านไปที่หน้ารายการ...</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Extracted Receipt Information Summary */}
      <div className="rounded-3xl border border-[#E3B5A4]/60 bg-[#FBF6F3] p-4 sm:p-5 dark:border-[#773344]/60 dark:bg-[#240E38]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#773344]/75 dark:text-[#E3B5A4]/75 flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-[#D44D5C] shrink-0" />
                <span>{t('tableMerchant')}</span>
              </span>
              <p className="mt-1 text-sm font-extrabold text-[#160029] dark:text-[#F5E9E2] truncate">
                {merchant || '-'}
              </p>
            </div>

            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#773344]/75 dark:text-[#E3B5A4]/75 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#D44D5C] shrink-0" />
                <span>{t('tableDate')}</span>
              </span>
              <p className="mt-1 text-sm font-bold text-[#160029] dark:text-[#F5E9E2] tabular-nums truncate">
                {date || '-'}
                {time ? ` · ${time}` : ''}
              </p>
            </div>

            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#773344]/75 dark:text-[#E3B5A4]/75 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-[#D44D5C] shrink-0" />
                <span>{t('tableCategory')}</span>
              </span>
              <p className="mt-1 text-sm font-bold text-[#160029] dark:text-[#F5E9E2] truncate">
                {t(`cat_${category}` as any)} ·{' '}
                <span className="tabular-nums">
                  {t('itemsCount', { count: String(items.filter((it) => it.name.trim()).length || items.length) })}
                </span>
              </p>
            </div>

            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#773344]/75 dark:text-[#E3B5A4]/75 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-[#D44D5C] shrink-0" />
                <span>{t('paymentMethodLabel')}</span>
              </span>
              <p className="mt-1 text-sm font-bold text-[#160029] dark:text-[#F5E9E2] truncate">
                {paymentMethod || '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[#E3B5A4]/40 dark:border-[#773344]/40 lg:pl-6 shrink-0">
            <div>
              <span className="text-[11px] font-bold text-[#773344]/75 dark:text-[#E3B5A4]/75 block">
                {t('grandTotalLabel')}
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#D44D5C] tabular-nums">
                {formatCurrency(Number(grandTotal) || 0, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Image on Left (Desktop), Form on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Receipt Image Preview & Controls */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sticky top-20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('receiptImage')}
            </span>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white"
                title={t('zoomIn')}
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white"
                title={t('zoomOut')}
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white"
                title={t('resetZoom')}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setFullscreenModal(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white"
                title={t('fullscreenImage')}
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative mt-3 h-[450px] sm:h-[550px] overflow-auto rounded-2xl bg-slate-950/5 dark:bg-slate-950/40 flex items-center justify-center p-2 border border-slate-200/50 dark:border-slate-800/50">
            {receiptImageUrl ? (
              <img
                src={receiptImageUrl}
                alt="Receipt Scan"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                className="max-h-full max-w-full object-contain rounded-lg shadow transition-transform duration-150"
              />
            ) : (
              <div className="text-center p-6 text-slate-400">
                <Store className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No image preview available</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Editable Review Form */}
        <div className="lg:col-span-7 space-y-6">
          <form id="review-receipt-form" onSubmit={handleSave} className="space-y-6">
            {/* Store & Metadata Card */}
            <div className="rounded-3xl border border-[#E3B5A4]/40 bg-white p-6 shadow-sm dark:border-[#773344]/40 dark:bg-[#160029] space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#D44D5C] dark:text-[#E3B5A4] flex items-center gap-2">
                <Store className="h-4 w-4" />
                <span>ข้อมูลร้านค้าและใบเสร็จ (General Details)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Merchant Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#773344] dark:text-[#E3B5A4] mb-1">
                    {t('merchantLabel')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full rounded-2xl border border-[#E3B5A4]/50 bg-white px-3.5 py-2 text-sm text-[#160029] focus:border-[#D44D5C] focus:ring-2 focus:ring-[#D44D5C]/20 dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2]"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-[#773344] dark:text-[#E3B5A4] mb-1 flex items-center justify-between">
                    <span>{t('dateLabel')} *</span>
                    <span className="text-[10px] text-[#D44D5C] dark:text-[#E3B5A4] font-normal">
                      พ.ศ. ➔ ค.ศ.
                    </span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-2xl border border-[#E3B5A4]/50 bg-white px-3.5 py-2 text-sm text-[#160029] focus:border-[#D44D5C] focus:ring-2 focus:ring-[#D44D5C]/20 dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {t('dateHelpThai')}
                  </p>
                </div>

                {/* Time */}
                <div>
                  <label className="block text-xs font-semibold text-[#773344] dark:text-[#E3B5A4] mb-1">
                    {t('timeLabel')} (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-2xl border border-[#E3B5A4]/50 bg-white px-3.5 py-2 text-sm text-[#160029] focus:border-[#D44D5C] focus:ring-2 focus:ring-[#D44D5C]/20 dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2]"
                  />
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[#773344] dark:text-[#E3B5A4] mb-1">
                    {t('categoryLabel')}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ReceiptCategory)}
                    className="w-full rounded-2xl border border-[#E3B5A4]/50 bg-white px-3.5 py-2 text-sm text-[#160029] focus:border-[#D44D5C] focus:ring-2 focus:ring-[#D44D5C]/20 dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2]"
                  >
                    {Object.keys(CATEGORY_CONFIG).map((catKey) => (
                      <option key={catKey} value={catKey}>
                        {t(`cat_${catKey}` as any)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-[#773344] dark:text-[#E3B5A4] mb-1">
                    {t('paymentMethodLabel')}
                  </label>
                  <input
                    type="text"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="Cash, PromptPay, Credit Card, TrueMoney..."
                    className="w-full rounded-2xl border border-[#E3B5A4]/50 bg-white px-3.5 py-2 text-sm text-[#160029] focus:border-[#D44D5C] focus:ring-2 focus:ring-[#D44D5C]/20 dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2]"
                  />
                </div>
              </div>
            </div>

            {/* Line Items Card */}
            <div className="rounded-3xl border border-[#E3B5A4]/40 bg-white p-6 shadow-sm dark:border-[#773344]/40 dark:bg-[#160029] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#D44D5C] dark:text-[#E3B5A4] flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span>{t('lineItemsTitle')} ({items.length})</span>
                </h3>

                <button
                  type="button"
                  onClick={addItemRow}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#D44D5C] hover:text-[#BF3F4E] bg-[#F5E9E2] dark:bg-[#240E38] px-3 py-1.5 rounded-xl transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('addItemBtn')}</span>
                </button>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                      <th className="py-2 pr-2">{t('itemName')}</th>
                      <th className="py-2 px-2 w-16 text-center">{t('qty')}</th>
                      <th className="py-2 px-2 w-24 text-right">{t('unitPrice')}</th>
                      <th className="py-2 px-2 w-24 text-right">{t('lineTotal')}</th>
                      <th className="py-2 pl-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {items.map((item, index) => (
                      <tr key={item.id || index} className="group">
                        <td className="py-2 pr-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                            placeholder="Product name / รายการ..."
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full text-center rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            className="w-full text-right rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.total}
                            onChange={(e) => handleItemChange(index, 'total', e.target.value)}
                            className="w-full text-right rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white"
                          />
                        </td>
                        <td className="py-2 pl-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            disabled={items.length <= 1}
                            className="text-slate-400 hover:text-rose-500 disabled:opacity-30 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Subtotal of items */}
              <div className="flex justify-between items-center pt-2 text-xs text-slate-500 dark:text-slate-400">
                <span>ยอดรวมสินค้า ({items.length} รายการ):</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(itemsSum, currency)}
                </span>
              </div>
            </div>

            {/* Financial Summary & Math Validation Warning */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#D44D5C] dark:text-[#E3B5A4] flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                <span>สรุปยอดเงินและภาษี (Totals & Taxes)</span>
              </h3>

              {/* Math Mismatch Warning Banner */}
              {isMathMismatch && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 text-amber-800 dark:text-amber-300">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold">
                        {t('mathMismatchWarning', {
                          itemSum: itemsSum.toFixed(2),
                          total: grandTotal.toFixed(2),
                        })}
                      </p>
                      <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                        อาจมีส่วนลด ภาษี หรือยอดเงินที่อ่านไม่ครบถ้วน
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRecalculateTotal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition shrink-0"
                  >
                    <Calculator className="h-3.5 w-3.5" />
                    <span>{t('recalcTotalBtn')}</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('subtotalLabel')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={subtotal}
                    onChange={(e) => setSubtotal(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('taxLabel')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tax}
                    onChange={(e) => setTax(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('discountLabel')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('serviceChargeLabel')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Grand Total */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {t('grandTotalLabel')}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    สกุลเงิน: {currency}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-400">
                    {currency === 'THB' ? '฿' : currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={grandTotal}
                    onChange={(e) => setGrandTotal(Number(e.target.value))}
                    className="w-36 text-right rounded-2xl border border-[#D44D5C]/40 bg-[#F5E9E2]/60 p-2 text-lg font-black text-[#D44D5C] focus:border-[#D44D5C] focus:ring-2 focus:ring-[#D44D5C]/20 dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F4DFD7]"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-3xl border border-[#E3B5A4]/40 bg-white p-6 shadow-sm dark:border-[#773344]/40 dark:bg-[#160029]">
              <label className="block text-xs font-semibold text-[#773344] dark:text-[#E3B5A4] mb-1">
                {t('notesLabel')}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="โน้ตเพิ่มเติมเกี่ยวกับใบเสร็จนี้..."
                className="w-full rounded-2xl border border-[#E3B5A4]/50 bg-white p-3 text-xs text-[#160029] focus:border-[#D44D5C] focus:ring-2 focus:ring-[#D44D5C]/20 dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2]"
              />
            </div>

            {/* Sticky High-Visibility Save Action Bar */}
            <div className="sticky bottom-3 z-30 rounded-2xl border border-[#E3B5A4]/70 bg-white/95 dark:border-[#773344]/70 dark:bg-[#160029]/95 backdrop-blur-md px-4 py-3 shadow-xl shadow-[#160029]/10 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#773344] dark:text-[#E3B5A4] truncate">
                  {merchant || 'Store'}
                </p>
                <p className="text-base font-black text-[#D44D5C] tabular-nums">
                  {formatCurrency(Number(grandTotal) || 0, currency)}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/upload')}
                  className="px-4 py-2.5 min-h-[44px] rounded-2xl border border-[#E3B5A4] text-xs font-bold text-[#773344] hover:bg-[#F5E9E2] dark:border-[#773344] dark:text-[#E3B5A4] dark:hover:bg-[#240E38] transition whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t('cancel')}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-7 py-2.5 min-h-[44px] rounded-2xl bg-[#D44D5C] text-sm font-extrabold text-white shadow-lg shadow-[#D44D5C]/35 hover:bg-[#BF3F4E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D44D5C] disabled:opacity-50 transition whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Save className="h-4 w-4 shrink-0" />
                  <span>{saving ? t('savingReceipt') : t('saveReceiptBtn')}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {fullscreenModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setFullscreenModal(false)}
        >
          <button
            onClick={() => setFullscreenModal(false)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={receiptImageUrl}
            alt="Fullscreen Receipt"
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
