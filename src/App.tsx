import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  Check,
  SlidersHorizontal,
  ArrowRight,
  Calendar,
  Menu as MenuIcon,
  X,
} from 'lucide-react';
import type {
  MenuItem,
  MenuCategory,
  CartItem,
  Order,
  OrderStatus,
  TableReservation,
  GuestReview,
} from './types/coffee';
import { ResilientImage } from './components/ResilientImage';
import { BespokeBrewLab } from './components/BespokeBrewLab';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { LiveBaristaQueueModal } from './components/LiveBaristaQueueModal';
import {
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  signOutUser,
  saveOrderToFirestore,
  saveReservationToFirestore,
  saveReviewToFirestore,
  updateOrderStatusInFirestore,
  subscribeToGuestReviews,
  subscribeToUserOrders,
  subscribeToUserReservations,
  isRoasteryAdmin,
  type User,
} from './lib/firebase';

import {
  SEED_MENU,
  SEED_ORDERS,
  SEED_RESERVATIONS,
  SEED_REVIEWS,
  BUNDLED_IMAGES,
} from './data/roasterySeed';

const HERO_IMAGE = BUNDLED_IMAGES.hero;
const ROASTERY_IMAGE = BUNDLED_IMAGES.roastery;
const DEFAULT_LATTE_IMAGE = BUNDLED_IMAGES.latte;

const CATEGORY_TABS: { id: 'all' | MenuCategory; label: string }[] = [
  { id: 'all', label: 'All Collection' },
  { id: 'espresso', label: 'Espresso & Milk' },
  { id: 'cold_brew', label: 'Cold & Nitro' },
  { id: 'bakehouse', label: 'Artisanal Bakehouse' },
  { id: 'whole_beans', label: 'Single-Origin Beans' },
];

export default function App() {
  const [menu, setMenu] = useState<MenuItem[]>(SEED_MENU);
  const [orders, setOrders] = useState<Order[]>(SEED_ORDERS);
  const [reservations, setReservations] = useState<TableReservation[]>(SEED_RESERVATIONS);
  const [reviews, setReviews] = useState<GuestReview[]>(SEED_REVIEWS);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<'all' | MenuCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Cart & Modals State
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('kafi_cart_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeProductModal, setActiveProductModal] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLiveQueueOpen, setIsLiveQueueOpen] = useState(false);
  const [quickAddedId, setQuickAddedId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Table Reservation Form State
  const [resName, setResName] = useState('');
  const [resEmail, setResEmail] = useState('');
  const [resPhone, setResPhone] = useState('');
  const [resDate, setResDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [resTime, setResTime] = useState('17:30 — Golden Hour Pour');
  const [resGuests, setResGuests] = useState(2);
  const [resZone, setResZone] = useState<TableReservation['seatingZone']>('Espresso Bar Counter');
  const [resOccasion, setResOccasion] = useState('Single-Origin Tasting Flight');
  const [resNotes, setResNotes] = useState('');
  const [resSubmitting, setResSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<TableReservation | null>(null);

  // Guest Review Form State
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [revName, setRevName] = useState('');
  const [revRole, setRevRole] = useState('');
  const [revItem, setRevItem] = useState('Kashmir Saffron & Cardamom Cortado');
  const [revComment, setRevComment] = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('kafi_cart_v1', JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  const fetchRoasteryData = async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('Using bundled roastery seed + Firestore');
      const data = await res.json();
      if (Array.isArray(data.menu) && data.menu.length > 0) setMenu(data.menu);
      if (Array.isArray(data.orders) && data.orders.length > 0) setOrders(data.orders);
      if (Array.isArray(data.reservations) && data.reservations.length > 0) {
        setReservations(data.reservations);
      }
      if (Array.isArray(data.reviews) && data.reviews.length > 0) setReviews(data.reviews);
    } catch {
      // On static Vercel hosting without Express, SEED_* + Firebase Firestore provide full functionality
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoasteryData();
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (user?.displayName) {
        setResName((prev) => prev || user.displayName || '');
        setRevName((prev) => prev || user.displayName || '');
      }
      if (user?.email) {
        setResEmail((prev) => prev || user.email || '');
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const unsubReviews = subscribeToGuestReviews((cloudReviews) => {
      if (cloudReviews.length > 0) {
        setReviews((prev) => {
          const map = new Map<string, GuestReview>();
          [...cloudReviews, ...prev].forEach((r) => map.set(r.id, r));
          return Array.from(map.values());
        });
      }
    });

    let unsubOrders: (() => void) | undefined;
    let unsubReservations: (() => void) | undefined;

    if (currentUser) {
      unsubOrders = subscribeToUserOrders(currentUser, (cloudOrders) => {
        if (cloudOrders.length > 0) {
          setOrders((prev) => {
            const map = new Map<string, Order>();
            [...cloudOrders, ...prev].forEach((o) => map.set(o.id, o));
            return Array.from(map.values());
          });
        }
      });

      unsubReservations = subscribeToUserReservations(currentUser, (cloudRes) => {
        if (cloudRes.length > 0) {
          setReservations((prev) => {
            const map = new Map<string, TableReservation>();
            [...cloudRes, ...prev].forEach((r) => map.set(r.id, r));
            return Array.from(map.values());
          });
        }
      });
    }

    return () => {
      unsubReviews();
      if (unsubOrders) unsubOrders();
      if (unsubReservations) unsubReservations();
    };
  }, [authReady, currentUser]);

  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (onlyInStock && !item.inStock) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchOrigin = item.origin.toLowerCase().includes(q);
        const matchNotes = item.tastingNotes.some((t) => t.toLowerCase().includes(q));
        return matchName || matchOrigin || matchNotes;
      }
      return true;
    });
  }, [menu, selectedCategory, onlyInStock, searchQuery]);

  const totalBagCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const activeOrdersCount = useMemo(
    () => orders.filter((o) => o.status !== 'Completed').length,
    [orders]
  );

  const handleAddToCart = (newItem: CartItem) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (c) =>
          c.menuItem.id === newItem.menuItem.id &&
          c.customization.milk === newItem.customization.milk &&
          c.customization.shotType === newItem.customization.shotType &&
          c.customization.sweetness === newItem.customization.sweetness &&
          c.customization.temperature === newItem.customization.temperature &&
          c.customization.grindSize === newItem.customization.grindSize &&
          !newItem.isBespoke
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + newItem.quantity,
        };
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const handleQuickAdd = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.inStock) return;
    const quickCartItem: CartItem = {
      cartItemId: `${item.id}-${Date.now()}`,
      menuItem: item,
      quantity: 1,
      unitPrice: item.price,
      customization: {
        milk:
          item.category === 'espresso'
            ? 'Oatly Barista'
            : 'Black / None',
        shotType: 'Signature House Blend',
        sweetness: 'Unsweetened',
        temperature: item.category === 'cold_brew' ? 'Over Crystal Ice' : '65°C Velvety',
        grindSize: item.category === 'whole_beans' ? 'Whole Bean' : undefined,
      },
    };
    handleAddToCart(quickCartItem);
    setQuickAddedId(item.id);
    setTimeout(() => setQuickAddedId(null), 1200);
  };

  const handleUpdateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.cartItemId === cartItemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((c) => c.cartItemId !== cartItemId));
  };

  const handleAdvanceOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    const estMins =
      nextStatus === 'Grinding & Extracting'
        ? 5
        : nextStatus === 'Steaming & Plating'
        ? 2
        : 0;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: nextStatus, estimatedReadyMinutes: estMins } : o
      )
    );
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      }).catch(() => {});
      if (currentUser && isRoasteryAdmin(currentUser)) {
        await updateOrderStatusInFirestore(orderId, nextStatus, estMins).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const handleToggleStock = async (menuId: string, inStock: boolean) => {
    setMenu((prev) => prev.map((m) => (m.id === menuId ? { ...m, inStock } : m)));
    try {
      await fetch(`/api/menu/${menuId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inStock }),
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to toggle stock:', err);
    }
  };

  const handleBookReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resName.trim() || !resPhone.trim()) return;
    setResSubmitting(true);
    try {
      let created: TableReservation;
      try {
        const response = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestName: resName,
            guestEmail: resEmail,
            guestPhone: resPhone,
            date: resDate,
            timeSlot: resTime,
            guests: resGuests,
            seatingZone: resZone,
            occasion: resOccasion,
            specialRequests: resNotes,
          }),
        });
        if (!response.ok) throw new Error('Fallback to direct creation');
        created = await response.json();
      } catch {
        const codeNum = Math.floor(100 + Math.random() * 900);
        created = {
          id: `res-${Date.now()}`,
          confirmationCode: `KFR-${codeNum}`,
          guestName: resName.trim(),
          guestEmail: resEmail.trim() || 'guest@kafiroastery.in',
          guestPhone: resPhone.trim(),
          date: resDate,
          timeSlot: resTime,
          guests: resGuests,
          seatingZone: resZone,
          occasion: resOccasion,
          specialRequests: resNotes.trim(),
          status: 'Confirmed',
          createdAt: new Date().toISOString(),
        };
      }
      setReservations((prev) => [created, ...prev]);
      setConfirmedReservation(created);
      if (currentUser) {
        await saveReservationToFirestore(created, currentUser).catch(() => {});
      }
      setResName('');
      setResNotes('');
    } catch (err) {
      console.error('Reservation error:', err);
    } finally {
      setResSubmitting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revName.trim() || !revComment.trim()) return;
    setRevSubmitting(true);
    try {
      let created: GuestReview;
      try {
        const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestName: revName,
            roleOrContext: revRole || 'Roastery Regular, Mumbai',
            orderedItem: revItem,
            rating: 5,
            comment: revComment,
          }),
        });
        if (!response.ok) throw new Error('Fallback to direct creation');
        created = await response.json();
      } catch {
        created = {
          id: `rev-${Date.now()}`,
          guestName: revName.trim(),
          roleOrContext: (revRole || 'Roastery Regular, Mumbai').trim(),
          orderedItem: revItem.trim(),
          rating: 5,
          comment: revComment.trim(),
          createdAt: new Date().toISOString().split('T')[0],
        };
      }
      setReviews((prev) => [created, ...prev]);
      if (currentUser) {
        await saveReviewToFirestore(created, currentUser).catch(() => {});
      }
      setRevName('');
      setRevRole('');
      setRevComment('');
      setShowReviewForm(false);
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setRevSubmitting(false);
    }
  };

  return (
    <div id="top" className="min-h-screen bg-[#111113] text-[#F4F4F5] flex flex-col">
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="sticky top-0 z-40 h-16 bg-[#111113]/95 backdrop-blur-md border-b border-white/[0.08] px-6 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="font-display text-2xl font-semibold tracking-wider text-[#F4F4F5] whitespace-nowrap shrink-0"
        >
          KĀFĪ ROASTERY
        </a>

        {/* Zone 2: 5 clean text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A1A1AA]"
        >
          <a
            href="#collection"
            className="hover:text-[#F4F4F5] hover:underline underline-offset-8 decoration-[#D4955A] transition-colors whitespace-nowrap"
          >
            Collection
          </a>
          <a
            href="#custom-brew"
            className="hover:text-[#F4F4F5] hover:underline underline-offset-8 decoration-[#D4955A] transition-colors whitespace-nowrap"
          >
            Brew Atelier
          </a>
          <a
            href="#craftsmanship"
            className="hover:text-[#F4F4F5] hover:underline underline-offset-8 decoration-[#D4955A] transition-colors whitespace-nowrap"
          >
            Roastery
          </a>
          <a
            href="#reservations"
            className="hover:text-[#F4F4F5] hover:underline underline-offset-8 decoration-[#D4955A] transition-colors whitespace-nowrap"
          >
            Reserve Table
          </a>
          <button
            type="button"
            onClick={() => setIsLiveQueueOpen(true)}
            className="hover:text-[#F4F4F5] hover:underline underline-offset-8 decoration-[#D4955A] transition-colors whitespace-nowrap cursor-pointer"
          >
            Live Bar ({activeOrdersCount})
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <button
              type="button"
              onClick={() => signOutUser()}
              title="Sign out of Roastery Member Account"
              className="hidden sm:inline-flex px-3 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] border border-white/10 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {currentUser.displayName?.split(' ')[0] || 'Member'} · Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => signInWithGoogle().catch(() => {})}
              className="hidden sm:inline-flex px-3 py-2 text-xs font-medium text-[#F4F4F5] hover:border-[#D4955A] border border-white/15 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Member Sign In
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-[#111113] bg-[#D4955A] hover:bg-[#DF9F64] rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="font-mono-tabular">Bag ({totalBagCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle mobile menu"
            className="md:hidden w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-[#F4F4F5]"
          >
            {mobileNavOpen ? <X className="w-4 h-4" /> : <MenuIcon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Dropdown Navigation */}
      {mobileNavOpen && (
        <div className="md:hidden bg-[#18181B] border-b border-white/10 px-6 py-4 flex flex-col gap-3 text-sm text-[#F4F4F5]">
          <a href="#collection" onClick={() => setMobileNavOpen(false)} className="py-1">
            Collection & Menu
          </a>
          <a href="#custom-brew" onClick={() => setMobileNavOpen(false)} className="py-1">
            Bespoke Brew Atelier
          </a>
          <a href="#craftsmanship" onClick={() => setMobileNavOpen(false)} className="py-1">
            Roastery & Provenance
          </a>
          <a href="#reservations" onClick={() => setMobileNavOpen(false)} className="py-1">
            Reserve Table
          </a>
          <button
            type="button"
            onClick={() => {
              setMobileNavOpen(false);
              setIsLiveQueueOpen(true);
            }}
            className="text-left py-1 text-[#D4955A] font-medium"
          >
            Live Barista Queue ({activeOrdersCount} Active)
          </button>
        </div>
      )}

      <main className="flex-1">
        {/* Section 1: Storefront Hero */}
        <section className="relative min-h-[78vh] flex items-end overflow-hidden border-b border-white/[0.08]">
          <div className="absolute inset-0">
            <ResilientImage
              src={HERO_IMAGE}
              alt="Double ristretto pouring from a naked brass portafilter at KĀFĪ Roastery"
              className="w-full h-full object-cover object-center scale-[1.01]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-[#111113]/65 to-black/35" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#111113]/90 via-[#111113]/40 to-transparent" />
          </div>

          <div className="relative z-10 max-w-[1240px] w-full mx-auto px-6 py-16 md:py-24">
            <div className="max-w-2xl space-y-6">
              {/* Unboxed regional & craft provenance metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#D4955A] tracking-wide">
                <span>Bandra West Flagship Roastery</span>
                <span aria-hidden="true">·</span>
                <span>Chikmagalur & Yirgacheffe Micro-Lots</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">SCA 89.25 Lot Grade</span>
              </div>

              <h1
                className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold text-[#F4F4F5] leading-[1.08] tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Precision Copper-Drum Roasting & Artisanal Espresso Atelier.
              </h1>

              <p className="text-base md:text-lg text-[#D4D4D8] leading-relaxed max-w-xl">
                Every cup begins at 1,450 meters in the Western Ghats and Ethiopian highlands.
                Roasted daily in small 12kg cast-iron batches, pulled at 93.5°C on our 3-group
                Slayer bar, and paired with 72-hour cold-fermented viennoiserie.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <a
                  href="#collection"
                  className="px-6 py-3.5 rounded-lg bg-[#D4955A] hover:bg-[#DF9F64] text-[#111113] font-semibold text-sm transition-all duration-150 flex items-center gap-2 whitespace-nowrap"
                >
                  <span>Explore Seasonal Menu</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <a
                  href="#custom-brew"
                  className="px-6 py-3.5 rounded-lg bg-[#18181B]/90 hover:bg-[#22201E] text-[#F4F4F5] border border-white/15 font-medium text-sm transition-colors whitespace-nowrap"
                >
                  Formulate Custom Brew
                </a>

                <button
                  type="button"
                  onClick={() => setIsLiveQueueOpen(true)}
                  className="px-4 py-3.5 text-xs text-[#A1A1AA] hover:text-[#F4F4F5] font-mono-tabular underline underline-offset-4 cursor-pointer whitespace-nowrap"
                >
                  View Live Slayer Queue ({activeOrdersCount} in extraction)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Featured Collection & Interactive Menu Grid */}
        <section id="collection" className="py-20 max-w-[1240px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-xs text-[#A1A1AA] tracking-wide mb-2">
                01. Curated Roastery & Bakehouse Menu · Autumn–Winter Harvest
              </p>
              <h2
                className="font-display text-3xl md:text-4xl font-semibold text-[#F4F4F5]"
                style={{ textWrap: 'balance' }}
              >
                Signature Extractions & Estate Micro-Lots
              </h2>
            </div>

            {/* Search & Availability Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search origin, note, pastry..."
                  aria-label="Search menu items"
                  className="w-full bg-[#18181B] border border-white/10 rounded-lg pl-9 pr-3.5 py-2 text-xs text-[#F4F4F5] placeholder:text-[#A1A1AA]/60 focus:outline-none focus:border-[#D4955A]"
                />
              </div>

              <button
                type="button"
                onClick={() => setOnlyInStock((v) => !v)}
                className={`px-3.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  onlyInStock
                    ? 'bg-[#22201E] border-[#D4955A] text-[#F4F4F5]'
                    : 'bg-[#18181B] border-white/10 text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>In-Stock Only</span>
              </button>
            </div>
          </div>

          {/* Interactive Category Segmented Filter Bar */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#18181B] border border-white/[0.08] rounded-xl overflow-x-auto mb-10">
            {CATEGORY_TABS.map((tab) => {
              const active = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#D4955A] text-[#111113] font-semibold shadow-sm'
                      : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 3-Column Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-[420px] rounded-xl bg-[#18181B] border border-white/[0.06] animate-pulse"
                />
              ))}
            </div>
          ) : filteredMenu.length === 0 ? (
            <div className="text-center py-16 bg-[#18181B] border border-white/[0.08] rounded-xl p-8">
              <p className="font-display text-2xl text-[#F4F4F5] mb-2">
                No Matching Roasts or Pastries Found
              </p>
              <p className="text-xs text-[#A1A1AA] mb-4">
                Try clearing your search filter or switching to All Collection.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setOnlyInStock(false);
                }}
                className="px-4 py-2 rounded-lg bg-[#D4955A] text-[#111113] text-xs font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredMenu.map((item) => {
                const isJustAdded = quickAddedId === item.id;
                return (
                  <article
                    key={item.id}
                    onClick={() => setActiveProductModal(item)}
                    className="group bg-[#18181B] border border-white/[0.08] rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 hover:border-white/20 cursor-pointer"
                  >
                    <div>
                      {/* Product Image takes ~68% height on neutral charcoal */}
                      <div className="relative aspect-4/3 w-full bg-[#141416] overflow-hidden">
                        <ResilientImage
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#18181B] via-transparent to-transparent opacity-65" />

                        {/* Single subtle text tag (no pill badge spam) */}
                        {item.seasonalTag && (
                          <span className="absolute bottom-3 left-4 text-[11px] font-medium text-[#D4955A] tracking-wide">
                            {item.seasonalTag}
                          </span>
                        )}
                        {!item.inStock && (
                          <span className="absolute top-3 right-4 text-xs font-semibold text-amber-300 bg-black/80 px-2.5 py-1 rounded">
                            Batch Sold Out
                          </span>
                        )}
                      </div>

                      {/* Card Content with Clean Unboxed Metadata */}
                      <div className="p-6">
                        <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA] mb-2 truncate">
                          <span>{item.origin}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.process}</span>
                        </div>

                        <div className="flex items-baseline justify-between gap-3 mb-2">
                          <h3 className="text-base font-semibold text-[#F4F4F5] group-hover:text-[#D4955A] transition-colors leading-snug">
                            {item.name}
                          </h3>
                          <span className="font-mono-tabular text-[15px] font-semibold text-[#F4F4F5] shrink-0">
                            ₹{item.price}
                          </span>
                        </div>

                        <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed mb-3">
                          {item.subtitle}
                        </p>

                        {/* Unboxed sensory tasting notes */}
                        <div className="text-[11px] text-[#D4955A]/90">
                          {item.tastingNotes.join(' · ')}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="px-6 pb-5 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
                      <span className="text-xs text-[#A1A1AA] font-mono-tabular">
                        {item.volumeOrWeight}
                        {item.caffeineMg > 0 ? ` · ${item.caffeineMg}mg` : ''}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveProductModal(item);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] border border-white/10 hover:border-white/25 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Customize
                        </button>
                        <button
                          type="button"
                          disabled={!item.inStock}
                          onClick={(e) => handleQuickAdd(item, e)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#D4955A] hover:bg-[#DF9F64] disabled:opacity-40 text-[#111113] transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                        >
                          {isJustAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 3: Interactive Bespoke Brew Atelier */}
        <BespokeBrewLab
          onAddBespokeToCart={handleAddToCart}
          defaultImage={DEFAULT_LATTE_IMAGE}
        />

        {/* Section 4: Roastery Craftsmanship, Quantitative Proof & Table Reservations */}
        <section id="craftsmanship" className="py-20 border-t border-white/[0.08] bg-[#111113]">
          <div className="max-w-[1240px] mx-auto px-6 space-y-20">
            {/* Craftsmanship & Provenance Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-6">
                <p className="text-xs text-[#A1A1AA] tracking-wide">
                  03. Small-Batch Copper Drum Architecture · Direct Farm-Gate Sourcing
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl font-semibold text-[#F4F4F5] leading-tight"
                  style={{ textWrap: 'balance' }}
                >
                  From Shade-Grown Chikmagalur Canopy to Our 1968 Cast-Iron Roaster.
                </h2>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  We partner directly with 14 high-altitude estates across Karnataka’s Baba
                  Budangiri hills and Ethiopia’s Guji zone. Every harvest lot is cupped blind by
                  certified Q-Graders and roasted on a custom-instrumented copper drum roaster with
                  real-time rate-of-rise thermal telemetry.
                </p>

                <div className="space-y-4 pt-2 border-t border-white/[0.08]">
                  <div>
                    <h3 className="text-sm font-semibold text-[#F4F4F5]">
                      01. Direct Farm-Gate Transparency (+28% Above Fair-Trade Minimum)
                    </h3>
                    <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                      Every tin and espresso shot carries lot-level harvest dates, elevation,
                      fermentation hours, and estate grower attribution.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#F4F4F5]">
                      02. Custom Remineralized Brewing Water (85 ppm Total Dissolved Solids)
                    </h3>
                    <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                      Reverse-osmosis water balanced with magnesium and bicarbonate buffers to
                      extract sweet stone-fruit aromatics without harsh astringency.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#F4F4F5]">
                      03. 72-Hour Cold-Fermented Viennoiserie Bakehouse
                    </h3>
                    <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                      Our pastry team laminates French AOP cultured butter every morning at 5:00 AM
                      for shatteringly crisp croissants and caramelized Basque cheesecakes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-xl overflow-hidden border border-white/10 bg-[#18181B]">
                  <div className="aspect-16/9 w-full overflow-hidden">
                    <ResilientImage
                      src={ROASTERY_IMAGE}
                      alt="KĀFĪ Copper Drum Coffee Roaster and Burlap Single Origin Sacks"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Claim-to-Proof Adjacent Quantitative Rigor Bar */}
                  <div className="grid grid-cols-3 divide-x divide-white/[0.08] p-5 bg-[#18181B] text-center">
                    <div className="px-2">
                      <span className="block font-mono-tabular text-xl md:text-2xl font-semibold text-[#D4955A]">
                        93.5°C ±0.1°
                      </span>
                      <span className="text-[11px] text-[#A1A1AA]">
                        PID Thermal Extraction Stability across 3 Slayer Groups
                      </span>
                    </div>
                    <div className="px-2">
                      <span className="block font-mono-tabular text-xl md:text-2xl font-semibold text-[#D4955A]">
                        89.25 SCA
                      </span>
                      <span className="text-[11px] text-[#A1A1AA]">
                        Mean Cupping Score Across 2026 Micro-Lot Releases
                      </span>
                    </div>
                    <div className="px-2">
                      <span className="block font-mono-tabular text-xl md:text-2xl font-semibold text-[#D4955A]">
                        &lt; 4 Mins
                      </span>
                      <span className="text-[11px] text-[#A1A1AA]">
                        Average Bar Dispatch from Grind to Table Service
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attributable Guest Testimonials & Tasting Notes */}
            <div className="pt-12 border-t border-white/[0.08]">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <p className="text-xs text-[#A1A1AA] mb-1">
                    Verified Guest & Q-Grader Ledger · Community Tasting Notes
                  </p>
                  <h3 className="font-display text-2xl md:text-3xl font-semibold text-[#F4F4F5]">
                    From Our Roastery Counter
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewForm((v) => !v)}
                  className="px-4 py-2 rounded-lg bg-[#18181B] border border-white/15 hover:border-[#D4955A] text-xs font-medium text-[#F4F4F5] transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap"
                >
                  {showReviewForm ? 'Close Note Form' : '+ Log Your Tasting Note'}
                </button>
              </div>

              {showReviewForm && (
                <form
                  onSubmit={handleSubmitReview}
                  className="mb-8 p-6 rounded-xl bg-[#18181B] border border-[#D4955A]/40 space-y-4"
                >
                  <h4 className="font-display text-xl text-[#F4F4F5]">
                    Record a Roastery Tasting Note
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="rev-name" className="block text-xs text-[#A1A1AA] mb-1">
                        Your Full Name *
                      </label>
                      <input
                        id="rev-name"
                        type="text"
                        required
                        value={revName}
                        onChange={(e) => setRevName(e.target.value)}
                        placeholder="e.g., Devika Nair"
                        className="w-full bg-[#111113] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F4F4F5]"
                      />
                    </div>
                    <div>
                      <label htmlFor="rev-role" className="block text-xs text-[#A1A1AA] mb-1">
                        Role & Organization
                      </label>
                      <input
                        id="rev-role"
                        type="text"
                        value={revRole}
                        onChange={(e) => setRevRole(e.target.value)}
                        placeholder="e.g., Creative Director, Studio Soma"
                        className="w-full bg-[#111113] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F4F4F5]"
                      />
                    </div>
                    <div>
                      <label htmlFor="rev-item" className="block text-xs text-[#A1A1AA] mb-1">
                        Pour or Pastry Tasted
                      </label>
                      <input
                        id="rev-item"
                        type="text"
                        value={revItem}
                        onChange={(e) => setRevItem(e.target.value)}
                        className="w-full bg-[#111113] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F4F4F5]"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="rev-comment" className="block text-xs text-[#A1A1AA] mb-1">
                      Tasting Impression & Outcome *
                    </label>
                    <textarea
                      id="rev-comment"
                      rows={2}
                      required
                      value={revComment}
                      onChange={(e) => setRevComment(e.target.value)}
                      placeholder="Share how the roast profile, extraction temperature, or pastry pairing stood out..."
                      className="w-full bg-[#111113] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F4F4F5]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={revSubmitting}
                    className="px-5 py-2.5 rounded-lg bg-[#D4955A] text-[#111113] font-semibold text-xs cursor-pointer"
                  >
                    {revSubmitting ? 'Publishing...' : 'Publish Tasting Note'}
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reviews.slice(0, 3).map((rev) => (
                  <blockquote
                    key={rev.id}
                    className="p-6 rounded-xl bg-[#18181B] border border-white/[0.08] flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="text-xs text-[#D4955A] font-medium">
                        Ordered: {rev.orderedItem}
                      </div>
                      <p className="text-xs text-[#D4D4D8] leading-relaxed">“{rev.comment}”</p>
                    </div>
                    <footer className="pt-3 border-t border-white/[0.06]">
                      <div className="text-xs font-semibold text-[#F4F4F5]">{rev.guestName}</div>
                      <div className="text-[11px] text-[#A1A1AA]">
                        {rev.roleOrContext} <span aria-hidden="true">·</span>{' '}
                        <span className="font-mono-tabular">{rev.createdAt}</span>
                      </div>
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>

            {/* Interactive Table & Private Cupping Room Reservation Module */}
            <div
              id="reservations"
              className="pt-12 border-t border-white/[0.08] grid grid-cols-1 lg:grid-cols-12 gap-10 items-start"
            >
              <div className="lg:col-span-5 space-y-4">
                <p className="text-xs text-[#A1A1AA] tracking-wide">
                  04. Table & Sensory Bar Reservations · Bandra West Flagship
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl font-semibold text-[#F4F4F5]"
                  style={{ textWrap: 'balance' }}
                >
                  Reserve Your Seat at the Espresso Bar or Sunlit Courtyard
                </h2>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Book a front-row seat at our Slayer 3-group tasting bar for a guided three-origin
                  flight, reserve a quiet table in the sunlit courtyard for remote studio work, or
                  book the Private Cupping Room for your team.
                </p>

                <div className="p-5 rounded-xl bg-[#18181B] border border-white/[0.08] space-y-2 text-xs">
                  <div className="font-semibold text-[#F4F4F5]">
                    Roastery Hours & Location
                  </div>
                  <p className="text-[#A1A1AA]">
                    14th Road, Off Linking Road, Bandra West, Mumbai 400050
                  </p>
                  <p className="text-[#A1A1AA] font-mono-tabular">
                    Mon–Sun: 07:30 AM – 11:00 PM · Valet Parking & High-Speed Studio Fibre
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7 bg-[#18181B] border border-white/[0.08] rounded-xl p-6 md:p-8">
                {confirmedReservation ? (
                  <div className="space-y-4 py-4">
                    <div className="text-xs font-mono-tabular text-[#D4955A]">
                      Reservation Confirmed · Code #{confirmedReservation.confirmationCode}
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-[#F4F4F5]">
                      We Look Forward to Hosting You, {confirmedReservation.guestName}
                    </h3>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      Your table for{' '}
                      <span className="text-[#F4F4F5] font-medium">
                        {confirmedReservation.guests} guests
                      </span>{' '}
                      in the{' '}
                      <span className="text-[#F4F4F5] font-medium">
                        {confirmedReservation.seatingZone}
                      </span>{' '}
                      is reserved for{' '}
                      <span className="text-[#D4955A] font-mono-tabular">
                        {confirmedReservation.date} ({confirmedReservation.timeSlot})
                      </span>
                      .
                    </p>
                    <div className="pt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setConfirmedReservation(null)}
                        className="px-4 py-2 rounded-lg bg-[#22201E] border border-white/15 text-xs font-medium text-[#F4F4F5] cursor-pointer"
                      >
                        Book Another Table
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsLiveQueueOpen(true)}
                        className="px-4 py-2 rounded-lg bg-[#D4955A] text-[#111113] text-xs font-semibold cursor-pointer"
                      >
                        View in Roastery Bookings
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleBookReservation} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="res-name" className="block text-xs text-[#A1A1AA] mb-1">
                          Guest Name *
                        </label>
                        <input
                          id="res-name"
                          type="text"
                          required
                          value={resName}
                          onChange={(e) => setResName(e.target.value)}
                          placeholder="e.g., Arjun Rampal"
                          className="w-full bg-[#111113] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#D4955A]"
                        />
                      </div>
                      <div>
                        <label htmlFor="res-phone" className="block text-xs text-[#A1A1AA] mb-1">
                          Mobile Number (WhatsApp / SMS Pass) *
                        </label>
                        <input
                          id="res-phone"
                          type="tel"
                          required
                          value={resPhone}
                          onChange={(e) => setResPhone(e.target.value)}
                          placeholder="+91 98201 55432"
                          className="w-full bg-[#111113] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-[#F4F4F5] font-mono-tabular focus:outline-none focus:border-[#D4955A]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="res-date" className="block text-xs text-[#A1A1AA] mb-1">
                          Date *
                        </label>
                        <input
                          id="res-date"
                          type="date"
                          required
                          value={resDate}
                          onChange={(e) => setResDate(e.target.value)}
                          className="w-full bg-[#111113] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-[#F4F4F5] font-mono-tabular focus:outline-none focus:border-[#D4955A]"
                        />
                      </div>
                      <div>
                        <label htmlFor="res-time" className="block text-xs text-[#A1A1AA] mb-1">
                          Preferred Session
                        </label>
                        <select
                          id="res-time"
                          value={resTime}
                          onChange={(e) => setResTime(e.target.value)}
                          className="w-full bg-[#111113] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#D4955A]"
                        >
                          <option value="08:30 — Morning Viennoiserie Batch">
                            08:30 — Morning Batch
                          </option>
                          <option value="11:00 — Mid-Morning Pour-Over">
                            11:00 — Mid-Morning Pour
                          </option>
                          <option value="15:00 — Afternoon Cold Brew Flight">
                            15:00 — Cold Brew Flight
                          </option>
                          <option value="17:30 — Golden Hour Pour">
                            17:30 — Golden Hour Pour
                          </option>
                          <option value="20:00 — Evening Espresso & Dessert">
                            20:00 — Evening Dessert
                          </option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="res-guests" className="block text-xs text-[#A1A1AA] mb-1">
                          Party Size
                        </label>
                        <select
                          id="res-guests"
                          value={resGuests}
                          onChange={(e) => setResGuests(Number(e.target.value))}
                          className="w-full bg-[#111113] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-[#F4F4F5] font-mono-tabular focus:outline-none focus:border-[#D4955A]"
                        >
                          {[1, 2, 3, 4, 6, 8].map((n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? 'Guest' : 'Guests'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="res-zone" className="block text-xs text-[#A1A1AA] mb-1">
                          Architectural Seating Zone
                        </label>
                        <select
                          id="res-zone"
                          value={resZone}
                          onChange={(e) =>
                            setResZone(e.target.value as TableReservation['seatingZone'])
                          }
                          className="w-full bg-[#111113] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#D4955A]"
                        >
                          <option value="Espresso Bar Counter">Espresso Bar Counter</option>
                          <option value="Sunlit Courtyard">Sunlit Courtyard</option>
                          <option value="Roaster’s Mezzanine">Roaster’s Mezzanine</option>
                          <option value="Private Cupping Room">Private Cupping Room</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="res-occasion" className="block text-xs text-[#A1A1AA] mb-1">
                          Experience Focus
                        </label>
                        <select
                          id="res-occasion"
                          value={resOccasion}
                          onChange={(e) => setResOccasion(e.target.value)}
                          className="w-full bg-[#111113] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#D4955A]"
                        >
                          <option value="Single-Origin Tasting Flight">
                            Single-Origin Tasting Flight
                          </option>
                          <option value="Daily Coffee & Pastry Ritual">
                            Daily Coffee & Pastry Ritual
                          </option>
                          <option value="Founder / Client Meeting">
                            Founder / Client Meeting
                          </option>
                          <option value="Guided Roastery Cupping">
                            Guided Roastery Cupping
                          </option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="res-notes" className="block text-xs text-[#A1A1AA] mb-1">
                        Dietary or Seating Notes (Optional)
                      </label>
                      <input
                        id="res-notes"
                        type="text"
                        value={resNotes}
                        onChange={(e) => setResNotes(e.target.value)}
                        placeholder="e.g., Power outlet table for laptop, pre-warm pistachio croissant"
                        className="w-full bg-[#111113] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#D4955A]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={resSubmitting}
                      className="w-full py-3.5 px-5 rounded-lg bg-[#D4955A] hover:bg-[#DF9F64] text-[#111113] font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>
                        {resSubmitting
                          ? 'Confirming Table Seat...'
                          : 'Confirm Roastery Table Reservation'}
                      </span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet, Refined Footer */}
      <footer className="border-t border-white/[0.08] bg-[#0E0E10] py-12 px-6">
        <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="font-display text-xl font-semibold tracking-wider text-[#F4F4F5]">
              KĀFĪ ROASTERY & BAKEHOUSE
            </span>
            <p className="text-xs text-[#A1A1AA] mt-1">
              14th Road, Bandra West, Mumbai · Direct-Trade Chikmagalur & Ethiopian Specialty Coffee
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#A1A1AA]">
            <a href="#collection" className="hover:text-[#F4F4F5] transition-colors">
              Seasonal Menu
            </a>
            <a href="#custom-brew" className="hover:text-[#F4F4F5] transition-colors">
              Bespoke Brew Lab
            </a>
            <a href="#reservations" className="hover:text-[#F4F4F5] transition-colors">
              Table Reservations
            </a>
            <button
              type="button"
              onClick={() => setIsLiveQueueOpen(true)}
              className="hover:text-[#F4F4F5] transition-colors cursor-pointer"
            >
              Barista Console
            </button>
            <span>© {new Date().getFullYear()} KĀFĪ Roastery</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ProductDetailModal
        item={activeProductModal}
        onClose={() => setActiveProductModal(null)}
        onAddToCart={handleAddToCart}
      />

      <CartCheckoutDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        onOrderCreated={(newOrder) => {
          setOrders((prev) => [newOrder, ...prev]);
          if (currentUser) {
            saveOrderToFirestore(newOrder, currentUser).catch(() => {});
          }
        }}
        onOpenLiveQueue={() => setIsLiveQueueOpen(true)}
      />

      <LiveBaristaQueueModal
        isOpen={isLiveQueueOpen}
        onClose={() => setIsLiveQueueOpen(false)}
        orders={orders}
        menu={menu}
        reservations={reservations}
        onAdvanceOrderStatus={handleAdvanceOrderStatus}
        onToggleStock={handleToggleStock}
        onRefresh={fetchRoasteryData}
      />
    </div>
  );
}
