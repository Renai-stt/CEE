import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { ReceiptLogo } from '../components/ReceiptLogo.tsx';

export const RegisterPage: React.FC = () => {
  const { register, demoLogin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    const res = await register(name, email, password);
    setSubmitting(false);
    if (res.success) {
      navigate('/login', {
        state: { registeredEmail: email, justRegistered: true },
        replace: true,
      });
    } else {
      setError(res.error || 'Registration failed');
    }
  };

  const handleDemo = async () => {
    setError('');
    setSubmitting(true);
    await demoLogin();
    setSubmitting(false);
    navigate('/');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F8F3EF] dark:bg-[#120022]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center">
            <ReceiptLogo className="h-14 w-14" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#160029] dark:text-[#F5E9E2]">
            {t('registerTitle')}
          </h1>
          <p className="text-xs font-medium text-[#773344] dark:text-[#E3B5A4]">
            {t('registerSubtitle')}
          </p>
        </div>

        <div className="rounded-3xl border border-[#E3B5A4]/50 bg-white p-6 sm:p-8 shadow-xl shadow-[#773344]/5 dark:border-[#773344]/40 dark:bg-[#160029] dark:shadow-none">
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-[#F9E8EA] p-3 text-xs font-semibold text-[#D44D5C] dark:bg-[#773344]/40 dark:text-[#F4DFD7] border border-[#D44D5C]/30">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#773344] dark:text-[#E3B5A4] mb-1.5">
                {t('nameLabel')}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-2.5 h-4 w-4 text-[#773344]/50 dark:text-[#E3B5A4]/50" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  className="w-full rounded-2xl border border-[#E3B5A4]/60 bg-[#F5E9E2]/20 pl-10 pr-3.5 py-2.5 text-xs text-[#160029] placeholder-[#773344]/40 focus:border-[#D44D5C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D44D5C]/20 dark:border-[#773344]/60 dark:bg-[#240E38] dark:text-[#F5E9E2] dark:placeholder-[#E3B5A4]/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#773344] dark:text-[#E3B5A4] mb-1.5">
                {t('emailLabel')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-[#773344]/50 dark:text-[#E3B5A4]/50" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="w-full rounded-2xl border border-[#E3B5A4]/60 bg-[#F5E9E2]/20 pl-10 pr-3.5 py-2.5 text-xs text-[#160029] placeholder-[#773344]/40 focus:border-[#D44D5C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D44D5C]/20 dark:border-[#773344]/60 dark:bg-[#240E38] dark:text-[#F5E9E2] dark:placeholder-[#E3B5A4]/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#773344] dark:text-[#E3B5A4] mb-1.5">
                {t('passwordLabel')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-[#773344]/50 dark:text-[#E3B5A4]/50" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-[#E3B5A4]/60 bg-[#F5E9E2]/20 pl-10 pr-3.5 py-2.5 text-xs text-[#160029] placeholder-[#773344]/40 focus:border-[#D44D5C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D44D5C]/20 dark:border-[#773344]/60 dark:bg-[#240E38] dark:text-[#F5E9E2] dark:placeholder-[#E3B5A4]/40"
                />
              </div>
              <p className="text-[11px] text-[#773344]/60 dark:text-[#E3B5A4]/60 mt-1 font-medium">
                Minimum 6 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#D44D5C] py-2.5 text-xs font-bold text-white shadow-md shadow-[#D44D5C]/25 hover:bg-[#BF3F4E] focus:outline-none focus:ring-2 focus:ring-[#D44D5C]/30 disabled:opacity-50 transition"
            >
              <span>{submitting ? t('loading') : t('registerBtn')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E3B5A4]/30 dark:border-[#773344]/40" />
            </div>
            <span className="relative bg-white px-2.5 text-xs font-medium text-[#773344]/60 dark:bg-[#160029] dark:text-[#E3B5A4]/60">
              หรือ
            </span>
          </div>

          <button
            type="button"
            onClick={handleDemo}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-[#E3B5A4] bg-[#F5E9E2]/60 py-2.5 text-xs font-bold text-[#773344] hover:bg-[#F5E9E2] dark:border-[#773344] dark:bg-[#240E38] dark:text-[#E3B5A4] transition"
          >
            <Sparkles className="h-4 w-4 text-[#D44D5C]" />
            <span>{t('demoLoginBtn')}</span>
          </button>

          <div className="mt-6 text-center text-xs text-[#773344] dark:text-[#E3B5A4]">
            {t('hasAccount')}{' '}
            <Link
              to="/login"
              className="font-bold text-[#D44D5C] hover:text-[#BF3F4E] underline underline-offset-2"
            >
              {t('loginBtn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
