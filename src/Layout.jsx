import { useTranslation } from 'react-i18next';
import DailyMotivation from '@/components/layout/DailyMotivation';
import SiteCredit from '@/components/layout/SiteCredit';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Layout({ children, currentPageName }) {
  const { i18n } = useTranslation();
  const isHomePage = currentPageName === 'Dashboard';

  return (
    <div
      className="min-h-screen"
      dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
      style={{ background: "linear-gradient(135deg, #edf5ea 0%, #f8f2e6 52%, #e6efe2 100%)" }}
    >
      {!isHomePage && (
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-2 border-b border-white/50 bg-white/70 backdrop-blur">
          <a href="/" className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <img src={`${import.meta.env.BASE_URL || '/'}app-icon.svg`} alt="Midhd" className="h-8 w-8 rounded-lg" />
            <span>Midhd</span>
          </a>
          <LanguageSwitcher />
        </header>
      )}
      {!isHomePage && <DailyMotivation />}
      {children}
      <SiteCredit />
    </div>
  );
}