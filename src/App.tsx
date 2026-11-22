import { Suspense, lazy, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Info, X } from 'lucide-react';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PlatformAuthProvider } from './context/PlatformAuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { HomePage } from './pages/HomePage';

const AccountPage = lazy(() =>
  import('./pages/AccountPage').then((m) => ({ default: m.AccountPage }))
);
const LoginPage = lazy(() =>
  import('./pages/AccountPage').then((m) => ({ default: m.LoginPage }))
);
const AiStudioPage = lazy(() =>
  import('./pages/AiStudioPage').then((m) => ({ default: m.AiStudioPage }))
);
const BookDemoPage = lazy(() =>
  import('./pages/BookingPages').then((m) => ({ default: m.BookDemoPage }))
);
const BookInstallationPage = lazy(() =>
  import('./pages/BookingPages').then((m) => ({ default: m.BookInstallationPage }))
);
const WarrantyRegistrationPage = lazy(() =>
  import('./pages/BookingPages').then((m) => ({ default: m.WarrantyRegistrationPage }))
);
const CartPage = lazy(() =>
  import('./pages/CartCheckoutPage').then((m) => ({ default: m.CartPage }))
);
const CheckoutPage = lazy(() =>
  import('./pages/CartCheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const AboutPage = lazy(() =>
  import('./pages/ContentPages').then((m) => ({ default: m.AboutPage }))
);
const BlogPage = lazy(() =>
  import('./pages/ContentPages').then((m) => ({ default: m.BlogPage }))
);
const ContactPage = lazy(() =>
  import('./pages/ContentPages').then((m) => ({ default: m.ContactPage }))
);
const ExperienceStoresPage = lazy(() =>
  import('./pages/ContentPages').then((m) => ({ default: m.ExperienceStoresPage }))
);
const OffersPage = lazy(() =>
  import('./pages/ContentPages').then((m) => ({ default: m.OffersPage }))
);
const PolicyPage = lazy(() =>
  import('./pages/ContentPages').then((m) => ({ default: m.PolicyPage }))
);
const HardwareLabPage = lazy(() =>
  import('./pages/HardwareLabPage').then((m) => ({ default: m.HardwareLabPage }))
);
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const ShopPage = lazy(() =>
  import('./pages/ShopPage').then((m) => ({ default: m.ShopPage }))
);
const SolutionsPage = lazy(() =>
  import('./pages/SolutionsPage').then((m) => ({ default: m.SolutionsPage }))
);
const SupportGuidePage = lazy(() =>
  import('./pages/SupportGuidePage').then((m) => ({ default: m.SupportGuidePage }))
);
const UnifiedPlatformPage = lazy(() =>
  import('./pages/UnifiedPlatformPage').then((m) => ({
    default: m.UnifiedPlatformPage,
  }))
);
const NewVehicleAppPage = lazy(() =>
  import('./pages/NewVehicleAppPage').then((m) => ({
    default: m.NewVehicleAppPage,
  }))
);
const LiveTrackingPage = lazy(() =>
  import('./pages/LiveTrackingPage').then((m) => ({
    default: m.LiveTrackingPage,
  }))
);

function ToastContainer() {
  const { toasts, dismissToast } = useStore();
  if (toasts.length === 0) return null;
  const visible = toasts.slice(-2);

  return (
    <div
      aria-live="polite"
      className="fixed bottom-16 left-4 right-18 sm:left-auto sm:right-6 lg:top-24 lg:bottom-auto z-50 flex flex-col gap-2 sm:max-w-sm"
    >
      {visible.map((t) => (
        <div
          key={t.id}
          className="rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#111B3A] px-4 py-3 shadow-xl flex items-center justify-between gap-3 text-xs font-medium text-slate-900 dark:text-white"
        >
          <div className="flex items-center gap-2">
            {t.tone === 'success' ? (
              <CheckCircle2
                className="w-4 h-4 text-emerald-600 dark:text-[#7CFF6B] shrink-0"
                aria-hidden="true"
              />
            ) : (
              <Info
                className="w-4 h-4 text-cyan-600 dark:text-[#00D4FF] shrink-0"
                aria-hidden="true"
              />
            )}
            <span>{t.text}</span>
          </div>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function MapsQuotaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onQuota = () => setVisible(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-medium flex flex-wrap items-center justify-between gap-3 shadow-md"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>
          Google Maps Platform demo quota or API key limit reached. Switch to your own Google Maps Platform API key for production traffic.
        </span>
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline font-bold"
        >
          <span>Resolve Quota Error</span>
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss Maps quota notice"
        className="p-1 rounded hover:bg-black/10 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function AppRouter() {
  const { route } = useStore();

  switch (route.page) {
    case 'home':
      return <HomePage />;
    case 'shop':
      return (
        <ShopPage
          initialCategory={route.category}
          initialSearch={route.search}
        />
      );
    case 'product':
      return <ProductDetailPage slug={route.slug} />;
    case 'solutions':
      return <SolutionsPage slug={route.slug} />;
    case 'book-installation':
      return <BookInstallationPage />;
    case 'book-demo':
      return <BookDemoPage prefillInterest={route.prefillInterest} />;
    case 'warranty':
      return <WarrantyRegistrationPage />;
    case 'offers':
      return <OffersPage />;
    case 'cart':
      return <CartPage />;
    case 'checkout':
      return <CheckoutPage />;
    case 'account':
      return <AccountPage initialTab={route.tab} />;
    case 'login':
      return <LoginPage />;
    case 'blog':
      return <BlogPage mode="blog" />;
    case 'whats-new':
      return <BlogPage mode="whats-new" />;
    case 'about':
      return <AboutPage />;
    case 'contact':
      return <ContactPage />;
    case 'experience-stores':
      return <ExperienceStoresPage />;
    case 'policy':
      return <PolicyPage slug={route.slug} />;
    case 'ai-studio':
      return <AiStudioPage initialTab={route.tab} />;
    case '3d-lab':
      return <HardwareLabPage initialProductId={route.productId} />;
    case 'support-guide':
      return <SupportGuidePage initialSection={route.section} />;
    case 'platform':
      return (
        <UnifiedPlatformPage
          initialPlatform={route.platform}
          initialRole={route.role}
          initialTrackRto={route.trackRto}
        />
      );
    case 'live-tracking':
      return <LiveTrackingPage initialRtoNumber={route.rtoNumber} />;
    case 'new-vehicle':
      return <NewVehicleAppPage />;
    default:
      return <HomePage />;
  }
}

function AppShell() {
  const { route } = useStore();
  const isStandaloneMobileApp = route.page === 'new-vehicle';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0A1128] dark:text-white transition-colors duration-200">
      <MapsQuotaBanner />
      {!isStandaloneMobileApp && <Header />}
      <main className="flex-1 flex flex-col">
        <Suspense
          fallback={
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-[#00D4FF] border-t-transparent animate-spin" />
            </div>
          }
        >
          <AppRouter />
        </Suspense>
      </main>
      {!isStandaloneMobileApp && <Footer />}
      {!isStandaloneMobileApp && <FloatingWhatsApp />}
      <OfflineIndicator />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <PlatformAuthProvider>
        <AppShell />
      </PlatformAuthProvider>
    </StoreProvider>
  );
}
