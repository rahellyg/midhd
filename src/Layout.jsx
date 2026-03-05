import DailyMotivation from '@/components/layout/DailyMotivation';
import SiteCredit from '@/components/layout/SiteCredit';

export default function Layout({ children, currentPageName }) {
    const isHomePage = currentPageName === 'Dashboard';

    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #edf5ea 0%, #f8f2e6 52%, #e6efe2 100%)" }}>
        {!isHomePage && <DailyMotivation />}
        {children}
        <SiteCredit />
      </div>
    );
  }