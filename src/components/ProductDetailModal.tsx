import React, { useState } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';
import type { MenuItem, CartItem, CartItemCustomization } from '../types/coffee';
import { ResilientImage } from './ResilientImage';

interface ProductDetailModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

const MILK_OPTIONS: CartItemCustomization['milk'][] = [
  'Whole Estate Milk',
  'Oatly Barista',
  'Roasted Almond',
  'Unsweetened Soy',
  'Black / None',
];

const SHOT_OPTIONS: CartItemCustomization['shotType'][] = [
  'Signature House Blend',
  'Single-Origin Ethiopia',
  'Double Ristretto (+₹60)',
  'Decaf Swiss Water',
];

const SWEETNESS_OPTIONS: CartItemCustomization['sweetness'][] = [
  'Unsweetened',
  'Raw Demerara',
  'Kashmir Saffron Honey (+₹45)',
  'Madagascar Vanilla (+₹45)',
];

const GRIND_OPTIONS: NonNullable<CartItemCustomization['grindSize']>[] = [
  'Whole Bean',
  'Espresso Fine',
  'V60 Pour-Over',
  'French Press Coarse',
];

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  item,
  onClose,
  onAddToCart,
}) => {
  if (!item) return null;

  const isBeans = item.category === 'whole_beans';
  const isBakehouse = item.category === 'bakehouse';

  const [quantity, setQuantity] = useState(1);
  const [milk, setMilk] = useState<CartItemCustomization['milk']>(
    item.category === 'cold_brew' ? 'Black / None' : 'Oatly Barista'
  );
  const [shotType, setShotType] = useState<CartItemCustomization['shotType']>(
    'Signature House Blend'
  );
  const [sweetness, setSweetness] = useState<CartItemCustomization['sweetness']>('Unsweetened');
  const [temperature, setTemperature] = useState<CartItemCustomization['temperature']>(
    item.category === 'cold_brew' ? 'Over Crystal Ice' : '65°C Velvety'
  );
  const [grindSize, setGrindSize] = useState<NonNullable<CartItemCustomization['grindSize']>>(
    'Whole Bean'
  );
  const [notes, setNotes] = useState('');
  const [addedFeedback, setAddedFeedback] = useState(false);

  const extraShotCost = shotType === 'Double Ristretto (+₹60)' ? 60 : 0;
  const extraSweetCost =
    sweetness === 'Kashmir Saffron Honey (+₹45)' || sweetness === 'Madagascar Vanilla (+₹45)'
      ? 45
      : 0;
  const computedUnitPrice = item.price + extraShotCost + extraSweetCost;

  const handleConfirmAdd = () => {
    const cartItem: CartItem = {
      cartItemId: `${item.id}-${Date.now()}`,
      menuItem: item,
      quantity,
      unitPrice: computedUnitPrice,
      customization: {
        milk: isBakehouse || isBeans ? 'Black / None' : milk,
        shotType: isBakehouse || isBeans ? 'Signature House Blend' : shotType,
        sweetness: isBakehouse || isBeans ? 'Unsweetened' : sweetness,
        temperature,
        grindSize: isBeans ? grindSize : undefined,
        notes: notes.trim() || undefined,
      },
    };
    onAddToCart(cartItem);
    setAddedFeedback(true);
    setTimeout(() => {
      setAddedFeedback(false);
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-modal-title"
    >
      <div className="relative w-full max-w-4xl bg-[#18181B] border border-white/10 rounded-xl overflow-hidden shadow-2xl my-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-lg bg-[#111113]/80 border border-white/10 text-[#F4F4F5] hover:border-[#D4955A] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Contiguous Purchase Module: Sticky Gallery Left, Purchase Module Right */}
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Imagery & Origin Traceability */}
          <div className="md:col-span-5 bg-[#121214] flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/[0.08]">
            <div className="relative aspect-4/3 md:aspect-square w-full overflow-hidden">
              <ResilientImage
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-transparent to-transparent" />
              {item.seasonalTag && (
                <span className="absolute bottom-4 left-4 text-xs text-[#D4955A] font-medium tracking-wide">
                  {item.seasonalTag}
                </span>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs text-[#A1A1AA] block mb-1">Origin & Lot Traceability</span>
                <p className="text-xs text-[#F4F4F5] font-medium">
                  {item.origin} <span aria-hidden="true">·</span> {item.elevation}{' '}
                  <span aria-hidden="true">·</span> {item.process}
                </p>
              </div>

              <div>
                <span className="text-xs text-[#A1A1AA] block mb-1">Sensory Tasting Notes</span>
                <p className="text-xs text-[#D4955A]">
                  {item.tastingNotes.join(' · ')}
                </p>
              </div>

              {item.brewRecipe && (
                <div className="pt-3 border-t border-white/[0.08]">
                  <span className="text-xs text-[#A1A1AA] block mb-2">
                    Roaster’s Extraction Parameters
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center bg-[#18181B] p-2.5 rounded-lg border border-white/[0.06] font-mono-tabular">
                    <div>
                      <span className="block text-[10px] text-[#A1A1AA]">Dose</span>
                      <span className="text-xs text-[#F4F4F5]">{item.brewRecipe.dose}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#A1A1AA]">Yield</span>
                      <span className="text-xs text-[#F4F4F5]">{item.brewRecipe.yield}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#A1A1AA]">Temp</span>
                      <span className="text-xs text-[#F4F4F5]">{item.brewRecipe.temp}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#A1A1AA]">Time</span>
                      <span className="text-xs text-[#F4F4F5]">{item.brewRecipe.time}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Contiguous Purchase & Customization Module */}
          <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#A1A1AA] mb-1">
                  <span>{item.roastLevel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{item.volumeOrWeight}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{item.caffeineMg}mg Caffeine</span>
                </div>
                <h2
                  id="pdp-modal-title"
                  className="font-display text-2xl md:text-3xl font-semibold text-[#F4F4F5] leading-tight"
                >
                  {item.name}
                </h2>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-mono-tabular text-2xl font-semibold text-[#D4955A]">
                    ₹{computedUnitPrice}
                  </span>
                  <span className="text-xs text-[#A1A1AA]">
                    {item.inStock ? 'Available for Immediate Extraction' : 'Currently Sold Out'}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[#A1A1AA] leading-relaxed">{item.description}</p>
              </div>

              {/* Beverage Customizations */}
              {!isBeans && !isBakehouse && (
                <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                  <div>
                    <label className="block text-xs font-medium text-[#F4F4F5] mb-2">
                      Milk & Texture Choice
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {MILK_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setMilk(opt)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                            milk === opt
                              ? 'bg-[#D4955A] text-[#111113] border-[#D4955A] font-semibold'
                              : 'bg-[#111113] text-[#A1A1AA] border-white/10 hover:text-[#F4F4F5]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#F4F4F5] mb-2">
                      Espresso Pull Selection
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SHOT_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setShotType(opt)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                            shotType === opt
                              ? 'bg-[#D4955A] text-[#111113] border-[#D4955A] font-semibold'
                              : 'bg-[#111113] text-[#A1A1AA] border-white/10 hover:text-[#F4F4F5]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#F4F4F5] mb-2">
                      Botanical & Raw Sweetness
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SWEETNESS_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSweetness(opt)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                            sweetness === opt
                              ? 'bg-[#D4955A] text-[#111113] border-[#D4955A] font-semibold'
                              : 'bg-[#111113] text-[#A1A1AA] border-white/10 hover:text-[#F4F4F5]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#F4F4F5] mb-2">
                      Serving Temperature
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(['65°C Velvety', 'Extra Hot 72°C', 'Over Crystal Ice'] as const).map(
                        (temp) => (
                          <button
                            key={temp}
                            type="button"
                            onClick={() => setTemperature(temp)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                              temperature === temp
                                ? 'bg-[#D4955A] text-[#111113] border-[#D4955A] font-semibold'
                                : 'bg-[#111113] text-[#A1A1AA] border-white/10 hover:text-[#F4F4F5]'
                            }`}
                          >
                            {temp}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Whole Bean Grind Selection */}
              {isBeans && (
                <div className="pt-4 border-t border-white/[0.08]">
                  <label className="block text-xs font-medium text-[#F4F4F5] mb-2">
                    Precision Mahlkönig EK43 Grind Setting
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {GRIND_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGrindSize(g)}
                        className={`px-3.5 py-2.5 rounded-lg text-xs font-medium border text-left transition-colors cursor-pointer ${
                          grindSize === g
                            ? 'bg-[#D4955A] text-[#111113] border-[#D4955A] font-semibold'
                            : 'bg-[#111113] text-[#A1A1AA] border-white/10 hover:text-[#F4F4F5]'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Barista / Bakehouse Note */}
              <div className="pt-2">
                <label htmlFor="barista-note" className="block text-xs text-[#A1A1AA] mb-1.5">
                  Barista / Preparation Note (Optional)
                </label>
                <input
                  id="barista-note"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isBakehouse
                      ? 'e.g., Warmed in deck oven, serve with extra espresso caramel'
                      : 'e.g., Extra dry microfoam, dust with raw cacao'
                  }
                  className="w-full bg-[#111113] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-[#F4F4F5] placeholder:text-[#A1A1AA]/50 focus:outline-none focus:border-[#D4955A]"
                />
              </div>
            </div>

            {/* Contiguous Purchase Footer */}
            <div className="mt-8 pt-4 border-t border-white/[0.08] flex items-center gap-4">
              <div className="flex items-center border border-white/10 rounded-lg bg-[#111113]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="w-10 h-11 flex items-center justify-center text-[#A1A1AA] hover:text-[#F4F4F5] cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-mono-tabular text-sm font-medium text-[#F4F4F5]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="w-10 h-11 flex items-center justify-center text-[#A1A1AA] hover:text-[#F4F4F5] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={!item.inStock}
                onClick={handleConfirmAdd}
                className="flex-1 h-11 px-5 rounded-lg bg-[#D4955A] hover:bg-[#DF9F64] disabled:opacity-40 text-[#111113] font-semibold text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {addedFeedback ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Roastery Bag</span>
                  </>
                ) : (
                  <span>
                    Add to Bag — ₹{computedUnitPrice * quantity}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
