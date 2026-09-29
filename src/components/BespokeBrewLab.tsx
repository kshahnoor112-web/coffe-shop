import React, { useState, useMemo } from 'react';
import { Plus, Sparkles, Check } from 'lucide-react';
import type { CartItem, MenuItem } from '../types/coffee';

interface BespokeBrewLabProps {
  onAddBespokeToCart: (item: CartItem) => void;
  defaultImage: string;
}

interface BaseOption {
  id: string;
  name: string;
  originNote: string;
  caffeineMg: number;
  basePrice: number;
  colorHex: string;
  acidity: number;
  body: number;
}

interface LiquidOption {
  id: string;
  name: string;
  calories: number;
  priceDelta: number;
  colorHex: string;
  sweetnessBoost: number;
  bodyBoost: number;
}

interface BotanicalOption {
  id: string;
  name: string;
  note: string;
  priceDelta: number;
  calories: number;
}

const BASES: BaseOption[] = [
  {
    id: 'ratnagiri-ristretto',
    name: 'Double Ristretto · Ratnagiri Lot #89',
    originNote: 'Chikmagalur · Carbonic Maceration',
    caffeineMg: 145,
    basePrice: 260,
    colorHex: '#3B1F12',
    acidity: 65,
    body: 92,
  },
  {
    id: 'yirgacheffe-espresso',
    name: 'Single-Origin Pull · Ethiopia Yirgacheffe',
    originNote: 'Halo Beriti · 2,050m Washed',
    caffeineMg: 155,
    basePrice: 280,
    colorHex: '#4E2A17',
    acidity: 88,
    body: 70,
  },
  {
    id: 'kyoto-slow-drip',
    name: '20-Hour Kyoto Cold Concentrate',
    originNote: 'Kelagur Estate · Nitrogen Charged',
    caffeineMg: 190,
    basePrice: 270,
    colorHex: '#28150C',
    acidity: 45,
    body: 86,
  },
];

const LIQUIDS: LiquidOption[] = [
  {
    id: 'oatly-velvet',
    name: 'Steamed Oatly Barista Microfoam',
    calories: 115,
    priceDelta: 60,
    colorHex: '#D8C3A5',
    sweetnessBoost: 30,
    bodyBoost: 25,
  },
  {
    id: 'estate-whole',
    name: 'A2 Grass-Fed Whole Milk (65°C)',
    calories: 130,
    priceDelta: 40,
    colorHex: '#EFE6D8',
    sweetnessBoost: 25,
    bodyBoost: 30,
  },
  {
    id: 'yuzu-botanical-tonic',
    name: 'Japanese Yuzu & Indian Bark Tonic',
    calories: 55,
    priceDelta: 80,
    colorHex: '#E6B86E',
    sweetnessBoost: 20,
    bodyBoost: -10,
  },
  {
    id: 'pure-spring-water',
    name: 'Mineral-Balanced 93°C Pour (Black)',
    calories: 0,
    priceDelta: 0,
    colorHex: '#59331E',
    sweetnessBoost: 0,
    bodyBoost: 0,
  },
];

const BOTANICALS: BotanicalOption[] = [
  {
    id: 'none',
    name: 'Uninfused Pure Origin',
    note: 'Zero added botanicals',
    priceDelta: 0,
    calories: 0,
  },
  {
    id: 'pampore-saffron',
    name: 'Pampore Saffron & Crushed Cardamom',
    note: 'Floral honeyed spice finish',
    priceDelta: 55,
    calories: 35,
  },
  {
    id: 'smoked-maple-tahini',
    name: 'Vermont Dark Maple & White Tahini',
    note: 'Nutty roasted sesame & caramel',
    priceDelta: 60,
    calories: 65,
  },
  {
    id: 'madagascar-vanilla',
    name: 'Raw Madagascar Bourbon Vanilla Bean',
    note: 'Warm custard & cacao aromatics',
    priceDelta: 50,
    calories: 40,
  },
];

export const BespokeBrewLab: React.FC<BespokeBrewLabProps> = ({
  onAddBespokeToCart,
  defaultImage,
}) => {
  const [selectedBase, setSelectedBase] = useState<BaseOption>(BASES[0]);
  const [selectedLiquid, setSelectedLiquid] = useState<LiquidOption>(LIQUIDS[0]);
  const [selectedBotanical, setSelectedBotanical] = useState<BotanicalOption>(BOTANICALS[1]);
  const [serveTemp, setServeTemp] = useState<'65°C Velvety' | 'Over Crystal Ice'>('65°C Velvety');
  const [customTitle, setCustomTitle] = useState('');
  const [justAdded, setJustAdded] = useState(false);

  const metrics = useMemo(() => {
    const unitPrice =
      selectedBase.basePrice + selectedLiquid.priceDelta + selectedBotanical.priceDelta;
    const calories = 10 + selectedLiquid.calories + selectedBotanical.calories;
    const caffeine = selectedBase.caffeineMg;
    const bodyScore = Math.min(98, Math.max(40, selectedBase.body + selectedLiquid.bodyBoost));
    const acidityScore = Math.min(96, Math.max(30, selectedBase.acidity));
    const sweetnessScore = Math.min(
      95,
      Math.max(25, 45 + selectedLiquid.sweetnessBoost + (selectedBotanical.id !== 'none' ? 20 : 0))
    );
    return { unitPrice, calories, caffeine, bodyScore, acidityScore, sweetnessScore };
  }, [selectedBase, selectedLiquid, selectedBotanical]);

  const handleCreateBespoke = () => {
    const generatedName =
      customTitle.trim() ||
      `Bespoke ${selectedBotanical.id !== 'none' ? selectedBotanical.name.split('&')[0].trim() : ''} ${
        selectedLiquid.name.split(' ')[1] || 'Atelier'
      } Pour`.replace(/\s+/g, ' ');

    const syntheticMenuItem: MenuItem = {
      id: `bespoke-${Date.now()}`,
      name: generatedName,
      subtitle: `${selectedBase.name} · ${selectedLiquid.name}`,
      category: serveTemp === 'Over Crystal Ice' ? 'cold_brew' : 'espresso',
      price: metrics.unitPrice,
      imageUrl: defaultImage,
      origin: selectedBase.originNote,
      elevation: 'Custom Atelier Extraction',
      process: selectedBotanical.name,
      roastLevel: 'Medium',
      tastingNotes: [selectedBase.originNote, selectedBotanical.note],
      caffeineMg: metrics.caffeine,
      calories: metrics.calories,
      volumeOrWeight: '240 ml',
      description: `Custom formulated in the KĀFĪ Brew Lab with ${selectedBase.name}, ${selectedLiquid.name}, and ${selectedBotanical.name}.`,
      inStock: true,
    };

    const cartItem: CartItem = {
      cartItemId: `cart-bespoke-${Date.now()}`,
      menuItem: syntheticMenuItem,
      quantity: 1,
      unitPrice: metrics.unitPrice,
      isBespoke: true,
      bespokeRecipeName: generatedName,
      customization: {
        milk:
          selectedLiquid.id === 'oatly-velvet'
            ? 'Oatly Barista'
            : selectedLiquid.id === 'estate-whole'
            ? 'Whole Estate Milk'
            : 'Black / None',
        shotType:
          selectedBase.id === 'yirgacheffe-espresso'
            ? 'Single-Origin Ethiopia'
            : 'Signature House Blend',
        sweetness:
          selectedBotanical.id === 'pampore-saffron'
            ? 'Kashmir Saffron Honey (+₹45)'
            : selectedBotanical.id === 'none'
            ? 'Unsweetened'
            : 'Raw Demerara',
        temperature: serveTemp,
        notes: `${selectedBase.name} + ${selectedLiquid.name} + ${selectedBotanical.name}`,
      },
    };

    onAddBespokeToCart(cartItem);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2200);
  };

  return (
    <section
      id="custom-brew"
      className="py-20 border-t border-white/[0.08] bg-[#141416]"
      aria-labelledby="brew-lab-heading"
    >
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <p className="text-xs text-[#A1A1AA] tracking-wide mb-2">
              02. Interactive Extraction Configurator · Real-Time Bar Telemetry
            </p>
            <h2
              id="brew-lab-heading"
              className="font-display text-3xl md:text-4xl font-semibold text-[#F4F4F5] tracking-wide"
              style={{ textWrap: 'balance' }}
            >
              The Bespoke Brew Atelier
            </h2>
          </div>
          <p className="text-sm text-[#A1A1AA] max-w-md leading-relaxed">
            Calibrate your personal extraction ratio. Select your estate espresso base, textured
            milk or tonic suspension, and house-steeped botanical infusion—transmitted directly to
            our Slayer bar queue.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Columns: Step-by-Step Controls */}
          <div className="lg:col-span-7 space-y-8 bg-[#18181B] border border-white/[0.08] rounded-xl p-6 md:p-8">
            {/* Step 1: Extraction Base */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[#F4F4F5]">
                  1. Select Estate Extraction Base
                </span>
                <span className="text-xs text-[#A1A1AA] font-mono-tabular">
                  9.0 Bar Pressure · 93.5°C
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {BASES.map((base) => {
                  const active = selectedBase.id === base.id;
                  return (
                    <button
                      key={base.id}
                      type="button"
                      onClick={() => setSelectedBase(base)}
                      className={`text-left p-4 rounded-lg border transition-all duration-150 ${
                        active
                          ? 'bg-[#22201E] border-[#D4955A] text-[#F4F4F5]'
                          : 'bg-[#121214] border-white/[0.07] text-[#A1A1AA] hover:border-white/20 hover:text-[#F4F4F5]'
                      }`}
                    >
                      <div className="font-medium text-xs text-[#F4F4F5] mb-1 leading-snug">
                        {base.name}
                      </div>
                      <div className="text-[11px] text-[#A1A1AA] mb-2">{base.originNote}</div>
                      <div className="text-xs font-mono-tabular text-[#D4955A]">
                        ₹{base.basePrice} · {base.caffeineMg}mg
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Liquid Texture */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[#F4F4F5]">
                  2. Choose Texture & Suspension
                </span>
                <div className="flex items-center gap-1 p-1 bg-[#111113] rounded-lg border border-white/[0.06]">
                  {(['65°C Velvety', 'Over Crystal Ice'] as const).map((temp) => (
                    <button
                      key={temp}
                      type="button"
                      onClick={() => setServeTemp(temp)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        serveTemp === temp
                          ? 'bg-[#D4955A] text-[#111113] font-semibold'
                          : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                      }`}
                    >
                      {temp}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LIQUIDS.map((liq) => {
                  const active = selectedLiquid.id === liq.id;
                  return (
                    <button
                      key={liq.id}
                      type="button"
                      onClick={() => setSelectedLiquid(liq)}
                      className={`text-left p-3.5 rounded-lg border transition-all duration-150 flex items-center justify-between ${
                        active
                          ? 'bg-[#22201E] border-[#D4955A] text-[#F4F4F5]'
                          : 'bg-[#121214] border-white/[0.07] text-[#A1A1AA] hover:border-white/20 hover:text-[#F4F4F5]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-medium text-[#F4F4F5]">{liq.name}</div>
                        <div className="text-[11px] text-[#A1A1AA] font-mono-tabular mt-0.5">
                          {liq.calories} kcal
                        </div>
                      </div>
                      <span className="text-xs font-mono-tabular text-[#D4955A] whitespace-nowrap ml-2">
                        {liq.priceDelta > 0 ? `+₹${liq.priceDelta}` : 'Included'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Botanical Infusion */}
            <div>
              <span className="block text-sm font-semibold text-[#F4F4F5] mb-3">
                3. Artisanal Botanical Infusion
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BOTANICALS.map((bot) => {
                  const active = selectedBotanical.id === bot.id;
                  return (
                    <button
                      key={bot.id}
                      type="button"
                      onClick={() => setSelectedBotanical(bot)}
                      className={`text-left p-3.5 rounded-lg border transition-all duration-150 flex items-center justify-between ${
                        active
                          ? 'bg-[#22201E] border-[#D4955A] text-[#F4F4F5]'
                          : 'bg-[#121214] border-white/[0.07] text-[#A1A1AA] hover:border-white/20 hover:text-[#F4F4F5]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-medium text-[#F4F4F5]">{bot.name}</div>
                        <div className="text-[11px] text-[#A1A1AA] mt-0.5">{bot.note}</div>
                      </div>
                      <span className="text-xs font-mono-tabular text-[#D4955A] whitespace-nowrap ml-2">
                        {bot.priceDelta > 0 ? `+₹${bot.priceDelta}` : 'Pure'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Custom Name on Cup */}
            <div className="pt-2 border-t border-white/[0.06] flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
              <div className="flex-1">
                <label htmlFor="bespoke-cup-label" className="block text-xs text-[#A1A1AA] mb-1">
                  Name Your Formulation (Printed on Craft Cup Ticket)
                </label>
                <input
                  id="bespoke-cup-label"
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g., Kabir’s Golden Hour Cortado"
                  className="w-full bg-[#111113] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-[#F4F4F5] placeholder:text-[#A1A1AA]/50 focus:outline-none focus:border-[#D4955A]"
                />
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Live Cup Visualizer & Sensory Profile */}
          <div className="lg:col-span-5 bg-[#18181B] border border-white/[0.08] rounded-xl p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
                <div>
                  <span className="text-xs text-[#A1A1AA] block">Live Formulation</span>
                  <h3 className="font-display text-2xl font-semibold text-[#F4F4F5]">
                    {customTitle.trim() || 'Atelier Custom Cup'}
                  </h3>
                </div>
                <div className="text-right font-mono-tabular">
                  <span className="text-2xl font-semibold text-[#D4955A]">
                    ₹{metrics.unitPrice}
                  </span>
                  <span className="block text-xs text-[#A1A1AA]">240 ml · Tax incl.</span>
                </div>
              </div>

              {/* Architectural Cup Cross-Section Diagram */}
              <div className="relative h-48 bg-[#111113] rounded-lg border border-white/[0.06] p-5 flex items-center gap-6 mb-6">
                <div className="w-24 h-36 mx-auto sm:mx-0 border-2 border-[#D4955A]/50 rounded-b-3xl rounded-t-md overflow-hidden flex flex-col justify-end relative shadow-inner">
                  {/* Top Botanical Crema Layer */}
                  {selectedBotanical.id !== 'none' && (
                    <div
                      className="w-full h-4 transition-all duration-300"
                      style={{ backgroundColor: '#D4955A' }}
                      title={selectedBotanical.name}
                    />
                  )}
                  {/* Middle Liquid Suspension Layer */}
                  <div
                    className="w-full h-16 transition-all duration-300 flex items-center justify-center text-[10px] font-mono-tabular text-[#111113] font-semibold"
                    style={{ backgroundColor: selectedLiquid.colorHex }}
                  >
                    160 ml
                  </div>
                  {/* Bottom Espresso Extraction Layer */}
                  <div
                    className="w-full h-12 transition-all duration-300 flex items-center justify-center text-[10px] font-mono-tabular text-[#F4F4F5]"
                    style={{ backgroundColor: selectedBase.colorHex }}
                  >
                    40 ml
                  </div>
                </div>

                <div className="flex-1 space-y-2.5 text-xs">
                  <div>
                    <span className="text-[#A1A1AA] block">Crema & Botanical Crown</span>
                    <span className="text-[#F4F4F5] font-medium">{selectedBotanical.name}</span>
                  </div>
                  <div>
                    <span className="text-[#A1A1AA] block">Body Suspension ({serveTemp})</span>
                    <span className="text-[#F4F4F5] font-medium">{selectedLiquid.name}</span>
                  </div>
                  <div>
                    <span className="text-[#A1A1AA] block">Foundation Pull</span>
                    <span className="text-[#F4F4F5] font-medium">{selectedBase.name}</span>
                  </div>
                </div>
              </div>

              {/* Sensory & Telemetry Bars */}
              <div className="space-y-3 mb-6">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#A1A1AA]">Tactile Body & Mouthfeel</span>
                    <span className="font-mono-tabular text-[#F4F4F5]">{metrics.bodyScore}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#111113] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D4955A] transition-all duration-200"
                      style={{ width: `${metrics.bodyScore}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#A1A1AA]">Origin Acidity & Brightness</span>
                    <span className="font-mono-tabular text-[#F4F4F5]">{metrics.acidityScore}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#111113] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D4955A]/80 transition-all duration-200"
                      style={{ width: `${metrics.acidityScore}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#A1A1AA]">Natural Sweetness Balance</span>
                    <span className="font-mono-tabular text-[#F4F4F5]">
                      {metrics.sweetnessScore}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#111113] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D4955A]/65 transition-all duration-200"
                      style={{ width: `${metrics.sweetnessScore}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#A1A1AA] font-mono-tabular py-3 border-t border-white/[0.08]">
                <span>Caffeine: {metrics.caffeine} mg</span>
                <span aria-hidden="true">·</span>
                <span>Energy: {metrics.calories} kcal</span>
                <span aria-hidden="true">·</span>
                <span>Pull Time: 29s</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateBespoke}
              className="mt-4 w-full py-3.5 px-5 rounded-lg bg-[#D4955A] hover:bg-[#DF9F64] text-[#111113] font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {justAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added Bespoke Cup to Bag</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Bespoke Formulation to Bag — ₹{metrics.unitPrice}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
