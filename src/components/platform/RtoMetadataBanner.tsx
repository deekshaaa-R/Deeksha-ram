import {
  Building2,
  CalendarCheck2,
  FileCheck2,
  Navigation,
  Phone,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import type { RtoVehicleMetadata } from '../../utils/rtoRegistryDatabase';

interface RtoMetadataBannerProps {
  record: RtoVehicleMetadata;
  onDismiss: () => void;
  compact?: boolean;
}

export function RtoMetadataBanner({
  record,
  onDismiss,
  compact = false,
}: RtoMetadataBannerProps) {
  return (
    <section
      data-testid="rto-live-tracking-metadata"
      data-rto-vehicle={record.vehicleNumber}
      aria-label={`RTO registry metadata for ${record.vehicleNumber}`}
      className="rounded-xl border border-cyan-500/35 bg-white dark:bg-[#0F1834] p-3.5 space-y-3"
    >
      {/* Top Row: Vehicle Title + Driver Call CTA + Dismiss */}
      <div className="flex flex-wrap items-start justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-white/10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 font-semibold text-cyan-700 dark:text-[#00D4FF]">
              <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Live Tracking Active</span>
            </span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="font-mono text-slate-600 dark:text-slate-300">
              {record.rtoOffice}
            </span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              {record.source === 'live-fleet' ? 'Active Fleet Telemetry' : 'RTO Registry Live Sync'}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h3 className="font-mono text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {record.vehicleNumber}
            </h3>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {record.makeModel}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              ({record.vehicleClass} · {record.fuelType})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`tel:${record.driverPhone.replace(/\s+/g, '')}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#00D4FF] text-[#0A1128] px-3 py-1.5 text-xs font-semibold hover:bg-[#33DDFF] transition-colors whitespace-nowrap"
          >
            <Phone className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Call {record.driverName}</span>
          </a>
          <button
            type="button"
            aria-label="Close RTO metadata banner"
            data-testid="rto-metadata-dismiss"
            onClick={onDismiss}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/15 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metadata Grid */}
      <dl
        className={`grid gap-2.5 text-[11px] ${
          compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6'
        }`}
      >
        <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] px-2.5 py-2">
          <dt className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Building2 className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Owner / Fleet</span>
          </dt>
          <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white truncate" title={record.transporterCompany}>
            {record.ownerName}
          </dd>
          <dd className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {record.transporterCompany}
          </dd>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] px-2.5 py-2">
          <dt className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Phone className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Driver Contact</span>
          </dt>
          <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white truncate">
            {record.driverName}
          </dd>
          <dd className="font-mono text-[10px] text-cyan-700 dark:text-[#00D4FF] truncate">
            {record.driverPhone}
          </dd>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] px-2.5 py-2">
          <dt className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Truck className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Chassis / Engine</span>
          </dt>
          <dd className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-white truncate" title={record.chassisNumber}>
            {record.chassisNumber}
          </dd>
          <dd className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate" title={record.engineNumber}>
            {record.engineNumber}
          </dd>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] px-2.5 py-2">
          <dt className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <CalendarCheck2 className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Registered / Permit</span>
          </dt>
          <dd className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-white">
            {record.registrationDate}
          </dd>
          <dd className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={record.permitType}>
            {record.permitType}
          </dd>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] px-2.5 py-2">
          <dt className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Insurance &amp; Fitness</span>
          </dt>
          <dd className="mt-0.5 font-mono font-semibold text-emerald-700 dark:text-emerald-400">
            Ins: {record.insuranceValidUntil}
          </dd>
          <dd className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
            Fit: {record.fitnessValidUntil}
          </dd>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-[#0A1128] px-2.5 py-2">
          <dt className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <FileCheck2 className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>GPS Hardware</span>
          </dt>
          <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white truncate">
            {record.deviceModel}
          </dd>
          <dd className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
            IMEI {record.imei}
          </dd>
        </div>
      </dl>
    </section>
  );
}
