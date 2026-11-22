import { useState, type FormEvent } from 'react';
import { Calendar, CheckCircle2, ShieldCheck, Wrench } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  validateEmail,
  validateInstallationFields,
  validatePhone,
  validateRequired,
  validateWarrantyFields,
  type FieldErrors,
} from '../utils/storeLogic';

export function BookInstallationPage() {
  const { addInstallationBooking, navigate, showToast } = useStore();
  const [form, setForm] = useState({
    vehicleType: 'Commercial Truck / Fleet',
    city: 'Bengaluru',
    date: '2026-11-25',
    timeSlot: '10:00 AM – 12:00 PM',
    customerName: '',
    phone: '',
  });
  const [errors, setErrors] = useState<
    FieldErrors<'vehicleType' | 'city' | 'date' | 'timeSlot' | 'customerName' | 'phone'>
  >({});
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateInstallationFields(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const created = addInstallationBooking(form);
    setConfirmedId(created.id);
    showToast(`Installation slot ${created.id} confirmed for ${form.city}.`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-10 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
            <Wrench className="w-4 h-4" aria-hidden="true" />
            <span>Certified Technician Network</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Book Hardware Installation
          </h1>
          <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
            Schedule a trained VS Technology technician at your depot, office, or home
            across 450+ cities.
          </p>
        </div>

        {confirmedId ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-[#7CFF6B] font-semibold">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              <span>Installation Scheduled · Reference #{confirmedId}</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-[#A9B4D0]">
              Technician visit booked for <strong>{form.vehicleType}</strong> in{' '}
              <strong>{form.city}</strong> on <strong>{form.date}</strong> ({form.timeSlot}).
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate({ page: 'account', tab: 'bookings' })}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
              >
                View in My Account
              </button>
              <button
                type="button"
                onClick={() => setConfirmedId(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white cursor-pointer"
              >
                Book Another Vehicle
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="inst-vehicle"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Vehicle Type *
                </label>
                <select
                  id="inst-vehicle"
                  value={form.vehicleType}
                  onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                >
                  <option value="Commercial Truck / Fleet">Commercial Truck / Fleet</option>
                  <option value="Passenger Car / SUV">Passenger Car / SUV</option>
                  <option value="Two-Wheeler / Scooter">Two-Wheeler / Scooter</option>
                  <option value="Bus / Coach">Bus / Coach</option>
                  <option value="Tractor / Harvester">Tractor / Harvester</option>
                </select>
                {errors.vehicleType && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.vehicleType}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="inst-city"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  City *
                </label>
                <input
                  id="inst-city"
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Bengaluru, Pune, Delhi"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.city}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="inst-date"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Preferred Date *
                </label>
                <input
                  id="inst-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
                {errors.date && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.date}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="inst-slot"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Time Slot *
                </label>
                <select
                  id="inst-slot"
                  value={form.timeSlot}
                  onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                >
                  <option value="10:00 AM – 12:00 PM">10:00 AM – 12:00 PM</option>
                  <option value="12:30 PM – 02:30 PM">12:30 PM – 02:30 PM</option>
                  <option value="03:00 PM – 05:00 PM">03:00 PM – 05:00 PM</option>
                  <option value="05:30 PM – 07:30 PM">05:30 PM – 07:30 PM</option>
                </select>
                {errors.timeSlot && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.timeSlot}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="inst-name"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Contact Name *
                </label>
                <input
                  id="inst-name"
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
                {errors.customerName && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.customerName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="inst-phone"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Mobile Number *
                </label>
                <input
                  id="inst-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
            >
              Confirm Installation Slot
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function BookDemoPage({ prefillInterest }: { prefillInterest?: string }) {
  const { addDemoRequest, showToast } = useStore();
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    fleetSize: '10–50 Vehicles',
    interest: prefillInterest || 'VS Fleet Pro & 4G AI Dashcams',
    preferredDate: '2026-11-24',
  });
  const [errors, setErrors] = useState<
    FieldErrors<'name' | 'company' | 'email' | 'phone' | 'preferredDate'>
  >({});
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs: FieldErrors<'name' | 'company' | 'email' | 'phone' | 'preferredDate'> =
      {};
    const nErr = validateRequired(form.name, 'Full name');
    if (nErr) errs.name = nErr;
    const cErr = validateRequired(form.company, 'Company name');
    if (cErr) errs.company = cErr;
    const eErr = validateEmail(form.email);
    if (eErr) errs.email = eErr;
    const pErr = validatePhone(form.phone);
    if (pErr) errs.phone = pErr;
    const dErr = validateRequired(form.preferredDate, 'Preferred date');
    if (dErr) errs.preferredDate = dErr;

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const created = addDemoRequest(form);
    setSubmittedId(created.id);
    showToast('Live platform demo scheduled!');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-10 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            <span>Live Product &amp; Platform Walkthrough</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Book a Free Live Demo
          </h1>
          <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
            Experience live GPS telemetry, fuel theft reports, ADAS dashcam feeds, or
            white-label branding with a solution engineer.
          </p>
        </div>

        {submittedId ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-[#7CFF6B] font-semibold">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              <span>Demo Scheduled · {form.preferredDate}</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-[#A9B4D0]">
              We have sent a calendar invite to <strong>{form.email}</strong> for{' '}
              <strong>{form.interest}</strong>.
            </p>
            <button
              type="button"
              onClick={() => setSubmittedId(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
            >
              Schedule Another Demo
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="demo-name"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Full Name *
                </label>
                <input
                  id="demo-name"
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
                  htmlFor="demo-company"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Company Name *
                </label>
                <input
                  id="demo-company"
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
                {errors.company && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.company}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="demo-email"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Work Email *
                </label>
                <input
                  id="demo-email"
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
                  htmlFor="demo-phone"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Phone Number *
                </label>
                <input
                  id="demo-phone"
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="demo-fleet"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Fleet Size
                </label>
                <select
                  id="demo-fleet"
                  value={form.fleetSize}
                  onChange={(e) => setForm({ ...form, fleetSize: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                >
                  <option value="1–9 Vehicles">1–9 Vehicles</option>
                  <option value="10–50 Vehicles">10–50 Vehicles</option>
                  <option value="51–250 Vehicles">51–250 Vehicles</option>
                  <option value="250+ Enterprise / Dealer">
                    250+ Enterprise / Dealer
                  </option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="demo-interest"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Primary Interest
                </label>
                <input
                  id="demo-interest"
                  type="text"
                  value={form.interest}
                  onChange={(e) => setForm({ ...form, interest: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="demo-date"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Preferred Date *
                </label>
                <input
                  id="demo-date"
                  type="date"
                  value={form.preferredDate}
                  onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
                {errors.preferredDate && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.preferredDate}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
            >
              Book Live Demo
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function WarrantyRegistrationPage() {
  const { products, registerWarranty, navigate, showToast } = useStore();
  const [form, setForm] = useState({
    imei: '',
    productName: products[0]?.name ?? 'VS Lite Wired GPS Tracker',
    purchaseDate: '2026-11-10',
    invoiceNumber: '',
    email: '',
  });
  const [errors, setErrors] = useState<
    FieldErrors<'imei' | 'productName' | 'purchaseDate' | 'invoiceNumber' | 'email'>
  >({});
  const [registeredImei, setRegisteredImei] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateWarrantyFields(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const record = registerWarranty({
      imei: form.imei.trim(),
      productName: form.productName,
      purchaseDate: form.purchaseDate,
      invoiceNumber: form.invoiceNumber.trim(),
    });
    setRegisteredImei(record.imei);
    showToast(`Warranty activated for IMEI ${record.imei}.`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-10 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>Hardware Protection Portal</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Warranty Registration
          </h1>
          <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
            Register your 15-digit device IMEI and invoice number to activate instant
            replacement coverage across VS Experience Centers.
          </p>
        </div>

        {registeredImei ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-[#7CFF6B] font-semibold">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              <span>Warranty Active for IMEI {registeredImei}</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-[#A9B4D0]">
              Your warranty certificate has been added to your VS Account dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate({ page: 'account', tab: 'warranty' })}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
              >
                View My Warranties
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegisteredImei(null);
                  setForm({ ...form, imei: '', invoiceNumber: '' });
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white cursor-pointer"
              >
                Register Another Device
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="war-imei"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  15-Digit Device IMEI *
                </label>
                <input
                  id="war-imei"
                  type="text"
                  inputMode="numeric"
                  maxLength={15}
                  value={form.imei}
                  onChange={(e) => setForm({ ...form, imei: e.target.value })}
                  placeholder="864291053829104"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white"
                />
                {errors.imei && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.imei}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="war-product"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Product Model *
                </label>
                <select
                  id="war-product"
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.productName && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.productName}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="war-date"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Purchase Date *
                </label>
                <input
                  id="war-date"
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
                {errors.purchaseDate && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.purchaseDate}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="war-invoice"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Invoice Number *
                </label>
                <input
                  id="war-invoice"
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                  placeholder="INV-VST-2026-104"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white"
                />
                {errors.invoiceNumber && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.invoiceNumber}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="war-email"
                  className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
                >
                  Registered Email *
                </label>
                <input
                  id="war-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ops@company.com"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
            >
              Activate Warranty Coverage
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
