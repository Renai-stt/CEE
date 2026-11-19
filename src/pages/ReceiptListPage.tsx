import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  Edit2,
  Eye,
  FileSpreadsheet,
  Plus,
  Calendar,
  X,
  Check,
  AlertTriangle,
  Receipt,
  Sparkles,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { IReceipt, ReceiptCategory } from '../../shared/types.ts';
import { CATEGORY_CONFIG, formatCurrency, formatDateThai } from '../utils/categories.ts';
import { apiFetch } from '../utils/api.ts';

export const ReceiptListPage: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [receipts, setReceipts] = useState<IReceipt[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedReceipt, setSelectedReceipt] = useState<IReceipt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IReceipt | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Edit in modal
  const [editingReceipt, setEditingReceipt] = useState<IReceipt | null>(null);
  const [editMerchant, setEditMerchant] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTotal, setEditTotal] = useState<number>(0);
  const [editCategory, setEditCategory] = useState<ReceiptCategory>('other');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      params.append('sort', sort);
      if (search) params.append('search', search);
      if (category && category !== 'all') params.append('category', category);
      if (from) params.append('from', from);
      if (to) params.append('to', to);

      const res = await apiFetch(`/api/v1/receipts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReceipts(data.receipts || []);
        setTotalCount(data.pagination?.totalCount || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (e) {
      console.error('Failed to load receipts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [page, sort, category, from, to]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReceipts();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/v1/receipts/${deleteTarget._id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteTarget(null);
        fetchReceipts();
      }
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (r: IReceipt) => {
    setEditingReceipt(r);
    setEditMerchant(r.merchant);
    setEditDate(r.date);
    setEditTotal(r.total);
    setEditCategory(r.category);
    setEditNotes(r.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceipt) return;
    setSavingEdit(true);
    try {
      const res = await apiFetch(`/api/v1/receipts/${editingReceipt._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: editMerchant,
          date: editDate,
          total: Number(editTotal),
          category: editCategory,
          notes: editNotes,
        }),
      });
      if (res.ok) {
        setEditingReceipt(null);
        fetchReceipts();
      }
    } catch (e) {
      console.error('Update failed:', e);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#160029] dark:text-[#F5E9E2] tracking-tight">
            {t('receiptListTitle')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#773344] dark:text-[#E3B5A4]">
            {t('receiptListSubtitle')} ({totalCount} ใบเสร็จ)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/export"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-[#E3B5A4] bg-white px-3.5 py-2 text-xs font-bold text-[#773344] hover:bg-[#F5E9E2] dark:border-[#773344] dark:bg-[#240E38] dark:text-[#E3B5A4] transition"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#D44D5C]" />
            <span>{t('exports')}</span>
          </Link>

          <Link
            to="/upload"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#D44D5C] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#BF3F4E] transition"
          >
            <Plus className="h-4 w-4" />
            <span>{t('upload')}</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl border border-[#E3B5A4]/40 bg-white p-4 sm:p-5 shadow-sm dark:border-[#773344]/40 dark:bg-[#160029] space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search text */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#773344]/50 dark:text-[#E3B5A4]/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-2xl border border-[#E3B5A4]/60 bg-[#F5E9E2]/30 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#160029] focus:border-[#D44D5C] focus:outline-none focus:ring-2 focus:ring-[#D44D5C]/20 dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2]"
            />
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-2xl border border-[#E3B5A4]/60 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-[#773344] dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2]"
          >
            <option value="all">{t('allCategories')}</option>
            {Object.keys(CATEGORY_CONFIG).map((catKey) => (
              <option key={catKey} value={catKey}>
                {t(`cat_${catKey}` as any)}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="rounded-2xl border border-[#E3B5A4]/60 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-[#773344] dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2]"
          >
            <option value="date_desc">{t('sortNewest')}</option>
            <option value="date_asc">{t('sortOldest')}</option>
            <option value="total_desc">{t('sortHighest')}</option>
            <option value="total_asc">{t('sortLowest')}</option>
            <option value="merchant_asc">{t('sortMerchant')}</option>
          </select>

          {/* Submit Search Button */}
          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-[#D44D5C] text-white hover:bg-[#BF3F4E] text-xs sm:text-sm font-bold shadow-xs transition"
          >
            ค้นหา
          </button>
        </form>

        {/* Date Filter row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 flex items-center gap-1 font-medium">
            <Calendar className="h-3.5 w-3.5" />
            ช่วงวันที่:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <span className="text-slate-400">➔</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {(from || to || search || category !== 'all') && (
              <button
                onClick={() => {
                  setFrom('');
                  setTo('');
                  setSearch('');
                  setCategory('all');
                  setPage(1);
                }}
                className="text-xs text-rose-500 hover:underline ml-2"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table of Receipts */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('loading')}</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {t('noReceiptsFound')}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              ลองปรับตัวกรองการค้นหา หรือสแกนใบเสร็จใหม่
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">{t('tableMerchant')}</th>
                  <th className="py-3.5 px-4">{t('tableDate')}</th>
                  <th className="py-3.5 px-4">{t('tableCategory')}</th>
                  <th className="py-3.5 px-4">{t('tableItems')}</th>
                  <th className="py-3.5 px-4 text-right">{t('tableTotal')}</th>
                  <th className="py-3.5 px-4 text-center">{t('tableActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {receipts.map((r) => {
                  const conf = CATEGORY_CONFIG[r.category] || CATEGORY_CONFIG.other;
                  const Icon = conf.icon;
                  return (
                    <tr
                      key={r._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Merchant & Photo thumb */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {r.imageUrl ? (
                            <button
                              onClick={() => setLightboxImage(r.imageUrl!)}
                              className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 hover:opacity-80 transition"
                              title="Click to view image"
                            >
                              <img
                                src={r.imageUrl}
                                alt={r.merchant}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ) : (
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${conf.bgColor} ${conf.textColor}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block max-w-xs truncate">
                              {r.merchant}
                            </span>
                            {r.notes && (
                              <span className="text-[11px] text-slate-400 block max-w-xs truncate">
                                {r.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {formatDateThai(r.date, language)}
                        {r.time && <span className="text-[11px] text-slate-400 ml-1.5">{r.time}</span>}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${conf.bgColor} ${conf.textColor}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{t(`cat_${r.category}` as any)}</span>
                        </span>
                      </td>

                      {/* Line Items Count */}
                      <td className="py-3 px-4 text-[#773344] dark:text-[#E3B5A4]">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          className="hover:text-[#D44D5C] font-semibold"
                        >
                          {t('itemsCount', { count: r.items?.length || 0 })}
                        </button>
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-[#160029] dark:text-[#F5E9E2]">
                          {formatCurrency(r.total, r.currency)}
                        </span>
                        {r.paymentMethod && (
                          <span className="block text-[10px] text-[#773344]/60 dark:text-[#E3B5A4]/60">
                            {r.paymentMethod}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedReceipt(r)}
                            className="p-1.5 rounded-xl text-[#773344]/70 hover:text-[#D44D5C] hover:bg-[#F5E9E2] dark:text-[#E3B5A4]/70 dark:hover:bg-[#240E38] transition"
                            title={t('view')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition"
                            title={t('edit')}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                            title={t('delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">
              {t('pageOf', { current: page, total: totalPages })}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Details Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedReceipt.merchant}
                </h3>
                <p className="text-xs text-slate-500">
                  {formatDateThai(selectedReceipt.date, language)} • {selectedReceipt.time || ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Photo preview if exists */}
              {selectedReceipt.imageUrl && (
                <div className="relative rounded-2xl overflow-hidden bg-slate-950/5 max-h-56 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                  <img
                    src={selectedReceipt.imageUrl}
                    alt="Receipt"
                    className="max-h-56 object-contain"
                  />
                  <button
                    onClick={() => {
                      setLightboxImage(selectedReceipt.imageUrl!);
                    }}
                    className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white text-xs flex items-center gap-1 hover:bg-black/80"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>ขยายภาพ</span>
                  </button>
                </div>
              )}

              {/* Line Items List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {t('lineItemsTitle')} ({selectedReceipt.items?.length || 0})
                </h4>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <tr>
                        <th className="py-2 px-3 text-left">{t('itemName')}</th>
                        <th className="py-2 px-2 text-center">{t('qty')}</th>
                        <th className="py-2 px-3 text-right">{t('unitPrice')}</th>
                        <th className="py-2 px-3 text-right">{t('lineTotal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedReceipt.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 text-slate-800 dark:text-slate-200 font-medium">
                            {it.name}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-500">
                            {it.quantity}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500">
                            {formatCurrency(it.unitPrice, selectedReceipt.currency)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(it.total, selectedReceipt.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>{t('subtotalLabel')}:</span>
                  <span>{formatCurrency(selectedReceipt.subtotal, selectedReceipt.currency)}</span>
                </div>
                {selectedReceipt.tax > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>{t('taxLabel')}:</span>
                    <span>{formatCurrency(selectedReceipt.tax, selectedReceipt.currency)}</span>
                  </div>
                )}
                {selectedReceipt.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{t('discountLabel')}:</span>
                    <span>-{formatCurrency(selectedReceipt.discount, selectedReceipt.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-[#160029] dark:text-[#F5E9E2] pt-2 border-t border-[#E3B5A4]/40 dark:border-[#773344]/40">
                  <span>{t('grandTotalLabel')}:</span>
                  <span className="text-[#D44D5C]">
                    {formatCurrency(selectedReceipt.total, selectedReceipt.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingReceipt && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setEditingReceipt(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                แก้ไขข้อมูลใบเสร็จ
              </h3>
              <button
                onClick={() => setEditingReceipt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('merchantLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={editMerchant}
                  onChange={(e) => setEditMerchant(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('dateLabel')}
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('grandTotalLabel')} (฿)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editTotal}
                    onChange={(e) => setEditTotal(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('categoryLabel')}
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as ReceiptCategory)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {Object.keys(CATEGORY_CONFIG).map((catKey) => (
                    <option key={catKey} value={catKey}>
                      {t(`cat_${catKey}` as any)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('notesLabel')}
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingReceipt(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-2xl bg-[#D44D5C] text-white font-bold hover:bg-[#BF3F4E] disabled:opacity-50 transition"
                >
                  {savingEdit ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <Trash2 className="h-7 w-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('confirmDeleteTitle')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('confirmDeleteMsg')} ({deleteTarget.merchant} - ฿{deleteTarget.total})
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? t('loading') : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Receipt Lightbox"
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
