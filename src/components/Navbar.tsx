import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  ScanLine,
  ListFilter,
  Sun,
  Moon,
  Laptop,
  Languages,
  LogOut,
  User,
  Menu,
  X,
  Sparkles,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { ReceiptLogo } from './ReceiptLogo.tsx';

export const Navbar: React.FC = () => {
  const { user, logout, demoLogin } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');

  const navLinks = [
    { to: '/', label: t('dashboard'), icon: LayoutDashboard },
    { to: '/receipts', label: t('receipts'), icon: ListFilter },
    { to: '/upload', label: t('upload'), icon: ScanLine, highlight: true },
    { to: '/export', label: t('exports'), icon: FileSpreadsheet },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearch.trim()) {
      navigate(`/receipts?search=${encodeURIComponent(navSearch.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E3B5A4]/40 bg-[#FFFFFF]/90 backdrop-blur-md dark:border-[#773344]/40 dark:bg-[#160029]/90 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <ReceiptLogo className="h-10 w-10 group-hover:scale-105" />
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight text-[#160029] dark:text-[#F5E9E2] text-lg flex items-center gap-1.5 leading-none">
              ไหน Receipt
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#D44D5C]/15 text-[#D44D5C] dark:bg-[#D44D5C]/30 dark:text-[#E3B5A4]">
                AI
              </span>
            </span>
            <span className="text-[10px] font-medium text-[#773344] dark:text-[#E3B5A4] mt-0.5 tracking-wide">
              Smart Expense Tracker
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        {user && (
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const active = isActive(link.to);
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    link.highlight
                      ? 'bg-[#D44D5C] text-white hover:bg-[#BF3F4E] shadow-sm shadow-[#D44D5C]/30'
                      : active
                      ? 'bg-[#F5E9E2] text-[#773344] dark:bg-[#773344]/50 dark:text-[#F5E9E2] shadow-xs'
                      : 'text-[#773344] hover:text-[#160029] hover:bg-[#F5E9E2]/60 dark:text-[#E3B5A4] dark:hover:text-white dark:hover:bg-[#240E38]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Header Search (styled like the reference mockup) */}
        {user && (
          <form
            onSubmit={handleNavSearch}
            className="hidden lg:flex items-center relative flex-1 max-w-xs"
          >
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="Search receipt, merchant..."
              className="w-full rounded-2xl border border-[#E3B5A4]/60 bg-[#F5E9E2]/30 pl-9 pr-3 py-1.5 text-xs text-[#160029] placeholder-[#773344]/50 focus:border-[#D44D5C] focus:bg-white focus:outline-none dark:border-[#773344]/60 dark:bg-[#240E38] dark:text-[#F5E9E2] dark:placeholder-[#E3B5A4]/40"
            />
            <Search className="absolute left-3 h-3.5 w-3.5 text-[#773344]/60 dark:text-[#E3B5A4]/60" />
          </form>
        )}

        {/* Actions & Profile (Right side) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#E3B5A4]/50 dark:border-[#773344]/60 text-xs font-bold text-[#773344] dark:text-[#E3B5A4] hover:bg-[#F5E9E2] dark:hover:bg-[#240E38] transition"
            title="Toggle language"
          >
            <Languages className="h-3.5 w-3.5 text-[#D44D5C]" />
            <span>{language === 'th' ? 'ไทย' : 'EN'}</span>
          </button>

          {/* Theme Switcher */}
          <div className="relative">
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="p-2 rounded-xl border border-[#E3B5A4]/50 dark:border-[#773344]/60 text-[#773344] dark:text-[#E3B5A4] hover:bg-[#F5E9E2] dark:hover:bg-[#240E38] transition"
              title="Theme settings"
            >
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 text-[#E3B5A4]" />
              ) : theme === 'light' ? (
                <Sun className="h-4 w-4 text-[#D44D5C]" />
              ) : (
                <Laptop className="h-4 w-4 text-[#773344] dark:text-[#E3B5A4]" />
              )}
            </button>

            {themeDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-36 space-y-1 rounded-2xl border border-[#E3B5A4]/60 dark:border-[#773344] bg-white dark:bg-[#160029] p-1.5 shadow-xl z-50 animate-in fade-in"
                onClick={() => setThemeDropdownOpen(false)}
              >
                <button
                  onClick={() => setTheme('light')}
                  className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold ${
                    theme === 'light'
                      ? 'bg-[#F5E9E2] text-[#D44D5C]'
                      : 'text-[#773344] hover:bg-[#F5E9E2]/60 dark:text-[#E3B5A4] dark:hover:bg-[#240E38]'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  {t('light')}
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold ${
                    theme === 'dark'
                      ? 'bg-[#773344] text-[#F5E9E2]'
                      : 'text-[#773344] hover:bg-[#F5E9E2]/60 dark:text-[#E3B5A4] dark:hover:bg-[#240E38]'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  {t('dark')}
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold ${
                    theme === 'system'
                      ? 'bg-[#E3B5A4]/40 text-[#773344] dark:bg-[#773344] dark:text-white'
                      : 'text-[#773344] hover:bg-[#F5E9E2]/60 dark:text-[#E3B5A4] dark:hover:bg-[#240E38]'
                  }`}
                >
                  <Laptop className="h-3.5 w-3.5" />
                  {t('system')}
                </button>
              </div>
            )}
          </div>

          {/* User Profile pill in reference style (e.g. icon circle + name) */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 border-l border-[#E3B5A4]/50 dark:border-[#773344]/50">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-2xl bg-[#F5E9E2]/70 dark:bg-[#240E38] border border-[#E3B5A4]/40 dark:border-[#773344]/40">
                <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#D44D5C] to-[#773344] flex items-center justify-center text-white text-[11px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-[#160029] dark:text-[#F5E9E2] max-w-[90px] truncate">
                  {user.name.split(' ')[0]}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-[#773344]/60 hover:text-[#D44D5C] dark:text-[#E3B5A4]/60 dark:hover:text-[#D44D5C] rounded-lg transition"
                title={t('logout')}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={demoLogin}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#D44D5C]/15 text-[#D44D5C] hover:bg-[#D44D5C]/25 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Demo
              </button>
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#D44D5C] text-white hover:bg-[#BF3F4E] shadow-sm shadow-[#D44D5C]/25"
              >
                {t('login')}
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          {user && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#773344] dark:text-[#E3B5A4] hover:bg-[#F5E9E2] dark:hover:bg-[#240E38]"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {user && mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E3B5A4]/30 bg-white dark:bg-[#160029] px-4 pt-3 pb-5 space-y-1.5 animate-in slide-in-from-top duration-200">
          {navLinks.map((link) => {
            const active = isActive(link.to);
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                  active
                    ? 'bg-[#F5E9E2] text-[#D44D5C] dark:bg-[#773344] dark:text-[#F5E9E2]'
                    : 'text-[#773344] dark:text-[#E3B5A4] hover:bg-[#F5E9E2]/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
