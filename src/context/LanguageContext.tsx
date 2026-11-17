import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations.ts';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.th, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language') as Language;
    return saved === 'en' || saved === 'th' ? saved : 'th'; // Thai by default
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: keyof typeof translations.th, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.th;
    let text = (dict as any)[key] || (translations.th as any)[key] || key;
    if (params) {
      Object.keys(params).forEach((p) => {
        text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), String(params[p]));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
