import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Login from '@/pages/Login';
import DailyTaskNotifier from '@/components/tasks/DailyTaskNotifier';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Keep rendering routes. We intentionally keep the landing page public
      // and only guard internal pages in the routing logic below.
    } else {
      return (
        <div className="fixed inset-0 flex items-center justify-center px-6">
          <div className="max-w-lg w-full rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <h1 className="text-lg font-semibold mb-2">App configuration required</h1>
            <p className="text-sm leading-6">
              {authError.message || 'Unable to initialize the app configuration.'}
            </p>
            <p className="text-sm leading-6 mt-3">
              Create <code>.env.local</code> and set <code>VITE_APP_ID</code> and <code>VITE_API_BASE_URL</code>, then restart <code>npm run dev</code>.
            </p>
          </div>
        </div>
      );
    }
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Render the main app
  return (
    <>
      <DailyTaskNotifier isAuthenticated={isAuthenticated} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router
          basename={import.meta.env.BASE_URL}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
