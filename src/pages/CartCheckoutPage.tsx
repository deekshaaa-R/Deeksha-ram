import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useStore } from '../context/StoreContext';
import type { Order } from '../types';
import {
  formatINR,
  getUnitPrice,
  validateCheckoutFields,
  type FieldErrors,
} from '../utils/storeLogic';

export function CartPage() {
  const {
    cart,
    products,
    cartTotals,
    promoCode,
    setPromoCode,
    updateCartQuantity,
    removeFromCart,
    navigate,
  } = useStore();
  const [promoInput, setPromoInput] = useState(promoCode);

  const handleApplyPromo = (e: FormEvent) => {
    e.preventDefault();
    setPromoCode(promoInput.trim().toUpperCase());
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#111B3A] border border-slate-200 dark:border-white/10 mx-auto flex items-center justify-center text-cyan-700 dark:text-[#00D4FF]">
          <ShoppingBag className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Your Cart is Empty
        </h1>
        <p className="text-sm text-slate-600 dark:text-[#A9B4D0] max-w-md mx-auto">
          Browse our wired GPS trackers, magnetic wireless units, and 4G AI dashcams to
          equip your fleet or personal vehicle.
        </p>
        <button
          type="button"
          onClick={() => navigate({ page: 'shop' })}
          className="px-6 py-3 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
        >
          Browse Hardware Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-8">
        Shopping Cart ({cartTotals.itemCount})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-4">
          {cart.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return null;
            const unitPrice = getUnitPrice(product, item.plan);

            return (
              <div
                key={`${item.productId}-${item.plan}`}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
              >
                <div className="w-24 aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 shrink-0">
                  <ImageWithFallback
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    {product.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#A9B4D0] mt-0.5">
                    Plan: {item.plan}
                  </p>
                  <p className="font-mono text-sm font-semibold text-cyan-700 dark:text-[#00D4FF] mt-1 tabular-nums">
                    {formatINR(unitPrice)} each
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="inline-flex items-center rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128]">
                    <button
                      type="button"
                      onClick={() =>
                        updateCartQuantity(item.productId, item.plan, item.quantity - 1)
                      }
                      aria-label={`Decrease quantity of ${product.name}`}
                      className="px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-white cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-2.5 font-mono text-sm tabular-nums text-slate-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateCartQuantity(item.productId, item.plan, item.quantity + 1)
                      }
                      aria-label={`Increase quantity of ${product.name}`}
                      className="px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-white cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums w-24 text-right">
                    {formatINR(unitPrice * item.quantity)}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId, item.plan)}
                    aria-label={`Remove ${product.name} from cart`}
                    className="p-2 rounded-lg text-slate-400 hover:text-[#FF4D4F] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Order Summary
          </h2>

          <form onSubmit={handleApplyPromo} className="flex gap-2">
            <label htmlFor="cart-promo-input" className="sr-only">
              Promo Code
            </label>
            <input
              id="cart-promo-input"
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Promo (try FLEET10)"
              className="flex-1 min-w-0 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white hover:border-[#00D4FF] cursor-pointer"
            >
              Apply
            </button>
          </form>

          {cartTotals.promoError && (
            <p className="text-xs text-rose-600 dark:text-[#FF4D4F]">
              {cartTotals.promoError}
            </p>
          )}
          {cartTotals.appliedPromo && (
            <p className="text-xs text-emerald-700 dark:text-[#7CFF6B]">
              Applied {cartTotals.appliedPromo.code}: {cartTotals.appliedPromo.description}
            </p>
          )}

          <div className="space-y-2.5 text-sm border-t border-slate-200 dark:border-white/10 pt-4">
            <div className="flex justify-between text-slate-600 dark:text-[#A9B4D0]">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">
                {formatINR(cartTotals.subtotal)}
              </span>
            </div>
            {cartTotals.discount > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-[#7CFF6B]">
                <span>Promo Discount</span>
                <span className="font-mono tabular-nums">
                  -{formatINR(cartTotals.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 dark:text-[#A9B4D0]">
              <span>Estimated GST (18%)</span>
              <span className="font-mono tabular-nums">{formatINR(cartTotals.gst)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-[#A9B4D0]">
              <span>Shipping</span>
              <span className="font-mono tabular-nums">
                {cartTotals.shipping === 0 ? 'FREE' : formatINR(cartTotals.shipping)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-3 border-t border-slate-200 dark:border-white/10">
              <span>Total</span>
              <span className="font-mono tabular-nums">
                {formatINR(cartTotals.total)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate({ page: 'checkout' })}
            className="w-full py-3.5 px-5 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

export function CheckoutPage() {
  const { cart, products, cartTotals, placeOrder, navigate, showToast, user } =
    useStore();
  const [form, setForm] = useState({
    fullName: user.isAuthenticated ? user.name : '',
    email: user.isAuthenticated ? user.email : '',
    phone: user.isAuthenticated ? user.phone : '',
    address: '',
    city: '',
    postalCode: '',
    paymentMethod: 'UPI / NetBanking',
  });
  const [errors, setErrors] = useState<
    FieldErrors<'fullName' | 'email' | 'phone' | 'address' | 'city' | 'postalCode'>
  >({});
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const handlePlaceOrder = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateCheckoutFields(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const orderItems = cart
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        return {
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          unitPrice: getUnitPrice(product, item.plan),
          plan: item.plan,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const created = placeOrder({
      items: orderItems,
      subtotal: cartTotals.subtotal,
      discount: cartTotals.discount,
      gst: cartTotals.gst,
      shipping: cartTotals.shipping,
      total: cartTotals.total,
      customerName: form.fullName.trim(),
      shippingAddress: `${form.address.trim()}, PIN ${form.postalCode.trim()}`,
      city: form.city.trim(),
      paymentMethod: form.paymentMethod,
    });

    setConfirmedOrder(created);
    showToast(`Order #${created.id} confirmed!`);
  };

  if (confirmedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-emerald-500/30 bg-white dark:bg-[#111B3A] p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-3 text-emerald-700 dark:text-[#7CFF6B]">
            <CheckCircle2 className="w-7 h-7 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold">Order Confirmed</p>
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Order #{confirmedOrder.id}
              </h1>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-[#A9B4D0]">
            Thank you, <strong>{confirmedOrder.customerName}</strong>. Your shipment to{' '}
            <strong>
              {confirmedOrder.shippingAddress}, {confirmedOrder.city}
            </strong>{' '}
            is being prepared for dispatch.
          </p>

          <div className="rounded-xl bg-slate-50 dark:bg-[#0A1128] p-4 space-y-2 text-sm">
            {confirmedOrder.items.map((item, idx) => (
              <div key={`${item.productId}-${idx}`} className="flex justify-between gap-3">
                <span className="text-slate-700 dark:text-[#A9B4D0]">
                  {item.quantity} × {item.name} ({item.plan})
                </span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                  {formatINR(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-between font-bold text-slate-900 dark:text-white">
              <span>Total Paid ({confirmedOrder.paymentMethod})</span>
              <span className="font-mono tabular-nums">
                {formatINR(confirmedOrder.total)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate({ page: 'account', tab: 'orders' })}
              className="px-5 py-3 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
            >
              View Order in Account
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'book-installation' })}
              className="px-5 py-3 rounded-xl text-sm font-semibold border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white cursor-pointer"
            >
              Schedule Technician Installation
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return <CartPage />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <button
        type="button"
        onClick={() => navigate({ page: 'cart' })}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-[#A9B4D0] hover:text-cyan-700 dark:hover:text-[#00D4FF] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back to Cart</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handlePlaceOrder}
          className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-8 space-y-5"
          noValidate
        >
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Shipping &amp; Payment Details
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="chk-name"
                className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
              >
                Full Name *
              </label>
              <input
                id="chk-name"
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                  {errors.fullName}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="chk-email"
                className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
              >
                Email for Invoice *
              </label>
              <input
                id="chk-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="chk-phone"
                className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
              >
                Mobile Number *
              </label>
              <input
                id="chk-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                  {errors.phone}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="chk-postal"
                className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
              >
                6-Digit PIN Code *
              </label>
              <input
                id="chk-postal"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white"
              />
              {errors.postalCode && (
                <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                  {errors.postalCode}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="chk-address"
                className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
              >
                Delivery Address *
              </label>
              <input
                id="chk-address"
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
              {errors.address && (
                <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                  {errors.address}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="chk-city"
                className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
              >
                City *
              </label>
              <input
                id="chk-city"
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
              {errors.city && (
                <p className="mt-1 text-xs text-rose-600 dark:text-[#FF4D4F]">
                  {errors.city}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="chk-payment"
              className="block text-xs font-medium text-slate-700 dark:text-[#A9B4D0] mb-1.5"
            >
              Payment Method
            </label>
            <select
              id="chk-payment"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
            >
              <option value="UPI / NetBanking">UPI / Corporate NetBanking</option>
              <option value="Credit / Debit Card">Credit / Debit Card</option>
              <option value="Cash on Delivery">Cash on Delivery (COD)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4" aria-hidden="true" />
            <span>Place Order · {formatINR(cartTotals.total)}</span>
          </button>
        </form>

        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Items ({cartTotals.itemCount})
          </h2>
          <div className="divide-y divide-slate-200 dark:divide-white/10 text-sm">
            {cart.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              if (!product) return null;
              return (
                <div
                  key={`${item.productId}-${item.plan}`}
                  className="py-3 flex justify-between gap-3"
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {item.quantity} × {product.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                      {item.plan}
                    </div>
                  </div>
                  <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatINR(getUnitPrice(product, item.plan) * item.quantity)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-[#A9B4D0]">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">
                {formatINR(cartTotals.subtotal)}
              </span>
            </div>
            {cartTotals.discount > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-[#7CFF6B]">
                <span>Discount</span>
                <span className="font-mono tabular-nums">
                  -{formatINR(cartTotals.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 dark:text-[#A9B4D0]">
              <span>GST (18%)</span>
              <span className="font-mono tabular-nums">{formatINR(cartTotals.gst)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-[#A9B4D0]">
              <span>Shipping</span>
              <span className="font-mono tabular-nums">
                {cartTotals.shipping === 0 ? 'FREE' : formatINR(cartTotals.shipping)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-base text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-white/10">
              <span>Payable Total</span>
              <span className="font-mono tabular-nums">
                {formatINR(cartTotals.total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
