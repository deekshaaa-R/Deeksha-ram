import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Copy,
  ExternalLink,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { GoogleFleetMap } from '../components/GoogleFleetMap';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useStore } from '../context/StoreContext';
import {
  BLOG_POSTS,
  CONTACT_INFO,
  EXPERIENCE_CENTERS,
  POLICY_CONTENT,
} from '../data/catalog';
import type { BlogPost, PolicySlug } from '../types';
import {
  PROMO_CODES,
  validateEmail,
  validatePhone,
  validateRequired,
  type FieldErrors,
} from '../utils/storeLogic';

export function OffersPage() {
  const { setPromoCode, navigate, showToast } = useStore();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] mb-1">
          Seasonal Hardware &amp; Fleet Promotions
        </p>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
          Active Offers &amp; Promo Codes
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PROMO_CODES.map((promo) => (
          <div
            key={promo.code}
            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
                <Tag className="w-4 h-4" aria-hidden="true" />
                <span>Verified Offer</span>
              </div>
              <h2 className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
                {promo.code}
              </h2>
              <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
                {promo.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPromoCode(promo.code);
                showToast(`Promo code ${promo.code} pre-applied to your cart!`);
                navigate({ page: 'shop' });
              }}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Apply &amp; Shop Hardware</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BlogPage({ mode }: { mode: 'blog' | 'whats-new' }) {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const items = BLOG_POSTS.filter((p) => p.type === mode);

  if (selectedPost) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <button
          type="button"
          onClick={() => setSelectedPost(null)}
          className="text-sm font-semibold text-cyan-700 dark:text-[#00D4FF] cursor-pointer"
        >
          ← Back to {mode === 'blog' ? 'Blog' : "What's New"}
        </button>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-10 space-y-5">
          <div className="text-xs text-slate-500 dark:text-[#A9B4D0]">
            {selectedPost.category} · {selectedPost.date} · {selectedPost.readTime}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {selectedPost.title}
          </h1>
          <div className="text-xs font-medium text-slate-500 dark:text-[#A9B4D0]">
            By {selectedPost.author}
          </div>
          <div className="space-y-4 text-sm sm:text-base text-slate-700 dark:text-[#A9B4D0] leading-relaxed pt-2">
            {selectedPost.content.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] mb-1">
          {mode === 'blog' ? 'Telematics Insights' : 'Product & Firmware Changelog'}
        </p>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
          {mode === 'blog' ? 'VS Technology Blog' : "What's New at VS Technology"}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((post) => (
          <article
            key={post.id}
            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                {post.category} · {post.date} · {post.readTime}
              </div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                {post.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
                {post.excerpt}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPost(post)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] cursor-pointer"
            >
              <span>Read Article</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

export function AboutPage() {
  const { navigate } = useStore();
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-10 space-y-4">
        <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
          Trusted Since 2016
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
          Engineering Safer, Smarter Mobility Across Every Road
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-[#A9B4D0] leading-relaxed">
          VS Technology designs rugged GPS tracking hardware, 4G AI video dashcams, and
          scalable white-label telematics software. From solo commuters to 5,000-truck
          enterprises and rural agricultural hubs, our platform turns live location and
          vision telemetry into measurable safety and fuel savings.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate({ page: 'shop' })}
            className="px-5 py-3 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
          >
            Explore Hardware
          </button>
          <button
            type="button"
            onClick={() => navigate({ page: 'book-demo' })}
            className="px-5 py-3 rounded-xl text-sm font-semibold border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white cursor-pointer"
          >
            Book a Demo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-2">
          <ShieldCheck className="w-6 h-6 text-cyan-700 dark:text-[#00D4FF]" />
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Made in India Engineering
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
            Built to endure monsoon humidity, 65°C parked dashboards, and rugged highway
            vibration.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-2">
          <MapPin className="w-6 h-6 text-cyan-700 dark:text-[#00D4FF]" />
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            450+ Authorized Dealers*
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
            Pan-India installation technicians and regional Experience Centers for rapid
            warranty support.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-[#7CFF6B]" />
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            ISO 9001 &amp; Encrypted Cloud
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
            End-to-end TLS telemetry pipelines with 99.94% platform uptime SLA targets.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ExperienceStoresPage() {
  const { navigate } = useStore();
  const [focusedCenterId, setFocusedCenterId] = useState<string>(EXPERIENCE_CENTERS[0].id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] mb-1">
          Retail Showrooms &amp; Service Bays
        </p>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
          VS Experience Stores
        </h1>
      </div>

      <GoogleFleetMap
        mode="stores"
        heightClass="h-72 sm:h-80"
        selectedCenterId={focusedCenterId}
        onSelectCenter={(c) => setFocusedCenterId(c.id)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {EXPERIENCE_CENTERS.map((center) => (
          <div
            key={center.id}
            className={`rounded-2xl border bg-white dark:bg-[#111B3A] overflow-hidden grid grid-cols-1 sm:grid-cols-5 ${
              focusedCenterId === center.id
                ? 'border-[#00D4FF]'
                : 'border-slate-200 dark:border-white/10'
            }`}
          >
            <div className="sm:col-span-2 bg-slate-900">
              <ImageWithFallback
                src={center.image}
                alt={center.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="sm:col-span-3 p-6 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-cyan-700 dark:text-[#00D4FF]">
                    {center.city}
                  </span>
                  {center.launchingSoon && (
                    <span className="font-semibold text-amber-700 dark:text-[#FFB020]">
                      Launching Soon
                    </span>
                  )}
                </div>
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  {center.name}
                </h2>
                <p className="text-xs text-slate-600 dark:text-[#A9B4D0] mt-2">
                  {center.address}
                </p>
                <p className="text-xs font-mono text-slate-900 dark:text-white mt-2">
                  {center.phone} · {center.hours}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFocusedCenterId(center.id)}
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-[#00D4FF] cursor-pointer"
                >
                  Focus Pin
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate({ page: 'book-demo', prefillInterest: center.name })
                  }
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
                >
                  Book Store Visit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactPage() {
  const { showToast, addDemoRequest } = useStore();
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  });
  const [errors, setErrors] = useState<
    FieldErrors<'name' | 'email' | 'phone' | 'message'>
  >({});
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs: FieldErrors<'name' | 'email' | 'phone' | 'message'> = {};
    const nErr = validateRequired(form.name, 'Full name');
    if (nErr) errs.name = nErr;
    const eErr = validateEmail(form.email);
    if (eErr) errs.email = eErr;
    const pErr = validatePhone(form.phone);
    if (pErr) errs.phone = pErr;
    const mErr = validateRequired(form.message, 'Message');
    if (mErr) errs.message = mErr;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    addDemoRequest({
      name: form.name.trim(),
      company: form.company.trim() || 'Direct Contact',
      email: form.email.trim(),
      phone: form.phone.trim(),
      fleetSize: 'Contact Form',
      interest: form.message.trim().slice(0, 120),
      preferredDate: new Date().toISOString().slice(0, 10),
    });

    setSent(true);
    showToast('Message received by VS Technology Sales.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] mb-1">
          Sales, Support &amp; Partnerships
        </p>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
          Contact VS Technology
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href={`mailto:${CONTACT_INFO.email}`}
          className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-5 space-y-1.5 hover:border-[#00D4FF] transition-colors"
        >
          <Mail className="w-5 h-5 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
          <div className="text-xs text-slate-500 dark:text-[#A9B4D0]">Official Email</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white break-all">
            {CONTACT_INFO.email}
          </div>
        </a>
        <a
          href={CONTACT_INFO.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-5 space-y-1.5 hover:border-[#7CFF6B] transition-colors"
        >
          <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-[#7CFF6B]" aria-hidden="true" />
          <div className="text-xs text-slate-500 dark:text-[#A9B4D0]">Phone &amp; WhatsApp</div>
          <div className="font-mono text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{CONTACT_INFO.phoneDisplay}</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </div>
        </a>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-5 space-y-1.5">
          <MapPin className="w-5 h-5 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
          <div className="text-xs text-slate-500 dark:text-[#A9B4D0]">Address</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {CONTACT_INFO.address}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-5 space-y-2">
          <div className="text-xs text-slate-500 dark:text-[#A9B4D0]">Social Channels</div>
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            <a
              href={CONTACT_INFO.instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-cyan-700 dark:text-[#00D4FF] hover:underline"
            >
              <Instagram className="w-4 h-4" aria-hidden="true" />
              <span>Instagram</span>
            </a>
            <a
              href={CONTACT_INFO.facebookHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-cyan-700 dark:text-[#00D4FF] hover:underline"
            >
              <Facebook className="w-4 h-4" aria-hidden="true" />
              <span>Facebook</span>
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-8">
        {sent ? (
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-emerald-700 dark:text-[#7CFF6B]">
              Thank you! Your inquiry has been logged.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
            >
              Send Another Inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cp-name"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1"
                >
                  Full Name *
                </label>
                <input
                  id="cp-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.name}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="cp-company"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1"
                >
                  Company
                </label>
                <input
                  id="cp-company"
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cp-email"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1"
                >
                  Email *
                </label>
                <input
                  id="cp-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.email}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="cp-phone"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1"
                >
                  Phone *
                </label>
                <input
                  id="cp-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label
                htmlFor="cp-msg"
                className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1"
              >
                Message *
              </label>
              <textarea
                id="cp-msg"
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
              {errors.message && (
                <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                  {errors.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function PolicyPage({ slug }: { slug: PolicySlug }) {
  const policy = POLICY_CONTENT[slug];
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-10 space-y-6">
        <div>
          <p className="text-xs text-slate-500 dark:text-[#A9B4D0]">{policy.updated}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {policy.title}
          </h1>
        </div>
        <div className="space-y-5">
          {policy.sections.map((sec) => (
            <section key={sec.heading} className="space-y-1.5">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                {sec.heading}
              </h2>
              <p className="text-sm text-slate-600 dark:text-[#A9B4D0] leading-relaxed">
                {sec.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
