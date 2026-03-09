import DailyMotivation from '@/components/layout/DailyMotivation';
import SiteCredit from '@/components/layout/SiteCredit';
import { useTranslation } from 'react-i18next';

export default function Layout({ children, currentPageName }) {
  const isHomePage = currentPageName === 'Dashboard';
  const { i18n } = useTranslation();

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #edf5ea 0%, #f8f2e6 52%, #e6efe2 100%)" }}>
      {/* Language switcher removed as requested */}
      {!isHomePage && <DailyMotivation />}
      {children}
      <SiteCredit />
    </div>
  );
}