import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Calendar,
  Filter,
  ExternalLink,
  Sparkles,
  Table,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { CATEGORY_CONFIG, formatCurrency, formatDateThai } from '../utils/categories.ts';
import { apiFetch, downloadProtectedFile } from '../utils/api.ts';

export const ExportPage: React.FC = () => {
  const { t, language } = useLanguage();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState('all');

  const [rows, setRows] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchExportPreview = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      if (category && category !== 'all') params.append('category', category);

      const res = await apiFetch(`/api/v1/export/data?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (e) {
      console.error('Error fetching export data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExportPreview();
  }, [from, to, category]);

  const handleDownloadCsv = async () => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (category && category !== 'all') params.append('category', category);
    try {
      await downloadProtectedFile(`/api/v1/export/csv?${params.toString()}`, 'receipts_export.csv');
    } catch (e) {
      console.error('CSV download error:', e);
    }
  };

  const handleDownloadXlsx = async () => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (category && category !== 'all') params.append('category', category);
    try {
      await downloadProtectedFile(`/api/v1/export/xlsx?${params.toString()}`, 'receipts_export.xlsx');
    } catch (e) {
      console.error('XLSX download error:', e);
    }
  };

  const handleCopyToClipboard = () => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const lines = [headers.join('\t')];
    for (const r of rows) {
      lines.push(headers.map((h) => r[h] ?? '').join('\t'));
    }
    const tsvText = lines.join('\n');
    navigator.clipboard.writeText(tsvText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#160029] dark:text-[#F5E9E2] tracking-tight flex items-center gap-2.5">
          <FileSpreadsheet className="h-7 w-7 text-[#D44D5C]" />
          <span>{t('exportTitle')}</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#773344] dark:text-[#E3B5A4]">
          {t('exportSubtitle')}
        </p>
      </div>

      {/* Filter and Download Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Filters - 5 cols */}
        <div className="lg:col-span-5 rounded-3xl border border-[#E3B5A4]/40 bg-white p-6 shadow-sm dark:border-[#773344]/40 dark:bg-[#160029] space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#773344] dark:text-[#E3B5A4] flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#D44D5C]" />
            <span>ตัวกรองข้อมูลส่งออก (Export Scope)</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[#773344] dark:text-[#E3B5A4] mb-1">
                {t('categoryLabel')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-[#E3B5A4]/60 bg-white p-2.5 text-[#160029] dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2]"
              >
                <option value="all">{t('allCategories')}</option>
                {Object.keys(CATEGORY_CONFIG).map((catKey) => (
                  <option key={catKey} value={catKey}>
                    {t(`cat_${catKey}` as any)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#773344] dark:text-[#E3B5A4] mb-1">
                  {t('fromDate')}
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-2xl border border-[#E3B5A4]/60 bg-white p-2 text-[#160029] dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#773344] dark:text-[#E3B5A4] mb-1">
                  {t('toDate')}
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-2xl border border-[#E3B5A4]/60 bg-white p-2 text-[#160029] dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2]"
                />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[11px] text-[#773344]/80 dark:text-[#E3B5A4]/80">
                พบทั้งหมด <strong className="text-[#160029] dark:text-white">{rows.length}</strong> แถวสินค้า (จาก {totalCount} ใบเสร็จ)
              </p>
            </div>
          </div>
        </div>

        {/* Export Formats Buttons - 7 cols */}
        <div className="lg:col-span-7 rounded-3xl border border-[#E3B5A4]/40 bg-white p-6 shadow-sm dark:border-[#773344]/40 dark:bg-[#160029] flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#773344] dark:text-[#E3B5A4] mb-1">
              เลือกรูปแบบไฟล์สำหรับดาวน์โหลด
            </h3>
            <p className="text-xs text-[#773344]/80 dark:text-[#E3B5A4]/80">
              แต่ละแถวจะแสดงรายละเอียดสินค้าแต่ละชิ้น วันที่ ร้านค้า ยอดเงิน และหมวดหมู่
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* CSV */}
            <button
              onClick={handleDownloadCsv}
              disabled={rows.length === 0}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#E3B5A4]/50 p-4 hover:border-[#D44D5C] hover:bg-[#F5E9E2]/50 dark:border-[#773344] dark:hover:bg-[#240E38] disabled:opacity-40 transition group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5E9E2] text-[#D44D5C] dark:bg-[#240E38] group-hover:scale-105 transition-transform">
                <Download className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-[#160029] dark:text-[#F5E9E2]">
                CSV (.csv)
              </span>
              <span className="text-[10px] text-slate-400 text-center">
                UTF-8 รองรับภาษาไทย
              </span>
            </button>

            {/* Excel XLSX */}
            <button
              onClick={handleDownloadXlsx}
              disabled={rows.length === 0}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#E3B5A4]/50 p-4 hover:border-[#773344] hover:bg-[#F5E9E2]/50 dark:border-[#773344] dark:hover:bg-[#240E38] disabled:opacity-40 transition group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E3B5A4]/30 text-[#773344] dark:bg-[#773344] dark:text-[#F5E9E2] group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-[#160029] dark:text-[#F5E9E2]">
                Excel (.xlsx)
              </span>
              <span className="text-[10px] text-slate-400 text-center">
                จัดรูปแบบคอลัมน์อัตโนมัติ
              </span>
            </button>

            {/* Google Sheets TSV Copy */}
            <button
              onClick={handleCopyToClipboard}
              disabled={rows.length === 0}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#E3B5A4]/50 p-4 hover:border-[#D44D5C] hover:bg-[#F5E9E2]/50 dark:border-[#773344] dark:hover:bg-[#240E38] disabled:opacity-40 transition group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D44D5C]/15 text-[#D44D5C] dark:bg-[#D44D5C]/30 dark:text-[#F4DFD7] group-hover:scale-105 transition-transform">
                {copied ? <Check className="h-6 w-6 text-[#D44D5C]" /> : <Copy className="h-6 w-6" />}
              </div>
              <span className="text-xs font-bold text-[#160029] dark:text-[#F5E9E2]">
                Google Sheets
              </span>
              <span className="text-[10px] text-slate-400 text-center">
                {copied ? 'คัดลอกสำเร็จ!' : 'คัดลอกเพื่อวาง (Ctrl+V)'}
              </span>
            </button>
          </div>

          {copied && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {t('copiedToClipboard')}
            </div>
          )}
        </div>
      </div>

      {/* Live Preview Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Table className="h-4 w-4 text-indigo-500" />
            <span>{t('previewExportTitle')}</span>
          </h3>
          <span className="text-xs text-slate-400">
            แสดง {Math.min(rows.length, 15)} รายการแรก
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">{t('loading')}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            ไม่มีข้อมูลที่ตรงกับตัวกรอง
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Merchant</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                  <th className="py-2.5 px-3 text-right">Receipt Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.slice(0, 15).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{row.Date}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{row.Merchant}</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{row.Category}</td>
                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{row['Item Name']}</td>
                    <td className="py-2 px-3 text-center">{row.Quantity}</td>
                    <td className="py-2 px-3 text-right">{row['Unit Price']}</td>
                    <td className="py-2 px-3 text-right font-medium">{row['Line Total']}</td>
                    <td className="py-2 px-3 text-right font-bold text-[#D44D5C]">
                      {row['Receipt Grand Total']} {row.Currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
