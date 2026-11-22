import { BellRing, Fuel, ShieldCheck } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';

interface ImpactMetric {
  id: string;
  title: string;
  target: number;
  decimals?: number;
  suffix: string;
  description: string;
  accentTextClass: string;
  iconBgClass: string;
  icon: typeof ShieldCheck;
}

const IMPACT_METRICS: ImpactMetric[] = [
  {
    id: 'accidents-prevented',
    title: 'Accidents Prevented',
    target: 14280,
    suffix: '+',
    description:
      'Collisions averted through real-time ADAS forward warnings, fatigue detection, and proactive overspeed coaching.',
    accentTextClass: 'text-emerald-700 dark:text-[#7CFF6B]',
    iconBgClass:
      'bg-emerald-50 dark:bg-[#7CFF6B]/10 border-emerald-200 dark:border-[#7CFF6B]/30 text-emerald-700 dark:text-[#7CFF6B]',
    icon: ShieldCheck,
  },
  {
    id: 'driver-alerts-processed',
    title: 'Driver Alerts Processed',
    target: 4.8,
    decimals: 1,
    suffix: 'M+',
    description:
      'Geofence breaches, harsh braking events, SOS triggers, and engine relay notifications routed with sub-second latency.',
    accentTextClass: 'text-cyan-700 dark:text-[#00D4FF]',
    iconBgClass:
      'bg-cyan-50 dark:bg-[#00D4FF]/10 border-cyan-200 dark:border-[#00D4FF]/30 text-cyan-700 dark:text-[#00D4FF]',
    icon: BellRing,
  },
  {
    id: 'fuel-efficiency-improvement',
    title: 'Average Fuel Efficiency Improvement',
    target: 18.4,
    decimals: 1,
    suffix: '%',
    description:
      'Lowered diesel expenditure per fleet through anti-siphon tank probes, idle cut-off coaching, and optimized corridors.',
    accentTextClass: 'text-amber-700 dark:text-[#FFB020]',
    iconBgClass:
      'bg-amber-50 dark:bg-[#FFB020]/10 border-amber-200 dark:border-[#FFB020]/30 text-amber-700 dark:text-[#FFB020]',
    icon: Fuel,
  },
];

export function SafetyImpact() {
  return (
    <section
      id="annual-safety-impact"
      aria-labelledby="annual-safety-impact-heading"
      className="scroll-mt-24 py-16 sm:py-20 bg-slate-100/70 dark:bg-[#070D1F] border-t border-slate-200/80 dark:border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-[#00D4FF] mb-2">
            Measured Telematics Outcomes
          </p>
          <h2
            id="annual-safety-impact-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white"
          >
            Annual Safety Impact
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#A9B4D0] mt-2 leading-relaxed">
            Every VS Technology GPS unit, AI dashcam, and capacitive fuel probe
            works together to protect drivers, cargo, and fleet operating margins
            every single year.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {IMPACT_METRICS.map((metric) => {
            const Icon = metric.icon;
            return (
              <article
                key={metric.id}
                data-testid={`impact-card-${metric.id}`}
                className="rounded-2xl border border-slate-200 dark:border-[#1E2E5C] bg-white dark:bg-[#111B3A] p-6 sm:p-7 flex flex-col justify-between shadow-sm hover:-translate-y-0.5 hover:border-cyan-500/50 dark:hover:border-[#00D4FF]/40 transition-all duration-200"
              >
                <div>
                  <div
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-5 ${metric.iconBgClass}`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>

                  <div
                    className={`font-display text-3xl sm:text-4xl font-bold tracking-tight ${metric.accentTextClass}`}
                    data-testid={`impact-value-${metric.id}`}
                  >
                    <AnimatedCounter
                      target={metric.target}
                      decimals={metric.decimals}
                      suffix={metric.suffix}
                      durationMs={950}
                    />
                  </div>

                  <h3 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-white mt-2">
                    {metric.title}
                  </h3>

                  <p className="text-sm text-slate-600 dark:text-[#A9B4D0] mt-2 leading-relaxed">
                    {metric.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-slate-500 dark:text-[#A9B4D0] mt-6">
          *Annualized telematics impact figures across monitored VS Fleet Pro &amp;
          4G AI Dashcam deployments.
        </p>
      </div>
    </section>
  );
}
