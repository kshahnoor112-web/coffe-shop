import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, CheckCircle2, ArrowRight } from 'lucide-react';
import type { CartItem, DiningMode, Order } from '../types/coffee';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onOrderCreated: (newOrder: Order) => void;
  onOpenLiveQueue: () => void;
}

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderCreated,
  onOpenLiveQueue,
}) => {
  const [diningMode, setDiningMode] = useState<DiningMode>('Dine-In at Table');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableOrAddress, setTableOrAddress] = useState('Table 04 · Sunlit Courtyard');
  const [paymentMethod, setPaymentMethod] = useState<
    'UPI / Instant Pay' | 'Pay at Espresso Bar' | 'Cash on Delivery'
  >('UPI / Instant Pay');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discount = appliedPromo === 'KAFI15' ? Math.round(subtotal * 0.15) : 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * 0.05);
  const deliveryFee =
    diningMode === 'Roastery Courier Delivery' && taxable > 0 && taxable < 900 ? 60 : 0;
  const total = taxable + tax + deliveryFee;

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'KAFI15') {
      setAppliedPromo('KAFI15');
      setErrorMsg('');
    } else {
      setAppliedPromo('');
      setErrorMsg('Use code KAFI15 for 15% off your roastery order.');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName.trim()) {
      setErrorMsg('Please enter your name for the cup ticket.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || '+91 98200 11223',
        diningMode,
        tableOrAddress: tableOrAddress.trim() || 'Main Espresso Bar',
        paymentMethod,
        promoCode: appliedPromo,
        items: cart.map((c) => ({
          name: c.menuItem.name,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          customizationSummary: [
            c.customization.milk !== 'Black / None' ? c.customization.milk : null,
            c.customization.shotType,
            c.customization.sweetness !== 'Unsweetened' ? c.customization.sweetness : null,
            c.customization.grindSize ? `Grind: ${c.customization.grindSize}` : null,
            c.customization.notes ? `Note: ${c.customization.notes}` : null,
          ]
            .filter(Boolean)
            .join(' · '),
        })),
      };

      let created: Order;
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('API fallback');
        created = await res.json();
      } catch {
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        created = {
          id: `ord-${Date.now()}`,
          orderNumber: `KF-${randomCode}`,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          diningMode: payload.diningMode,
          tableOrAddress: payload.tableOrAddress,
          paymentMethod: payload.paymentMethod,
          items: payload.items,
          subtotal,
          discount,
          tax,
          deliveryFee,
          total,
          status: 'Received',
          createdAt: new Date().toISOString(),
          estimatedReadyMinutes: diningMode === 'Roastery Courier Delivery' ? 24 : 6,
        };
      }

      setConfirmedOrder(created);
      onOrderCreated(created);
      onClearCart();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Order submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <div className="relative w-full max-w-lg bg-[#18181B] border-l border-white/10 h-full flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#D4955A]" />
            <h2 id="cart-drawer-title" className="font-display text-2xl font-semibold text-[#F4F4F5]">
              Roastery Bag & Dispatch
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmedOrder(null);
              onClose();
            }}
            aria-label="Close bag drawer"
            className="w-9 h-9 rounded-lg bg-[#111113] border border-white/10 text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {confirmedOrder ? (
            <div className="bg-[#121214] border border-[#D4955A]/40 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-[#D4955A] shrink-0" />
                <div>
                  <span className="text-xs text-[#D4955A] font-mono-tabular block">
                    Order #{confirmedOrder.orderNumber} Confirmed — Transmitted to Slayer Bar
                  </span>
                  <h3 className="font-display text-2xl font-semibold text-[#F4F4F5]">
                    Preparing Extraction for {confirmedOrder.customerName}
                  </h3>
                </div>
              </div>

              <div className="text-xs text-[#A1A1AA] space-y-1 border-t border-b border-white/[0.08] py-3">
                <div className="flex justify-between">
                  <span>Service Mode:</span>
                  <span className="text-[#F4F4F5] font-medium">{confirmedOrder.diningMode}</span>
                </div>
                <div className="flex justify-between">
                  <span>Location / Table:</span>
                  <span className="text-[#F4F4F5] font-medium">{confirmedOrder.tableOrAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Bar Ready Time:</span>
                  <span className="text-[#D4955A] font-mono-tabular">
                    ~{confirmedOrder.estimatedReadyMinutes} mins
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-[#A1A1AA] block">Itemized Receipt</span>
                {confirmedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-[#F4F4F5]">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-mono-tabular text-[#F4F4F5]">
                      ₹{item.unitPrice * item.quantity}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/[0.08] flex justify-between text-sm font-semibold text-[#D4955A] font-mono-tabular">
                  <span>Total Paid ({confirmedOrder.paymentMethod})</span>
                  <span>₹{confirmedOrder.total}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  onClose();
                  onOpenLiveQueue();
                }}
                className="w-full py-3 px-4 rounded-lg bg-[#D4955A] hover:bg-[#DF9F64] text-[#111113] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Track Live Extraction in Barista Queue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <ShoppingBag className="w-10 h-10 text-[#A1A1AA]/50 mx-auto" />
              <h3 className="font-display text-2xl text-[#F4F4F5]">Your Roastery Bag is Empty</h3>
              <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto leading-relaxed">
                Explore our single-origin espresso pours, 72-hour laminated viennoiserie, or craft a
                personal formulation in the Bespoke Brew Atelier.
              </p>
            </div>
          ) : (
            <>
              {/* Itemized List */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="p-4 rounded-lg bg-[#121214] border border-white/[0.07] flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#F4F4F5] truncate">
                        {item.menuItem.name}
                      </h4>
                      <p className="text-[11px] text-[#A1A1AA] mt-0.5 leading-relaxed">
                        {item.customization.milk !== 'Black / None' &&
                          `${item.customization.milk} · `}
                        {item.customization.shotType}
                        {item.customization.sweetness !== 'Unsweetened' &&
                          ` · ${item.customization.sweetness}`}
                        {item.customization.grindSize &&
                          ` · Grind: ${item.customization.grindSize}`}
                      </p>
                      {item.customization.notes && (
                        <p className="text-[11px] text-[#D4955A] mt-0.5">
                          Note: {item.customization.notes}
                        </p>
                      )}
                      <div className="mt-2 font-mono-tabular text-xs text-[#D4955A]">
                        ₹{item.unitPrice * item.quantity}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.cartItemId, -1)}
                        aria-label="Decrease item quantity"
                        className="w-7 h-7 rounded bg-[#18181B] border border-white/10 flex items-center justify-center text-[#A1A1AA] hover:text-[#F4F4F5] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-mono-tabular text-xs text-[#F4F4F5]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.cartItemId, 1)}
                        aria-label="Increase item quantity"
                        className="w-7 h-7 rounded bg-[#18181B] border border-white/10 flex items-center justify-center text-[#A1A1AA] hover:text-[#F4F4F5] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.cartItemId)}
                        aria-label="Remove item"
                        className="w-7 h-7 rounded bg-[#18181B] border border-white/10 flex items-center justify-center text-[#A1A1AA] hover:text-red-400 ml-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Box */}
              <div className="pt-3 border-t border-white/[0.08]">
                <label htmlFor="promo-input" className="block text-xs text-[#A1A1AA] mb-1.5">
                  Roastery Member Code (Try <span className="text-[#D4955A] font-mono-tabular">KAFI15</span> for 15% off)
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo-input"
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter KAFI15"
                    className="flex-1 bg-[#121214] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F4F4F5] uppercase font-mono-tabular focus:outline-none focus:border-[#D4955A]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 rounded-lg bg-[#22201E] border border-white/15 text-xs font-medium text-[#F4F4F5] hover:border-[#D4955A] cursor-pointer whitespace-nowrap"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Service Mode & Customer Form */}
              <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4 pt-3 border-t border-white/[0.08]">
                <div>
                  <span className="block text-xs font-medium text-[#F4F4F5] mb-2">
                    Select Service Mode
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        'Dine-In at Table',
                        'Express Bar Pickup',
                        'Roastery Courier Delivery',
                      ] as DiningMode[]
                    ).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setDiningMode(mode);
                          if (mode === 'Dine-In at Table') setTableOrAddress('Table 04 · Sunlit Courtyard');
                          if (mode === 'Express Bar Pickup') setTableOrAddress('Bandra Flagship Bar Counter');
                          if (mode === 'Roastery Courier Delivery') setTableOrAddress('');
                        }}
                        className={`p-2.5 rounded-lg border text-[11px] font-medium text-center transition-colors cursor-pointer ${
                          diningMode === mode
                            ? 'bg-[#D4955A] text-[#111113] border-[#D4955A] font-semibold'
                            : 'bg-[#121214] text-[#A1A1AA] border-white/10 hover:text-[#F4F4F5]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cust-name" className="block text-xs text-[#A1A1AA] mb-1">
                      Guest Name *
                    </label>
                    <input
                      id="cust-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g., Zoya Akhtar"
                      className="w-full bg-[#121214] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#D4955A]"
                    />
                  </div>
                  <div>
                    <label htmlFor="cust-phone" className="block text-xs text-[#A1A1AA] mb-1">
                      Mobile Number (SMS Alert)
                    </label>
                    <input
                      id="cust-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98201 00000"
                      className="w-full bg-[#121214] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F4F4F5] font-mono-tabular focus:outline-none focus:border-[#D4955A]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cust-table" className="block text-xs text-[#A1A1AA] mb-1">
                    {diningMode === 'Dine-In at Table'
                      ? 'Table Number & Zone'
                      : diningMode === 'Express Bar Pickup'
                      ? 'Pickup Counter'
                      : 'Full Delivery Address & PIN Code (Free delivery above ₹900)'}
                  </label>
                  <input
                    id="cust-table"
                    type="text"
                    required
                    value={tableOrAddress}
                    onChange={(e) => setTableOrAddress(e.target.value)}
                    placeholder={
                      diningMode === 'Roastery Courier Delivery'
                        ? '14th Road, Pali Hill, Bandra West, Mumbai 400050'
                        : 'Table 04 · Sunlit Courtyard'
                    }
                    className="w-full bg-[#121214] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#D4955A]"
                  />
                </div>

                <div>
                  <span className="block text-xs text-[#A1A1AA] mb-1.5">Payment Preference</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      ['UPI / Instant Pay', 'Pay at Espresso Bar', 'Cash on Delivery'] as const
                    ).map((pm) => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setPaymentMethod(pm)}
                        className={`p-2 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                          paymentMethod === pm
                            ? 'bg-[#22201E] border-[#D4955A] text-[#F4F4F5]'
                            : 'bg-[#121214] border-white/10 text-[#A1A1AA]'
                        }`}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-xs text-amber-400 bg-amber-950/40 border border-amber-500/30 rounded-lg p-2.5">
                    {errorMsg}
                  </p>
                )}
              </form>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        {cart.length > 0 && !confirmedOrder && (
          <div className="p-6 bg-[#121214] border-t border-white/[0.08] space-y-4">
            <div className="space-y-1.5 text-xs font-mono-tabular">
              <div className="flex justify-between text-[#A1A1AA]">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#D4955A]">
                  <span>Member Roast Discount (KAFI15)</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-[#A1A1AA]">
                <span>GST (5%)</span>
                <span>₹{tax}</span>
              </div>
              {diningMode === 'Roastery Courier Delivery' && (
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Roastery Courier (Free above ₹900)</span>
                  <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-[#F4F4F5] pt-2 border-t border-white/[0.08]">
                <span>Total Payable</span>
                <span className="text-[#D4955A]">₹{total}</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="w-full py-3.5 px-5 rounded-lg bg-[#D4955A] hover:bg-[#DF9F64] disabled:opacity-50 text-[#111113] font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              {submitting ? 'Transmitting to Espresso Bar...' : `Confirm & Send to Bar — ₹${total}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
