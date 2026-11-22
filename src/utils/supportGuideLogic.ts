export type GuideSectionId = 'login' | 'tracking' | 'reports' | 'geofence';

export interface GuideStep {
  number: string;
  title: string;
  detail: string;
  tip?: string;
}

export interface GuideSection {
  id: GuideSectionId;
  chapterLabel: string;
  title: string;
  subtitle: string;
  steps: GuideStep[];
}

export interface SupportFaq {
  id: string;
  question: string;
  answer: string;
  category: GuideSectionId;
}

export type ReportType = 'trips' | 'fuel' | 'safety';

export interface SampleReportRow {
  unit: string;
  driver: string;
  corridor: string;
  distanceKm: number;
  avgSpeedKmh: number;
  fuelLiters: number;
  alertsCount: number;
  status: 'Moving' | 'Idle' | 'Alert';
}

export interface GeofenceRuleInput {
  zoneName: string;
  radiusMeters: number;
  trigger: 'exit' | 'enter' | 'both';
  speedLimitKmh: number;
  notifyWhatsApp: boolean;
  notifyDashboard: boolean;
  autoImmobilize: boolean;
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'login',
    chapterLabel: '01. Account & Onboarding',
    title: 'Initial Login & Account Setup',
    subtitle:
      'Sign in to VS Technology, sync your workspace to the cloud, and link purchased GPS or AI dashcam IMEIs.',
    steps: [
      {
        number: '01',
        title: 'Open the Login Portal',
        detail:
          'Click Login in the top-right header (or Account in the mobile bottom navigation bar) to reach the VS Account screen.',
      },
      {
        number: '02',
        title: 'Choose Your Authentication Method',
        detail:
          'Select Continue with Google for cloud-synced profile, wishlist, and AI Studio history, or use Email / Password to sign in or register a company fleet profile. For instant evaluation, click Continue with Demo Fleet Account.',
        tip: 'Google Sign-In automatically creates your encrypted profile record and restores saved hardware wishlists across devices.',
      },
      {
        number: '03',
        title: 'Verify Tracked Hardware & Activate Warranty',
        detail:
          'Open Account → Devices to inspect active IMEIs and SIM expiration dates, then open Warranty Registration to bind a 15-digit device IMEI and invoice number for 1–2 year coverage.',
      },
      {
        number: '04',
        title: 'Schedule Technician Installation (Optional)',
        detail:
          'If your hardware requires wired ignition-relay or capacitive fuel-probe mounting, open Book Installation from the top utility bar to reserve a technician slot.',
      },
    ],
  },
  {
    id: 'tracking',
    chapterLabel: '02. Live Fleet Console',
    title: 'Viewing Live Tracking on the Dashboard',
    subtitle:
      'Monitor real-time vehicle locations, speeds, ignition relays, and route corridors across Simulated and Google Maps layers.',
    steps: [
      {
        number: '01',
        title: 'Inspect Fleet Status Cards',
        detail:
          'At the top of the VS Fleet Pro Console (on the Hero and Live GPS Tracking Simulator), review Total fleet units alongside live Moving, Idle, and Alerts counts.',
      },
      {
        number: '02',
        title: 'Switch Between Simulated & Live Google Maps',
        detail:
          'Use the Simulated / Google Maps segmented toggle in the console header to inspect animated corridor routes or real-world interactive street and satellite map pins.',
      },
      {
        number: '03',
        title: 'Select a Vehicle Unit for Telemetry',
        detail:
          'Click any marker on the map or any unit card in the fleet list to view the assigned Driver, formatted GPS Coordinates, Ignition / Relay state, and live speed in km/h.',
      },
      {
        number: '04',
        title: 'Read Color-Coded Status Indicators',
        detail:
          'Moving (>0 km/h) indicates active transit; Idle (0 km/h) indicates stationary engine-on or parked state; Alert signals an active geofence exit or overspeed threshold breach.',
        tip: 'Use Pause Stream or 2× Ping Rate in the Live GPS Tracking Simulator to test speed changes and alert popups in real time.',
      },
    ],
  },
  {
    id: 'reports',
    chapterLabel: '03. Analytics & Exports',
    title: 'Generating Fleet, Fuel & Safety Reports',
    subtitle:
      'Audit trip mileage, verify diesel refills against tank drops, and export compliance logs for dispatchers and accounting.',
    steps: [
      {
        number: '01',
        title: 'Select Report Category & Fleet Scope',
        detail:
          'Choose the audit report type matching your review: Trip Summary (distance, route zone, speed), Fuel Audit (liters consumed vs idle waste), or Safety & ADAS (overspeed and geofence violations).',
      },
      {
        number: '02',
        title: 'Filter by Vehicle Status or Unit Plate',
        detail:
          'Narrow rows to Moving, Idle, or Alert vehicles—or search by license plate—to isolate high-idling hubs or over-speeding corridors before exporting.',
      },
      {
        number: '03',
        title: 'Reconcile Anomalies With AI Copilot',
        detail:
          'Copy route figures or open Resources → AI Telematics Studio to ask Fleet Chat about fuel-probe calibration, AIS-140 compliance, or driver fatigue trends.',
      },
      {
        number: '04',
        title: 'Export Clean CSV Logs',
        detail:
          'Click Download CSV Report to generate a spreadsheet-ready file containing vehicle IDs, drivers, distances, fuel figures, and alert counts for billing or fleet audits.',
      },
    ],
  },
  {
    id: 'geofence',
    chapterLabel: '04. Proactive Protection',
    title: 'Setting Up Geofence & Speed Alerts',
    subtitle:
      'Configure virtual depot perimeters, overspeed thresholds, multi-channel notifications, and safe remote immobilizer rules.',
    steps: [
      {
        number: '01',
        title: 'Define Zone Perimeter & Coordinates',
        detail:
          'Name your boundary (for example, Tumkuru Hub or Depot Geofence B) and set a containment radius between 100 m and 50,000 m around your loading bay, warehouse, or highway corridor.',
      },
      {
        number: '02',
        title: 'Choose Boundary Trigger & Speed Limit',
        detail:
          'Select whether alerts fire on Exit Only, Entry Only, or Both Entry & Exit, and set the corridor speed limit (standard highway alert triggers at 85+ km/h).',
      },
      {
        number: '03',
        title: 'Configure Alert Channels & Relay Safeguards',
        detail:
          'Enable Dashboard Live Popups and WhatsApp Dispatch notifications. Optionally enable Safe Engine Cut-Off recommendations for unauthorized night-time exits.',
        tip: 'Remote engine immobilization executes safely only when speed drops below safe cut-off velocity or when confirmed by a dispatcher.',
      },
      {
        number: '04',
        title: 'Test & Acknowledge Breaches',
        detail:
          'Open the Live GPS Tracking Simulator and click Geofence Alert or Overspeed Alert to verify the alert banner and Live Alert Log, then click Acknowledge to clear resolved incidents.',
      },
    ],
  },
];

export const SUPPORT_FAQS: SupportFaq[] = [
  {
    id: 'faq-login-sync',
    category: 'login',
    question: 'Why should I use Continue with Google instead of the Demo account?',
    answer:
      'Continue with Google binds your session to Firebase Authentication so your wishlist, profile details, and AI Studio transcripts/media persist across browser reloads and devices. The Demo Fleet Account stores data only in your current browser localStorage.',
  },
  {
    id: 'faq-gps-delay',
    category: 'tracking',
    question: 'How often does the dashboard update vehicle coordinates and speed?',
    answer:
      'VS Technology 4G LTE trackers transmit telemetry pings every 5 seconds while moving and switch to low-power heartbeat intervals when parked. In the homepage simulator, you can toggle between 1× and 2× ping rates.',
  },
  {
    id: 'faq-fuel-report',
    category: 'reports',
    question: 'How does the Fuel Audit report detect diesel siphoning?',
    answer:
      'Capacitive and ultrasonic probes sample tank volume continuously. Sudden drops exceeding 4% while the vehicle is Idle or ignition is OFF are flagged alongside GPS timestamps in your Fuel Audit export.',
  },
  {
    id: 'faq-geofence-relay',
    category: 'geofence',
    question: 'Can a geofence alert automatically cut off the vehicle engine?',
    answer:
      'Yes, wired trackers fitted with the 12V/24V relay harness support remote immobilization. For road safety, our firmware queues cut-off pulses safely at low speed or stationary idle rather than at highway cruise speed.',
  },
];

export const SAMPLE_REPORT_ROWS: SampleReportRow[] = [
  {
    unit: 'KA-01-FL-4821',
    driver: 'R. Deshpande',
    corridor: 'NH-48 Corridor',
    distanceKm: 412.6,
    avgSpeedKmh: 64,
    fuelLiters: 92.4,
    alertsCount: 0,
    status: 'Moving',
  },
  {
    unit: 'MH-12-TR-9032',
    driver: 'S. Kulkarni',
    corridor: 'Expressway Exit 4',
    distanceKm: 328.0,
    avgSpeedKmh: 52,
    fuelLiters: 74.1,
    alertsCount: 1,
    status: 'Moving',
  },
  {
    unit: 'DL-04-CG-1190',
    driver: 'V. Tiwari',
    corridor: 'Hub Dock 3',
    distanceKm: 18.4,
    avgSpeedKmh: 0,
    fuelLiters: 11.2,
    alertsCount: 2,
    status: 'Idle',
  },
  {
    unit: 'TN-09-CR-7741',
    driver: 'M. Rajan',
    corridor: 'Depot Zone B',
    distanceKm: 486.2,
    avgSpeedKmh: 78,
    fuelLiters: 118.5,
    alertsCount: 3,
    status: 'Alert',
  },
];

export function filterGuideSections(
  sections: GuideSection[],
  rawQuery: string
): GuideSection[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return sections;

  return sections.filter((section) => {
    if (
      section.title.toLowerCase().includes(q) ||
      section.subtitle.toLowerCase().includes(q) ||
      section.chapterLabel.toLowerCase().includes(q)
    ) {
      return true;
    }
    return section.steps.some(
      (step) =>
        step.title.toLowerCase().includes(q) ||
        step.detail.toLowerCase().includes(q) ||
        (step.tip ? step.tip.toLowerCase().includes(q) : false)
    );
  });
}

export function buildGeofenceRuleSummary(input: GeofenceRuleInput): {
  valid: boolean;
  error?: string;
  summary: string;
} {
  const zoneName = input.zoneName.trim();
  if (zoneName.length < 2) {
    return {
      valid: false,
      error: 'Enter a zone name (at least 2 characters).',
      summary: '',
    };
  }

  const radius = Math.max(100, Math.min(50000, Math.round(input.radiusMeters)));
  const speedLimit = Math.max(20, Math.min(120, Math.round(input.speedLimitKmh)));

  const triggerText =
    input.trigger === 'exit'
      ? 'on boundary exit'
      : input.trigger === 'enter'
      ? 'on boundary entry'
      : 'on both entry & exit';

  const channels: string[] = [];
  if (input.notifyDashboard) channels.push('Dashboard Popup');
  if (input.notifyWhatsApp) channels.push('WhatsApp');
  if (channels.length === 0) channels.push('Silent Log');

  const relayText = input.autoImmobilize
    ? ' · Safe relay cut-off queued at < 15 km/h'
    : '';

  return {
    valid: true,
    summary: `Zone "${zoneName}" (${radius} m radius) alerts ${triggerText} or above ${speedLimit} km/h via ${channels.join(' + ')}${relayText}.`,
  };
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateTelemetryCsv(
  rows: SampleReportRow[],
  reportType: ReportType
): string {
  const header =
    reportType === 'fuel'
      ? ['Report Type', 'Vehicle Plate', 'Driver', 'Corridor', 'Distance (km)', 'Fuel Used (L)', 'Status']
      : reportType === 'safety'
      ? ['Report Type', 'Vehicle Plate', 'Driver', 'Corridor', 'Avg Speed (km/h)', 'Alert Count', 'Status']
      : ['Report Type', 'Vehicle Plate', 'Driver', 'Corridor', 'Distance (km)', 'Avg Speed (km/h)', 'Fuel Used (L)', 'Alert Count', 'Status'];

  const label =
    reportType === 'fuel'
      ? 'Fuel Audit'
      : reportType === 'safety'
      ? 'Safety & ADAS'
      : 'Trip Summary';

  const bodyLines = rows.map((r) => {
    const cells =
      reportType === 'fuel'
        ? [label, r.unit, r.driver, r.corridor, r.distanceKm.toFixed(1), r.fuelLiters.toFixed(1), r.status]
        : reportType === 'safety'
        ? [label, r.unit, r.driver, r.corridor, r.avgSpeedKmh, r.alertsCount, r.status]
        : [label, r.unit, r.driver, r.corridor, r.distanceKm.toFixed(1), r.avgSpeedKmh, r.fuelLiters.toFixed(1), r.alertsCount, r.status];
    return cells.map(escapeCsvCell).join(',');
  });

  return [header.map(escapeCsvCell).join(','), ...bodyLines].join('\n');
}
