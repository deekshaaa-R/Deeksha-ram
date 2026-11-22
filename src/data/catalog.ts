import wiredGpsImg from '../assets/images/product_wired_gps_1794721097761.jpg';
import wirelessGpsImg from '../assets/images/product_wireless_gps_1794721097980.jpg';
import aiDashcamImg from '../assets/images/product_ai_dashcam_1794721098251.jpg';
import assetFarmingImg from '../assets/images/product_asset_farming_gps_1794721097655.jpg';
import storeImg from '../assets/images/experience_center_store_1794721100453.jpg';
import type {
  BlogPost,
  ExperienceCenter,
  InstallationBooking,
  Order,
  PolicySlug,
  Product,
  ProductCategory,
  SolutionDetail,
  TrackedDevice,
  WarrantyRecord,
} from '../types';

export const CONTACT_INFO = {
  email: 'vstechnology999@gmail.com',
  phoneDisplay: '+91 97406 40650',
  phoneRaw: '9740640650',
  telHref: 'tel:+919740640650',
  whatsappHref: 'https://wa.me/919740640650',
  instagramHref: 'https://www.instagram.com/_vs_technology/?hl=en',
  facebookHref: 'https://www.facebook.com/profile.php?id=61592661693129',
  address: 'Tumkuru',
} as const;

export const HEAD_OFFICE_COORDS = {
  lat: 13.3379,
  lng: 77.1173,
};

export interface FleetMapMarkerData {
  id: string;
  plate: string;
  driver: string;
  status: 'Moving' | 'Idle' | 'Alert';
  speedKmh: number;
  routeZone: string;
  lat: number;
  lng: number;
}

export const FLEET_MAP_TELEMETRY: FleetMapMarkerData[] = [
  {
    id: 'v1',
    plate: 'KA-01-FL-4821',
    driver: 'R. Deshpande',
    status: 'Moving',
    speedKmh: 64,
    routeZone: 'NH-48 Electronic City Corridor',
    lat: 12.8985,
    lng: 77.6382,
  },
  {
    id: 'v2',
    plate: 'MH-12-TR-9032',
    driver: 'S. Kulkarni',
    status: 'Moving',
    speedKmh: 52,
    routeZone: 'Outer Ring Logistics Belt',
    lat: 12.9562,
    lng: 77.7011,
  },
  {
    id: 'v3',
    plate: 'DL-04-CG-1190',
    driver: 'V. Tiwari',
    status: 'Idle',
    speedKmh: 0,
    routeZone: 'Bommasandra Hub Dock 3',
    lat: 12.8169,
    lng: 77.6845,
  },
  {
    id: 'v4',
    plate: 'TN-09-CR-7741',
    driver: 'M. Rajan',
    status: 'Alert',
    speedKmh: 78,
    routeZone: 'Hosur Highway Depot Zone B',
    lat: 12.7852,
    lng: 77.7812,
  },
];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Wired GPS Trackers',
  'Wireless GPS Trackers',
  'WiFi Dashcams',
  '4G AI Dashcams',
  'Bluetooth Asset Tags',
  'Smart Farming GPS',
];

export const FEATURE_FILTERS = [
  '4G LTE',
  'Ignition Cut-off',
  'Geofence',
  'IP67 Waterproof',
  'ADAS Alerts',
  'Driver Monitoring',
  'OBD Plug & Play',
  'RTK / Precision GNSS',
];

export const PRODUCTS: Product[] = [
  {
    id: 'vs-lite-wired',
    slug: 'vs-lite-wired-gps-tracker',
    name: 'VS Lite Wired GPS Tracker',
    category: 'Wired GPS Trackers',
    price: 2499,
    compareAtPrice: 3199,
    badge: 'Best Seller',
    rating: 4.7,
    reviewCount: 142,
    inStock: true,
    shortDescription:
      'Compact 9–90V wired tracker with remote engine cut-off, tamper alert, and 5-second live updates.',
    description:
      'Engineered for cars, two-wheelers, and commercial delivery vans, VS Lite Wired GPS Tracker combines high-sensitivity multi-constellation GNSS with wide-voltage surge protection. Monitor live routes, overspeeding, and ignition status from web or mobile.',
    images: [wiredGpsImg, wirelessGpsImg],
    features: [
      'Ignition Cut-off',
      'Geofence',
      '9-90V Surge Protection',
      'Backup Battery 250mAh',
    ],
    specs: [
      { label: 'Connectivity', value: '2G / GSM Quad-Band' },
      { label: 'Input Voltage', value: '9V – 90V DC' },
      { label: 'Position Accuracy', value: '< 2.5 meters CEP' },
      { label: 'Ingress Protection', value: 'IP65 Splash Resistant' },
      { label: 'Backup Battery', value: '250 mAh Li-Po (up to 4 hrs)' },
      { label: 'Warranty', value: '1 Year Replacement Warranty (Placeholder)' },
    ],
    faqs: [
      {
        question: 'Does VS Lite support remote ignition cut-off?',
        answer:
          'Yes, it ships with an automotive relay kit that lets authorized fleet managers safely immobilize the vehicle below 20 km/h.',
      },
      {
        question: 'Will it drain my motorcycle or car battery?',
        answer:
          'No. Ultra-low sleep draw (< 5 mA when parked) preserves vehicle battery health even across multi-week parking.',
      },
    ],
    reviews: [
      {
        id: 'rev-1',
        author: 'Raghavendra Kulkarni',
        role: 'Fleet Coordinator, Pune Logistics (Sample Review)',
        rating: 5,
        date: 'Oct 2026',
        comment:
          'Installed across 28 delivery vans. Geofence alerts and daily trip exports cut unauthorized idling noticeably.',
      },
      {
        id: 'rev-2',
        author: 'Meera Subramanian',
        role: 'Personal Car Owner, Chennai (Sample Review)',
        rating: 4,
        date: 'Sep 2026',
        comment:
          'Installation technician completed wiring in 20 minutes. App playback is crisp and accurate.',
      },
    ],
  },
  {
    id: 'vs-pro-4g-wired',
    slug: 'vs-pro-4g-wired-gps-tracker',
    name: 'VS Pro 4G Wired GPS Tracker',
    category: 'Wired GPS Trackers',
    price: 4299,
    compareAtPrice: 4999,
    badge: 'Enterprise Grade',
    rating: 4.9,
    reviewCount: 98,
    inStock: true,
    shortDescription:
      'Dual-antenna 4G LTE Cat-1 tracker with RS485 fuel sensor support, SOS panic button, and CAN telemetry.',
    description:
      'Built for heavy trucks, intercity buses, and cold-chain logistics. VS Pro 4G delivers sub-second packet telemetry over 4G LTE with automatic fallback, RS232/RS485 ultrasonic or capacitive fuel probe integration, and temperature probe support.',
    images: [wiredGpsImg, assetFarmingImg],
    features: [
      '4G LTE',
      'Ignition Cut-off',
      'Geofence',
      'Fuel Sensor Ready (RS485)',
      'SOS Alert Input',
    ],
    specs: [
      { label: 'Connectivity', value: '4G LTE Cat-1 + 2G Fallback' },
      { label: 'Interfaces', value: 'RS485, Dual Analog, ACC, Relay, SOS' },
      { label: 'GNSS Receiver', value: 'GPS + NavIC + GLONASS + BeiDou' },
      { label: 'Ingress Protection', value: 'IP66 Rugged Enclosure' },
      { label: 'Internal Memory', value: '16 MB (50,000 offline waypoints)' },
      { label: 'Warranty', value: '2 Years Enterprise Warranty (Placeholder)' },
    ],
    faqs: [
      {
        question: 'Can it connect to an external fuel level sensor?',
        answer:
          'Yes, the built-in RS485 and dual analog ports connect directly to capacitive and ultrasonic diesel sensors.',
      },
      {
        question: 'What happens in low-network highway corridors?',
        answer:
          'Up to 50,000 GPS packets are buffered in flash memory and uploaded automatically once cellular signal returns.',
      },
    ],
    reviews: [
      {
        id: 'rev-3',
        author: 'Harpreet Gill',
        role: 'Operations Director, Northern Freight (Sample Review)',
        rating: 5,
        date: 'Nov 2026',
        comment:
          'Paired with diesel probes on 45 reefers. Caught two siphon incidents within the first month.',
      },
    ],
  },
  {
    id: 'vs-ultra-wireless',
    slug: 'vs-ultra-wireless-gps-tracker',
    name: 'VS Ultra Wireless GPS Tracker',
    category: 'Wireless GPS Trackers',
    price: 5499,
    compareAtPrice: 6499,
    badge: 'Zero Wiring',
    rating: 4.8,
    reviewCount: 74,
    inStock: true,
    shortDescription:
      '10,000 mAh magnetic IP67 wireless tracker with up to 90-day standby and light-sensor tamper alarm.',
    description:
      'Attach in seconds to containers, trailers, rental fleets, or high-value machinery without touching vehicle wiring. Features industrial neodymium magnets, IP67 weatherproofing, and an optical drop-off alert if removed.',
    images: [wirelessGpsImg, wiredGpsImg],
    features: [
      '4G LTE',
      'IP67 Waterproof',
      'Geofence',
      '10,000 mAh Battery',
      'Magnetic Mount',
    ],
    specs: [
      { label: 'Battery Capacity', value: '10,000 mAh Industrial Li-Ion' },
      { label: 'Standby Endurance', value: 'Up to 90 days (1 ping/day mode)' },
      { label: 'Mounting', value: '5x Neodymium N52 Magnets' },
      { label: 'Ingress Protection', value: 'IP67 Waterproof & Dustproof' },
      { label: 'Tamper Detection', value: 'Optical Light Sensor + Accelerometer' },
      { label: 'Dimensions', value: '108 × 61 × 30 mm' },
    ],
    faqs: [
      {
        question: 'How long does the battery last under daily movement?',
        answer:
          'Reporting every 30 seconds while moving gives roughly 25–30 days per charge; scheduled asset pings last up to 90 days.',
      },
    ],
    reviews: [
      {
        id: 'rev-4',
        author: 'Siddharth Rao',
        role: 'Equipment Rental Manager (Sample Review)',
        rating: 5,
        date: 'Oct 2026',
        comment:
          'Strong magnets hold firmly onto earthmoving trailers even over rough quarry roads.',
      },
    ],
  },
  {
    id: 'vs-obd-4g',
    slug: 'vs-obd-4g-tracker',
    name: 'VS OBD 4G Tracker',
    category: 'Wireless GPS Trackers',
    price: 3899,
    compareAtPrice: 4499,
    rating: 4.6,
    reviewCount: 61,
    inStock: true,
    shortDescription:
      'Plug-and-play OBD-II 4G tracker reading live engine DTC fault codes, RPM, coolant temp, and trip analytics.',
    description:
      'Install in under 10 seconds into any passenger car or light commercial vehicle OBD-II diagnostic port. Combines real-time GPS tracking with vehicle health diagnostics and harsh driving scoring.',
    images: [wiredGpsImg, wirelessGpsImg],
    features: [
      '4G LTE',
      'OBD Plug & Play',
      'Geofence',
      'Engine Diagnostics (DTC)',
    ],
    specs: [
      { label: 'Connector', value: 'Standard 16-pin OBD-II J1962' },
      { label: 'Protocols', value: 'ISO 15765 CAN, KWP2000, ISO 9141' },
      { label: 'Connectivity', value: '4G LTE + BLE 5.0' },
      { label: 'Sensors', value: '6-Axis IMU (Harsh Brake/Cornering)' },
      { label: 'Unplug Alert', value: 'Instant push + SMS alert' },
    ],
    faqs: [
      {
        question: 'Will it fit my hatchback or SUV?',
        answer:
          'Compatible with virtually all petrol, diesel, and hybrid vehicles manufactured after 2010 with a 16-pin OBD-II port.',
      },
    ],
    reviews: [
      {
        id: 'rev-5',
        author: 'Ananya Deshmukh',
        role: 'Corporate Cab Fleet Lead (Sample Review)',
        rating: 5,
        date: 'Sep 2026',
        comment:
          'Zero mechanic dependency. We plugged 15 units into our executive sedans in one afternoon.',
      },
    ],
  },
  {
    id: 'vs-2k-wifi-dashcam',
    slug: 'vs-2k-wifi-dashcam',
    name: 'VS 2K WiFi Dashcam',
    category: 'WiFi Dashcams',
    price: 6499,
    compareAtPrice: 7999,
    rating: 4.7,
    reviewCount: 115,
    inStock: true,
    shortDescription:
      '1440p QHD wide-angle Sony STARVIS dashcam with 5GHz WiFi clip transfer and supercapacitor safety.',
    description:
      'Crisp 2K QHD road recording day and night using an F1.6 6-glass aperture and low-light CMOS sensor. Built with an extreme-temperature supercapacitor instead of lithium batteries for safe dashboard mounting.',
    images: [aiDashcamImg, wiredGpsImg],
    features: ['WiFi App Sync', 'Supercapacitor', 'Night Vision', 'G-Sensor Lock'],
    specs: [
      { label: 'Resolution', value: '2560 × 1440p @ 30fps' },
      { label: 'Field of View', value: '145° Wide-Angle Glass Lens' },
      { label: 'Power Storage', value: 'High-Temp Supercapacitor (-20°C to 70°C)' },
      { label: 'Storage Support', value: 'MicroSD up to 256 GB (Class 10 U3)' },
      { label: 'WiFi', value: 'Dual-Band 2.4GHz / 5GHz Direct App Download' },
    ],
    faqs: [
      {
        question: 'Why does it use a supercapacitor instead of a battery?',
        answer:
          'Supercapacitors withstand parked cabin heat above 65°C without swelling or fire risk.',
      },
    ],
    reviews: [
      {
        id: 'rev-6',
        author: 'Karthik Venkataraman',
        role: 'Highway Commuter (Sample Review)',
        rating: 5,
        date: 'Oct 2026',
        comment:
          'Number plates stay readable even at dusk. Fast 5GHz transfer directly to phone.',
      },
    ],
  },
  {
    id: 'vs-4k-dual-dashcam',
    slug: 'vs-4k-dual-dashcam',
    name: 'VS 4K Dual Dashcam',
    category: 'WiFi Dashcams',
    price: 10999,
    compareAtPrice: 12999,
    badge: 'Front + Rear',
    rating: 4.8,
    reviewCount: 83,
    inStock: true,
    shortDescription:
      'True 4K UHD front + 1080p rear camera system with GPS speed stamp and 24/7 buffered parking mode.',
    description:
      'Complete front and rear highway evidence capture. Includes embedded GPS coordinates and speed watermark directly on footage, plus time-lapse parking surveillance when paired with the hardwire kit.',
    images: [aiDashcamImg, wirelessGpsImg],
    features: [
      '4K UHD + Rear 1080p',
      'Built-in GPS Logger',
      '24h Parking Guard',
      'WiFi App Sync',
    ],
    specs: [
      { label: 'Front Camera', value: '3840 × 2160p @ 30fps UHD' },
      { label: 'Rear Camera', value: '1920 × 1080p @ 30fps HDR' },
      { label: 'GPS', value: 'Integrated Speed & Route Watermark' },
      { label: 'Storage', value: 'MicroSD up to 512 GB' },
      { label: 'Parking Mode', value: 'Time-Lapse + Impact Triggered Buffer' },
    ],
    faqs: [
      {
        question: 'Is the rear camera waterproof for external mounting?',
        answer:
          'It comes with an IP67 rear bracket option for SUVs and pickups as well as interior glass adhesive.',
      },
    ],
    reviews: [
      {
        id: 'rev-7',
        author: 'Neha Sharma',
        role: 'Touring Enthusiast (Sample Review)',
        rating: 5,
        date: 'Aug 2026',
        comment:
          'Dual channel clarity helped settle a rear bumper claim within hours using the exported timestamped video.',
      },
    ],
  },
  {
    id: 'vs-ai-4g-dashcam',
    slug: 'vs-ai-4g-dashcam-adas-dms',
    name: 'VS AI 4G Dashcam (ADAS + Driver Monitoring)',
    category: '4G AI Dashcams',
    price: 18999,
    compareAtPrice: 22499,
    badge: 'Flagship AI',
    rating: 4.9,
    reviewCount: 64,
    inStock: true,
    shortDescription:
      'Cloud-connected dual 4G LTE dashcam with live cabin + road streaming, ADAS collision alerts, and DMS fatigue detection.',
    description:
      'Purpose-built for commercial fleets, school buses, and hazardous cargo carriers. On-edge neural vision detects forward collision risk, lane departure, driver drowsiness, phone usage, and distracted gaze—streaming instant 15-second video clips to VS Fleet Pro.',
    images: [aiDashcamImg, wiredGpsImg],
    features: [
      '4G LTE',
      'ADAS Alerts',
      'Driver Monitoring',
      'Geofence',
      'Two-Way Cabin Audio',
    ],
    specs: [
      { label: 'Cellular', value: '4G LTE Cat-4 + WiFi Hotspot' },
      { label: 'AI Vision', value: 'On-Edge ADAS (FCW, LDW, HMW) + DMS (Fatigue, Phone, Smoking)' },
      { label: 'Cameras', value: '1080p Road + 1080p IR Night Cabin' },
      { label: 'Cloud Storage', value: 'Auto Event Clip Upload + Live View' },
      { label: 'Audio', value: 'Built-in Mic & Speaker (Dispatcher Talkback)' },
      { label: 'Warranty', value: '2 Years Commercial Warranty (Placeholder)' },
    ],
    faqs: [
      {
        question: 'Can fleet managers watch live video remotely?',
        answer:
          'Yes, both road and IR cabin feeds stream on-demand over 4G LTE into VS Fleet Pro web and mobile apps.',
      },
      {
        question: 'Does driver monitoring work at night?',
        answer:
          'Infrared LEDs illuminate the driver face invisibly at night without glaring or distracting the driver.',
      },
    ],
    reviews: [
      {
        id: 'rev-8',
        author: 'Vikramaditya Nair',
        role: 'VP Safety, Metro Transit Coaches (Sample Review)',
        rating: 5,
        date: 'Nov 2026',
        comment:
          'Driver drowsiness audio alerts reduced night-shift lane drift events by over 60% across 30 intercity coaches.',
      },
    ],
  },
  {
    id: 'vs-tag-bluetooth',
    slug: 'vs-tag-bluetooth-asset-tracker',
    name: 'VS Tag Bluetooth Asset Tracker',
    category: 'Bluetooth Asset Tags',
    price: 1899,
    compareAtPrice: 2299,
    rating: 4.5,
    reviewCount: 52,
    inStock: true,
    shortDescription:
      'Rugged BLE 5.2 asset & temperature beacon with 3-year coin battery for pallets, tools, and cold-chain crates.',
    description:
      'Track high-value tools, returnable crates, hospital equipment, and cold-chain pallets automatically whenever they pass within range of a VS 4G gateway or mobile field app.',
    images: [assetFarmingImg, wirelessGpsImg],
    features: [
      'IP67 Waterproof',
      'BLE 5.2 Long Range',
      '3-Year Battery',
      'Temperature Telemetry',
    ],
    specs: [
      { label: 'Wireless Protocol', value: 'Bluetooth 5.2 Low Energy (up to 120m LOS)' },
      { label: 'Sensors', value: 'Temperature (-30°C to +70°C) + Motion' },
      { label: 'Battery Life', value: 'Up to 36 Months (Replaceable CR2477)' },
      { label: 'Enclosure', value: 'IP67 Ultrasonic Sealed ABS' },
    ],
    faqs: [
      {
        question: 'Does VS Tag require a SIM card?',
        answer:
          'No SIM card is needed per tag. It pairs seamlessly with VS Pro 4G vehicle gateways or smartphones.',
      },
    ],
    reviews: [
      {
        id: 'rev-9',
        author: 'Prashant Joshi',
        role: 'Warehouse Systems Lead (Sample Review)',
        rating: 5,
        date: 'Sep 2026',
        comment:
          'We tagged 120 pharma crates. Cold-chain temperature logs automatically sync through truck gateways.',
      },
    ],
  },
  {
    id: 'vs-harvester-tractor',
    slug: 'vs-harvester-tractor-gps',
    name: 'VS Harvester Tractor GPS',
    category: 'Smart Farming GPS',
    price: 12499,
    compareAtPrice: 14999,
    badge: 'Agri-Tech',
    rating: 4.8,
    reviewCount: 47,
    inStock: true,
    shortDescription:
      'IP68 vibration-hardened precision GNSS unit calculating exact acreage worked, PTO hours, and diesel spend.',
    description:
      'Designed specifically for tractors, harvesters, and custom hiring centers. Accurately maps field polygons to calculate exact acres ploughed or harvested, monitors PTO shaft engagement, and prevents fuel pilferage in remote fields.',
    images: [assetFarmingImg, wiredGpsImg],
    features: [
      '4G LTE',
      'RTK / Precision GNSS',
      'IP67 Waterproof',
      'PTO & Acreage Calculation',
      'Geofence',
    ],
    specs: [
      { label: 'GNSS Accuracy', value: 'Sub-meter SBAS / NavIC Assisted' },
      { label: 'Agri Inputs', value: 'PTO Switch, Implement Lift Sensor, Fuel Probe' },
      { label: 'Enclosure', value: 'IP68 Mud & Pressure-Wash Resistant' },
      { label: 'Power', value: '9–36V Tractor Battery Protected' },
    ],
    faqs: [
      {
        question: 'Does it calculate harvested area automatically?',
        answer:
          'Yes. Enter your implement width once, and VS Fleet Pro computes exact acres/hectares worked per field polygon.',
      },
    ],
    reviews: [
      {
        id: 'rev-10',
        author: 'Devendra Patel',
        role: 'Agri Custom Hiring Hub, Gujarat (Sample Review)',
        rating: 5,
        date: 'Oct 2026',
        comment:
          'Eliminated acreage billing disputes with farmers. The pressure-wash waterproof housing handles monsoon mud easily.',
      },
    ],
  },
];

export const SOLUTIONS: SolutionDetail[] = [
  {
    slug: 'gps-tracking',
    title: 'Real-Time GPS Fleet Tracking',
    subtitle: 'Sub-5-second vehicle telemetry, route replay, and automated compliance.',
    summary:
      'Monitor entire commercial fleets or personal vehicles on a single unified map. Receive instant notifications for ignition events, geofence crossings, harsh braking, and scheduled maintenance milestones.',
    heroMetric: '99.94%',
    heroMetricLabel: 'Platform Telemetry Uptime (Target SLA)',
    capabilities: [
      {
        title: 'Live Multi-Constellation Mapping',
        description:
          'Combines GPS, NavIC, and GLONASS signals for reliable urban canyon and highway lock.',
      },
      {
        title: 'Smart Geofencing & Corridor Alerts',
        description:
          'Draw circular or custom polygon zones around depots, tolls, and customer loading bays.',
      },
      {
        title: 'Remote Engine Immobilization',
        description:
          'Safely trigger relay cut-off from authorized admin consoles in theft or misuse scenarios.',
      },
      {
        title: '90-Day Route & Trip Playback',
        description:
          'Audit exact stoppages, trip durations, average speeds, and mileage logs in downloadable CSV/PDF.',
      },
    ],
    industries: ['Logistics & Courier', 'Cold Chain', 'School & Staff Transit', 'Car Rentals'],
    recommendedProductIds: ['vs-lite-wired', 'vs-pro-4g-wired', 'vs-obd-4g'],
  },
  {
    slug: 'fuel-monitoring',
    title: 'Precision Fuel Monitoring & Anti-Siphon',
    subtitle: 'Detect fuel theft, verify bunk refills, and cut fleet diesel waste by up to 18%.',
    summary:
      'Pair capacitive or ultrasonic fuel probes with VS Pro 4G gateways to graph real-time tank levels against distance and engine hours. Get instant alerts the moment a sudden drop occurs while parked.',
    heroMetric: '±1.5%',
    heroMetricLabel: 'Tank Calibration Accuracy (Typical)',
    capabilities: [
      {
        title: 'Refill & Drain Verification',
        description:
          'Automated timestamps and litre deltas cross-check fuel station receipts against actual tank fills.',
      },
      {
        title: 'Sudden-Drop Theft Alarms',
        description:
          'Instant SMS and push alerts whenever tank volume drops unexpectedly during engine-off hours.',
      },
      {
        title: 'Mileage & Idling Analytics',
        description:
          'Identify high-idling vehicles and underperforming engines with per-vehicle km/L reports.',
      },
      {
        title: 'Dual-Tank Support',
        description:
          'Supports heavy prime movers and tippers with twin diesel tanks via single RS485 bus.',
      },
    ],
    industries: ['Long-Haul Freight', 'Mining Tippers', 'Diesel Generators', 'Construction'],
    recommendedProductIds: ['vs-pro-4g-wired', 'vs-harvester-tractor'],
  },
  {
    slug: 'dashcam',
    title: '4G AI Video Telematics & Dashcams',
    subtitle: 'Prevent collisions with on-edge ADAS, driver fatigue alerts, and instant cloud video.',
    summary:
      'Move from reactive accident investigation to proactive driver coaching. Dual-lens 4G AI dashcams detect tailgating, lane drift, drowsiness, and phone distraction in real time while archiving HD evidence in the cloud.',
    heroMetric: '-62%',
    heroMetricLabel: 'Preventable Safety Incidents (Target Benchmark)',
    capabilities: [
      {
        title: 'Driver Monitoring System (DMS)',
        description:
          'IR night-vision cabin lens detects eye closure, yawning, phone use, and seatbelt compliance.',
      },
      {
        title: 'ADAS Forward Collision Warnings',
        description:
          'Audio voice prompts alert drivers seconds before unsafe headway or unintended lane departure.',
      },
      {
        title: 'Live 4G Streaming & Talkback',
        description:
          'Watch road and cabin views live from dispatch and speak directly to drivers during emergencies.',
      },
      {
        title: 'Tamper-Proof Event Clips',
        description:
          'Harsh impact or SOS triggers lock and upload 15-second pre/post clips even if the SD card is removed.',
      },
    ],
    industries: ['Intercity Coaches', 'Hazmat Tankers', 'Cash-in-Transit', 'Executive Fleets'],
    recommendedProductIds: ['vs-ai-4g-dashcam', 'vs-4k-dual-dashcam', 'vs-2k-wifi-dashcam'],
  },
  {
    slug: 'smart-farming',
    title: 'Smart Farming & Tractor Telemetry',
    subtitle: 'Automated acreage calculation, PTO tracking, and equipment utilization for agribusiness.',
    summary:
      'Purpose-built for tractor fleets, combine harvesters, and rural equipment leasing hubs. Track exact acres worked per field, monitor implement engagement, and eliminate billing disputes.',
    heroMetric: '0.1 ac',
    heroMetricLabel: 'Field Polygon Area Resolution',
    capabilities: [
      {
        title: 'Automated Acreage Reports',
        description:
          'Computes worked field area from GPS path polygons and configured implement working width.',
      },
      {
        title: 'PTO & Implement Sensors',
        description:
          'Distinguishes road transit hours from true harvesting or ploughing PTO hours.',
      },
      {
        title: 'Mud & Wash-Down Hardened',
        description:
          'IP68 sealed chassis resists dust storms, monsoon rain, and high-pressure tractor washdowns.',
      },
      {
        title: 'Seasonal Operator Billing',
        description:
          'Export farmer-wise work receipts with plot boundaries and total worked duration.',
      },
    ],
    industries: ['Custom Hiring Centers', 'Sugar & Tea Estates', 'Tractor OEMs', 'Agri Co-ops'],
    recommendedProductIds: ['vs-harvester-tractor', 'vs-pro-4g-wired'],
  },
  {
    slug: 'asset-tracking',
    title: 'Wireless & Bluetooth Asset Tracking',
    subtitle: 'Track containers, trailers, pallets, and cold-chain crates with multi-year battery life.',
    summary:
      'Protect unpowered assets anywhere. Combine 90-day magnetic 4G trackers for containers and trailers with cost-effective BLE 5.2 temperature and proximity tags for individual crates and equipment.',
    heroMetric: '3 Yrs',
    heroMetricLabel: 'BLE Beacon Battery Endurance',
    capabilities: [
      {
        title: 'Magnetic Drop-Off Alerts',
        description:
          'Optical sensors fire immediate alerts if a wireless unit is detached from a container.',
      },
      {
        title: 'Cold-Chain Temperature Logs',
        description:
          'Continuous crate temperature telemetry relayed through nearby truck gateways.',
      },
      {
        title: 'Yard & Warehouse Inventory',
        description:
          'Auto-check-in assets whenever they arrive within geofenced depot zones.',
      },
      {
        title: 'Zero Vehicle Wiring',
        description:
          'Deploy across leased trailers and seasonal containers in under 30 seconds.',
      },
    ],
    industries: ['Container Logistics', 'Pharma Cold Chain', 'Construction Rental', 'Retail Supply'],
    recommendedProductIds: ['vs-ultra-wireless', 'vs-tag-bluetooth'],
  },
];

export const EXPERIENCE_CENTERS: ExperienceCenter[] = [
  {
    id: 'ec-bengaluru',
    city: 'Bengaluru',
    name: 'VS Experience Hub — Koramangala',
    address: 'Plot 42, 100 Feet Road, Koramangala 4th Block, Bengaluru 560034',
    phone: '+91 97406 40650',
    hours: 'Mon–Sat · 10:00 AM – 7:30 PM',
    coordinates: '12.9352° N, 77.6245° E',
    lat: 12.9352,
    lng: 77.6245,
    image: storeImg,
  },
  {
    id: 'ec-delhi',
    city: 'Delhi NCR',
    name: 'VS Experience Hub — Gurugram',
    address: 'Unit 14, Cyber Park Service Lane, Sector 18, Gurugram 122015',
    phone: '+91 97406 40650',
    hours: 'Mon–Sat · 10:00 AM – 7:30 PM',
    coordinates: '28.4946° N, 77.0887° E',
    lat: 28.4946,
    lng: 77.0887,
    image: storeImg,
  },
  {
    id: 'ec-pune',
    city: 'Pune',
    name: 'VS Experience Hub — Wakad',
    address: 'Showroom 3, Mobility Square, Wakad Highway, Pune 411057',
    phone: '+91 97406 40650',
    hours: 'Mon–Sat · 10:00 AM – 7:00 PM',
    coordinates: '18.5987° N, 73.7611° E',
    lat: 18.5987,
    lng: 73.7611,
    image: storeImg,
  },
  {
    id: 'ec-ahmedabad',
    city: 'Ahmedabad',
    name: 'VS Experience Hub — SG Highway',
    address: 'Ground Floor, Apex Trade Center, SG Highway, Ahmedabad 380054',
    phone: '+91 97406 40650',
    hours: 'Opening Next Month · Pre-book Demos',
    coordinates: '23.0301° N, 72.5070° E',
    lat: 23.0301,
    lng: 72.5070,
    launchingSoon: true,
    image: storeImg,
  },
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-1',
    slug: 'ai-dashcams-reducing-highway-fatigue',
    type: 'blog',
    category: 'Video Telematics',
    title: 'How Edge AI Dashcams Cut Highway Fatigue Incidents in Long-Haul Fleets',
    excerpt:
      'Discover how real-time infrared driver monitoring and audible forward-collision cues help transport operators shift from post-crash video review to active accident prevention.',
    content: [
      'Traditional dashcams only answer what happened after an insurance claim is filed. Modern 4G AI video telematics changes the equation by analyzing road geometry and driver gaze directly on the device NPU.',
      'When micro-sleep indicators or prolonged distraction exceed 1.8 seconds, an immediate cabin voice prompt alerts the driver while uploading a short 15-second verification clip to the fleet safety desk.',
      'Combined with geofenced night-halt scheduling, transport operators gain measurable reductions in roadside breakdowns and insurance loss ratios.',
    ],
    date: 'Nov 08, 2026',
    readTime: '4 min read',
    author: 'VS Telematics Research Team',
  },
  {
    id: 'post-2',
    slug: 'preventing-diesel-pilferage-rs485-probes',
    type: 'blog',
    category: 'Fuel Intelligence',
    title: 'Capacitive vs Ultrasonic Fuel Sensors: Choosing the Right Probe for Heavy Trucks',
    excerpt:
      'A practical engineering breakdown of accuracy, installation time, and calibration workflows for mixed commercial truck fleets.',
    content: [
      'Fuel accounts for more than 45% of operating cost in Indian long-haul logistics. Yet basic odometer-based estimates miss partial siphon events and short-fill billing discrepancies.',
      'Capacitive probes inserted into the tank provide ±1% resolution across rough terrain, while non-invasive ultrasonic sensors clamp underneath tanks where drilling is restricted by OEM warranties.',
      'Paired with VS Pro 4G RS485 telemetry, both options stream tamper-resilient refill and drain alerts into daily reconciliation sheets.',
    ],
    date: 'Oct 22, 2026',
    readTime: '5 min read',
    author: 'Hardware Engineering Desk',
  },
  {
    id: 'post-3',
    slug: 'navic-dual-constellation-urban-canyons',
    type: 'blog',
    category: 'GNSS Engineering',
    title: 'Why Multi-Constellation GPS + NavIC Matters for Last-Mile Urban Tracking',
    excerpt:
      'Single-constellation receivers often drift between dense flyovers and narrow market lanes. Here is how multi-band GNSS eliminates route jitter.',
    content: [
      'Delivery fleets operating under metro viaducts or high-rise business districts routinely experience multipath GPS drift that inflates reported distances.',
      'By locking onto GPS, NavIC, and GLONASS satellites simultaneously and fusing 6-axis IMU dead-reckoning data, VS trackers hold crisp lane-level paths even through brief signal shadows.',
    ],
    date: 'Oct 04, 2026',
    readTime: '3 min read',
    author: 'Firmware Systems Group',
  },
  {
    id: 'news-1',
    slug: 'vs-fleet-pro-v4-launch',
    type: 'whats-new',
    category: 'Platform Release',
    title: 'VS Fleet Pro Web Console: Live Video Wall & Automated Trip Billing',
    excerpt:
      'Introducing multi-camera 4G live view, automated per-trip fuel cost reconciliation, and instant webhook APIs for ERP integration.',
    content: [
      'Our latest platform release introduces a low-latency 4-channel live video wall for 4G AI Dashcam fleets, allowing safety teams to monitor critical consignments in real time.',
      'We have also shipped customizable white-label domain SSL automation so dealer partners can onboard new fleet customers under their own brand in under 15 minutes.',
    ],
    date: 'Nov 12, 2026',
    readTime: 'Release Note',
    author: 'VS Product Team',
  },
  {
    id: 'news-2',
    slug: 'ahmedabad-experience-center-announcement',
    type: 'whats-new',
    category: 'Retail Expansion',
    title: 'New Ahmedabad Experience Center Launching Next Month',
    excerpt:
      'Our fourth regional hardware showroom and installer training bay opens on SG Highway with live dashcam and fuel-probe demos.',
    content: [
      'Fleet owners and retail vehicle drivers across Gujarat will soon be able to test live 4G AI dashcams, magnetic asset trackers, and tractor GNSS units in person before purchasing.',
      'Pre-booked installation slots and dealer partnership consultations are already open online.',
    ],
    date: 'Nov 01, 2026',
    readTime: 'Announcement',
    author: 'VS Retail Network',
  },
];

export const POLICY_CONTENT: Record<
  PolicySlug,
  { title: string; updated: string; sections: Array<{ heading: string; body: string }> }
> = {
  privacy: {
    title: 'Privacy Policy (Placeholder Template)',
    updated: 'Updated November 2026',
    sections: [
      {
        heading: '1. Telemetry & Location Data Ownership',
        body: 'All GPS coordinates, video clips, and sensor telemetry generated by VS Technology devices belong exclusively to the registered device owner or fleet organization. Data is encrypted in transit via TLS 1.3.',
      },
      {
        heading: '2. Account & Order Information',
        body: 'We collect contact, shipping, and vehicle installation details solely to fulfill hardware orders, activate warranty coverage, and provide technical support.',
      },
      {
        heading: '3. Data Retention & Deletion',
        body: 'Route history is retained per your active cloud plan (90 days standard, up to 365 days enterprise). Account holders may request full data export or deletion via vstechnology999@gmail.com.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service (Placeholder Template)',
    updated: 'Updated November 2026',
    sections: [
      {
        heading: '1. Hardware & Software Licensing',
        body: 'Hardware purchases include manufacturer warranty per product tier. Ongoing cellular SIM and cloud platform access require an active subscription after any included initial term.',
      },
      {
        heading: '2. Authorized Installation & Road Safety',
        body: 'Remote engine immobilization must only be triggered when safe and lawful. Customers are responsible for adhering to local privacy laws regarding cabin video/audio recording.',
      },
    ],
  },
  return: {
    title: 'Return & Replacement Policy (Placeholder Template)',
    updated: 'Updated November 2026',
    sections: [
      {
        heading: '1. 7-Day Unopened Return Window',
        body: 'Hardware in original unopened packaging with intact seal may be returned within 7 days of delivery for a full refund, excluding installation service fees already rendered.',
      },
      {
        heading: '2. Warranty Replacement',
        body: 'Verified manufacturing defects within the warranty period qualify for express replacement at any VS Experience Center or via courier pickup.',
      },
    ],
  },
  shipping: {
    title: 'Shipping & Installation Policy (Placeholder Template)',
    updated: 'Updated November 2026',
    sections: [
      {
        heading: '1. Dispatch & Pan-India Delivery',
        body: 'Orders placed before 2:00 PM IST ship the same business day. Free shipping applies on orders of ₹4,000 and above; standard delivery takes 2–5 business days.',
      },
      {
        heading: '2. Technician Installation',
        body: 'Doorstep technician installation is available across 450+ dealer cities. Book your preferred date and time slot directly after checkout.',
      },
    ],
  },
};

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'VST-2026-8412',
    date: '2026-10-28',
    status: 'Delivered',
    items: [
      {
        productId: 'vs-pro-4g-wired',
        name: 'VS Pro 4G Wired GPS Tracker',
        quantity: 2,
        unitPrice: 5498,
        plan: '1-Year Cloud SIM',
      },
    ],
    subtotal: 10996,
    discount: 1100,
    gst: 1781,
    shipping: 0,
    total: 11677,
    customerName: 'Arjun Mehta (Demo Account)',
    shippingAddress: '18 Industrial Estate, Hosur Road',
    city: 'Bengaluru',
    paymentMethod: 'Corporate UPI',
  },
];

export const INITIAL_DEVICES: TrackedDevice[] = [
  {
    id: 'dev-1',
    imei: '864291053829104',
    model: 'VS Pro 4G Wired GPS Tracker',
    vehicleLabel: 'KA-01-TR-4821 (Cargo Van)',
    vehicleType: 'Cargo Van / LCV',
    status: 'Moving',
    speedKmh: 58,
    lastUpdated: 'Just now',
    simExpiry: '2027-10-28',
    latitude: 12.8985,
    longitude: 77.6382,
    headingDeg: 112,
    telemetrySource: 'simulated',
  },
  {
    id: 'dev-2',
    imei: '864291053829889',
    model: 'VS AI 4G Dashcam (ADAS + DMS)',
    vehicleLabel: 'MH-12-FL-9032 (Express Coach)',
    vehicleType: 'Bus / Coach',
    status: 'Idle',
    speedKmh: 0,
    lastUpdated: '2 min ago',
    simExpiry: '2027-08-14',
    latitude: 18.5987,
    longitude: 73.7611,
    headingDeg: 298,
    telemetrySource: 'simulated',
  },
  {
    id: 'dev-3',
    imei: '864291053824512',
    model: 'VS Ultra Wireless GPS Tracker',
    vehicleLabel: 'TRL-8812 (Reefer Container)',
    vehicleType: 'Refrigerated Van',
    status: 'Alert',
    speedKmh: 42,
    lastUpdated: '1 min ago',
    simExpiry: '2027-06-05',
    latitude: 13.3379,
    longitude: 77.1173,
    headingDeg: 138,
    telemetrySource: 'simulated',
  },
];

export const INITIAL_WARRANTIES: WarrantyRecord[] = [
  {
    id: 'war-1',
    imei: '864291053829104',
    productName: 'VS Pro 4G Wired GPS Tracker',
    purchaseDate: '2026-10-28',
    invoiceNumber: 'INV-VST-8412',
    status: 'Active',
    expiresOn: '2028-10-28',
  },
];

export const INITIAL_BOOKINGS: InstallationBooking[] = [
  {
    id: 'ins-101',
    vehicleType: 'Heavy Commercial Truck',
    city: 'Bengaluru',
    date: '2026-11-22',
    timeSlot: '10:00 AM – 12:00 PM',
    customerName: 'Arjun Mehta (Demo Account)',
    phone: '9876543210',
    status: 'Scheduled',
  },
];
