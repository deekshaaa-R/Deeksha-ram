import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  ChevronDown,
  Cpu,
  Download,
  FileBarChart2,
  FileText,
  LogIn,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CONTACT_INFO } from '../data/catalog';
import {
  ROLE_ACCESS_MATRIX,
  VEHICLE_ONBOARDING_FIELDS,
  buildUserManualSpec,
} from '../utils/manualDocumentation';
import { downloadManualPdf } from '../utils/manualPdfGenerator';
import {
  GUIDE_SECTIONS,
  SAMPLE_REPORT_ROWS,
  SUPPORT_FAQS,
  buildGeofenceRuleSummary,
  filterGuideSections,
  generateTelemetryCsv,
  type GeofenceRuleInput,
  type GuideSectionId,
  type ReportType,
} from '../utils/supportGuideLogic';

const SECTION_ICONS: Record<GuideSectionId, typeof LogIn> = {
  login: LogIn,
  tracking: Navigation,
  reports: FileBarChart2,
  geofence: ShieldAlert,
};

export function SupportGuidePage({
  initialSection,
}: {
  initialSection?: GuideSectionId;
}) {
  const { user, navigate, showToast } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<GuideSectionId>(
    initialSection ?? 'login'
  );
  const [openFaqId, setOpenFaqId] = useState<string | null>(SUPPORT_FAQS[0].id);

  // Interactive Report Preview & CSV Export state (Chapter 03)
  const [reportType, setReportType] = useState<ReportType>('trips');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Moving' | 'Idle' | 'Alert'>('All');

  // Interactive Geofence Rule Builder Preview state (Chapter 04)
  const [geofenceInput, setGeofenceInput] = useState<GeofenceRuleInput>({
    zoneName: 'Tumkuru Depot Zone B',
    radiusMeters: 750,
    trigger: 'exit',
    speedLimitKmh: 85,
    notifyWhatsApp: true,
    notifyDashboard: true,
    autoImmobilize: false,
  });
  const [ruleTested, setRuleTested] = useState(false);

  useEffect(() => {
    if (!initialSection) return;
    setActiveSection(initialSection);
    const el = document.getElementById(`guide-${initialSection}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [initialSection]);

  const filteredSections = useMemo(
    () => filterGuideSections(GUIDE_SECTIONS, searchQuery),
    [searchQuery]
  );

  const filteredReportRows = useMemo(
    () =>
      statusFilter === 'All'
        ? SAMPLE_REPORT_ROWS
        : SAMPLE_REPORT_ROWS.filter((r) => r.status === statusFilter),
    [statusFilter]
  );

  const geofencePreview = useMemo(
    () => buildGeofenceRuleSummary(geofenceInput),
    [geofenceInput]
  );

  const jumpToSection = (id: GuideSectionId) => {
    setActiveSection(id);
    if (searchQuery.trim()) {
      setSearchQuery('');
    }
    window.setTimeout(() => {
      document
        .getElementById(`guide-${id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  };

  const handleDownloadCsv = () => {
    const csv = generateTelemetryCsv(filteredReportRows, reportType);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vs-technology-${reportType}-report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredReportRows.length} rows to CSV report.`);
  };

  const handleSaveRulePreview = () => {
    if (!geofencePreview.valid) {
      showToast(geofencePreview.error ?? 'Check zone settings.', 'info');
      return;
    }
    setRuleTested(true);
    showToast(`Geofence rule "${geofenceInput.zoneName.trim()}" validated.`);
  };

  const handleDownloadUserManualPdf = () => {
    const spec = buildUserManualSpec({
      preparedFor: user.company || user.name || 'Fleet Operators & Vehicle Owners',
    });
    downloadManualPdf(spec);
    showToast(`Downloaded ${spec.filename}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-10">
      {/* Page Header & Search */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>Platform Documentation &amp; Support Center</span>
          </p>
          <h1
            className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            VS Technology Support &amp; User Guide
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#A9B4D0] leading-relaxed">
            Step-by-step instructions for initial login, live GPS fleet tracking,
            trip and fuel report exports, and automated geofence alert rules.
          </p>
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-3">
          <div>
            <label
              htmlFor="guide-search-input"
              className="block text-xs font-medium text-slate-600 dark:text-[#A9B4D0] mb-1.5"
            >
              Search Guide Topics
            </label>
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="guide-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. login, geofence, CSV, SIM..."
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-2 focus:outline-[#00D4FF]"
              />
            </div>
          </div>

          <button
            type="button"
            data-testid="download-user-manual-btn"
            onClick={handleDownloadUserManualPdf}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] whitespace-nowrap cursor-pointer transition-colors"
          >
            <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Download User Manual (PDF)</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout: Sticky Chapter Sidebar + Guide Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Chapter Sidebar */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          <nav
            aria-label="User guide chapters"
            className="rounded-2xl border border-slate-200 dark:border-[#1E2E5C] bg-white dark:bg-[#111B3A] p-4 space-y-1.5"
          >
            <div className="px-2 pb-2 text-xs font-semibold text-slate-500 dark:text-[#A9B4D0]">
              Chapters
            </div>
            {GUIDE_SECTIONS.map((section) => {
              const Icon = SECTION_ICONS[section.id];
              const isCurrent = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => jumpToSection(section.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-[#00D4FF] text-[#0A1128]'
                      : 'text-slate-700 dark:text-[#A9B4D0] hover:bg-slate-100 dark:hover:bg-[#0A1128] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{section.chapterLabel}</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-75" aria-hidden="true" />
                </button>
              );
            })}
          </nav>

          {/* Direct Support Desk Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E5C] bg-white dark:bg-[#111B3A] p-5 space-y-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Need Technician or Dispatch Help?
              </h2>
              <p className="text-xs text-slate-600 dark:text-[#A9B4D0] mt-1 leading-relaxed">
                Reach the VS Technology engineering desk for IMEI activation, relay
                wiring, or bulk fleet setup.
              </p>
            </div>
            <div className="space-y-2.5 text-xs">
              <a
                href={CONTACT_INFO.telHref}
                className="flex items-center gap-2 font-mono font-medium text-slate-800 dark:text-white hover:text-cyan-700 dark:hover:text-[#00D4FF]"
              >
                <Phone className="w-3.5 h-3.5 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
                <span>{CONTACT_INFO.phoneDisplay}</span>
              </a>
              <a
                href={CONTACT_INFO.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-mono font-medium text-emerald-700 dark:text-[#7CFF6B] hover:underline"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>WhatsApp: {CONTACT_INFO.phoneRaw}</span>
              </a>
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="flex items-center gap-2 text-slate-700 dark:text-[#A9B4D0] hover:text-cyan-700 dark:hover:text-[#00D4FF]"
              >
                <Mail className="w-3.5 h-3.5 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
                <span>{CONTACT_INFO.email}</span>
              </a>
              <div className="flex items-center gap-2 text-slate-600 dark:text-[#A9B4D0]">
                <MapPin className="w-3.5 h-3.5 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
                <span>Head Office: {CONTACT_INFO.address}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate({ page: 'book-installation' })}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] whitespace-nowrap cursor-pointer"
              >
                Book Installation
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'ai-studio' })}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] whitespace-nowrap cursor-pointer"
              >
                Ask AI Copilot
              </button>
            </div>
          </div>
        </aside>

        {/* Right Guide Content */}
        <div className="lg:col-span-8 space-y-10">
          {filteredSections.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E5C] bg-white dark:bg-[#111B3A] p-8 text-center space-y-3">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                No matching guide chapters found
              </h2>
              <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
                No guide topics matched &ldquo;{searchQuery}&rdquo;. Clear the
                filter to view all 4 chapters.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
              >
                Show All Topics
              </button>
            </div>
          ) : (
            filteredSections.map((section) => {
              const Icon = SECTION_ICONS[section.id];
              return (
                <section
                  key={section.id}
                  id={`guide-${section.id}`}
                  aria-labelledby={`heading-${section.id}`}
                  className="scroll-mt-24 rounded-2xl border border-slate-200 dark:border-[#1E2E5C] bg-white dark:bg-[#111B3A] p-6 sm:p-8 space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        <span>{section.chapterLabel}</span>
                      </div>
                      <h2
                        id={`heading-${section.id}`}
                        className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white"
                      >
                        {section.title}
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-[#A9B4D0] leading-relaxed">
                        {section.subtitle}
                      </p>
                    </div>

                    {/* Section Shortcut Button */}
                    {section.id === 'login' && (
                      <button
                        type="button"
                        onClick={() => navigate({ page: 'login' })}
                        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] whitespace-nowrap cursor-pointer"
                      >
                        <span>Open Login</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                    {section.id === 'tracking' && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate({ page: 'home', section: 'live-simulator' })
                        }
                        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] whitespace-nowrap cursor-pointer"
                      >
                        <span>Open Live Simulator</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {/* Step List */}
                  <ol className="divide-y divide-slate-200/80 dark:divide-white/10">
                    {section.steps.map((step) => (
                      <li
                        key={step.number}
                        className="py-4 first:pt-0 last:pb-0 flex items-start gap-4"
                      >
                        <span className="font-mono text-xs font-bold tabular-nums text-cyan-700 dark:text-[#00D4FF] pt-0.5 shrink-0">
                          {step.number}
                        </span>
                        <div className="space-y-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                            {step.title}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-[#A9B4D0] leading-relaxed">
                            {step.detail}
                          </p>
                          {step.tip && (
                            <p className="text-xs text-slate-500 dark:text-[#A9B4D0] pt-1">
                              Tip · {step.tip}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>

                  {/* Quick Links for Login Chapter */}
                  {section.id === 'login' && (
                    <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => navigate({ page: 'account', tab: 'devices' })}
                        className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                      >
                        View Tracked Devices
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate({ page: 'warranty' })}
                        className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] cursor-pointer"
                      >
                        Register Device Warranty
                      </button>
                    </div>
                  )}

                  {/* Interactive Sample Report Generator (Chapter 03) */}
                  {section.id === 'reports' && (
                    <div className="pt-5 border-t border-slate-200 dark:border-white/10 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Interactive Report Preview &amp; CSV Export
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                            Select a report type and status filter, then export a
                            spreadsheet-ready CSV log.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadCsv}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Download CSV Report</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div
                          role="group"
                          aria-label="Report type"
                          className="inline-flex rounded-xl bg-slate-100 dark:bg-[#0A1128] p-1 gap-1"
                        >
                          {(
                            [
                              ['trips', 'Trip Summary'],
                              ['fuel', 'Fuel Audit'],
                              ['safety', 'Safety & ADAS'],
                            ] as const
                          ).map(([id, label]) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setReportType(id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                                reportType === id
                                  ? 'bg-white dark:bg-[#111B3A] text-slate-900 dark:text-white shadow-sm'
                                  : 'text-slate-600 dark:text-[#A9B4D0]'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        <div
                          role="group"
                          aria-label="Vehicle status filter"
                          className="inline-flex rounded-xl bg-slate-100 dark:bg-[#0A1128] p-1 gap-1"
                        >
                          {(['All', 'Moving', 'Idle', 'Alert'] as const).map(
                            (st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setStatusFilter(st)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                                  statusFilter === st
                                    ? 'bg-[#00D4FF] text-[#0A1128]'
                                    : 'text-slate-600 dark:text-[#A9B4D0]'
                                }`}
                              >
                                {st}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-[#0A1128] text-slate-500 dark:text-[#A9B4D0] border-b border-slate-200 dark:border-white/10">
                            <tr>
                              <th className="py-2.5 px-3 font-semibold">Unit</th>
                              <th className="py-2.5 px-3 font-semibold">Corridor</th>
                              <th className="py-2.5 px-3 font-semibold text-right">
                                Distance
                              </th>
                              <th className="py-2.5 px-3 font-semibold text-right">
                                {reportType === 'fuel'
                                  ? 'Fuel (L)'
                                  : reportType === 'safety'
                                  ? 'Alerts'
                                  : 'Avg Speed'}
                              </th>
                              <th className="py-2.5 px-3 font-semibold text-right">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
                            {filteredReportRows.map((row) => (
                              <tr
                                key={row.unit}
                                className="hover:bg-slate-50 dark:hover:bg-[#0A1128]/60"
                              >
                                <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                  {row.unit}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-[#A9B4D0]">
                                  {row.corridor} · {row.driver}
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-900 dark:text-white">
                                  {row.distanceKm.toFixed(1)} km
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-900 dark:text-white">
                                  {reportType === 'fuel'
                                    ? `${row.fuelLiters.toFixed(1)} L`
                                    : reportType === 'safety'
                                    ? row.alertsCount
                                    : `${row.avgSpeedKmh} km/h`}
                                </td>
                                <td
                                  className={`py-2.5 px-3 font-semibold text-right ${
                                    row.status === 'Moving'
                                      ? 'text-emerald-700 dark:text-[#7CFF6B]'
                                      : row.status === 'Idle'
                                      ? 'text-amber-700 dark:text-[#FFB020]'
                                      : 'text-rose-700 dark:text-[#FF4D4F]'
                                  }`}
                                >
                                  {row.status}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Interactive Geofence Rule Builder Preview (Chapter 04) */}
                  {section.id === 'geofence' && (
                    <div className="pt-5 border-t border-slate-200 dark:border-white/10 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Interactive Geofence Alert Rule Preview
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                            Practice configuring a depot boundary and overspeed
                            rule before testing it on the Live Simulator.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            navigate({ page: 'home', section: 'live-simulator' })
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-cyan-500 dark:hover:border-[#00D4FF] whitespace-nowrap cursor-pointer"
                        >
                          <span>Test Breach in Simulator</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="geofence-zone-name"
                            className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1"
                          >
                            Zone Name
                          </label>
                          <input
                            id="geofence-zone-name"
                            type="text"
                            value={geofenceInput.zoneName}
                            onChange={(e) => {
                              setRuleTested(false);
                              setGeofenceInput({
                                ...geofenceInput,
                                zoneName: e.target.value,
                              });
                            }}
                            className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="geofence-trigger"
                            className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1"
                          >
                            Boundary Trigger
                          </label>
                          <select
                            id="geofence-trigger"
                            value={geofenceInput.trigger}
                            onChange={(e) => {
                              setRuleTested(false);
                              setGeofenceInput({
                                ...geofenceInput,
                                trigger: e.target.value as GeofenceRuleInput['trigger'],
                              });
                            }}
                            className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                          >
                            <option value="exit">Alert on Boundary Exit</option>
                            <option value="enter">Alert on Boundary Entry</option>
                            <option value="both">Alert on Both Entry &amp; Exit</option>
                          </select>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <label
                              htmlFor="geofence-radius"
                              className="font-medium text-slate-700 dark:text-[#A9B4D0]"
                            >
                              Zone Radius
                            </label>
                            <span className="font-mono font-semibold tabular-nums text-cyan-700 dark:text-[#00D4FF]">
                              {geofenceInput.radiusMeters} m
                            </span>
                          </div>
                          <input
                            id="geofence-radius"
                            type="range"
                            min={100}
                            max={5000}
                            step={50}
                            value={geofenceInput.radiusMeters}
                            onChange={(e) => {
                              setRuleTested(false);
                              setGeofenceInput({
                                ...geofenceInput,
                                radiusMeters: Number(e.target.value),
                              });
                            }}
                            className="w-full accent-[#00D4FF] cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <label
                              htmlFor="geofence-speed"
                              className="font-medium text-slate-700 dark:text-[#A9B4D0]"
                            >
                              Speed Alert Limit
                            </label>
                            <span className="font-mono font-semibold tabular-nums text-cyan-700 dark:text-[#00D4FF]">
                              {geofenceInput.speedLimitKmh} km/h
                            </span>
                          </div>
                          <input
                            id="geofence-speed"
                            type="range"
                            min={40}
                            max={120}
                            step={5}
                            value={geofenceInput.speedLimitKmh}
                            onChange={(e) => {
                              setRuleTested(false);
                              setGeofenceInput({
                                ...geofenceInput,
                                speedLimitKmh: Number(e.target.value),
                              });
                            }}
                            className="w-full accent-[#00D4FF] cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-5 text-xs text-slate-700 dark:text-[#A9B4D0]">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={geofenceInput.notifyDashboard}
                            onChange={(e) =>
                              setGeofenceInput({
                                ...geofenceInput,
                                notifyDashboard: e.target.checked,
                              })
                            }
                            className="accent-[#00D4FF]"
                          />
                          <span>Dashboard Alert Popup</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={geofenceInput.notifyWhatsApp}
                            onChange={(e) =>
                              setGeofenceInput({
                                ...geofenceInput,
                                notifyWhatsApp: e.target.checked,
                              })
                            }
                            className="accent-[#00D4FF]"
                          />
                          <span>WhatsApp Dispatch Alert</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={geofenceInput.autoImmobilize}
                            onChange={(e) =>
                              setGeofenceInput({
                                ...geofenceInput,
                                autoImmobilize: e.target.checked,
                              })
                            }
                            className="accent-[#00D4FF]"
                          />
                          <span>Safe Relay Cut-Off (&lt; 15 km/h)</span>
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <div className="text-xs text-slate-700 dark:text-[#A9B4D0] flex items-start gap-2">
                          {geofencePreview.valid ? (
                            <Bell
                              className="w-4 h-4 text-cyan-700 dark:text-[#00D4FF] shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                          ) : (
                            <ShieldAlert
                              className="w-4 h-4 text-rose-600 dark:text-[#FF4D4F] shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                          )}
                          <span data-testid="geofence-rule-summary">
                            {geofencePreview.valid
                              ? geofencePreview.summary
                              : geofencePreview.error}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveRulePreview}
                          className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] whitespace-nowrap cursor-pointer"
                        >
                          {ruleTested ? 'Rule Validated' : 'Validate Alert Rule'}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              );
            })
          )}

          {/* Admin vs. Client Login & Adding New Vehicles Quick Reference */}
          <section
            id="guide-roles-onboarding"
            aria-labelledby="roles-onboarding-heading"
            data-testid="roles-onboarding-section"
            className="rounded-2xl border border-slate-200 dark:border-[#1E2E5C] bg-white dark:bg-[#111B3A] p-6 sm:p-8 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
                  <UserCheck className="w-4 h-4" aria-hidden="true" />
                  <span>05. Role Access &amp; Vehicle Onboarding</span>
                </div>
                <h2
                  id="roles-onboarding-heading"
                  className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white"
                >
                  Admin Login, Client Login &amp; Including New Vehicles
                </h2>
                <p className="text-sm text-slate-600 dark:text-[#A9B4D0] leading-relaxed">
                  Reference guide comparing Client and Administrator authentication along with step-by-step hardware onboarding. Download the printable User Manual PDF above.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate({ page: 'account', tab: 'devices' })}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] whitespace-nowrap cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Open Fleet Devices</span>
              </button>
            </div>

            {/* Client vs Admin Login Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] p-4 space-y-2">
                <div className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
                  Client Login (Fleet Owner / Driver)
                </div>
                <p className="text-xs text-slate-600 dark:text-[#A9B4D0] leading-relaxed">
                  Click <strong className="text-slate-900 dark:text-white">Login → Continue with Google</strong> for cloud-synced vehicles, odometer logs, and AI transcripts—or choose <strong className="text-slate-900 dark:text-white">Continue with Demo Fleet Account</strong> for instant browser-local testing.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] p-4 space-y-2">
                <div className="text-xs font-semibold text-emerald-700 dark:text-[#7CFF6B]">
                  Admin Login (Super Admin / Fleet Manager)
                </div>
                <p className="text-xs text-slate-600 dark:text-[#A9B4D0] leading-relaxed">
                  Admin privileges require verified Google sign-in (<span className="font-mono text-slate-900 dark:text-white">email_verified == true</span>) via the bootstrap admin account (<span className="font-mono text-slate-900 dark:text-white">ramdeeksharam@gmail.com</span>) or a delegated grant in <span className="font-mono text-slate-900 dark:text-white">/admins/{'{uid}'}</span>.
                </p>
              </div>
            </div>

            {/* Access Matrix Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#0A1128] text-slate-600 dark:text-[#A9B4D0] border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Capability</th>
                    <th className="py-2.5 px-3 font-semibold">Client (Verified)</th>
                    <th className="py-2.5 px-3 font-semibold">Admin / Manager</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
                  {ROLE_ACCESS_MATRIX.map((row) => (
                    <tr key={row.capability}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {row.capability}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-[#A9B4D0]">
                        {row.clientVerified}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200">
                        {row.adminManager}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vehicle Onboarding Fields */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                How to Include a New Vehicle (Required Fields)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VEHICLE_ONBOARDING_FIELDS.map((item) => (
                  <div
                    key={item.field}
                    className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] p-3.5 space-y-1 text-xs"
                  >
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {item.field}
                    </div>
                    <p className="text-slate-600 dark:text-[#A9B4D0]">
                      {item.validationRule}
                    </p>
                    <p className="font-mono text-[11px] text-cyan-700 dark:text-[#00D4FF]">
                      Example: {item.exampleValue}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Troubleshooting FAQs */}
          <section
            aria-labelledby="support-faq-heading"
            className="rounded-2xl border border-slate-200 dark:border-[#1E2E5C] bg-white dark:bg-[#111B3A] p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck
                className="w-5 h-5 text-cyan-700 dark:text-[#00D4FF]"
                aria-hidden="true"
              />
              <h2
                id="support-faq-heading"
                className="font-display text-xl font-bold text-slate-900 dark:text-white"
              >
                Troubleshooting &amp; Common Questions
              </h2>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-white/10">
              {SUPPORT_FAQS.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className="py-3.5 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full flex items-center justify-between gap-4 text-left text-sm font-semibold text-slate-900 dark:text-white py-1 cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-cyan-700 dark:text-[#00D4FF]' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <p className="text-sm text-slate-600 dark:text-[#A9B4D0] leading-relaxed mt-2 pr-6">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
