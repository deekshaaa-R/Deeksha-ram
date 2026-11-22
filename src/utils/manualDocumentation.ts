export type ManualAudience = 'user';

export interface ManualStepItem {
  step: string;
  action: string;
  details: string;
}

export interface ManualChapter {
  code: string;
  title: string;
  summary: string;
  steps: ManualStepItem[];
}

export interface RoleAccessRow {
  capability: string;
  clientVerified: string;
  demoClient: string;
  adminManager: string;
}

export interface OnboardingFieldRow {
  field: string;
  validationRule: string;
  exampleValue: string;
}

export interface ManualDocumentSpec {
  audience: ManualAudience;
  badgeText: string;
  title: string;
  subtitle: string;
  filename: string;
  generatedAt: string;
  preparedFor: string;
  chapters: ManualChapter[];
  roleMatrix: RoleAccessRow[];
  onboardingFields: OnboardingFieldRow[];
  supportContacts: {
    phone: string;
    whatsapp: string;
    email: string;
    headOffice: string;
  };
}

export const ROLE_ACCESS_MATRIX: RoleAccessRow[] = [
  {
    capability: 'Authentication Method',
    clientVerified: 'Google Sign-In or Verified Email',
    demoClient: 'One-click Demo Fleet Account (Local)',
    adminManager: 'Verified Admin Email / /admins/{uid} Grant',
  },
  {
    capability: 'Live Fleet Console & Global Map',
    clientVerified: 'Full simulated + Google Maps tracking',
    demoClient: 'Full simulated + Google Maps tracking',
    adminManager: 'Full cross-fleet telemetry supervision',
  },
  {
    capability: 'Include / Register New Vehicles',
    clientVerified: 'Synced to Firestore /vehicleDevices',
    demoClient: 'Stored in browser localStorage',
    adminManager: 'Register, audit, or remove any unit',
  },
  {
    capability: 'Search Vehicles (Nickname / IMEI)',
    clientVerified: 'Instant Account Dashboard filter',
    demoClient: 'Instant Account Dashboard filter',
    adminManager: 'Instant cross-unit filter & audit',
  },
  {
    capability: 'Odometer & Service Milestones',
    clientVerified: 'Synced to /vehicleMaintenance',
    demoClient: 'Tracked in browser session',
    adminManager: 'Full maintenance audit & overrides',
  },
  {
    capability: 'Reports (CSV & A4 PDF Audit)',
    clientVerified: 'Tracking Logs + Fuel Efficiency',
    demoClient: 'Tracking Logs + Fuel Efficiency',
    adminManager: 'Enterprise audit & compliance exports',
  },
  {
    capability: 'Admin Grant Management (/admins)',
    clientVerified: 'No access (Owner-scoped only)',
    demoClient: 'No access (Local sandbox only)',
    adminManager: 'Full read/create/revoke admin rights',
  },
];

export const VEHICLE_ONBOARDING_FIELDS: OnboardingFieldRow[] = [
  {
    field: '15-Digit Device IMEI',
    validationRule: 'Exactly 15 digits (0-9); unique in fleet; immutable after creation',
    exampleValue: '864291053829555',
  },
  {
    field: 'Vehicle Nickname / Plate',
    validationRule: '2 to 80 characters; displayed across Devices, Fuel & Reports',
    exampleValue: 'KA-05-FL-7721 (Cold Chain)',
  },
  {
    field: 'Vehicle Type',
    validationRule:
      '7 supported classes (Truck, Cargo Van, Car/SUV, Two-Wheeler, Bus, Reefer, Tractor)',
    exampleValue: 'Refrigerated Van',
  },
  {
    field: 'Tracker / Dashcam Model',
    validationRule: '2 to 80 characters; auto-selected from Vehicle Type if omitted',
    exampleValue: 'VS Ultra Wireless GPS Tracker',
  },
  {
    field: 'Odometer Baseline (Optional)',
    validationRule: '0 to 2,000,000 km; initializes Oil, Filter, Brake & Transmission alerts',
    exampleValue: '49,350 km',
  },
];

export function formatManualTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function buildUserManualSpec(options?: {
  preparedFor?: string;
  generatedAt?: string;
}): ManualDocumentSpec {
  return {
    audience: 'user',
    badgeText: 'CLIENT & FLEET OPERATOR EDITION',
    title: 'VS Technology Platform - User & Client Manual',
    subtitle:
      'Complete walkthrough for client sign-in, live GPS fleet tracking, including new vehicles, odometer alerts, and CSV/PDF report exports.',
    filename: 'vs-technology-user-manual.pdf',
    generatedAt: options?.generatedAt ?? formatManualTimestamp(),
    preparedFor: options?.preparedFor?.trim() || 'Fleet Operators & Vehicle Owners',
    chapters: [
      {
        code: 'CH-01',
        title: 'Client Login & Account Modes',
        summary:
          'How clients sign in with Google Cloud Sync, Email/Password, or the Demo Fleet Account.',
        steps: [
          {
            step: '1.1',
            action: 'Open the Login Portal',
            details:
              'Select Login in the top header (or Account in mobile navigation) to open the Sign In / Register screen.',
          },
          {
            step: '1.2',
            action: 'Client Cloud Sync Login (Recommended)',
            details:
              'Click Continue with Google to authenticate via Firebase Authentication. Your registered vehicles, odometer logs, wishlist, and AI transcripts sync securely to Firestore across devices.',
          },
          {
            step: '1.3',
            action: 'Email & Demo Evaluation Login',
            details:
              'Use Email & Password (6+ chars) to create a local profile, or click Continue with Demo Fleet Account to evaluate pre-seeded vehicles immediately.',
          },
        ],
      },
      {
        code: 'CH-02',
        title: 'How to Track Vehicles Live',
        summary:
          'Monitor real-time coordinates, speeds, fuel tanks, and alerts on desktop and mobile.',
        steps: [
          {
            step: '2.1',
            action: 'Use the VS Fleet Pro Console & Simulator',
            details:
              'On the Home page, inspect Total, Moving, Idle, and Alert vehicle KPIs. Toggle between Simulated and Google Maps layers, adjust speed sliders (0-120 km/h), and inspect GPS Coordinates and Ignition Relay status.',
          },
          {
            step: '2.2',
            action: 'Monitor Worldwide Fleet Map & Critical Alerts',
            details:
              'Scroll to Live Worldwide Vehicle & Fuel Monitor to filter Moving/Idle/Offline units and click markers for speed & fuel popups. Acknowledge Red/Amber events in the Critical Alert Feed.',
          },
          {
            step: '2.3',
            action: 'Search Registered Vehicles in Account Dashboard',
            details:
              'Open My Account and use the Search Bar above the tabs to filter registered vehicles instantaneously by nickname/plate (e.g. Cargo Van) or partial/full 15-digit IMEI.',
          },
        ],
      },
      {
        code: 'CH-03',
        title: 'How to Include (Register) New Vehicles',
        summary:
          'Add a new GPS tracker or 4G AI dashcam unit to your fleet in four quick steps.',
        steps: [
          {
            step: '3.1',
            action: 'Launch the Vehicle Registration Modal',
            details:
              'In My Account, click Register Vehicle in the top banner or Add Vehicle Device inside the Devices tab.',
          },
          {
            step: '3.2',
            action: 'Enter 15-Digit IMEI & Nickname',
            details:
              'Type the 15-digit numeric IMEI printed on your tracker box (non-digits and duplicates are automatically rejected) and enter a clear Vehicle Nickname or Plate.',
          },
          {
            step: '3.3',
            action: 'Select Vehicle Type & Tracker Model',
            details:
              'Pick one of 7 vehicle categories (Commercial Truck, Cargo Van, Car/SUV, Two-Wheeler, Bus/Coach, Refrigerated Van, or Tractor) and optionally customize the hardware model.',
          },
          {
            step: '3.4',
            action: 'Save & Sync Across Dashboard',
            details:
              'Click Register Vehicle to Fleet. Verified Google users persist the unit directly to Firestore /vehicleDevices; the new vehicle immediately appears in Devices, Fuel Analytics, Odometer Alerts, and Exports.',
          },
        ],
      },
      {
        code: 'CH-04',
        title: 'Odometer Milestones, Geofences & PDF/CSV Reports',
        summary:
          'Prevent breakdowns with mileage alerts and generate audit-ready spreadsheets and PDFs.',
        steps: [
          {
            step: '4.1',
            action: 'Track Service Milestones',
            details:
              'Open Account -> Service & Odo to update current odometer readings (+500 km / +1,500 km or exact km). Overdue (Red) and Approaching (Amber) reminders track Oil, Air/Fuel Filters, Brakes, and Transmission intervals.',
          },
          {
            step: '4.2',
            action: 'Export Administrative Reports',
            details:
              'Click Export Reports in My Account (or Export CSV / Export PDF on the Fuel Efficiency chart) to download Tracking Logs, Fuel Efficiency, or Combined Fleet Audit files in CSV or A4 PDF format.',
          },
        ],
      },
    ],
    roleMatrix: ROLE_ACCESS_MATRIX,
    onboardingFields: VEHICLE_ONBOARDING_FIELDS,
    supportContacts: {
      phone: '+91 97406 40650',
      whatsapp: 'https://wa.me/919740640650',
      email: 'vstechnology999@gmail.com',
      headOffice: 'Tumkuru, Karnataka, India',
    },
  };
}
