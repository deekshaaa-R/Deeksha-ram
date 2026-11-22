export type WizardFieldType =
  | 'text'
  | 'password'
  | 'number'
  | 'dropdown'
  | 'date'
  | 'imei'
  | 'idle_split';

export interface WizardFieldSpec {
  key: string;
  label: string;
  required: boolean;
  type: WizardFieldType;
  placeholder?: string;
  defaultValue?: string;
  helperText?: string;
  tooltipTopic?: string;
  unitSuffix?: string;
  noIcon?: boolean;
  maxLength?: number;
  cardGroup: string;
  rightActionLabel?: string;
  dropdownSource?:
    | 'timezones'
    | 'inactiveTimes'
    | 'languages'
    | 'simOperators'
    | 'deviceTypes'
    | 'vehicleTypes'
    | 'devices'
    | 'transporters'
    | 'paymentTypes'
    | 'paymentTerms'
    | 'vehicles'
    | 'ownedBy'
    | 'vehicleBodies';
}

export interface WizardSwitchSpec {
  key: string;
  label: string;
  defaultValue: boolean;
  cardGroup: string;
}

export interface WizardCheckboxSpec {
  key: string;
  label: string;
  defaultValue: boolean;
  cardGroup: string;
  sensitiveAction?: boolean;
}

export interface WizardStepSpec {
  stepNumber: 1 | 2 | 3 | 4 | 5 | 6;
  featureKey:
    | 'step_1'
    | 'step_2'
    | 'step_3'
    | 'step_4'
    | 'step_5'
    | 'step_6';
  title: string;
  previousTitle: string | null;
  nextTitle: string | null;
  fields: WizardFieldSpec[];
  switches: WizardSwitchSpec[];
  checkboxes: WizardCheckboxSpec[];
  todoNotice?: string;
}

export function formatDateDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function getTodayDDMMYYYY(now: Date = new Date()): string {
  return formatDateDDMMYYYY(now);
}

export function getOffsetDateDDMMYYYY(
  monthsOffset: number,
  now: Date = new Date()
): string {
  const d = new Date(now.getTime());
  d.setMonth(d.getMonth() + monthsOffset);
  return formatDateDDMMYYYY(d);
}

export function parseDDMMYYYYToISO(value: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function formatISOToDDMMYYYY(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function buildWizardSteps(now: Date = new Date()): WizardStepSpec[] {
  const today = getTodayDDMMYYYY(now);
  const nextYear = getOffsetDateDDMMYYYY(12, now);

  return [
    {
      stepNumber: 1,
      featureKey: 'step_1',
      title: 'Add Transporter',
      previousTitle: null,
      nextTitle: 'Add Device',
      fields: [
        {
          key: 'username',
          label: 'Username',
          required: true,
          type: 'text',
          placeholder: 'Add Username',
          helperText: 'Only contains [ A-z, 0-9, _ , - , *, @ ]',
          cardGroup: 'Login',
        },
        {
          key: 'password',
          label: 'Password',
          required: true,
          type: 'password',
          placeholder: 'Add Password',
          cardGroup: 'Login',
        },
        {
          key: 'confirmPassword',
          label: 'Confirm Password',
          required: true,
          type: 'password',
          placeholder: 'Add Confirm Password',
          cardGroup: 'Login',
        },
        {
          key: 'companyName',
          label: 'Company Name',
          required: true,
          type: 'text',
          placeholder: 'Add Company Name',
          cardGroup: 'Company',
        },
        {
          key: 'timezone',
          label: 'Timezone',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Timezone',
          defaultValue: '(GMT+5:30) Asia/Calcutta',
          dropdownSource: 'timezones',
          cardGroup: 'Company',
        },
        {
          key: 'inactiveTime',
          label: 'Inactive Time',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Inactive Time',
          defaultValue: '12',
          dropdownSource: 'inactiveTimes',
          cardGroup: 'Company',
        },
        {
          key: 'language',
          label: 'Language',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Language',
          defaultValue: 'English',
          dropdownSource: 'languages',
          cardGroup: 'Company',
        },
        {
          key: 'name',
          label: 'Name',
          required: false,
          type: 'text',
          placeholder: 'Add Name',
          cardGroup: 'Contact',
        },
        {
          key: 'email',
          label: 'Email',
          required: false,
          type: 'text',
          placeholder: 'Add Email',
          cardGroup: 'Contact',
        },
        {
          key: 'phone',
          label: 'Phone',
          required: false,
          type: 'text',
          placeholder: 'Add Phone',
          cardGroup: 'Contact',
        },
        {
          key: 'address',
          label: 'Address',
          required: false,
          type: 'text',
          placeholder: 'Add Address',
          cardGroup: 'Contact',
        },
        {
          key: 'subscriptionStartDate',
          label: 'Subscription Start Date',
          required: true,
          type: 'date',
          defaultValue: today,
          cardGroup: 'Subscription',
        },
        {
          key: 'subscriptionDueDate',
          label: 'Subscription Due Date',
          required: true,
          type: 'date',
          defaultValue: nextYear,
          cardGroup: 'Subscription',
        },
        {
          key: 'subscriptionExtendDate',
          label: 'Subscription Extend Date',
          required: false,
          type: 'date',
          defaultValue: nextYear,
          cardGroup: 'Subscription',
        },
        {
          key: 'subscriptionExpiryCount',
          label: 'Subscription Expiry Count',
          required: false,
          type: 'number',
          defaultValue: '10',
          cardGroup: 'Subscription',
        },
        {
          key: 'maxRadiusNearestPoi',
          label: 'Maximum Radius for Nearest POI(KM)',
          required: false,
          type: 'text',
          placeholder: 'Add Maximum Radius for Nearest POI(KM)',
          tooltipTopic: 'nearestPoiRadius',
          unitSuffix: 'km',
          cardGroup: 'Map rules',
        },
        {
          key: 'minDistanceForAddress',
          label: 'Minimum Distance For Address (KM)',
          required: false,
          type: 'text',
          placeholder: 'Add Minimum Distance For Address (KM)',
          tooltipTopic: 'minDistanceAddress',
          unitSuffix: 'km',
          cardGroup: 'Map rules',
        },
        {
          key: 'dataRestricationDays',
          label: 'Data Restrication (in Days)',
          required: false,
          type: 'text',
          placeholder: '',
          noIcon: true,
          cardGroup: 'Map rules',
        },
      ],
      switches: [],
      checkboxes: [
        {
          key: 'active',
          label: 'Active',
          defaultValue: true,
          cardGroup: 'Status',
          sensitiveAction: true,
        },
        {
          key: 'overwriteSubscriptionAll',
          label: 'Overwrite Subscription for all vehicles',
          defaultValue: false,
          cardGroup: 'Status',
          sensitiveAction: true,
        },
        {
          key: 'inactiveAfterSubscriptionExpire',
          label: 'Should vehicle inactive after subscription expire',
          defaultValue: false,
          cardGroup: 'Status',
        },
      ],
    },
    {
      stepNumber: 2,
      featureKey: 'step_2',
      title: 'Add Device',
      previousTitle: 'Add Transporter',
      nextTitle: 'Add Vehicle',
      fields: [
        {
          key: 'imei',
          label: 'Imei',
          required: true,
          type: 'imei',
          placeholder: 'Add Imei',
          rightActionLabel: 'Import From Inventory',
          cardGroup: 'Device',
        },
        {
          key: 'simNumber',
          label: 'Sim Number',
          required: true,
          type: 'text',
          placeholder: 'Add Sim Number',
          helperText: 'Only contains 24 digits',
          maxLength: 24,
          cardGroup: 'SIM',
        },
        {
          key: 'simOperator',
          label: 'Sim Operator',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Sim Operator',
          defaultValue: 'Bsnl (bsnl)',
          dropdownSource: 'simOperators',
          cardGroup: 'SIM',
        },
        {
          key: 'secondarySimNumber',
          label: 'Secondary Sim Number',
          required: false,
          type: 'text',
          placeholder: 'Add Secondary Sim Number',
          helperText: 'Only contains 24 digits',
          maxLength: 24,
          cardGroup: 'SIM',
        },
        {
          key: 'secondarySimOperator',
          label: 'Secondary Sim Operator',
          required: false,
          type: 'dropdown',
          placeholder: 'Select Secondary Sim Operator',
          defaultValue: 'Bsnl (bsnl)',
          dropdownSource: 'simOperators',
          cardGroup: 'SIM',
        },
        {
          key: 'deviceType',
          label: 'Device Type',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Device Type',
          defaultValue: 'Seaworld-R12 (5023)',
          dropdownSource: 'deviceTypes',
          cardGroup: 'Device',
        },
        {
          key: 'password',
          label: 'Password',
          required: false,
          type: 'password',
          placeholder: 'Add Password',
          cardGroup: 'Device',
        },
      ],
      switches: [
        {
          key: 'attendance',
          label: 'Attendance',
          defaultValue: false,
          cardGroup: 'Settings',
        },
        {
          key: 'timezoneSetting',
          label: 'Timezone Setting',
          defaultValue: false,
          cardGroup: 'Settings',
        },
      ],
      checkboxes: [
        {
          key: 'active',
          label: 'Active',
          defaultValue: true,
          cardGroup: 'Wiring',
          sensitiveAction: true,
        },
        {
          key: 'ignitionWirePositive',
          label: 'Ignition wire connected in (+)ve',
          defaultValue: false,
          cardGroup: 'Wiring',
        },
        {
          key: 'ignitionWireNotConnected',
          label: 'Ignition wire not connected',
          defaultValue: false,
          cardGroup: 'Wiring',
        },
        {
          key: 'acWirePositive',
          label: 'Air condition wire connected in (+)ve',
          defaultValue: false,
          cardGroup: 'Wiring',
        },
      ],
    },
    {
      stepNumber: 3,
      featureKey: 'step_3',
      title: 'Add Vehicle',
      previousTitle: 'Add Device',
      nextTitle: 'Payment Details',
      fields: [
        {
          key: 'vehicle',
          label: 'Vehicle',
          required: true,
          type: 'text',
          placeholder: 'Add Vehicle Number',
          helperText: 'Only contains [ A-z, 0-9, _ , - , *, @ ]',
          cardGroup: 'Vehicle',
        },
        {
          key: 'mileage',
          label: 'Mileage',
          required: true,
          type: 'number',
          defaultValue: '1',
          cardGroup: 'Vehicle',
        },
        {
          key: 'vehicleType',
          label: 'Vehicle Type',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Vehicle Type',
          dropdownSource: 'vehicleTypes',
          cardGroup: 'Vehicle',
        },
        {
          key: 'overspeed',
          label: 'Overspeed',
          required: true,
          type: 'text',
          placeholder: 'Add Overspeed',
          unitSuffix: 'km/h',
          cardGroup: 'Vehicle',
        },
        {
          key: 'idleTime',
          label: 'Idle Time',
          required: false,
          type: 'idle_split',
          tooltipTopic: 'idleTime',
          cardGroup: 'Vehicle',
        },
        {
          key: 'device',
          label: 'Device',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Device',
          dropdownSource: 'devices',
          cardGroup: 'Assignment',
        },
        {
          key: 'transporter',
          label: 'Transporter',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Transporter',
          dropdownSource: 'transporters',
          cardGroup: 'Assignment',
        },
        {
          key: 'subscriptionStartDate',
          label: 'Subscription Start Date',
          required: true,
          type: 'date',
          defaultValue: today,
          cardGroup: 'Subscription',
        },
        {
          key: 'subscriptionDueDate',
          label: 'Subscription Due Date',
          required: true,
          type: 'date',
          defaultValue: nextYear,
          cardGroup: 'Subscription',
        },
        {
          key: 'currentOdometerReading',
          label: 'Current Odometer Reading',
          required: false,
          type: 'number',
          defaultValue: '0',
          unitSuffix: 'km',
          cardGroup: 'Odometer',
        },
        {
          key: 'vehicleNickname',
          label: 'Vehicle Nickname',
          required: false,
          type: 'text',
          placeholder: 'Add Vehicle Nickname',
          cardGroup: 'Extra info',
        },
        {
          key: 'remark',
          label: 'Remark',
          required: false,
          type: 'text',
          placeholder: 'Add Remark',
          cardGroup: 'Extra info',
        },
        {
          key: 'durationOdometer',
          label: 'Duration Odometer',
          required: false,
          type: 'number',
          defaultValue: '0',
          unitSuffix: 'km',
          cardGroup: 'Odometer',
        },
        {
          key: 'remark2',
          label: 'Remark 2',
          required: false,
          type: 'text',
          placeholder: 'Add Remark 2',
          cardGroup: 'Extra info',
        },
        {
          key: 'chassisNumber',
          label: 'Chassis Number',
          required: false,
          type: 'text',
          placeholder: 'Add Chassis Number',
          cardGroup: 'Extra info',
        },
        {
          key: 'motorNumber',
          label: 'Motor Number',
          required: false,
          type: 'text',
          placeholder: 'Add Motor Number',
          cardGroup: 'Extra info',
        },
        {
          key: 'driverName',
          label: 'Driver Name',
          required: false,
          type: 'text',
          placeholder: 'Add Driver Name',
          cardGroup: 'Driver',
        },
        {
          key: 'driverPhone',
          label: 'Driver Phone Number',
          required: false,
          type: 'text',
          placeholder: 'Add Driver Phone Number',
          helperText: 'Used for one-tap calling from Live Tracking dashboard',
          cardGroup: 'Driver',
        },
      ],
      switches: [],
      checkboxes: [
        {
          key: 'parkingViolationAlarm',
          label: 'Parking violation alarm on Ignition on',
          defaultValue: false,
          cardGroup: 'Extra info',
        },
      ],
    },
    {
      stepNumber: 4,
      featureKey: 'step_4',
      title: 'Payment Details',
      previousTitle: 'Add Vehicle',
      nextTitle: 'Add Vehicle Detail',
      fields: [
        {
          key: 'type',
          label: 'Type',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Type',
          dropdownSource: 'paymentTypes',
          cardGroup: 'Payment',
        },
        {
          key: 'transporter',
          label: 'Transporter',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Transporter',
          dropdownSource: 'transporters',
          cardGroup: 'Payment',
        },
        {
          key: 'sellingPrice',
          label: 'Selling Price',
          required: false,
          type: 'number',
          defaultValue: '0',
          unitSuffix: '₹',
          cardGroup: 'Payment',
        },
        {
          key: 'paymentTerm',
          label: 'Payment Term',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Payment Term',
          dropdownSource: 'paymentTerms',
          cardGroup: 'Payment',
        },
        {
          key: 'installationDate',
          label: 'Installation Date',
          required: false,
          type: 'date',
          defaultValue: today,
          cardGroup: 'Schedule',
        },
        {
          key: 'rentalDueDate',
          label: 'Rental Due Date',
          required: false,
          type: 'date',
          defaultValue: today,
          cardGroup: 'Schedule',
        },
        {
          key: 'technicianName',
          label: 'Technician Name',
          required: false,
          type: 'text',
          placeholder: 'Add Technician Name',
          cardGroup: 'Details',
        },
        {
          key: 'rental',
          label: 'Rental',
          required: false,
          type: 'text',
          placeholder: 'Add Rental',
          unitSuffix: '₹',
          cardGroup: 'Details',
        },
        {
          key: 'remark',
          label: 'Remark',
          required: false,
          type: 'text',
          placeholder: 'Add Remark',
          helperText: 'Max 50 chars',
          maxLength: 50,
          cardGroup: 'Details',
        },
      ],
      switches: [],
      checkboxes: [],
    },
    {
      stepNumber: 5,
      featureKey: 'step_5',
      title: 'Add Vehicle Detail',
      previousTitle: 'Payment Details',
      nextTitle: 'Custom Fields',
      fields: [
        {
          key: 'transporter',
          label: 'Transporter',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Transporter',
          dropdownSource: 'transporters',
          cardGroup: 'Ownership',
        },
        {
          key: 'vehicle',
          label: 'Vehicle',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Vehicle',
          dropdownSource: 'vehicles',
          cardGroup: 'Ownership',
        },
        {
          key: 'ownerName',
          label: 'Owner Name',
          required: false,
          type: 'text',
          placeholder: 'Add Owner Name',
          cardGroup: 'Ownership',
        },
        {
          key: 'ownedBy',
          label: 'Owned By',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Owned By',
          dropdownSource: 'ownedBy',
          cardGroup: 'Ownership',
        },
        {
          key: 'vehicleBrand',
          label: 'Vehicle Brand',
          required: false,
          type: 'text',
          placeholder: 'Add Vehicle Brand',
          cardGroup: 'Specifications',
        },
        {
          key: 'vehicleModel',
          label: 'Vehicle Model',
          required: false,
          type: 'text',
          placeholder: 'Add Vehicle Model',
          cardGroup: 'Specifications',
        },
        {
          key: 'vehicleBody',
          label: 'Vehicle Body',
          required: true,
          type: 'dropdown',
          placeholder: 'Select Vehicle Body',
          dropdownSource: 'vehicleBodies',
          cardGroup: 'Specifications',
        },
        {
          key: 'capacity',
          label: 'Capacity',
          required: false,
          type: 'number',
          defaultValue: '0',
          cardGroup: 'Specifications',
        },
        {
          key: 'manufactureDate',
          label: 'Manufacture Date',
          required: false,
          type: 'date',
          defaultValue: today,
          cardGroup: 'Dates',
        },
        {
          key: 'purchaseDate',
          label: 'Purchase Date',
          required: false,
          type: 'date',
          defaultValue: today,
          cardGroup: 'Dates',
        },
      ],
      switches: [],
      checkboxes: [],
    },
    {
      stepNumber: 6,
      featureKey: 'step_6',
      title: 'Custom Fields',
      previousTitle: 'Add Vehicle Detail',
      nextTitle: null,
      fields: [],
      switches: [],
      checkboxes: [],
    },
  ];
}

export const STATIC_DROPDOWN_OPTIONS = {
  timezones: [
    '(GMT+5:30) Asia/Calcutta',
    '(GMT+0:00) UTC',
    '(GMT+4:00) Asia/Dubai',
    '(GMT+8:00) Asia/Singapore',
    '(GMT-5:00) America/New_York',
  ],
  inactiveTimes: ['5', '10', '12', '15', '30', '60'],
  languages: ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Marathi'],
  simOperators: [
    'Bsnl (bsnl)',
    'Airtel M2M (airtel)',
    'Jio IoT (jio)',
    'Vi Business (vi)',
  ],
  deviceTypes: [
    'Seaworld-R12 (5023)',
    'Concox GT06N (5023)',
    'Teltonika FMB920 (5027)',
    'VS VST-PRO-4G (5023)',
    'AIS-140 NavIC Pro (5093)',
  ],
  vehicleTypes: [
    'Truck',
    'Car',
    'Bus',
    'Two-Wheeler',
    'E-Rickshaw',
    'Excavator',
    'Container Trailer',
    'Refrigerated Van',
  ],
  paymentTypes: ['New Sale', 'Rental', 'Renewal', 'Hardware Upgrade'],
  paymentTerms: ['Prepaid Annual', 'Quarterly', 'Monthly', 'Net 30'],
  ownedBy: ['Company Owned', 'Transporter Owned', 'Leased / Contract', 'Individual'],
  vehicleBodies: [
    'Open Body',
    'Closed Container',
    'Flatbed',
    'Tanker',
    'Tipper',
    'Refrigerated Box',
    'Passenger Cabin',
  ],
};

export const WIZARD_TOOLTIPS: Record<
  string,
  { title: string; body: string; example: string }
> = {
  nearestPoiRadius: {
    title: 'Maximum Radius for Nearest POI(KM)',
    body: 'Controls how far around a vehicle position the map looks to label the nearest Point of Interest (landmark, depot, or hub).',
    example: 'Example: 2 km shows landmarks within 2 km of the vehicle pin.',
  },
  minDistanceAddress: {
    title: 'Minimum Distance For Address (KM)',
    body: 'Avoids repetitive reverse-geocoding lookups until the vehicle moves at least this distance from the previous address fix.',
    example: 'Example: 0.5 km refreshes street address every 500 meters moved.',
  },
  idleTime: {
    title: 'Idle Time (Hours | Minutes)',
    body: 'Maximum continuous time a vehicle may stay stationary with ignition ON before being flagged as idling.',
    example: 'Example: 00 Hours | 15 Minutes flags idle sessions over 15 minutes.',
  },
};

export const ALLOWED_ID_CHAR_REGEX = /^[A-Za-z0-9_\-*@]+$/;
export const SIM_24_DIGITS_REGEX = /^\d{24}$/;

export function isValidImeiLuhn(raw: string): boolean {
  const digits = raw.replace(/\s+/g, '');
  if (!/^\d{15}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(digits[i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function validateStepForm(
  step: WizardStepSpec,
  values: Record<string, string | boolean>,
  existingRecords?: {
    imeis?: string[];
    sims?: string[];
    vehicles?: string[];
  }
): {
  valid: boolean;
  fieldErrors: Record<string, string>;
  warnings: string[];
} {
  const fieldErrors: Record<string, string> = {};
  const warnings: string[] = [];

  for (const field of step.fields) {
    const raw = values[field.key];
    const strVal = typeof raw === 'string' ? raw.trim() : '';

    if (field.required && !strVal) {
      fieldErrors[field.key] = `${field.label} is required.`;
      continue;
    }

    if (!strVal) continue;

    if (field.key === 'username' || field.key === 'vehicle') {
      if (!ALLOWED_ID_CHAR_REGEX.test(strVal)) {
        fieldErrors[field.key] =
          'Only contains [ A-z, 0-9, _ , - , *, @ ]';
      }
    }

    if (field.key === 'simNumber' || field.key === 'secondarySimNumber') {
      if (!SIM_24_DIGITS_REGEX.test(strVal)) {
        fieldErrors[field.key] = 'Only contains 24 digits';
      } else if (
        field.key === 'simNumber' &&
        existingRecords?.sims?.includes(strVal)
      ) {
        fieldErrors[field.key] = 'Duplicate Sim Number already registered.';
      }
    }

    if (field.key === 'imei') {
      if (!isValidImeiLuhn(strVal)) {
        fieldErrors[field.key] =
          'Imei must be a valid 15-digit number (Luhn check).';
      } else if (existingRecords?.imeis?.includes(strVal)) {
        fieldErrors[field.key] = 'Duplicate Imei already exists.';
      }
    }

    if (
      step.stepNumber === 3 &&
      field.key === 'vehicle' &&
      existingRecords?.vehicles?.includes(strVal.toUpperCase())
    ) {
      fieldErrors[field.key] = 'Duplicate Vehicle already exists.';
    }

    if (field.maxLength && strVal.length > field.maxLength) {
      fieldErrors[field.key] = `Maximum ${field.maxLength} characters allowed.`;
    }
  }

  // Step 1 password match check
  if (step.stepNumber === 1) {
    const pwd = String(values.password ?? '');
    const confirm = String(values.confirmPassword ?? '');
    if (pwd && confirm && pwd !== confirm) {
      fieldErrors.confirmPassword = 'Password and Confirm Password must match.';
    }
  }

  // Step 2 (Add Device) dual-ignition checkbox warning (D13)
  if (
    step.stepNumber === 2 &&
    values.ignitionWirePositive === true &&
    values.ignitionWireNotConnected === true
  ) {
    warnings.push(
      'Warning: Both "Ignition wire connected in (+)ve" and "Ignition wire not connected" are checked.'
    );
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    warnings,
  };
}
