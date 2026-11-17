import { ReceiptCategory } from '../../shared/types.ts';
import {
  Utensils,
  Car,
  ShoppingCart,
  ShoppingBag,
  FileText,
  HeartPulse,
  Sparkles,
  Tag,
  LucideIcon,
} from 'lucide-react';

export interface CategoryMeta {
  key: ReceiptCategory;
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  borderColor: string;
  chartColor: string;
}

export const CATEGORY_CONFIG: Record<ReceiptCategory, CategoryMeta> = {
  food: {
    key: 'food',
    icon: Utensils,
    bgColor: 'bg-[#D44D5C]/15 dark:bg-[#D44D5C]/25',
    textColor: 'text-[#D44D5C] dark:text-[#E3B5A4]',
    borderColor: 'border-[#D44D5C]/30',
    chartColor: '#D44D5C', // Lobster Pink
  },
  groceries: {
    key: 'groceries',
    icon: ShoppingCart,
    bgColor: 'bg-[#773344]/15 dark:bg-[#773344]/30',
    textColor: 'text-[#773344] dark:text-[#F5E9E2]',
    borderColor: 'border-[#773344]/30',
    chartColor: '#773344', // Wine Plum
  },
  shopping: {
    key: 'shopping',
    icon: ShoppingBag,
    bgColor: 'bg-[#E3B5A4]/25 dark:bg-[#E3B5A4]/20',
    textColor: 'text-[#873447] dark:text-[#E3B5A4]',
    borderColor: 'border-[#E3B5A4]/50',
    chartColor: '#E3B5A4', // Almond Silk
  },
  transport: {
    key: 'transport',
    icon: Car,
    bgColor: 'bg-[#A63A50]/15 dark:bg-[#A63A50]/25',
    textColor: 'text-[#A63A50] dark:text-[#F4DFD7]',
    borderColor: 'border-[#A63A50]/30',
    chartColor: '#A63A50',
  },
  bills: {
    key: 'bills',
    icon: FileText,
    bgColor: 'bg-[#5C2734]/15 dark:bg-[#5C2734]/30',
    textColor: 'text-[#5C2734] dark:text-[#E3B5A4]',
    borderColor: 'border-[#5C2734]/30',
    chartColor: '#5C2734',
  },
  health: {
    key: 'health',
    icon: HeartPulse,
    bgColor: 'bg-[#C46D7D]/15 dark:bg-[#C46D7D]/25',
    textColor: 'text-[#C46D7D] dark:text-[#F4DFD7]',
    borderColor: 'border-[#C46D7D]/30',
    chartColor: '#C46D7D',
  },
  entertainment: {
    key: 'entertainment',
    icon: Sparkles,
    bgColor: 'bg-[#E08575]/15 dark:bg-[#E08575]/25',
    textColor: 'text-[#C05545] dark:text-[#E3B5A4]',
    borderColor: 'border-[#E08575]/30',
    chartColor: '#E08575',
  },
  other: {
    key: 'other',
    icon: Tag,
    bgColor: 'bg-[#773344]/10 dark:bg-[#773344]/20',
    textColor: 'text-[#773344] dark:text-[#E3B5A4]',
    borderColor: 'border-[#773344]/20',
    chartColor: '#9A5868',
  },
};

export function formatCurrency(amount: number, currency: string = 'THB'): string {
  const symbol = currency === 'THB' ? '฿' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : `${currency} `;
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateThai(dateStr: string, language: 'th' | 'en'): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (language === 'th') {
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    const beYear = year + 543;
    return `${day} ${thaiMonths[month - 1] || ''} ${beYear}`;
  } else {
    const enMonths = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${day} ${enMonths[month - 1] || ''} ${year}`;
  }
}
