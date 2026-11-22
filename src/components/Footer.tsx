import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Facebook,
  Instagram,
  Linkedin,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Youtube,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CONTACT_INFO } from '../data/catalog';
import { validateEmail } from '../utils/storeLogic';
import { Logo } from './Logo';

export function Footer() {
  const { navigate, showToast } = useStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubscribed(true);
    setEmail('');
    showToast('Subscribed to VS Technology product & firmware updates.');
  };

  return (
    <footer className="border-t border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#070D1F] pb-20 lg:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <button
              type="button"
              onClick={() => navigate({ page: 'home' })}
              className="cursor-pointer text-left"
              aria-label="Back to VS Technology home"
            >
              <Logo />
            </button>
            <p className="text-sm text-slate-600 dark:text-[#A9B4D0] leading-relaxed max-w-sm">
              Smarter Tracking. Safer Journeys. Engineering connected GPS hardware, 4G AI
              dashcams, fuel telemetry, and white-label fleet intelligence since 2016.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-700 dark:text-[#A9B4D0]">
              <a
                href={CONTACT_INFO.telHref}
                className="inline-flex items-center gap-1.5 font-mono hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors"
              >
                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{CONTACT_INFO.phoneDisplay}</span>
              </a>
              <a
                href={CONTACT_INFO.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono hover:text-emerald-700 dark:hover:text-[#7CFF6B] transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-700 dark:text-[#7CFF6B]" aria-hidden="true" />
                <span>WhatsApp: {CONTACT_INFO.phoneRaw}</span>
              </a>
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="inline-flex items-center gap-1.5 hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{CONTACT_INFO.email}</span>
              </a>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{CONTACT_INFO.address}</span>
              </span>
            </div>
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700 dark:text-[#A9B4D0] pt-1">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  className="w-4 h-4 text-cyan-700 dark:text-[#00D4FF]"
                  aria-hidden="true"
                />
                ISO 9001 Certified
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock
                  className="w-4 h-4 text-emerald-700 dark:text-[#7CFF6B]"
                  aria-hidden="true"
                />
                SSL Secured
              </span>
              <span className="inline-flex items-center gap-1.5">
                Made in India
              </span>
            </div>
          </div>

          {/* Link Columns */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Business
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-[#A9B4D0]">
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'home', section: 'white-label' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  White-Label Platform
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    navigate({ page: 'book-demo', prefillInterest: 'Dealer Program' })
                  }
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  Dealer Program
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'shop' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  Bulk Hardware Store
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'offers' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  Fleet Offers
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Solutions
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-[#A9B4D0]">
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'solutions', slug: 'gps-tracking' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  GPS Tracking
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'solutions', slug: 'fuel-monitoring' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  Fuel Monitoring
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'solutions', slug: 'dashcam' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  4G AI Dashcams
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'solutions', slug: 'smart-farming' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  Smart Farming GPS
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'solutions', slug: 'asset-tracking' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  Asset Tracking
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Company
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-[#A9B4D0]">
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'about' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'experience-stores' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  Experience Centers
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'contact' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  Contact Sales
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Resources
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-[#A9B4D0]">
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'blog' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  Telematics Blog
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'whats-new' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  What&apos;s New
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'book-installation' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  Book Installation
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'warranty' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  Warranty Registration
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'ai-studio' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  AI Telematics Studio
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: '3d-lab' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  3D Hardware Lab
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'support-guide' })}
                  className="hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                >
                  Support / User Guide
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter & Social Row */}
        <div className="mt-10 pt-8 border-t border-slate-200 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-md w-full">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Stay updated on firmware &amp; fleet releases
            </h4>
            <form onSubmit={handleSubscribe} className="mt-2.5 flex gap-2" noValidate>
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address for newsletter
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 min-w-0 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-2 focus:outline-[#00D4FF]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Subscribe
              </button>
            </form>
            {error && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-[#FF4D4F]">{error}</p>
            )}
            {subscribed && !error && (
              <p className="mt-1.5 text-xs text-emerald-700 dark:text-[#7CFF6B] inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                Subscribed to VS Technology briefings.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-[#A9B4D0] mr-1">
              Connect:
            </span>
            <a
              href="#linkedin"
              onClick={(e) => {
                e.preventDefault();
                showToast('VS Technology LinkedIn profile link (Placeholder).', 'info');
              }}
              aria-label="VS Technology on LinkedIn"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#A9B4D0] hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href={CONTACT_INFO.instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="VS Technology on Instagram"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#A9B4D0] hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="#youtube"
              onClick={(e) => {
                e.preventDefault();
                showToast('VS Technology YouTube channel link (Placeholder).', 'info');
              }}
              aria-label="VS Technology on YouTube"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#A9B4D0] hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors"
            >
              <Youtube className="w-4 h-4" />
            </a>
            <a
              href={CONTACT_INFO.facebookHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="VS Technology on Facebook"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#A9B4D0] hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors"
            >
              <Facebook className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Bottom Copyright & Policies */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-[#A9B4D0]">
          <p>© {new Date().getFullYear()} VS Technology Pvt. Ltd. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => navigate({ page: 'policy', slug: 'privacy' })}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'policy', slug: 'terms' })}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'policy', slug: 'return' })}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Return Policy
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'policy', slug: 'shipping' })}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Shipping Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
