/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { LanguageProvider, useLanguage } from './context/LanguageContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { UploadPage } from './pages/UploadPage.tsx';
import { ReviewReceiptPage } from './pages/ReviewReceiptPage.tsx';
import { ReceiptListPage } from './pages/ReceiptListPage.tsx';
import { ExportPage } from './pages/ExportPage.tsx';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F3EF] dark:bg-[#120022]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#D44D5C]" />
          <span className="text-xs font-semibold text-[#773344] dark:text-[#E3B5A4]">
            {t('loading')}
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F3EF] dark:bg-[#120022]">
        <Loader2 className="h-8 w-8 animate-spin text-[#D44D5C]" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <BrowserRouter>
              <div className="min-h-screen flex flex-col bg-[#F8F3EF] text-[#160029] dark:bg-[#120022] dark:text-[#F5E9E2] selection:bg-[#D44D5C] selection:text-white">
                <Navbar />
                <main className="flex-1">
                  <Routes>
                    {/* Public Auth Routes */}
                    <Route
                      path="/login"
                      element={
                        <PublicOnlyRoute>
                          <LoginPage />
                        </PublicOnlyRoute>
                      }
                    />
                    <Route
                      path="/register"
                      element={
                        <PublicOnlyRoute>
                          <RegisterPage />
                        </PublicOnlyRoute>
                      }
                    />

                    {/* Protected Main App Routes */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/upload"
                      element={
                        <ProtectedRoute>
                          <UploadPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/review"
                      element={
                        <ProtectedRoute>
                          <ReviewReceiptPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/receipts"
                      element={
                        <ProtectedRoute>
                          <ReceiptListPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/export"
                      element={
                        <ProtectedRoute>
                          <ExportPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Catch all fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
