import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  filterAndSortProducts,
  getProductFaqs,
  validateCheckoutFields,
  validateImei,
  validateInstallationFields,
  validateWarrantyFields,
} from './storeLogic';
import type { Product } from '../types';

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'p1',
    slug: 'vs-lite-wired',
    name: 'VS Lite Wired GPS Tracker',
    category: 'Wired GPS Trackers',
    price: 2499,
    rating: 4.6,
    reviewCount: 40,
    inStock: true,
    shortDescription: 'Compact wired GPS tracker',
    description: 'Compact wired GPS tracker',
    images: [],
    features: ['Ignition Cut-off', 'Geofence'],
    specs: [],
    faqs: [],
    reviews: [],
  },
  {
    id: 'p2',
    slug: 'vs-ai-dashcam',
    name: 'VS AI 4G Dashcam',
    category: '4G AI Dashcams',
    price: 18999,
    rating: 4.9,
    reviewCount: 65,
    inStock: true,
    shortDescription: 'Dual lens ADAS + DMS dashcam',
    description: 'Dual lens ADAS + DMS dashcam',
    images: [],
    features: ['ADAS Alerts', 'Live 4G Streaming', 'Geofence'],
    specs: [{ label: 'Warranty', value: '2 Years Commercial Warranty' }],
    faqs: [
      {
        question: 'Can fleet managers watch live video remotely?',
        answer: 'Yes, streams live over 4G LTE.',
      },
    ],
    reviews: [],
  },
  {
    id: 'p3',
    slug: 'vs-tag',
    name: 'VS Tag Bluetooth Asset Tracker',
    category: 'Bluetooth Asset Tags',
    price: 1899,
    rating: 4.4,
    reviewCount: 18,
    inStock: true,
    shortDescription: 'BLE beacon tag',
    description: 'BLE beacon tag',
    images: [],
    features: ['BLE 5.2', 'IP67 Waterproof'],
    specs: [],
    faqs: [],
    reviews: [],
  },
];

test('filterAndSortProducts filters by category, search, maxPrice, and sorts by price', () => {
  const byCat = filterAndSortProducts(SAMPLE_PRODUCTS, {
    category: '4G AI Dashcams',
  });
  assert.equal(byCat.length, 1);
  assert.equal(byCat[0].id, 'p2');

  const byFeature = filterAndSortProducts(SAMPLE_PRODUCTS, {
    feature: 'geofence',
    sort: 'price-desc',
  });
  assert.deepEqual(
    byFeature.map((p) => p.id),
    ['p2', 'p1']
  );

  const byMaxPrice = filterAndSortProducts(SAMPLE_PRODUCTS, {
    maxPrice: 3000,
    sort: 'price-asc',
  });
  assert.deepEqual(
    byMaxPrice.map((p) => p.id),
    ['p3', 'p1']
  );
});

test('calculateCartTotals computes subtotal, promo discount, GST, free shipping threshold, and total', () => {
  const totals = calculateCartTotals(
    [
      { productId: 'p1', quantity: 2, plan: 'Hardware Only' }, // 4998
      { productId: 'p3', quantity: 1, plan: '1-Year Cloud SIM' }, // 1899 + 1199 = 3098
    ],
    SAMPLE_PRODUCTS,
    'FLEET10'
  );
  // Subtotal = 4998 + 3098 = 8096
  assert.equal(totals.itemCount, 3);
  assert.equal(totals.subtotal, 8096);
  // 10% of 8096 = 810
  assert.equal(totals.discount, 810);
  // Taxable = 7286, GST 18% = 1311
  assert.equal(totals.gst, 1311);
  // Free shipping >= 4000
  assert.equal(totals.shipping, 0);
  assert.equal(totals.total, 7286 + 1311);
  assert.equal(totals.appliedPromo?.code, 'FLEET10');
  assert.equal(totals.promoError, null);
});

test('calculateCartTotals handles invalid and below-minimum promo codes', () => {
  const badCode = calculateCartTotals(
    [{ productId: 'p1', quantity: 1, plan: 'Hardware Only' }],
    SAMPLE_PRODUCTS,
    'NOPE'
  );
  assert.equal(badCode.appliedPromo, null);
  assert.ok(badCode.promoError?.includes('not recognized'));

  const minNotMet = calculateCartTotals(
    [{ productId: 'p3', quantity: 1, plan: 'Hardware Only' }],
    SAMPLE_PRODUCTS,
    'FLEET10'
  );
  assert.equal(minNotMet.discount, 0);
  assert.ok(minNotMet.promoError?.includes('minimum subtotal'));
  assert.equal(minNotMet.shipping, 199);
});

test('form validators reject invalid IMEI, phone, PIN, and missing required fields', () => {
  assert.ok(validateImei('12345') !== null);
  assert.equal(validateImei('864291053829104'), null);

  const checkoutErrs = validateCheckoutFields({
    fullName: '',
    email: 'bad-email',
    phone: '123',
    address: '',
    city: 'Bengaluru',
    postalCode: '5600',
  });
  assert.ok(checkoutErrs.fullName);
  assert.ok(checkoutErrs.email);
  assert.ok(checkoutErrs.phone);
  assert.ok(checkoutErrs.address);
  assert.equal(checkoutErrs.city, undefined);
  assert.ok(checkoutErrs.postalCode);

  const warrantyErrs = validateWarrantyFields({
    imei: '864291053829104',
    productName: 'VS Lite Wired GPS Tracker',
    purchaseDate: '2026-10-01',
    invoiceNumber: 'INV-2026-991',
    email: 'ops@fleetcorp.in',
  });
  assert.equal(Object.keys(warrantyErrs).length, 0);

  const installErrs = validateInstallationFields({
    vehicleType: '',
    city: 'Pune',
    date: '2026-11-20',
    timeSlot: '10:00 AM - 12:00 PM',
    customerName: 'Arjun',
    phone: '9876543210',
  });
  assert.ok(installErrs.vehicleType);
  assert.equal(installErrs.city, undefined);
});

test('getProductFaqs includes installation, battery life, and warranty topics', () => {
  const dashcamFaqs = getProductFaqs(SAMPLE_PRODUCTS[1]);
  const topics = dashcamFaqs.map((f) => f.topic);
  assert.ok(topics.includes('Product'));
  assert.ok(topics.includes('Installation'));
  assert.ok(topics.includes('Battery Life'));
  assert.ok(topics.includes('Warranty'));
  const warrantyItem = dashcamFaqs.find((f) => f.topic === 'Warranty');
  assert.ok(warrantyItem?.answer.includes('2 Years Commercial Warranty'));

  const tagFaqs = getProductFaqs(SAMPLE_PRODUCTS[2]);
  assert.equal(tagFaqs.length, 3);
  assert.ok(
    tagFaqs.find((f) => f.topic === 'Battery Life')?.answer.includes('36 months')
  );

  const supportFaqs = getProductFaqs({
    ...SAMPLE_PRODUCTS[0],
    faqs: [
      {
        question: 'Does VS Lite support remote ignition cut-off?',
        answer: 'Yes, via relay kit.',
      },
    ],
  });
  assert.equal(supportFaqs[0].topic, 'Product');
  assert.ok(supportFaqs.some((f) => f.topic === 'Installation'));
  assert.ok(supportFaqs.some((f) => f.topic === 'Battery Life'));
  assert.ok(supportFaqs.some((f) => f.topic === 'Warranty'));
});

