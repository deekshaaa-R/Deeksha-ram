import { useState } from 'react';
import { ArrowRight, Box, Check, ShoppingCart } from 'lucide-react';
import { HardwareViewer3D } from '../components/HardwareViewer3D';
import { useStore } from '../context/StoreContext';
import { formatINR } from '../utils/storeLogic';

export function HardwareLabPage({ initialProductId }: { initialProductId?: string }) {
  const { products, addToCart, navigate } = useStore();
  const [selectedId, setSelectedId] = useState(
    initialProductId && products.some((p) => p.id === initialProductId)
      ? initialProductId
      : 'vs-ai-4g-dashcam'
  );

  const selected = products.find((p) => p.id === selectedId) ?? products[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] mb-1">
            <Box className="w-4 h-4" aria-hidden="true" />
            <span>Interactive 3D CAD Showroom</span>
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            VS Hardware 3D Lab
          </h1>
          <p className="text-sm text-slate-600 dark:text-[#A9B4D0] mt-1">
            Orbit, zoom, explode internal sub-assemblies, and inspect housing finishes across all VS Technology devices.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate({ page: 'shop' })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer"
        >
          <span>Browse Full Storefront</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Model Switcher */}
      <div className="flex flex-wrap gap-2">
        {products.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedId(p.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              p.id === selected.id
                ? 'bg-[#00D4FF] text-[#0A1128]'
                : 'bg-white dark:bg-[#111B3A] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#A9B4D0] hover:border-cyan-500'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* 3D Canvas + Spec Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7">
          <HardwareViewer3D
            productId={selected.id}
            productName={selected.name}
            heightClass="h-[420px] sm:h-[500px]"
          />
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-5">
          <div>
            <span className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
              {selected.category}
            </span>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {selected.name}
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#A9B4D0] mt-2 leading-relaxed">
              {selected.shortDescription}
            </p>
          </div>

          <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {formatINR(selected.price)}
            <span className="text-xs font-sans font-normal text-slate-500 dark:text-[#A9B4D0] ml-2">
              Base Hardware (Excl. GST)
            </span>
          </div>

          <div className="space-y-2 border-t border-slate-200 dark:border-white/10 pt-4">
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              Engineering Highlights
            </div>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-[#A9B4D0]">
              {selected.features.map((feat) => (
                <li key={feat} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#7CFF6B] shrink-0" aria-hidden="true" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5 border-t border-slate-200 dark:border-white/10 pt-4 text-xs">
            {selected.specs.slice(0, 4).map((s) => (
              <div key={s.label} className="flex justify-between gap-2">
                <span className="text-slate-500 dark:text-[#A9B4D0]">{s.label}</span>
                <span className="font-mono text-right text-slate-900 dark:text-white">{s.value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => addToCart(selected.id, 1, '1-Year Cloud SIM')}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
              <span>Add to Cart</span>
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'product', slug: selected.slug })}
              className="py-3 px-4 rounded-xl text-sm font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-[#00D4FF] cursor-pointer"
            >
              Full Specs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
