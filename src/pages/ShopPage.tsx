import { useEffect, useMemo, useState } from 'react';
import { Heart, Search, ShoppingCart, SlidersHorizontal, Star } from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useStore } from '../context/StoreContext';
import { FEATURE_FILTERS, PRODUCT_CATEGORIES } from '../data/catalog';
import type { ProductCategory, SortOption } from '../types';
import { filterAndSortProducts, formatINR } from '../utils/storeLogic';

export function ShopPage({
  initialCategory,
  initialSearch,
}: {
  initialCategory?: ProductCategory;
  initialSearch?: string;
}) {
  const { products, addToCart, wishlist, toggleWishlist, navigate } = useStore();
  const [category, setCategory] = useState<ProductCategory | 'All'>(
    initialCategory ?? 'All'
  );
  const [search, setSearch] = useState(initialSearch ?? '');
  const [maxPrice, setMaxPrice] = useState<number>(25000);
  const [feature, setFeature] = useState<string>('');
  const [sort, setSort] = useState<SortOption>('featured');

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);

  const filteredProducts = useMemo(
    () =>
      filterAndSortProducts(products, {
        category,
        maxPrice,
        feature,
        search,
        sort,
      }),
    [products, category, maxPrice, feature, search, sort]
  );

  const resetFilters = () => {
    setCategory('All');
    setSearch('');
    setMaxPrice(25000);
    setFeature('');
    setSort('featured');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-slate-200 dark:border-white/10">
        <div>
          <p className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] mb-1">
            Hardware Storefront
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            GPS Trackers &amp; AI Dashcams
          </h1>
          <p className="text-sm text-slate-600 dark:text-[#A9B4D0] mt-1">
            All prices are placeholder INR benchmarks with optional Cloud SIM telemetry plans.
          </p>
        </div>
        <div className="text-sm font-mono text-slate-600 dark:text-[#A9B4D0] tabular-nums">
          Showing {filteredProducts.length} of {products.length} devices
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        <aside className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-5 space-y-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                Filters
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer"
              >
                Reset
              </button>
            </div>

            {/* Category Filter */}
            <div>
              <h2 className="text-xs font-semibold text-slate-500 dark:text-[#A9B4D0] mb-2">
                Category
              </h2>
              <div className="space-y-1.5">
                {(['All', ...PRODUCT_CATEGORIES] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      category === cat
                        ? 'bg-[#00D4FF] text-[#0A1128] font-semibold'
                        : 'text-slate-700 dark:text-[#A9B4D0] hover:bg-slate-100 dark:hover:bg-[#0A1128]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <label
                  htmlFor="shop-price-range"
                  className="font-semibold text-slate-500 dark:text-[#A9B4D0]"
                >
                  Max Price
                </label>
                <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                  {formatINR(maxPrice)}
                </span>
              </div>
              <input
                id="shop-price-range"
                type="range"
                min={2000}
                max={25000}
                step={500}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#00D4FF]"
              />
            </div>

            {/* Feature Filter */}
            <div>
              <label
                htmlFor="shop-feature-select"
                className="block text-xs font-semibold text-slate-500 dark:text-[#A9B4D0] mb-2"
              >
                Key Feature
              </label>
              <select
                id="shop-feature-select"
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-xs text-slate-900 dark:text-white"
              >
                <option value="">All Features</option>
                {FEATURE_FILTERS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="lg:col-span-9 space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <label htmlFor="shop-search-input" className="sr-only">
                Search products
              </label>
              <input
                id="shop-search-input"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trackers, dashcams, ADAS, tractor GPS..."
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="shop-sort-select" className="sr-only">
                Sort products
              </label>
              <select
                id="shop-sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="w-full sm:w-48 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111B3A] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="featured">Sort: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-12 text-center space-y-3">
              <p className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                No matching devices found
              </p>
              <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
                Try clearing your search term or expanding the price range.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const wishlisted = wishlist.includes(product.id);
                return (
                  <article
                    key={product.id}
                    className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] overflow-hidden flex flex-col justify-between hover:-translate-y-0.5 hover:border-cyan-500/60 dark:hover:border-[#00D4FF]/50 transition-all"
                  >
                    <div>
                      <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            navigate({ page: 'product', slug: product.slug })
                          }
                          className="w-full h-full block cursor-pointer"
                          aria-label={`View details for ${product.name}`}
                        >
                          <ImageWithFallback
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleWishlist(product.id)}
                          aria-label={
                            wishlisted
                              ? `Remove ${product.name} from wishlist`
                              : `Add ${product.name} to wishlist`
                          }
                          className="absolute top-3 right-3 p-2 rounded-xl bg-[#0A1128]/75 text-white hover:bg-[#0A1128] cursor-pointer"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              wishlisted ? 'fill-[#FF4D4F] text-[#FF4D4F]' : ''
                            }`}
                          />
                        </button>
                      </div>

                      <div className="p-5 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-[#A9B4D0]">
                          <span>{product.category}</span>
                          {product.badge && (
                            <span className="font-semibold text-cyan-700 dark:text-[#00D4FF]">
                              {product.badge}
                            </span>
                          )}
                        </div>
                        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white leading-snug">
                          <button
                            type="button"
                            onClick={() =>
                              navigate({ page: 'product', slug: product.slug })
                            }
                            className="text-left hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
                          >
                            {product.name}
                          </button>
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-[#A9B4D0] line-clamp-2">
                          {product.shortDescription}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-[#FFB020] pt-1">
                          <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                          <span className="font-mono font-semibold tabular-nums">
                            {product.rating}
                          </span>
                          <span className="text-slate-500 dark:text-[#A9B4D0]">
                            ({product.reviewCount})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-white/5">
                      <div>
                        <div className="font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                          {formatINR(product.price)}
                        </div>
                        {product.compareAtPrice && (
                          <div className="font-mono text-xs text-slate-400 line-through tabular-nums">
                            {formatINR(product.compareAtPrice)}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(product.id, 1, '1-Year Cloud SIM')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
