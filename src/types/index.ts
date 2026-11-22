export type ProductCategory =
  | 'Wired GPS Trackers'
  | 'Wireless GPS Trackers'
  | 'WiFi Dashcams'
  | '4G AI Dashcams'
  | 'Bluetooth Asset Tags'
  | 'Smart Farming GPS';

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductFaq {
  question: string;
  answer: string;
}

export interface ProductReview {
  id: string;
  author: string;
  role: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  price: number;
  compareAtPrice?: number;
  badge?: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  shortDescription: string;
  description: string;
  images: string[];
  features: string[];
  specs: ProductSpec[];
  faqs: ProductFaq[];
  reviews: ProductReview[];
}

export interface CartItem {
  productId: string;
  quantity: number;
  plan: 'Hardware Only' | '1-Year Cloud SIM' | '3-Year Enterprise Plan';
}

export interface PromoCode {
  code: string;
  description: string;
  discountType: 'percent' | 'flat';
  value: number;
  minSubtotal: number;
}

export interface Order {
  id: string;
  date: string;
  status: 'Confirmed' | 'Shipped' | 'Delivered';
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    plan: string;
  }>;
  subtotal: number;
  discount: number;
  gst: number;
  shipping: number;
  total: number;
  customerName: string;
  shippingAddress: string;
  city: string;
  paymentMethod: string;
}

export type VehicleType =
  | 'Commercial Truck / Fleet'
  | 'Cargo Van / LCV'
  | 'Passenger Car / SUV'
  | 'Two-Wheeler / Scooter'
  | 'Bus / Coach'
  | 'Refrigerated Van'
  | 'Tractor / Harvester';

export type TelemetrySource = 'gps' | 'simulated' | 'manual';

export interface TrackedDevice {
  id: string;
  imei: string;
  model: string;
  vehicleLabel: string;
  vehicleType?: VehicleType;
  status: 'Moving' | 'Idle' | 'Alert';
  speedKmh: number;
  lastUpdated: string;
  simExpiry: string;
  cloudSynced?: boolean;
  latitude?: number;
  longitude?: number;
  headingDeg?: number;
  telemetrySource?: TelemetrySource;
  accuracyMeters?: number;
  lastPingAt?: string;
}

export type ServiceMilestoneId =
  | 'oil_change'
  | 'air_filter'
  | 'fuel_filter'
  | 'brake_inspection'
  | 'transmission_oil';

export type ServiceAlertSeverity = 'Overdue' | 'Approaching' | 'Scheduled';

export interface VehicleMaintenanceRecord {
  deviceId: string;
  imei: string;
  odometerKm: number;
  lastServiceOdometers: Record<ServiceMilestoneId, number>;
  lastServicedDates?: Partial<Record<ServiceMilestoneId, string>>;
  updatedAt: string;
  cloudSynced?: boolean;
}

export interface WarrantyRecord {
  id: string;
  imei: string;
  productName: string;
  purchaseDate: string;
  invoiceNumber: string;
  status: 'Active' | 'Pending Verification';
  expiresOn: string;
}

export interface InstallationBooking {
  id: string;
  vehicleType: string;
  city: string;
  date: string;
  timeSlot: string;
  customerName: string;
  phone: string;
  status: 'Scheduled' | 'Completed';
}

export interface DemoRequest {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  fleetSize: string;
  interest: string;
  preferredDate: string;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  company: string;
  isAuthenticated: boolean;
  uid?: string;
  photoURL?: string;
  authProvider?: 'google' | 'demo';
}

export type SolutionSlug =
  | 'gps-tracking'
  | 'fuel-monitoring'
  | 'dashcam'
  | 'smart-farming'
  | 'asset-tracking';

export interface SolutionDetail {
  slug: SolutionSlug;
  title: string;
  subtitle: string;
  summary: string;
  heroMetric: string;
  heroMetricLabel: string;
  capabilities: Array<{ title: string; description: string }>;
  industries: string[];
  recommendedProductIds: string[];
}

export interface ExperienceCenter {
  id: string;
  city: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  coordinates: string;
  lat: number;
  lng: number;
  launchingSoon?: boolean;
  image: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  type: 'blog' | 'whats-new';
  category: string;
  title: string;
  excerpt: string;
  content: string[];
  date: string;
  readTime: string;
  author: string;
}

export type PolicySlug = 'privacy' | 'terms' | 'return' | 'shipping';

export type AppRoute =
  | { page: 'home'; section?: string }
  | { page: 'shop'; category?: ProductCategory; search?: string }
  | { page: 'product'; slug: string }
  | { page: 'solutions'; slug: SolutionSlug }
  | { page: 'book-installation' }
  | { page: 'book-demo'; prefillInterest?: string }
  | { page: 'warranty' }
  | { page: 'offers' }
  | { page: 'cart' }
  | { page: 'checkout' }
  | {
      page: 'account';
      tab?: 'orders' | 'tracking' | 'devices' | 'service' | 'warranty' | 'bookings' | 'wishlist';
    }
  | { page: 'login' }
  | { page: 'blog' }
  | { page: 'whats-new' }
  | { page: 'about' }
  | { page: 'contact' }
  | { page: 'experience-stores' }
  | { page: 'policy'; slug: PolicySlug }
  | { page: 'ai-studio'; tab?: 'chat' | 'voice' | 'transcribe' | 'image' | 'video' }
  | { page: '3d-lab'; productId?: string }
  | { page: 'support-guide'; section?: 'login' | 'tracking' | 'reports' | 'geofence' }
  | {
      page: 'platform';
      platform?: 'laptop' | 'android' | 'iphone';
      role?: 'super_admin' | 'admin' | 'client' | 'customer';
      trackRto?: string;
    }
  | { page: 'live-tracking'; rtoNumber?: string }
  | { page: 'new-vehicle' };

