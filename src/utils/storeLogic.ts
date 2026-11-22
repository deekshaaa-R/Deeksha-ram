import type {
  CartItem,
  Product,
  ProductCategory,
  PromoCode,
  SortOption,
} from '../types';

export const PLAN_SURCHARGE: Record<CartItem['plan'], number> = {
  'Hardware Only': 0,
  '1-Year Cloud SIM': 1199,
  '3-Year Enterprise Plan': 2799,
};

export const PROMO_CODES: PromoCode[] = [
  {
    code: 'FLEET10',
    description: '10% off orders above ₹5,000',
    discountType: 'percent',
    value: 10,
    minSubtotal: 5000,
  },
  {
    code: 'DASHCAM15',
    description: '15% off on orders above ₹10,000',
    discountType: 'percent',
    value: 15,
    minSubtotal: 10000,
  },
  {
    code: 'NEWUSER500',
    description: 'Flat ₹500 off orders above ₹2,499',
    discountType: 'flat',
    value: 500,
    minSubtotal: 2499,
  },
];

export interface ProductFilterCriteria {
  category?: ProductCategory | 'All';
  maxPrice?: number;
  feature?: string;
  search?: string;
  sort?: SortOption;
}

export function filterAndSortProducts(
  products: Product[],
  criteria: ProductFilterCriteria
): Product[] {
  const query = (criteria.search ?? '').trim().toLowerCase();
  const category = criteria.category ?? 'All';
  const maxPrice = criteria.maxPrice ?? Infinity;
  const feature = (criteria.feature ?? '').trim().toLowerCase();

  const filtered = products.filter((product) => {
    if (category !== 'All' && product.category !== category) {
      return false;
    }
    if (product.price > maxPrice) {
      return false;
    }
    if (
      feature &&
      !product.features.some((f) => f.toLowerCase().includes(feature))
    ) {
      return false;
    }
    if (query) {
      const haystack = [
        product.name,
        product.category,
        product.shortDescription,
        ...product.features,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });

  const sorted = [...filtered];
  switch (criteria.sort ?? 'featured') {
    case 'price-asc':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      break;
    case 'featured':
    default:
      break;
  }

  return sorted;
}

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  discount: number;
  gst: number;
  shipping: number;
  total: number;
  appliedPromo: PromoCode | null;
  promoError: string | null;
}

export function getUnitPrice(product: Product, plan: CartItem['plan']): number {
  return product.price + (PLAN_SURCHARGE[plan] ?? 0);
}

export function calculateCartTotals(
  items: CartItem[],
  products: Product[],
  promoCodeInput?: string
): CartTotals {
  const productMap = new Map(products.map((p) => [p.id, p]));
  let subtotal = 0;
  let itemCount = 0;

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product || item.quantity <= 0) continue;
    const qty = Math.floor(item.quantity);
    subtotal += getUnitPrice(product, item.plan) * qty;
    itemCount += qty;
  }

  let appliedPromo: PromoCode | null = null;
  let promoError: string | null = null;
  let discount = 0;

  const trimmedCode = (promoCodeInput ?? '').trim().toUpperCase();
  if (trimmedCode) {
    const match = PROMO_CODES.find((p) => p.code === trimmedCode);
    if (!match) {
      promoError = `Promo code "${trimmedCode}" is not recognized.`;
    } else if (subtotal < match.minSubtotal) {
      promoError = `Code ${match.code} requires a minimum subtotal of ${formatINR(match.minSubtotal)}.`;
    } else {
      appliedPromo = match;
      discount =
        match.discountType === 'percent'
          ? Math.round((subtotal * match.value) / 100)
          : Math.min(match.value, subtotal);
    }
  }

  const taxableAmount = Math.max(0, subtotal - discount);
  const gst = Math.round(taxableAmount * 0.18);
  const shipping = subtotal === 0 || taxableAmount >= 4000 ? 0 : 199;
  const total = taxableAmount + gst + shipping;

  return {
    itemCount,
    subtotal,
    discount,
    gst,
    shipping,
    total,
    appliedPromo,
    promoError,
  };
}

export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email address is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/[\s\-+()]/g, '');
  if (!digits) return 'Phone number is required.';
  if (!/^\d{10,13}$/.test(digits)) {
    return 'Enter a valid 10 to 13 digit phone number.';
  }
  return null;
}

export function validateImei(imei: string): string | null {
  const digits = imei.trim();
  if (!digits) return 'Device IMEI / Serial number is required.';
  if (!/^\d{15}$/.test(digits)) {
    return 'IMEI must be exactly 15 numeric digits.';
  }
  return null;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value.trim()) {
    return `${fieldName} is required.`;
  }
  return null;
}

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function validateCheckoutFields(input: {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}): FieldErrors<'fullName' | 'email' | 'phone' | 'address' | 'city' | 'postalCode'> {
  const errors: FieldErrors<'fullName' | 'email' | 'phone' | 'address' | 'city' | 'postalCode'> = {};
  const nameErr = validateRequired(input.fullName, 'Full name');
  if (nameErr) errors.fullName = nameErr;
  const emailErr = validateEmail(input.email);
  if (emailErr) errors.email = emailErr;
  const phoneErr = validatePhone(input.phone);
  if (phoneErr) errors.phone = phoneErr;
  const addrErr = validateRequired(input.address, 'Street address');
  if (addrErr) errors.address = addrErr;
  const cityErr = validateRequired(input.city, 'City');
  if (cityErr) errors.city = cityErr;
  if (!/^\d{6}$/.test(input.postalCode.trim())) {
    errors.postalCode = 'Enter a valid 6-digit PIN / postal code.';
  }
  return errors;
}

export function validateWarrantyFields(input: {
  imei: string;
  productName: string;
  purchaseDate: string;
  invoiceNumber: string;
  email: string;
}): FieldErrors<'imei' | 'productName' | 'purchaseDate' | 'invoiceNumber' | 'email'> {
  const errors: FieldErrors<'imei' | 'productName' | 'purchaseDate' | 'invoiceNumber' | 'email'> = {};
  const imeiErr = validateImei(input.imei);
  if (imeiErr) errors.imei = imeiErr;
  const prodErr = validateRequired(input.productName, 'Product model');
  if (prodErr) errors.productName = prodErr;
  const dateErr = validateRequired(input.purchaseDate, 'Purchase date');
  if (dateErr) errors.purchaseDate = dateErr;
  const invErr = validateRequired(input.invoiceNumber, 'Invoice number');
  if (invErr) errors.invoiceNumber = invErr;
  const emailErr = validateEmail(input.email);
  if (emailErr) errors.email = emailErr;
  return errors;
}

export function validateInstallationFields(input: {
  vehicleType: string;
  city: string;
  date: string;
  timeSlot: string;
  customerName: string;
  phone: string;
}): FieldErrors<'vehicleType' | 'city' | 'date' | 'timeSlot' | 'customerName' | 'phone'> {
  const errors: FieldErrors<'vehicleType' | 'city' | 'date' | 'timeSlot' | 'customerName' | 'phone'> = {};
  const vErr = validateRequired(input.vehicleType, 'Vehicle type');
  if (vErr) errors.vehicleType = vErr;
  const cErr = validateRequired(input.city, 'City');
  if (cErr) errors.city = cErr;
  const dErr = validateRequired(input.date, 'Preferred date');
  if (dErr) errors.date = dErr;
  const tErr = validateRequired(input.timeSlot, 'Time slot');
  if (tErr) errors.timeSlot = tErr;
  const nErr = validateRequired(input.customerName, 'Full name');
  if (nErr) errors.customerName = nErr;
  const pErr = validatePhone(input.phone);
  if (pErr) errors.phone = pErr;
  return errors;
}

export type ProductFaqTopic =
  | 'Product'
  | 'Installation'
  | 'Battery Life'
  | 'Warranty';

export interface ProductFaqItem {
  question: string;
  answer: string;
  topic: ProductFaqTopic;
}

function detectFaqTopic(question: string): ProductFaqTopic {
  const q = question.toLowerCase();
  if (/\b(install|installation|mount|mounting|wiring|wire|plug|port|setup)\b/.test(q)) {
    return 'Installation';
  }
  if (/\b(battery|batteries|drain|supercapacitor|standby|charge|mah)\b/.test(q)) {
    return 'Battery Life';
  }
  if (/\b(warranty|warranties|replacement|guarantee|defect|rma)\b/.test(q)) {
    return 'Warranty';
  }
  return 'Product';
}

export function getProductFaqs(product: Product): ProductFaqItem[] {
  const items: ProductFaqItem[] = product.faqs.map((faq) => ({
    question: faq.question,
    answer: faq.answer,
    topic: detectFaqTopic(faq.question),
  }));

  const hasTopic = (topic: ProductFaqTopic) =>
    items.some((item) => item.topic === topic);

  if (!hasTopic('Installation')) {
    let answer: string;
    if (product.id === 'vs-obd-4g') {
      answer =
        'No tools or mechanic required. Plug the unit directly into your vehicle’s 16-pin OBD-II port under the dashboard in under 10 seconds—power and CAN telemetry activate automatically.';
    } else if (product.category === 'Wireless GPS Trackers') {
      answer =
        'Zero wiring needed. Attach the housing directly to any flat steel chassis beam, trailer frame, or container surface using its built-in industrial Neodymium N52 magnets in under 30 seconds.';
    } else if (product.category === 'Bluetooth Asset Tags') {
      answer =
        'Mount in seconds using the included industrial 3M VHB pad, zip-tie slots, or screw tabs. No SIM card is required—pair via the VS Field App with any VS Pro 4G vehicle gateway.';
    } else if (
      product.category === 'WiFi Dashcams' ||
      product.category === '4G AI Dashcams'
    ) {
      answer =
        'Mount cleanly behind the rearview mirror using the electrostatic windshield film, then route the power cable along the A-pillar trim. You can use the 12V socket or book a doorstep VS technician for concealed fuse-box hardwiring.';
    } else if (product.category === 'Smart Farming GPS') {
      answer =
        'Connects to 9–36V tractor or harvester electrical systems with weatherproof Deutsch/ring terminals and optional PTO switch leads. Pan-India doorstep installation by certified VS field technicians is available.';
    } else {
      answer =
        'Concealed 4-wire installation (Power, Ground, Ignition ACC, and optional Relay Cut-off) takes around 20 minutes. Book a VS-certified technician at your doorstep across 450+ cities via the Book Installation page.';
    }

    items.push({
      question: `How is the ${product.name} installed, and is technician support available?`,
      answer,
      topic: 'Installation',
    });
  }

  if (!hasTopic('Battery Life')) {
    let answer: string;
    if (product.id === 'vs-ultra-wireless') {
      answer =
        'Its 10,000 mAh rechargeable Li-Ion pack delivers up to 90 days of standby in scheduled asset mode (1 ping/day) or 25–30 days on active 30-second live tracking. Low-battery alerts trigger automatically at 15%.';
    } else if (product.category === 'Bluetooth Asset Tags') {
      answer =
        'Powered by a high-capacity replaceable CR2477 coin cell rated for up to 36 months (3 years) of continuous BLE 5.2 temperature and proximity broadcasting.';
    } else if (
      product.category === 'WiFi Dashcams' ||
      product.category === '4G AI Dashcams'
    ) {
      answer =
        'Built with a heat-resistant industrial supercapacitor instead of lithium batteries so it operates safely in parked cabin heat up to 70°C. When hardwired for parking mode, built-in low-voltage cut-off (11.8V / 23.6V) protects your vehicle battery from draining.';
    } else {
      answer =
        'Runs on your vehicle’s 9V–90V battery with ultra-low < 5 mA parked sleep draw so it never drains car or two-wheeler batteries. An internal backup Li-Po battery provides up to 4 hours of runtime and fires an instant power-tamper alert if main wires are cut.';
    }

    items.push({
      question: `What is the battery life and vehicle battery protection on the ${product.name}?`,
      answer,
      topic: 'Battery Life',
    });
  }

  if (!hasTopic('Warranty')) {
    const warrantySpec = product.specs.find((s) =>
      s.label.toLowerCase().includes('warranty')
    );
    const coverage = warrantySpec
      ? warrantySpec.value.replace(/\s*\(Placeholder\)/i, '')
      : '1-Year Manufacturer Replacement Warranty';

    items.push({
      question: `What warranty coverage and replacement support comes with the ${product.name}?`,
      answer: `Includes ${coverage} covering manufacturing and hardware defects, plus a 7-day unopened return window. Activate coverage online in seconds using your 15-digit IMEI and invoice on the Warranty Registration page for priority service at any VS Experience Center.`,
      topic: 'Warranty',
    });
  }

  return items;
}

