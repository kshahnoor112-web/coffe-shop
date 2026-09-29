import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type { MenuItem, Order, TableReservation, GuestReview, OrderStatus } from './src/types/coffee.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'roastery_db.json');

interface DatabaseSchema {
  menu: MenuItem[];
  orders: Order[];
  reservations: TableReservation[];
  reviews: GuestReview[];
}

const INITIAL_MENU: MenuItem[] = [
  {
    id: 'kafi-saffron-cortado',
    name: 'Kashmir Saffron & Cardamom Cortado',
    subtitle: 'Equal parts double ristretto and saffron-infused microfoam',
    category: 'espresso',
    price: 340,
    imageUrl: '/src/assets/images/signature_latte_art_1790682805965.jpg',
    origin: 'Ratnagiri Estate, Chikmagalur',
    elevation: '1,420m ASL',
    process: 'Honey Sun-Dried',
    roastLevel: 'Medium',
    tastingNotes: ['Saffron Blossom', 'Roasted Pistachio', 'Dark Cacao'],
    caffeineMg: 135,
    calories: 110,
    volumeOrWeight: '150 ml',
    description: 'Our signature house pour pairing a syrupy double ristretto pulled at 9 bars with velvety steamed milk steeped with Pampore Mongra saffron threads and freshly crushed green cardamom.',
    featured: true,
    seasonalTag: 'Signature Release',
    inStock: true,
    brewRecipe: {
      dose: '19.5g',
      yield: '38g',
      temp: '93.5°C',
      time: '29s',
    },
  },
  {
    id: 'yuzu-espresso-tonic',
    name: 'Artisanal Yuzu & Blood Orange Espresso Tonic',
    subtitle: 'Single-origin Ethiopian shot suspended over botanical tonic & clear ice',
    category: 'cold_brew',
    price: 380,
    imageUrl: '/src/assets/images/cold_brew_tonic_1790682824630.jpg',
    origin: 'Yirgacheffe Halo Beriti, Ethiopia',
    elevation: '2,050m ASL',
    process: 'Washed Heirloom',
    roastLevel: 'Light-Medium',
    tastingNotes: ['Yuzu Citrus', 'Bergamot', 'Sparkling Cane'],
    caffeineMg: 145,
    calories: 75,
    volumeOrWeight: '280 ml',
    description: 'A bright, effervescent afternoon refresher. We float a floral Ethiopian Yirgacheffe espresso over small-batch Japanese yuzu tonic and a hand-carved crystal ice sphere.',
    featured: true,
    seasonalTag: 'Limited Harvest',
    inStock: true,
    brewRecipe: {
      dose: '18.5g',
      yield: '42g',
      temp: '94.0°C',
      time: '26s',
    },
  },
  {
    id: 'pistachio-praline-croissant',
    name: 'Iranian Pistachio Praline Twice-Baked Croissant',
    subtitle: '72-hour fermented Isigny butter dough filled with roasted pistachio frangipane',
    category: 'bakehouse',
    price: 360,
    imageUrl: '/src/assets/images/artisanal_croissant_pastry_1790682837139.jpg',
    origin: 'In-House Viennoiserie, Mumbai',
    elevation: 'Sea Level Bakehouse',
    process: '72h Cold Fermentation',
    roastLevel: 'Artisanal Bake',
    tastingNotes: ['Cultured Butter', 'Toasted Pistachio', 'Orange Blossom'],
    caffeineMg: 0,
    calories: 410,
    volumeOrWeight: '135 g',
    description: 'Laminated with French AOP cultured butter over three days for a honeycomb crumb, filled generously with stone-ground green pistachio praline and finished with crushed kernels.',
    featured: true,
    seasonalTag: 'Fresh 8 AM Batch',
    inStock: true,
  },
  {
    id: 'smoked-maple-oat-latte',
    name: 'Smoked Maple & Tahini Velvet Latte',
    subtitle: 'Silky oat milk emulsion with organic Vermont dark maple and toasted sesame',
    category: 'espresso',
    price: 360,
    imageUrl: '/src/assets/images/signature_latte_art_1790682805965.jpg',
    origin: 'Baba Budangiri, Karnataka',
    elevation: '1,550m ASL',
    process: 'Natural Anaerobic',
    roastLevel: 'Medium-Dark',
    tastingNotes: ['Smoked Maple', 'Halva Sesame', 'Toasted Pecan'],
    caffeineMg: 150,
    calories: 185,
    volumeOrWeight: '240 ml',
    description: 'Rich nutty depth from artisanal white sesame tahini whisked into warm dark amber maple syrup, crowned with a full-bodied double shot of anaerobic natural Arabica.',
    featured: false,
    inStock: true,
    brewRecipe: {
      dose: '20.0g',
      yield: '40g',
      temp: '93.0°C',
      time: '31s',
    },
  },
  {
    id: 'cascara-nitro-cold-brew',
    name: '20-Hour Kyoto Slow-Drip & Nitro Cascara',
    subtitle: 'Nitrogen-charged cold extraction with a velvety cascading crema head',
    category: 'cold_brew',
    price: 350,
    imageUrl: '/src/assets/images/cold_brew_tonic_1790682824630.jpg',
    origin: 'Kelagur Estate, Chikmagalur',
    elevation: '1,380m ASL',
    process: 'Carbonic Maceration',
    roastLevel: 'Medium',
    tastingNotes: ['Black Cherry', 'Cacao Nibs', 'Velvet Molasses'],
    caffeineMg: 195,
    calories: 15,
    volumeOrWeight: '300 ml',
    description: 'Extracted drop-by-drop over 20 hours through blown-glass Kyoto towers, then infused with pure nitrogen for a stout-like texture with zero dairy or added sugar.',
    featured: false,
    seasonalTag: 'On Tap',
    inStock: true,
  },
  {
    id: 'burnt-basque-cheesecake',
    name: 'Espresso Caramel Burnt Basque Cheesecake',
    subtitle: 'Caramelized high-heat crust with a molten vanilla bean & mascarpone core',
    category: 'bakehouse',
    price: 420,
    imageUrl: '/src/assets/images/artisanal_croissant_pastry_1790682837139.jpg',
    origin: 'San Sebastián Inspired, In-House',
    elevation: 'Deck Oven 245°C',
    process: 'High-Heat Caramelization',
    roastLevel: 'Artisanal Bake',
    tastingNotes: ['Burnt Toffee', 'Tahitian Vanilla', 'Espresso Glaze'],
    caffeineMg: 35,
    calories: 460,
    volumeOrWeight: '160 g',
    description: 'Baked at high temperature for a deeply blistered amber top while keeping the center custard-soft, served with a warm reduction of our house espresso caramel.',
    featured: false,
    inStock: true,
  },
  {
    id: 'ratnagiri-lot-89-beans',
    name: 'Ratnagiri Estate Lot #89 — Whole Bean Reserve',
    subtitle: '72-hour carbonic maceration natural roasted in our copper drum roaster',
    category: 'whole_beans',
    price: 890,
    imageUrl: '/src/assets/images/single_origin_beans_roastery_1790682849245.jpg',
    origin: 'Western Ghats, Chikmagalur',
    elevation: '1,450m ASL',
    process: 'Carbonic Maceration Natural',
    roastLevel: 'Light-Medium',
    tastingNotes: ['Concord Grape', 'Dark Rum Truffle', 'Candied Fig'],
    caffeineMg: 160,
    calories: 5,
    volumeOrWeight: '250 g Tin',
    description: 'Scored 89.25 on the SCA cupping table. Whole coffee cherries are fermented in sealed stainless steel tanks flushed with carbon dioxide before slow drying on raised African beds.',
    featured: true,
    seasonalTag: 'SCA 89.25 Score',
    inStock: true,
    brewRecipe: {
      dose: '15.0g',
      yield: '250g',
      temp: '92.5°C',
      time: '2m 45s (V60)',
    },
  },
  {
    id: 'ethiopia-guji-beans',
    name: 'Ethiopia Guji Uraga — Filter & Espresso Roast',
    subtitle: 'High-altitude heirloom varietal with jasmine aromatics and peach clarity',
    category: 'whole_beans',
    price: 1050,
    imageUrl: '/src/assets/images/single_origin_beans_roastery_1790682849245.jpg',
    origin: 'Uraga Woreda, Guji Zone',
    elevation: '2,200m ASL',
    process: 'Washed Mountain Spring',
    roastLevel: 'Light-Medium',
    tastingNotes: ['White Peach', 'Jasmine Tea', 'Honeycomb'],
    caffeineMg: 155,
    calories: 5,
    volumeOrWeight: '250 g Tin',
    description: 'Grown by smallholder farmers above 2,200 meters. Roasted with a delicate declining rate-of-rise to preserve crystalline floral aromatics and silky stone-fruit sweetness.',
    featured: false,
    seasonalTag: 'Micro-Lot 40 Tins',
    inStock: true,
    brewRecipe: {
      dose: '16.0g',
      yield: '260g',
      temp: '94.5°C',
      time: '2m 30s (V60)',
    },
  },
  {
    id: 'pour-over-geisha-flight',
    name: 'Hand-Poured Origami V60 — Estate Micro-Lot',
    subtitle: 'Brewed table-side in Japanese Mino ware porcelain with custom mineral water',
    category: 'espresso',
    price: 440,
    imageUrl: '/src/assets/images/hero_espresso_pour_1790682785187.jpg',
    origin: 'Sankalp Series, Coorg & Guji',
    elevation: '1,650m–2,100m',
    process: 'Washed & Honey Selection',
    roastLevel: 'Light-Medium',
    tastingNotes: ['Darjeeling First Flush', 'Mandarin Zest', 'Raw Cane'],
    caffeineMg: 140,
    calories: 8,
    volumeOrWeight: '250 ml Carafe',
    description: 'Precision three-stage manual pour-over served in a hand-blown borosilicate glass carafe alongside a sensory aroma glass and origin traceability card.',
    featured: false,
    inStock: true,
    brewRecipe: {
      dose: '16.0g',
      yield: '256g',
      temp: '93.0°C',
      time: '2m 40s',
    },
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    orderNumber: 'KF-8419',
    customerName: 'Aarav Mehta',
    customerPhone: '+91 98201 44120',
    diningMode: 'Dine-In at Table',
    tableOrAddress: 'Table 04 · Sunlit Courtyard',
    paymentMethod: 'UPI / Instant Pay',
    items: [
      {
        name: 'Kashmir Saffron & Cardamom Cortado',
        quantity: 1,
        unitPrice: 340,
        customizationSummary: 'Oatly Barista · Signature House Blend · Raw Demerara',
      },
      {
        name: 'Iranian Pistachio Praline Twice-Baked Croissant',
        quantity: 1,
        unitPrice: 360,
        customizationSummary: 'Warmed in Deck Oven',
      },
    ],
    subtotal: 700,
    discount: 0,
    tax: 35,
    deliveryFee: 0,
    total: 735,
    status: 'Steaming & Plating',
    createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    estimatedReadyMinutes: 4,
  },
  {
    id: 'ord-102',
    orderNumber: 'KF-8420',
    customerName: 'Mira Deshmukh',
    customerPhone: '+91 98194 77310',
    diningMode: 'Express Bar Pickup',
    tableOrAddress: 'Bandra Flagship Espresso Bar',
    paymentMethod: 'UPI / Instant Pay',
    items: [
      {
        name: 'Artisanal Yuzu & Blood Orange Espresso Tonic',
        quantity: 2,
        unitPrice: 380,
        customizationSummary: 'Over Crystal Ice · Single-Origin Ethiopia',
      },
    ],
    subtotal: 760,
    discount: 0,
    tax: 38,
    deliveryFee: 0,
    total: 798,
    status: 'Grinding & Extracting',
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    estimatedReadyMinutes: 6,
  },
];

const INITIAL_RESERVATIONS: TableReservation[] = [
  {
    id: 'res-201',
    confirmationCode: 'KFR-914',
    guestName: 'Rohan & Tara Kapoor',
    guestEmail: 'rohan.kapoor@studio.in',
    guestPhone: '+91 98209 11234',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '17:30 — Golden Hour Pour',
    guests: 2,
    seatingZone: 'Espresso Bar Counter',
    occasion: 'Single-Origin Tasting Flight',
    specialRequests: 'Seats near the Slayer 3-group espresso machine if available.',
    status: 'Confirmed',
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
];

const INITIAL_REVIEWS: GuestReview[] = [
  {
    id: 'rev-1',
    guestName: 'Vikramaditya Sen',
    roleOrContext: 'Q-Grader & Architectural Designer, Mumbai',
    orderedItem: 'Ratnagiri Estate Lot #89 & Saffron Cortado',
    rating: 5,
    comment: 'Switched our studio’s daily coffee ritual to KĀFĪ six months ago. Their 93.5°C extraction on the Ratnagiri carbonic maceration lot delivers cleaner stone-fruit acidity and 30% longer crema persistence than any third-wave bar in the city.',
    createdAt: '2026-09-18',
  },
  {
    id: 'rev-2',
    guestName: 'Ananya Krishnan',
    roleOrContext: 'Pastry Chef, Kala Ghoda Culinary Collective',
    orderedItem: 'Iranian Pistachio Praline Croissant & Yuzu Tonic',
    rating: 5,
    comment: 'The 72-hour laminated honeycomb structure on the pistachio croissant rivals Parisian viennoiseries, and pairing it with the washed Yirgacheffe yuzu tonic cuts through the cultured butter richness effortlessly.',
    createdAt: '2026-09-24',
  },
  {
    id: 'rev-3',
    guestName: 'Kabir Malhotra',
    roleOrContext: 'Founder, Monochrome Design House',
    orderedItem: 'Private Cupping Room & Bespoke Brew Bar',
    rating: 5,
    comment: 'Hosted four client workshops in the Roaster’s Mezzanine this quarter. Pre-ordering bespoke drinks via the live bar queue meant every cup arrived at 65°C within 4 minutes of seating.',
    createdAt: '2026-09-27',
  },
];

function loadDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const seed: DatabaseSchema = {
        menu: INITIAL_MENU,
        orders: INITIAL_ORDERS,
        reservations: INITIAL_RESERVATIONS,
        reviews: INITIAL_REVIEWS,
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    return {
      menu: parsed.menu?.length ? parsed.menu : INITIAL_MENU,
      orders: parsed.orders || INITIAL_ORDERS,
      reservations: parsed.reservations || INITIAL_RESERVATIONS,
      reviews: parsed.reviews?.length ? parsed.reviews : INITIAL_REVIEWS,
    };
  } catch {
    return {
      menu: INITIAL_MENU,
      orders: INITIAL_ORDERS,
      reservations: INITIAL_RESERVATIONS,
      reviews: INITIAL_REVIEWS,
    };
  }
}

function saveDb(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // GET full roastery state (menu, live orders, reservations, reviews)
  app.get('/api/bootstrap', (_req, res) => {
    const db = loadDb();
    res.json(db);
  });

  // GET menu
  app.get('/api/menu', (_req, res) => {
    const db = loadDb();
    res.json(db.menu);
  });

  // PATCH toggle menu item stock
  app.patch('/api/menu/:id/stock', (req, res) => {
    const db = loadDb();
    const item = db.menu.find((m) => m.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }
    item.inStock = typeof req.body.inStock === 'boolean' ? req.body.inStock : !item.inStock;
    saveDb(db);
    res.json(item);
  });

  // GET orders
  app.get('/api/orders', (_req, res) => {
    const db = loadDb();
    res.json(db.orders);
  });

  // POST create new order
  app.post('/api/orders', (req, res) => {
    const db = loadDb();
    const {
      customerName,
      customerPhone,
      diningMode,
      tableOrAddress,
      paymentMethod,
      items,
      promoCode,
    } = req.body;

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Customer name and at least one item are required.' });
      return;
    }

    const subtotal = items.reduce(
      (sum: number, item: { unitPrice: number; quantity: number }) =>
        sum + Number(item.unitPrice) * Number(item.quantity),
      0
    );

    const normalizedPromo = String(promoCode || '').trim().toUpperCase();
    const discount = normalizedPromo === 'KAFI15' ? Math.round(subtotal * 0.15) : 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = Math.round(taxableAmount * 0.05);
    const deliveryFee =
      diningMode === 'Roastery Courier Delivery' && taxableAmount < 900 ? 60 : 0;
    const total = taxableAmount + tax + deliveryFee;

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `KF-${randomCode}`,
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone || '+91 98200 00000').trim(),
      diningMode: diningMode || 'Dine-In at Table',
      tableOrAddress: String(tableOrAddress || 'Table 01 · Main Roastery').trim(),
      paymentMethod: paymentMethod || 'UPI / Instant Pay',
      items,
      subtotal,
      discount,
      tax,
      deliveryFee,
      total,
      status: 'Received',
      createdAt: new Date().toISOString(),
      estimatedReadyMinutes: diningMode === 'Roastery Courier Delivery' ? 24 : 6,
    };

    db.orders.unshift(newOrder);
    saveDb(db);
    res.status(201).json(newOrder);
  });

  // PATCH update order status in Barista Queue
  app.patch('/api/orders/:id/status', (req, res) => {
    const db = loadDb();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const validStatuses: OrderStatus[] = [
      'Received',
      'Grinding & Extracting',
      'Steaming & Plating',
      'Ready for Pickup / Table',
      'Completed',
    ];
    const nextStatus = req.body.status as OrderStatus;
    if (!validStatuses.includes(nextStatus)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    order.status = nextStatus;
    if (nextStatus === 'Grinding & Extracting') order.estimatedReadyMinutes = 5;
    if (nextStatus === 'Steaming & Plating') order.estimatedReadyMinutes = 2;
    if (nextStatus === 'Ready for Pickup / Table' || nextStatus === 'Completed') {
      order.estimatedReadyMinutes = 0;
    }
    saveDb(db);
    res.json(order);
  });

  // GET reservations
  app.get('/api/reservations', (_req, res) => {
    const db = loadDb();
    res.json(db.reservations);
  });

  // POST create table reservation
  app.post('/api/reservations', (req, res) => {
    const db = loadDb();
    const {
      guestName,
      guestEmail,
      guestPhone,
      date,
      timeSlot,
      guests,
      seatingZone,
      occasion,
      specialRequests,
    } = req.body;

    if (!guestName || !guestPhone || !date || !timeSlot) {
      res.status(400).json({ error: 'Name, phone, date, and time slot are required.' });
      return;
    }

    const codeNum = Math.floor(100 + Math.random() * 900);
    const newReservation: TableReservation = {
      id: `res-${Date.now()}`,
      confirmationCode: `KFR-${codeNum}`,
      guestName: String(guestName).trim(),
      guestEmail: String(guestEmail || 'guest@kafiroastery.in').trim(),
      guestPhone: String(guestPhone).trim(),
      date: String(date),
      timeSlot: String(timeSlot),
      guests: Number(guests) || 2,
      seatingZone: seatingZone || 'Espresso Bar Counter',
      occasion: String(occasion || 'Daily Coffee Ritual'),
      specialRequests: String(specialRequests || '').trim(),
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
    };

    db.reservations.unshift(newReservation);
    saveDb(db);
    res.status(201).json(newReservation);
  });

  // PATCH update reservation status
  app.patch('/api/reservations/:id/status', (req, res) => {
    const db = loadDb();
    const reservation = db.reservations.find((r) => r.id === req.params.id);
    if (!reservation) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }
    reservation.status = req.body.status || 'Confirmed';
    saveDb(db);
    res.json(reservation);
  });

  // POST guest review / tasting note
  app.post('/api/reviews', (req, res) => {
    const db = loadDb();
    const { guestName, roleOrContext, orderedItem, rating, comment } = req.body;
    if (!guestName || !comment) {
      res.status(400).json({ error: 'Name and tasting note comment are required.' });
      return;
    }
    const newReview: GuestReview = {
      id: `rev-${Date.now()}`,
      guestName: String(guestName).trim(),
      roleOrContext: String(roleOrContext || 'Verified Roastery Guest').trim(),
      orderedItem: String(orderedItem || 'House Espresso Pour').trim(),
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      comment: String(comment).trim(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    db.reviews.unshift(newReview);
    saveDb(db);
    res.status(201).json(newReview);
  });

  // Vite middleware in development, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KĀFĪ Roastery full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
