import { useState } from 'react';
import {
  ChevronDown,
  Cpu,
  Home,
  LayoutGrid,
  Menu,
  Moon,
  ShoppingCart,
  Store,
  Sun,
  User,
  X,
} from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import type { AppRoute, SolutionSlug } from '../types';
import { Logo } from './Logo';
import { PWAInstallButton } from './PWAInstallButton';
import { VehicleSearch } from './VehicleSearch';

type MenuKey = 'products' | 'solutions' | 'business' | 'resources' | 'company' | null;

const SOLUTION_ITEMS: Array<{ slug: SolutionSlug; label: string; desc: string }> = [
  { slug: 'gps-tracking', label: 'GPS Tracking', desc: 'Live telemetry & route compliance' },
  { slug: 'fuel-monitoring', label: 'Fuel Monitoring', desc: 'Anti-siphon probes & mileage audit' },
  { slug: 'dashcam', label: 'Dashcam Solutions', desc: '4G AI ADAS & driver monitoring' },
  { slug: 'smart-farming', label: 'Smart Farming', desc: 'Acreage & PTO tractor analytics' },
  { slug: 'asset-tracking', label: 'Asset Tracking', desc: '90-day magnetic & BLE beacons' },
];

export function Header() {
  const { theme, toggleTheme, route, navigate, cartTotals, user } = useStore();
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const go = (next: AppRoute) => {
    setOpenMenu(null);
    setMobileMenuOpen(false);
    navigate(next);
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1128]/95 backdrop-blur-md"
        onMouseLeave={() => setOpenMenu(null)}
      >
        {/* Top Utility Strip (Desktop only) */}
        <div className="hidden lg:block border-b border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-[#070D1F]">
          <div className="max-w-7xl mx-auto px-6 h-8 flex items-center justify-between text-xs text-slate-600 dark:text-[#A9B4D0]">
            <span>Smarter Tracking. Safer Journeys.</span>
            <nav aria-label="Quick services" className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => go({ page: 'book-installation' })}
                className="hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Book Installation
              </button>
              <button
                type="button"
                onClick={() => go({ page: 'offers' })}
                className="hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Offers
              </button>
              <button
                type="button"
                onClick={() => go({ page: 'experience-stores' })}
                className="hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Experience Stores
              </button>
              <button
                type="button"
                onClick={() => go({ page: 'warranty' })}
                className="hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Warranty Registration
              </button>
              <button
                type="button"
                onClick={() => go({ page: 'support-guide' })}
                className="hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                User Guide
              </button>
              <button
                type="button"
                data-testid="header-trackpro-utility-btn"
                onClick={() => go({ page: 'platform' })}
                className="font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                TrackPro OS (4-Role Live Portal)
              </button>
              <button
                type="button"
                data-testid="header-new-vehicle-utility-btn"
                onClick={() => go({ page: 'new-vehicle' })}
                className="font-semibold text-purple-700 dark:text-purple-300 hover:underline transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                New Vehicle Wizard
              </button>
              <button
                type="button"
                onClick={() => go({ page: 'account', tab: 'tracking' })}
                className="hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                My Account
              </button>
              <PWAInstallButton variant="compact" />
            </nav>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 lg:h-16 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="lg:hidden p-2 -ml-1 rounded-lg text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => go({ page: 'home' })}
              aria-label="VS Technology Home"
              className="whitespace-nowrap shrink-0 cursor-pointer text-left"
            >
              <Logo className="scale-90 sm:scale-95 xl:scale-100 origin-left" />
            </button>
          </div>

          {/* Desktop Primary Mega-Menu */}
          <nav
            aria-label="Main navigation"
            className="hidden lg:flex items-center gap-3.5 xl:gap-5 text-[13px] xl:text-sm font-medium text-slate-700 dark:text-[#A9B4D0]"
          >
            {(
              [
                ['products', 'Products'],
                ['solutions', 'Solutions'],
                ['business', 'Business'],
                ['resources', 'Resources'],
                ['company', 'Company'],
              ] as Array<[Exclude<MenuKey, null>, string]>
            ).map(([key, label]) => {
              const isOpen = openMenu === key;
              return (
                <button
                  key={key}
                  type="button"
                  onMouseEnter={() => setOpenMenu(key)}
                  onClick={() => setOpenMenu(isOpen ? null : key)}
                  aria-expanded={isOpen}
                  className={`inline-flex items-center gap-1 py-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isOpen
                      ? 'text-cyan-700 dark:text-[#00D4FF]'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{label}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
            <button
              type="button"
              data-testid="header-trackpro-nav-btn"
              onClick={() => go({ page: 'platform' })}
              className={`py-2 whitespace-nowrap shrink-0 font-semibold transition-colors cursor-pointer ${
                route.page === 'platform'
                  ? 'text-cyan-700 dark:text-[#00D4FF]'
                  : 'text-cyan-700 dark:text-[#00D4FF] hover:opacity-80'
              }`}
            >
              TrackPro OS
            </button>
            <button
              type="button"
              data-testid="header-new-vehicle-nav-btn"
              onClick={() => go({ page: 'new-vehicle' })}
              className={`py-2 whitespace-nowrap shrink-0 font-semibold transition-colors cursor-pointer ${
                route.page === 'new-vehicle'
                  ? 'text-purple-700 dark:text-purple-300'
                  : 'text-purple-700 dark:text-purple-300 hover:opacity-80'
              }`}
            >
              New Vehicle
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <VehicleSearch
              variant="header-trigger"
              enableShortcut
              testIdPrefix="header-vehicle-search"
            />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
              }
              className="p-2 rounded-lg border border-slate-200 dark:border-white/15 text-slate-700 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                go(
                  user.isAuthenticated
                    ? { page: 'account', tab: 'tracking' }
                    : { page: 'login' }
                )
              }
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <User className="w-4 h-4" aria-hidden="true" />
              <span>{user.isAuthenticated ? 'Account' : 'Login'}</span>
            </button>

            <button
              type="button"
              onClick={() => go({ page: 'cart' })}
              aria-label={`Shopping cart with ${cartTotals.itemCount} items`}
              className="hidden sm:inline-flex relative items-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
              <span
                data-testid="cart-badge"
                className="font-mono text-xs font-semibold tabular-nums"
              >
                {cartTotals.itemCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => go({ page: 'book-demo' })}
              className="inline-flex items-center justify-center px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
            >
              Book a Demo
            </button>
          </div>
        </div>

        {/* Mega Menu Dropdown Panel */}
        {openMenu && (
          <div className="hidden lg:block border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] shadow-2xl">
            <div className="max-w-7xl mx-auto px-6 py-6">
              {openMenu === 'products' && (
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    {PRODUCT_CATEGORIES.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => go({ page: 'shop', category })}
                        className="flex items-start gap-3 p-3 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] hover:bg-slate-50 dark:hover:bg-[#0A1128]/70 transition-colors cursor-pointer"
                      >
                        <Cpu
                          className="w-5 h-5 text-cyan-600 dark:text-[#00D4FF] shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {category}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-0.5">
                            Explore hardware models &amp; specs
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-xl p-5 bg-slate-100 dark:bg-[#0A1128] border border-slate-200 dark:border-white/10 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
                        Full Hardware Catalog
                      </p>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                        Compare Trackers &amp; 4G AI Dashcams
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-[#A9B4D0] mt-2">
                        Filter by connectivity, battery life, and fleet safety features.
                      </p>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => go({ page: 'shop' })}
                        className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
                      >
                        Browse All Products
                      </button>
                      <button
                        type="button"
                        onClick={() => go({ page: '3d-lab' })}
                        className="w-full py-2 px-4 rounded-xl text-xs font-semibold border border-cyan-500/40 text-cyan-700 dark:text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-colors cursor-pointer"
                      >
                        Inspect in 3D CAD Lab
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {openMenu === 'solutions' && (
                <div className="grid grid-cols-5 gap-3">
                  {SOLUTION_ITEMS.map((item) => (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => go({ page: 'solutions', slug: item.slug })}
                      className="p-4 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] hover:bg-slate-50 dark:hover:bg-[#0A1128]/70 transition-colors cursor-pointer"
                    >
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item.label}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                        {item.desc}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {openMenu === 'business' && (
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => go({ page: 'home', section: 'white-label' })}
                    className="p-4 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      White-Label Telematics SaaS
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                      Launch your own GPS brand with custom domain, mobile app, and billing.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => go({ page: 'book-demo', prefillInterest: 'Dealer Partnership' })}
                    className="p-4 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Authorized Dealer Network
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                      Join 450+ regional dealers with bulk pricing and recurring SaaS margins.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => go({ page: 'home', section: 'software-platforms' })}
                    className="p-4 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      VS Fleet Pro Enterprise
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                      API webhooks, fuel analytics, and multi-depot fleet dispatch.
                    </p>
                  </button>
                </div>
              )}

              {openMenu === 'resources' && (
                <div className="grid grid-cols-4 gap-4">
                  <button
                    type="button"
                    onClick={() => go({ page: 'ai-studio' })}
                    className="col-span-2 p-4 rounded-xl text-left border border-cyan-500/40 bg-cyan-50/50 dark:bg-[#00D4FF]/10 hover:border-[#00D4FF] cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-cyan-800 dark:text-[#00D4FF]">
                      AI Telematics Studio
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#A9B4D0] mt-1">
                      Fleet Copilot chat, Search &amp; Maps grounding, voice &amp; media.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => go({ page: '3d-lab' })}
                    className="p-4 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      3D Hardware Lab
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                      Interactive 3D exploded CAD models &amp; material finishes.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => go({ page: 'blog' })}
                    className="p-4 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Engineering Blog
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                      Fleet telematics, GNSS &amp; safety guides.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => go({ page: 'whats-new' })}
                    className="p-4 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      What&apos;s New
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                      Latest hardware &amp; platform releases.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => go({ page: 'warranty' })}
                    className="p-4 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Warranty Registration
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                      Activate 1–2 year coverage with IMEI.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => go({ page: 'book-installation' })}
                    className="p-4 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Book Installation
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                      Schedule a certified technician visit.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => go({ page: 'support-guide' })}
                    className="p-4 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Support / User Guide
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                      Login, live tracking, reports &amp; geofence alerts guide.
                    </p>
                  </button>
                </div>
              )}

              {openMenu === 'company' && (
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => go({ page: 'about' })}
                    className="p-4 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      About VS Technology
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                      Trusted since 2016 across 28 states and global partners.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => go({ page: 'experience-stores' })}
                    className="p-4 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Experience Centers
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                      Visit showrooms in Bengaluru, Delhi NCR, Pune &amp; more.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => go({ page: 'contact' })}
                    className="p-4 rounded-xl text-left border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Contact &amp; Support
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                      24/7 fleet support and enterprise sales desk.
                    </p>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] px-4 py-4 max-h-[75vh] overflow-y-auto space-y-4">
            <PWAInstallButton
              variant="drawer"
              onActionComplete={() => setMobileMenuOpen(false)}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => go({ page: 'platform' })}
                className="col-span-2 p-3 rounded-xl text-left text-sm font-semibold bg-[#00D4FF] text-[#0A1128]"
              >
                TrackPro OS · 4-Role Live Portal (12 Versions)
              </button>
              <button
                type="button"
                onClick={() => go({ page: 'new-vehicle' })}
                className="col-span-2 p-3 rounded-xl text-left text-sm font-semibold bg-[#4B2166] text-white"
              >
                New Vehicle 6-Step Wizard &amp; TurboTrackers
              </button>
              <button
                type="button"
                onClick={() => go({ page: 'shop' })}
                className="p-3 rounded-xl text-left text-sm font-semibold bg-slate-100 dark:bg-[#0A1128] text-slate-900 dark:text-white"
              >
                All Products
              </button>
              <button
                type="button"
                onClick={() => go({ page: 'offers' })}
                className="p-3 rounded-xl text-left text-sm font-semibold bg-slate-100 dark:bg-[#0A1128] text-slate-900 dark:text-white"
              >
                Offers
              </button>
              <button
                type="button"
                onClick={() => go({ page: 'book-installation' })}
                className="p-3 rounded-xl text-left text-sm font-semibold bg-slate-100 dark:bg-[#0A1128] text-slate-900 dark:text-white"
              >
                Book Installation
              </button>
              <button
                type="button"
                onClick={() => go({ page: 'warranty' })}
                className="p-3 rounded-xl text-left text-sm font-semibold bg-slate-100 dark:bg-[#0A1128] text-slate-900 dark:text-white"
              >
                Warranty Reg.
              </button>
              <button
                type="button"
                onClick={() => go({ page: 'ai-studio' })}
                className="p-3 rounded-xl text-left text-sm font-semibold bg-cyan-500/15 text-cyan-800 dark:text-[#00D4FF]"
              >
                AI Fleet Studio
              </button>
              <button
                type="button"
                onClick={() => go({ page: '3d-lab' })}
                className="p-3 rounded-xl text-left text-sm font-semibold bg-slate-100 dark:bg-[#0A1128] text-slate-900 dark:text-white"
              >
                3D CAD Lab
              </button>
              <button
                type="button"
                onClick={() => go({ page: 'support-guide' })}
                className="col-span-2 p-3 rounded-xl text-left text-sm font-semibold bg-slate-100 dark:bg-[#0A1128] text-slate-900 dark:text-white"
              >
                Support / User Guide
              </button>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-[#A9B4D0] mb-2">
                Solutions &amp; Company
              </div>
              <div className="flex flex-col divide-y divide-slate-200 dark:divide-white/10 text-sm">
                {SOLUTION_ITEMS.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => go({ page: 'solutions', slug: item.slug })}
                    className="py-2.5 text-left text-slate-800 dark:text-white"
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => go({ page: 'experience-stores' })}
                  className="py-2.5 text-left text-slate-800 dark:text-white"
                >
                  Experience Stores
                </button>
                <button
                  type="button"
                  onClick={() => go({ page: 'blog' })}
                  className="py-2.5 text-left text-slate-800 dark:text-white"
                >
                  Blog &amp; What&apos;s New
                </button>
                <button
                  type="button"
                  onClick={() => go({ page: 'about' })}
                  className="py-2.5 text-left text-slate-800 dark:text-white"
                >
                  About Us
                </button>
                <button
                  type="button"
                  onClick={() => go({ page: 'contact' })}
                  className="py-2.5 text-left text-slate-800 dark:text-white"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile quick navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-14 border-t border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1128]/95 backdrop-blur-md grid grid-cols-5"
      >
        <button
          type="button"
          onClick={() => go({ page: 'home' })}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            route.page === 'home'
              ? 'text-cyan-700 dark:text-[#00D4FF]'
              : 'text-slate-600 dark:text-[#A9B4D0]'
          }`}
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => go({ page: 'shop' })}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            route.page === 'shop' || route.page === 'product'
              ? 'text-cyan-700 dark:text-[#00D4FF]'
              : 'text-slate-600 dark:text-[#A9B4D0]'
          }`}
        >
          <Store className="w-4 h-4" aria-hidden="true" />
          <span>Shop</span>
        </button>
        <button
          type="button"
          onClick={() => go({ page: 'solutions', slug: 'gps-tracking' })}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            route.page === 'solutions'
              ? 'text-cyan-700 dark:text-[#00D4FF]'
              : 'text-slate-600 dark:text-[#A9B4D0]'
          }`}
        >
          <LayoutGrid className="w-4 h-4" aria-hidden="true" />
          <span>Solutions</span>
        </button>
        <button
          type="button"
          onClick={() => go({ page: 'cart' })}
          className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            route.page === 'cart' || route.page === 'checkout'
              ? 'text-cyan-700 dark:text-[#00D4FF]'
              : 'text-slate-600 dark:text-[#A9B4D0]'
          }`}
        >
          <ShoppingCart className="w-4 h-4" aria-hidden="true" />
          <span>Cart ({cartTotals.itemCount})</span>
        </button>
        <button
          type="button"
          onClick={() =>
            go(
              user.isAuthenticated
                ? { page: 'account', tab: 'tracking' }
                : { page: 'login' }
            )
          }
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            route.page === 'account' || route.page === 'login'
              ? 'text-cyan-700 dark:text-[#00D4FF]'
              : 'text-slate-600 dark:text-[#A9B4D0]'
          }`}
        >
          <User className="w-4 h-4" aria-hidden="true" />
          <span>Account</span>
        </button>
      </nav>
    </>
  );
}
