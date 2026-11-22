import { ArrowRight, CheckCircle2, ShoppingCart } from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useStore } from '../context/StoreContext';
import { SOLUTIONS } from '../data/catalog';
import type { SolutionSlug } from '../types';
import { formatINR } from '../utils/storeLogic';

export function SolutionsPage({ slug }: { slug: SolutionSlug }) {
  const { products, addToCart, navigate } = useStore();
  const solution = SOLUTIONS.find((s) => s.slug === slug) ?? SOLUTIONS[0];
  const recommended = products.filter((p) =>
    solution.recommendedProductIds.includes(p.id)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      {/* Solution Switcher Tabs */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-200 dark:border-white/10">
        {SOLUTIONS.map((item) => {
          const active = item.slug === solution.slug;
          return (
            <button
              key={item.slug}
              type="button"
              onClick={() => navigate({ page: 'solutions', slug: item.slug })}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#00D4FF] text-[#0A1128]'
                  : 'bg-slate-100 dark:bg-[#111B3A] text-slate-700 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.title.split(' ')[0]} {item.title.split(' ')[1]}
            </button>
          );
        })}
      </div>

      {/* Hero Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-8 space-y-4">
          <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
            Industry Solution
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            {solution.title}
          </h1>
          <p className="text-base font-medium text-slate-700 dark:text-white">
            {solution.subtitle}
          </p>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#A9B4D0] leading-relaxed">
            {solution.summary}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() =>
                navigate({ page: 'book-demo', prefillInterest: solution.title })
              }
              className="px-5 py-3 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
            >
              Request Solution Demo
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'book-installation' })}
              className="px-5 py-3 rounded-xl text-sm font-semibold border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white hover:border-cyan-500 cursor-pointer"
            >
              Book Installation
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-2xl bg-slate-100 dark:bg-[#0A1128] border border-slate-200 dark:border-white/10 p-6 text-center space-y-2">
          <div className="font-mono text-4xl font-bold text-cyan-700 dark:text-[#00D4FF] tabular-nums">
            {solution.heroMetric}
          </div>
          <div className="text-xs font-medium text-slate-600 dark:text-[#A9B4D0]">
            {solution.heroMetricLabel}
          </div>
        </div>
      </div>

      {/* Capabilities Grid */}
      <div className="space-y-6">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Core Capabilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {solution.capabilities.map((cap) => (
            <div
              key={cap.title}
              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-2"
            >
              <div className="flex items-center gap-2 text-emerald-700 dark:text-[#7CFF6B]">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  {cap.title}
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
                {cap.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Industries */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#080E22] p-6">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-3">
          Ideal Industries
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700 dark:text-[#A9B4D0]">
          {solution.industries.map((ind, idx) => (
            <span key={ind}>
              {idx > 0 && <span className="mr-6 text-slate-400">·</span>}
              {ind}
            </span>
          ))}
        </div>
      </div>

      {/* Recommended Hardware */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Recommended Hardware
          </h2>
          <button
            type="button"
            onClick={() => navigate({ page: 'shop' })}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-[#00D4FF] cursor-pointer"
          >
            <span>All Hardware</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommended.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[4/3] bg-slate-900">
                  <ImageWithFallback
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    <button
                      type="button"
                      onClick={() =>
                        navigate({ page: 'product', slug: product.slug })
                      }
                      className="text-left hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                    >
                      {product.name}
                    </button>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-[#A9B4D0]">
                    {product.shortDescription}
                  </p>
                </div>
              </div>
              <div className="px-5 pb-5 flex items-center justify-between gap-2">
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatINR(product.price)}
                </span>
                <button
                  type="button"
                  onClick={() => addToCart(product.id, 1, '1-Year Cloud SIM')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
