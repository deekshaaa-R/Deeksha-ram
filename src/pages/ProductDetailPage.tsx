import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Box,
  Check,
  ChevronDown,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  ShieldCheck,
  ShoppingCart,
  Star,
} from 'lucide-react';
import { HardwareViewer3D } from '../components/HardwareViewer3D';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useStore } from '../context/StoreContext';
import type { CartItem } from '../types';
import {
  formatINR,
  getProductFaqs,
  getUnitPrice,
  PLAN_SURCHARGE,
  validateRequired,
} from '../utils/storeLogic';

export function ProductDetailPage({ slug }: { slug: string }) {
  const {
    products,
    addToCart,
    wishlist,
    toggleWishlist,
    navigate,
    addProductReview,
  } = useStore();

  const product = products.find((p) => p.slug === slug) ?? products[0];
  const [viewMode, setViewMode] = useState<'photos' | '3d'>('photos');
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedPlan, setSelectedPlan] =
    useState<CartItem['plan']>('1-Year Cloud SIM');
  const [quantity, setQuantity] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // New review form
  const [revAuthor, setRevAuthor] = useState('');
  const [revRole, setRevRole] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');
  const [revError, setRevError] = useState<string | null>(null);

  const unitPrice = getUnitPrice(product, selectedPlan);
  const wishlisted = wishlist.includes(product.id);
  const productFaqs = getProductFaqs(product);

  useEffect(() => {
    setSelectedImage(0);
    setOpenFaq(0);
  }, [product.id]);

  const handleBuyNow = () => {
    addToCart(product.id, quantity, selectedPlan);
    navigate({ page: 'checkout' });
  };

  const handleReviewSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err =
      validateRequired(revAuthor, 'Your name') ||
      validateRequired(revComment, 'Review comment');
    if (err) {
      setRevError(err);
      return;
    }
    setRevError(null);
    addProductReview(product.id, {
      author: revAuthor.trim(),
      role: revRole.trim() || 'Verified Customer',
      rating: revRating,
      comment: revComment.trim(),
    });
    setRevAuthor('');
    setRevRole('');
    setRevComment('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-14">
      <button
        type="button"
        onClick={() => navigate({ page: 'shop' })}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-[#A9B4D0] hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back to Products</span>
      </button>

      {/* Main Purchase Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Image Gallery or 3D CAD Inspector */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-[#111B3A] border border-slate-200 dark:border-white/10 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('photos')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  viewMode === 'photos'
                    ? 'bg-[#00D4FF] text-[#0A1128]'
                    : 'text-slate-600 dark:text-[#A9B4D0]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Photos</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  viewMode === '3d'
                    ? 'bg-[#00D4FF] text-[#0A1128]'
                    : 'text-slate-600 dark:text-[#A9B4D0]'
                }`}
              >
                <Box className="w-3.5 h-3.5" aria-hidden="true" />
                <span>3D CAD Inspect</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate({ page: '3d-lab', productId: product.id })}
              className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer"
            >
              Open Full 3D Lab →
            </button>
          </div>

          {viewMode === '3d' ? (
            <HardwareViewer3D
              productId={product.id}
              productName={product.name}
              heightClass="h-[340px] sm:h-[400px]"
            />
          ) : (
            <>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900">
                <ImageWithFallback
                  src={product.images[selectedImage] ?? product.images[0]}
                  alt={product.name}
                  loading="eager"
                  className="w-full h-full object-cover"
                />
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-3">
                  {product.images.map((img, idx) => (
                    <button
                      key={`${product.id}-img-${idx}`}
                      type="button"
                      onClick={() => setSelectedImage(idx)}
                      aria-label={`View image ${idx + 1} of ${product.name}`}
                      className={`w-24 aspect-[4/3] rounded-xl overflow-hidden border-2 transition-colors cursor-pointer ${
                        selectedImage === idx
                          ? 'border-[#00D4FF]'
                          : 'border-slate-200 dark:border-white/10 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <ImageWithFallback
                        src={img}
                        alt={`${product.name} view ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Purchase Module */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-[#A9B4D0]">
              <span>{product.category}</span>
              <span className="font-semibold text-emerald-700 dark:text-[#7CFF6B]">
                {product.inStock ? 'In Stock · Same-Day Dispatch' : 'Backorder'}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-[#FFB020] font-semibold">
                <Star className="w-4 h-4 fill-current" aria-hidden="true" />
                <span className="font-mono tabular-nums">{product.rating}</span>
              </span>
              <span className="text-slate-500 dark:text-[#A9B4D0]">
                · {product.reviewCount} verified reviews
              </span>
            </div>
          </div>

          <p className="text-sm sm:text-base text-slate-600 dark:text-[#A9B4D0] leading-relaxed">
            {product.description}
          </p>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
              {formatINR(unitPrice)}
            </span>
            {product.compareAtPrice && (
              <span className="font-mono text-base text-slate-400 line-through tabular-nums">
                {formatINR(product.compareAtPrice + (PLAN_SURCHARGE[selectedPlan] ?? 0))}
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-[#A9B4D0]">
              (Excl. 18% GST · Placeholder)
            </span>
          </div>

          {/* Telemetry Plan Selector */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-[#A9B4D0]">
              Select Connectivity &amp; Cloud Plan
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(
                ['Hardware Only', '1-Year Cloud SIM', '3-Year Enterprise Plan'] as const
              ).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`p-3 rounded-xl text-left border text-xs transition-colors cursor-pointer ${
                    selectedPlan === plan
                      ? 'border-[#00D4FF] bg-cyan-50 dark:bg-[#00D4FF]/10 text-slate-900 dark:text-white font-semibold'
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#A9B4D0] hover:border-slate-300'
                  }`}
                >
                  <div>{plan}</div>
                  <div className="font-mono text-[11px] mt-0.5 text-cyan-700 dark:text-[#00D4FF]">
                    {PLAN_SURCHARGE[plan] === 0
                      ? 'Included'
                      : `+${formatINR(PLAN_SURCHARGE[plan])}`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="inline-flex items-center rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128]">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-white cursor-pointer"
              >
                -
              </button>
              <span className="px-3 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
                className="px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-white cursor-pointer"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={() => addToCart(product.id, quantity, selectedPlan)}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer whitespace-nowrap"
            >
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
              <span>Add to Cart</span>
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              className="flex-1 inline-flex items-center justify-center py-3 px-5 rounded-xl text-sm font-semibold border border-cyan-600 dark:border-[#00D4FF] text-cyan-700 dark:text-[#00D4FF] hover:bg-cyan-50 dark:hover:bg-[#00D4FF]/10 transition-colors cursor-pointer whitespace-nowrap"
            >
              Buy Now
            </button>

            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              className="p-3 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-white hover:border-[#FF4D4F] cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${
                  wishlisted ? 'fill-[#FF4D4F] text-[#FF4D4F]' : ''
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#A9B4D0] pt-2 border-t border-slate-200 dark:border-white/10">
            <ShieldCheck
              className="w-4 h-4 text-emerald-600 dark:text-[#7CFF6B] shrink-0"
              aria-hidden="true"
            />
            <span>
              Backed by Pan-India doorstep technician installation &amp; online IMEI
              warranty activation.
            </span>
          </div>
        </div>
      </div>

      {/* Features + Specs Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">
            Key Capabilities
          </h2>
          <ul className="space-y-3">
            {product.features.map((feat) => (
              <li
                key={feat}
                className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-[#A9B4D0]"
              >
                <Check
                  className="w-4 h-4 text-emerald-600 dark:text-[#7CFF6B] shrink-0"
                  aria-hidden="true"
                />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">
            Technical Specifications
          </h2>
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {product.specs.map((spec) => (
              <div
                key={spec.label}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm"
              >
                <span className="text-slate-500 dark:text-[#A9B4D0]">
                  {spec.label}
                </span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Customer Reviews
          </h2>
          <div className="space-y-4">
            {product.reviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {rev.author}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                      {rev.role} · {rev.date}
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-amber-600 dark:text-[#FFB020]">
                    <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                    <span>{rev.rating}.0</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
                  {rev.comment}
                </p>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleReviewSubmit}
          className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-3"
          noValidate
        >
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Write a Product Review
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={revAuthor}
              onChange={(e) => setRevAuthor(e.target.value)}
              placeholder="Your Name *"
              aria-label="Reviewer Name"
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={revRole}
                onChange={(e) => setRevRole(e.target.value)}
                placeholder="Role / City (optional)"
                aria-label="Reviewer Role or City"
                className="rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
              <select
                value={revRating}
                onChange={(e) => setRevRating(Number(e.target.value))}
                aria-label="Star Rating"
                className="rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                <option value={5}>5 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={2}>2 Stars</option>
                <option value={1}>1 Star</option>
              </select>
            </div>
          </div>
          <textarea
            rows={3}
            value={revComment}
            onChange={(e) => setRevComment(e.target.value)}
            placeholder="Share your hardware or fleet deployment feedback *"
            aria-label="Review comment"
            className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
          {revError && (
            <p className="text-xs text-rose-600 dark:text-[#FF4D4F]">{revError}</p>
          )}
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
          >
            Post Review
          </button>
        </form>
      </div>

      {/* Bottom Frequently Asked Questions Accordion */}
      <section
        aria-labelledby="product-faq-heading"
        className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-[#00D4FF]">
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Installation, Battery &amp; Warranty Guide</span>
            </div>
            <h2
              id="product-faq-heading"
              className="font-display text-2xl font-bold text-slate-900 dark:text-white"
            >
              Frequently Asked Questions
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => navigate({ page: 'book-installation' })}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-[#A9B4D0] hover:border-[#00D4FF] hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors cursor-pointer"
            >
              Book Installation
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'warranty' })}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-[#A9B4D0] hover:border-[#00D4FF] hover:text-cyan-700 dark:hover:text-[#00D4FF] transition-colors cursor-pointer"
            >
              Warranty Registration
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-white/10 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#0A1128]/70 overflow-hidden">
          {productFaqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            const panelId = `product-faq-panel-${product.id}-${idx}`;
            const triggerId = `product-faq-trigger-${product.id}-${idx}`;
            return (
              <div key={faq.question} className="transition-colors">
                <h3>
                  <button
                    id={triggerId}
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-100/80 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0">
                      <span className="shrink-0 text-[11px] font-mono font-semibold uppercase tracking-wider text-cyan-700 dark:text-[#00D4FF]">
                        {faq.topic}
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                        {faq.question}
                      </span>
                    </div>
                    <ChevronDown
                      aria-hidden="true"
                      className={`w-4 h-4 shrink-0 text-slate-500 dark:text-[#A9B4D0] transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-cyan-700 dark:text-[#00D4FF]' : ''
                      }`}
                    />
                  </button>
                </h3>
                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    className="px-5 sm:px-6 pb-5 pt-0.5 text-sm text-slate-600 dark:text-[#A9B4D0] leading-relaxed"
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
