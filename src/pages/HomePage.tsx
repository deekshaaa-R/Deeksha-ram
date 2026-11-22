import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  Compass,
  ExternalLink,
  Fuel,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Shield,
  Smartphone,
  Sparkles,
  Tractor,
  Users,
  X,
} from 'lucide-react';
import wiredGpsImg from '../assets/images/product_wired_gps_1794721097761.jpg';
import wirelessGpsImg from '../assets/images/product_wireless_gps_1794721097980.jpg';
import aiDashcamImg from '../assets/images/product_ai_dashcam_1794721098251.jpg';
import assetFarmingImg from '../assets/images/product_asset_farming_gps_1794721097655.jpg';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { FleetMap } from '../components/FleetMap';
import { SafetyImpact } from '../components/SafetyImpact';
import { GoogleFleetMap } from '../components/GoogleFleetMap';
import { HeroDashboard } from '../components/HeroDashboard';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { LiveTrackingSimulatorSection } from '../components/LiveTrackingSimulatorSection';
import { VehicleSearch } from '../components/VehicleSearch';
import { useStore } from '../context/StoreContext';
import { CONTACT_INFO, EXPERIENCE_CENTERS } from '../data/catalog';
import type { ExperienceCenter, ProductCategory, SolutionSlug } from '../types';
import {
  validateEmail,
  validatePhone,
  validateRequired,
  type FieldErrors,
} from '../utils/storeLogic';

const CLIENT_LOGOS = [
  'CLIENT LOGO 01',
  'CLIENT LOGO 02',
  'CLIENT LOGO 03',
  'CLIENT LOGO 04',
  'CLIENT LOGO 05',
  'CLIENT LOGO 06',
  'CLIENT LOGO 07',
  'CLIENT LOGO 08',
];

const OFFERINGS: Array<{
  title: string;
  desc: string;
  slug: SolutionSlug;
  icon: typeof Navigation;
}> = [
  {
    title: 'GPS Tracking',
    desc: 'Live 5-second location pings, geofence rules, route playback, and remote engine immobilization.',
    slug: 'gps-tracking',
    icon: Navigation,
  },
  {
    title: 'Fuel Monitoring',
    desc: 'High-accuracy capacitive & ultrasonic probes that verify refills and catch sudden diesel theft.',
    slug: 'fuel-monitoring',
    icon: Fuel,
  },
  {
    title: 'Dashcam Solutions',
    desc: '2K/4K WiFi and 4G AI dashcams with ADAS collision alerts, fatigue detection, and cloud clips.',
    slug: 'dashcam',
    icon: Camera,
  },
  {
    title: 'Smart Farming',
    desc: 'IP68 tractor GNSS calculating exact acreage worked, PTO hours, and diesel efficiency.',
    slug: 'smart-farming',
    icon: Tractor,
  },
];

const ECOSYSTEM_TILES: Array<{
  title: string;
  subtitle: string;
  category: ProductCategory;
  image: string;
}> = [
  {
    title: '4G AI Dashcam',
    subtitle: 'ADAS + Driver Monitoring',
    category: '4G AI Dashcams',
    image: aiDashcamImg,
  },
  {
    title: 'Wired GPS Tracker',
    subtitle: '9–90V + Engine Cut-off',
    category: 'Wired GPS Trackers',
    image: wiredGpsImg,
  },
  {
    title: 'Wireless Tracker',
    subtitle: '90-Day Magnetic IP67',
    category: 'Wireless GPS Trackers',
    image: wirelessGpsImg,
  },
  {
    title: 'WiFi Dashcam',
    subtitle: '2K & 4K Dual Road View',
    category: 'WiFi Dashcams',
    image: aiDashcamImg,
  },
  {
    title: 'Bluetooth Asset Tag',
    subtitle: '3-Year BLE & Temp Tag',
    category: 'Bluetooth Asset Tags',
    image: assetFarmingImg,
  },
];

const SOFTWARE_PLATFORMS = [
  {
    name: 'VS Fleet Pro',
    audience: 'B2B Enterprise',
    desc: 'Comprehensive fleet management for transporters, logistics hubs, and school buses with API webhooks and fuel reconciliation.',
    highlights: ['Multi-depot live console', 'Automated trip & fuel sheets', 'Role-based dispatcher access'],
    icon: Building2,
    actionLabel: 'Request Fleet Demo',
    interest: 'VS Fleet Pro (B2B)',
  },
  {
    name: 'VS Track App',
    audience: 'B2C Personal',
    desc: 'Everyday personal car and two-wheeler tracking with instant ignition alerts, parking lock, and family trip sharing.',
    highlights: ['One-tap anti-theft lock', 'Overspeed & towing alerts', 'Service reminder logs'],
    icon: Smartphone,
    actionLabel: 'Explore Trackers',
    interest: 'VS Track App (B2C)',
  },
  {
    name: 'VS Riders',
    audience: 'Community',
    desc: 'Group ride telemetry built for touring clubs and expedition riders featuring live convoy formation and instant SOS.',
    highlights: ['Live convoy radar map', 'One-press emergency SOS', 'Offline GPX route export'],
    icon: Compass,
    actionLabel: 'Join Demo Preview',
    interest: 'VS Riders Community',
  },
];

const GLOBAL_FLAGS = [
  { code: 'IN', country: 'India', flag: '🇮🇳' },
  { code: 'AE', country: 'UAE', flag: '🇦🇪' },
  { code: 'SA', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SG', country: 'Singapore', flag: '🇸🇬' },
  { code: 'KE', country: 'Kenya', flag: '🇰🇪' },
  { code: 'ZA', country: 'South Africa', flag: '🇿🇦' },
  { code: 'GB', country: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', country: 'Australia', flag: '🇦🇺' },
];

export function HomePage() {
  const { navigate, showToast, addDemoRequest } = useStore();
  const [selectedCenter, setSelectedCenter] = useState<ExperienceCenter | null>(
    null
  );
  const [showStoresMap, setShowStoresMap] = useState(false);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  });
  const [contactErrors, setContactErrors] = useState<
    FieldErrors<'name' | 'email' | 'phone' | 'message'>
  >({});
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs: FieldErrors<'name' | 'email' | 'phone' | 'message'> = {};
    const nErr = validateRequired(contactForm.name, 'Full name');
    if (nErr) errs.name = nErr;
    const eErr = validateEmail(contactForm.email);
    if (eErr) errs.email = eErr;
    const pErr = validatePhone(contactForm.phone);
    if (pErr) errs.phone = pErr;
    const mErr = validateRequired(contactForm.message, 'Message');
    if (mErr) errs.message = mErr;

    setContactErrors(errs);
    if (Object.keys(errs).length > 0) return;

    addDemoRequest({
      name: contactForm.name.trim(),
      company: contactForm.company.trim() || 'Direct Inquiry',
      email: contactForm.email.trim(),
      phone: contactForm.phone.trim(),
      fleetSize: 'General Inquiry',
      interest: contactForm.message.trim().slice(0, 120),
      preferredDate: new Date().toISOString().slice(0, 10),
    });

    setContactSubmitted(true);
    setContactForm({ name: '', company: '', email: '', phone: '', message: '' });
    showToast('Inquiry received! Our team will respond within 4 business hours.');
  };

  return (
    <div className="overflow-x-clip">
      {/* 1. HERO SECTION */}
      <section className="relative pt-10 pb-16 lg:pt-14 lg:pb-24 bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-[#0A1128] dark:via-[#0D1633] dark:to-[#0A1128]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top_right,rgba(0,212,255,0.14),transparent_60%)]"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-cyan-800 dark:text-[#00D4FF]">
                <Shield className="w-4 h-4" aria-hidden="true" />
                <span>Trusted Since 2016 · ISO 9001 Telematics</span>
              </div>

              <h1
                className="font-display font-bold tracking-tight text-slate-900 dark:text-white leading-[1.12]"
                style={{ fontSize: 'clamp(2.15rem, 3.8vw, 3.45rem)', textWrap: 'balance' }}
              >
                Smart GPS &amp; Dashcam Technology for a Connected World
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-[#A9B4D0] leading-relaxed max-w-xl">
                Real-time GPS tracking, 4G AI video telematics, precision fuel monitoring,
                and white-label fleet platforms engineered for commercial transporters,
                dealers, and everyday vehicle owners.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() => navigate({ page: 'shop' })}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors shadow-lg shadow-[#00D4FF]/20 cursor-pointer"
                >
                  <span>Explore Products</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'home', section: 'contact-section' })}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-white/20 text-slate-800 dark:text-white hover:border-cyan-600 dark:hover:border-[#00D4FF] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <span>Contact Sales</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'ai-studio' })}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold border border-cyan-500/40 bg-cyan-500/10 text-cyan-800 dark:text-[#00D4FF] hover:bg-cyan-500/20 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>AI Copilot</span>
                </button>
              </div>

              {/* Reusable Global RTO Vehicle Search */}
              <div className="pt-1 max-w-xl">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A9B4D0] mb-2">
                  Instant RTO Live Vehicle Tracking
                </div>
                <VehicleSearch
                  variant="hero"
                  testIdPrefix="home-vehicle-search"
                  placeholder="Enter RTO No. (e.g. KA-06-TR-4821, GJ-01-HT-6192, MH-12)..."
                />
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-200 dark:border-white/10">
                <div>
                  <div className="text-2xl font-bold font-display text-slate-900 dark:text-white">
                    <AnimatedCounter target={10} suffix="+" />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-0.5">
                    Years of Experience
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-display text-slate-900 dark:text-white">
                    <AnimatedCounter target={450} suffix="+" />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-0.5">
                    Authorized Dealers*
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-display text-slate-900 dark:text-white">
                    <AnimatedCounter target={28} suffix=" States" />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-0.5">
                    Pan-India Network*
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-display text-cyan-700 dark:text-[#00D4FF]">
                    B2B &amp; B2C
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-0.5">
                    180K+ Active Units*
                  </div>
                </div>
              </div>
            </div>

            {/* Right Animated Live-Tracking Dashboard */}
            <div className="lg:col-span-6">
              <HeroDashboard />
            </div>
          </div>
        </div>
      </section>

      {/* 2. TRUSTED BY MARQUEE */}
      <section className="py-10 border-y border-slate-200 dark:border-white/10 bg-white dark:bg-[#080E22]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-5 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-[#A9B4D0]">
            Trusted by Fleet Operators &amp; Enterprise Partners (Placeholder Logos)
          </h2>
        </div>
        <div className="overflow-hidden">
          <div className="animate-marquee gap-6 px-4">
            {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((label, idx) => (
              <div
                key={`${label}-${idx}`}
                className="w-44 h-14 rounded-xl bg-slate-200/80 dark:bg-[#111B3A] border border-slate-300/70 dark:border-white/10 flex items-center justify-center shrink-0"
              >
                <span className="text-xs font-mono font-medium text-slate-500 dark:text-[#A9B4D0]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. BOOK A FREE DEMO BANNER */}
      <section className="py-10 bg-slate-50 dark:bg-[#0A1128]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-[#111B3A] to-[#0D2149] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-white shadow-lg">
            <div className="space-y-1.5 max-w-2xl">
              <h2 className="font-display text-xl sm:text-2xl font-bold">
                See VS Fleet Pro &amp; 4G AI Dashcams Live in Action
              </h2>
              <p className="text-sm text-[#A9B4D0]">
                Book a 20-minute walkthrough tailored to your fleet size, fuel routes, or
                white-label dealer launch.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => navigate({ page: 'book-demo' })}
                className="px-5 py-3 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
              >
                Book a Free Demo
              </button>
              <a
                href={CONTACT_INFO.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>WhatsApp Sales ({CONTACT_INFO.phoneDisplay})</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHAT WE OFFER */}
      <section className="py-16 bg-white dark:bg-[#0A1128]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] mb-2">
              Core Telematics Pillars
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              What We Offer
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-[#A9B4D0] mt-2">
              End-to-end hardware and cloud telemetry tailored for commercial logistics,
              passenger mobility, and precision agriculture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {OFFERINGS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.slug}
                  className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111B3A] p-6 flex flex-col justify-between hover:-translate-y-1 hover:border-cyan-500/60 dark:hover:border-[#00D4FF]/50 transition-all duration-200"
                >
                  <div>
                    <div className="w-11 h-11 rounded-xl bg-cyan-500/10 dark:bg-[#00D4FF]/15 text-cyan-700 dark:text-[#00D4FF] flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-[#A9B4D0] mt-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'solutions', slug: item.slug })}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-[#00D4FF] group-hover:gap-2.5 transition-all cursor-pointer"
                  >
                    <span>Explore</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. HARDWARE ECOSYSTEM (5 TILES) */}
      <section className="py-16 bg-slate-50 dark:bg-[#080E22]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] mb-2">
                Connected Devices
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Hardware Ecosystem
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate({ page: '3d-lab' })}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-cyan-500/40 text-cyan-700 dark:text-[#00D4FF] hover:bg-cyan-500/10 cursor-pointer"
              >
                <span>Open 3D CAD Lab</span>
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'shop' })}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer"
              >
                <span>View Full Catalog</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {ECOSYSTEM_TILES.map((tile) => (
              <button
                key={tile.title}
                type="button"
                onClick={() => navigate({ page: 'shop', category: tile.category })}
                className="group text-left rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] overflow-hidden hover:-translate-y-1 hover:border-cyan-500/60 dark:hover:border-[#00D4FF]/50 transition-all cursor-pointer"
              >
                <div className="aspect-[4/3] overflow-hidden bg-slate-900">
                  <ImageWithFallback
                    src={tile.image}
                    alt={tile.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    {tile.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-1">
                    {tile.subtitle}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 6. SOFTWARE PLATFORMS */}
      <section id="software-platforms" className="py-16 bg-white dark:bg-[#0A1128]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] mb-2">
              Unified Cloud &amp; Mobile Apps
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Software Platforms
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SOFTWARE_PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              return (
                <div
                  key={platform.name}
                  className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111B3A] p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-[#00D4FF]/15 text-cyan-700 dark:text-[#00D4FF] flex items-center justify-center">
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <span className="text-xs font-medium text-slate-500 dark:text-[#A9B4D0]">
                        {platform.audience}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
                      {platform.name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-[#A9B4D0] mt-2 leading-relaxed">
                      {platform.desc}
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-[#A9B4D0]">
                      {platform.highlights.map((hl) => (
                        <li key={hl} className="flex items-center gap-2">
                          <Check
                            className="w-4 h-4 text-emerald-600 dark:text-[#7CFF6B] shrink-0"
                            aria-hidden="true"
                          />
                          <span>{hl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      platform.name === 'VS Track App'
                        ? navigate({ page: 'shop' })
                        : navigate({
                            page: 'book-demo',
                            prefillInterest: platform.interest,
                          })
                    }
                    className="mt-6 w-full py-2.5 px-4 rounded-xl text-sm font-semibold border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors cursor-pointer"
                  >
                    {platform.actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6B. LIVE GPS TRACKING SIMULATOR */}
      <LiveTrackingSimulatorSection />

      {/* 7. EXPERIENCE CENTERS */}
      <section className="py-16 bg-slate-50 dark:bg-[#080E22]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] mb-2">
                Hands-On Hardware Demos
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Experience Centers
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowStoresMap((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] text-slate-800 dark:text-white hover:border-[#00D4FF] cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
                <span>{showStoresMap ? 'Hide Map View' : 'View on Google Map'}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'experience-stores' })}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer"
              >
                <span>All Store Locations</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {showStoresMap && (
            <div className="mb-8">
              <GoogleFleetMap
                mode="stores"
                heightClass="h-72 sm:h-80"
                onSelectCenter={(c) => setSelectedCenter(c)}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {EXPERIENCE_CENTERS.map((center) => (
              <div
                key={center.id}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video overflow-hidden bg-slate-900">
                    <ImageWithFallback
                      src={center.image}
                      alt={center.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                      <span className="font-semibold text-cyan-700 dark:text-[#00D4FF]">
                        {center.city}
                      </span>
                      {center.launchingSoon && (
                        <span className="font-semibold text-amber-700 dark:text-[#FFB020]">
                          Launching Soon
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                      {center.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#A9B4D0] mt-2 leading-relaxed">
                      {center.address}
                    </p>
                    <p className="text-xs font-mono text-slate-700 dark:text-white mt-2">
                      {center.phone}
                    </p>
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <button
                    type="button"
                    onClick={() => setSelectedCenter(center)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Get Directions</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. WHITE LABEL & DEALER PROGRAM */}
      <section id="white-label" className="py-16 bg-white dark:bg-[#0A1128]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111B3A] p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
                B2B Partner Ecosystem
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                White-Label &amp; Authorized Dealer Program
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-[#A9B4D0] leading-relaxed">
                Launch your own telematics brand backed by VS Technology hardware and
                cloud infrastructure. Scale recurring SaaS subscriptions without managing
                servers or mobile app engineering.
              </p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {[
                  'Custom branded iOS & Android app',
                  'Your own domain, SSL, and logo',
                  'Real-time GPS & video telemetry',
                  'Recurring SaaS subscription revenue',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-slate-800 dark:text-white"
                  >
                    <Check
                      className="w-4 h-4 text-emerald-600 dark:text-[#7CFF6B] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      page: 'book-demo',
                      prefillInterest: 'White-Label & Dealer Program',
                    })
                  }
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
                >
                  <span>Get White-Label Demo</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Phone Mockup Preview */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-64 rounded-[2rem] border-4 border-slate-800 dark:border-slate-700 bg-[#0A1128] p-4 shadow-2xl text-white">
                <div className="w-16 h-1.5 rounded-full bg-slate-700 mx-auto mb-4" />
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <div className="text-[10px] text-[#00D4FF] font-semibold">
                      YOUR BRAND GPS
                    </div>
                    <div className="text-sm font-bold">Fleet Control App</div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-[#00D4FF]/20 text-[#00D4FF] flex items-center justify-center text-xs font-bold">
                    YB
                  </div>
                </div>
                <div className="mt-3 space-y-2.5">
                  <div className="rounded-xl bg-[#111B3A] p-3">
                    <div className="text-[11px] text-[#A9B4D0]">Active Vehicles</div>
                    <div className="text-xl font-mono font-bold tabular-nums mt-0.5">
                      48 / 50
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#111B3A] p-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold">TRK-204</div>
                      <div className="text-[11px] text-[#7CFF6B]">Moving · 61 km/h</div>
                    </div>
                    <span className="text-[11px] font-mono text-[#00D4FF]">98% Fuel</span>
                  </div>
                  <div className="rounded-xl bg-[#111B3A] p-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold">VAN-118</div>
                      <div className="text-[11px] text-[#FFB020]">Idle · 6 mins</div>
                    </div>
                    <span className="text-[11px] font-mono text-[#A9B4D0]">Depot A</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8B. ANNUAL SAFETY IMPACT */}
      <SafetyImpact />

      {/* 9. GLOBAL PRESENCE */}
      <section className="py-16 bg-slate-50 dark:bg-[#080E22] border-y border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] mb-2">
            Worldwide Deployment Footprint
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Built for Scale Across Borders
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto mt-10">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6">
              <div className="text-3xl font-bold font-display text-slate-900 dark:text-white">
                <AnimatedCounter target={180000} suffix="+" />
              </div>
              <div className="text-sm text-slate-600 dark:text-[#A9B4D0] mt-1">
                Active Connected Devices*
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6">
              <div className="text-3xl font-bold font-display text-emerald-700 dark:text-[#7CFF6B]">
                <AnimatedCounter target={99.94} decimals={2} suffix="%" />
              </div>
              <div className="text-sm text-slate-600 dark:text-[#A9B4D0] mt-1">
                API &amp; Cloud Uptime*
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6">
              <div className="text-3xl font-bold font-display text-cyan-700 dark:text-[#00D4FF]">
                24/7
              </div>
              <div className="text-sm text-slate-600 dark:text-[#A9B4D0] mt-1">
                Worldwide Partner Support
              </div>
            </div>
          </div>

          <div className="mt-10">
            <FleetMap />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {GLOBAL_FLAGS.map((item) => (
              <div
                key={item.code}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] text-sm text-slate-700 dark:text-[#A9B4D0]"
              >
                <span aria-hidden="true" className="text-base">
                  {item.flag}
                </span>
                <span>{item.country}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A9B4D0] mt-4">
            *Placeholder deployment metrics shown for template demonstration.
          </p>
        </div>
      </section>

      {/* 10. CONTACT SECTION */}
      <section id="contact-section" className="py-16 bg-white dark:bg-[#0A1128]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] mb-2">
              Get in Touch
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Speak With Our Fleet &amp; Hardware Specialists
            </h2>
          </div>

          {/* 3 Contact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111B3A] p-6">
              <Headphones
                className="w-6 h-6 text-cyan-700 dark:text-[#00D4FF] mb-3"
                aria-hidden="true"
              />
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Customer Support
              </h3>
              <p className="text-sm text-slate-600 dark:text-[#A9B4D0] mt-1">
                Device activation, SIM renewals, and installation scheduling.
              </p>
              <a
                href={CONTACT_INFO.telHref}
                className="block text-sm font-mono font-medium text-slate-900 dark:text-white mt-3 hover:text-[#00D4FF]"
              >
                {CONTACT_INFO.phoneDisplay}
              </a>
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="block text-xs text-cyan-700 dark:text-[#00D4FF] mt-0.5 hover:underline"
              >
                {CONTACT_INFO.email}
              </a>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111B3A] p-6">
              <Users
                className="w-6 h-6 text-cyan-700 dark:text-[#00D4FF] mb-3"
                aria-hidden="true"
              />
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Bulk &amp; Enterprise Sales
              </h3>
              <p className="text-sm text-slate-600 dark:text-[#A9B4D0] mt-1">
                Volume hardware quotes, API licensing, and dealer onboarding.
              </p>
              <a
                href={CONTACT_INFO.telHref}
                className="block text-sm font-mono font-medium text-slate-900 dark:text-white mt-3 hover:text-[#00D4FF]"
              >
                {CONTACT_INFO.phoneDisplay}
              </a>
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="block text-xs text-cyan-700 dark:text-[#00D4FF] mt-0.5 hover:underline"
              >
                {CONTACT_INFO.email}
              </a>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111B3A] p-6">
              <MessageCircle
                className="w-6 h-6 text-emerald-600 dark:text-[#7CFF6B] mb-3"
                aria-hidden="true"
              />
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                WhatsApp Direct Desk
              </h3>
              <p className="text-sm text-slate-600 dark:text-[#A9B4D0] mt-1">
                Instant product recommendations and technician slot checks.
              </p>
              <a
                href={CONTACT_INFO.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-mono font-medium text-emerald-700 dark:text-[#7CFF6B] mt-3 hover:underline"
              >
                <span>{CONTACT_INFO.phoneDisplay}</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
              <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-0.5">
                Mon–Sat · 9:00 AM – 8:00 PM IST
              </p>
            </div>
          </div>

          {/* Contact Form + Corporate Office */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111B3A] p-6 sm:p-8">
              <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-white mb-5">
                Send an Inquiry
              </h3>

              {contactSubmitted ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-5 text-sm text-slate-800 dark:text-white space-y-3">
                  <p className="font-semibold text-emerald-700 dark:text-[#7CFF6B]">
                    Inquiry Submitted Successfully
                  </p>
                  <p className="text-slate-600 dark:text-[#A9B4D0]">
                    Our regional engineering and sales desk has logged your message and
                    will reach out shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setContactSubmitted(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="home-contact-name"
                        className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                      >
                        Full Name *
                      </label>
                      <input
                        id="home-contact-name"
                        type="text"
                        value={contactForm.name}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, name: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                      />
                      {contactErrors.name && (
                        <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                          {contactErrors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="home-contact-company"
                        className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                      >
                        Company / Fleet Name
                      </label>
                      <input
                        id="home-contact-company"
                        type="text"
                        value={contactForm.company}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, company: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="home-contact-email"
                        className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                      >
                        Work Email *
                      </label>
                      <input
                        id="home-contact-email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, email: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                      />
                      {contactErrors.email && (
                        <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                          {contactErrors.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="home-contact-phone"
                        className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                      >
                        Phone Number *
                      </label>
                      <input
                        id="home-contact-phone"
                        type="tel"
                        value={contactForm.phone}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, phone: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                      />
                      {contactErrors.phone && (
                        <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                          {contactErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="home-contact-message"
                      className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                    >
                      Project or Hardware Requirement *
                    </label>
                    <textarea
                      id="home-contact-message"
                      rows={3}
                      value={contactForm.message}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, message: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                    />
                    {contactErrors.message && (
                      <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                        {contactErrors.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
                  >
                    Submit Inquiry
                  </button>
                </form>
              )}
            </div>

            {/* Corporate Office Block */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111B3A] p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
                  Head Office &amp; Corporate HQ
                </h3>
                <div className="space-y-3 text-sm text-slate-600 dark:text-[#A9B4D0]">
                  <div className="flex items-start gap-3">
                    <MapPin
                      className="w-4 h-4 text-cyan-700 dark:text-[#00D4FF] shrink-0 mt-1"
                      aria-hidden="true"
                    />
                    <p>{CONTACT_INFO.address}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone
                      className="w-4 h-4 text-cyan-700 dark:text-[#00D4FF] shrink-0"
                      aria-hidden="true"
                    />
                    <a
                      href={CONTACT_INFO.telHref}
                      className="font-mono hover:text-cyan-700 dark:hover:text-[#00D4FF]"
                    >
                      {CONTACT_INFO.phoneDisplay}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail
                      className="w-4 h-4 text-cyan-700 dark:text-[#00D4FF] shrink-0"
                      aria-hidden="true"
                    />
                    <a
                      href={`mailto:${CONTACT_INFO.email}`}
                      className="hover:text-cyan-700 dark:hover:text-[#00D4FF]"
                    >
                      {CONTACT_INFO.email}
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A1128] p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Need On-Site Technician Installation?
                </div>
                <p className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                  Schedule doorstep installation across 450+ dealer cities.
                </p>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'book-installation' })}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] cursor-pointer"
                >
                  <span>Book Installation Slot</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Center Directions Modal */}
      {selectedCenter && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Directions to ${selectedCenter.name}`}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#111B3A] p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
                  {selectedCenter.city}
                </p>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {selectedCenter.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCenter(null)}
                aria-label="Close directions dialog"
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-[#A9B4D0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <GoogleFleetMap
              mode="stores"
              heightClass="h-48"
              selectedCenterId={selectedCenter.id}
            />
            <div className="space-y-1.5 text-sm text-slate-600 dark:text-[#A9B4D0]">
              <p>{selectedCenter.address}</p>
              <p className="font-mono text-xs text-slate-900 dark:text-white">
                GPS Coordinates: {selectedCenter.coordinates} · {selectedCenter.hours}
              </p>
              <p className="font-mono text-xs text-slate-900 dark:text-white">
                Phone: {selectedCenter.phone}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedCenter.lat},${selectedCenter.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold border border-cyan-500/40 text-cyan-700 dark:text-[#00D4FF]"
              >
                <span>Open Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => {
                  setSelectedCenter(null);
                  navigate({ page: 'book-demo', prefillInterest: selectedCenter.name });
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
              >
                Book Store Visit
              </button>
              <button
                type="button"
                onClick={() => setSelectedCenter(null)}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
