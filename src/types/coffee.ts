export type MenuCategory = 'espresso' | 'cold_brew' | 'bakehouse' | 'whole_beans';

export interface MenuItem {
  id: string;
  name: string;
  subtitle: string;
  category: MenuCategory;
  price: number; // in INR (₹)
  imageUrl: string;
  origin: string;
  elevation: string;
  process: string;
  roastLevel: 'Light-Medium' | 'Medium' | 'Medium-Dark' | 'Artisanal Bake';
  tastingNotes: string[];
  caffeineMg: number;
  calories: number;
  volumeOrWeight: string;
  description: string;
  featured?: boolean;
  seasonalTag?: string;
  inStock: boolean;
  brewRecipe?: {
    dose: string;
    yield: string;
    temp: string;
    time: string;
  };
}

export interface CartItemCustomization {
  milk: 'Whole Estate Milk' | 'Oatly Barista' | 'Roasted Almond' | 'Unsweetened Soy' | 'Black / None';
  shotType: 'Signature House Blend' | 'Single-Origin Ethiopia' | 'Decaf Swiss Water' | 'Double Ristretto (+₹60)';
  sweetness: 'Unsweetened' | 'Raw Demerara' | 'Kashmir Saffron Honey (+₹45)' | 'Madagascar Vanilla (+₹45)';
  temperature: '65°C Velvety' | 'Extra Hot 72°C' | 'Over Crystal Ice';
  grindSize?: 'Whole Bean' | 'Espresso Fine' | 'V60 Pour-Over' | 'French Press Coarse';
  notes?: string;
}

export interface CartItem {
  cartItemId: string;
  menuItem: MenuItem;
  quantity: number;
  unitPrice: number;
  customization: CartItemCustomization;
  isBespoke?: boolean;
  bespokeRecipeName?: string;
}

export type OrderStatus =
  | 'Received'
  | 'Grinding & Extracting'
  | 'Steaming & Plating'
  | 'Ready for Pickup / Table'
  | 'Completed';

export type DiningMode = 'Dine-In at Table' | 'Express Bar Pickup' | 'Roastery Courier Delivery';

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  diningMode: DiningMode;
  tableOrAddress: string;
  paymentMethod: 'UPI / Instant Pay' | 'Pay at Espresso Bar' | 'Cash on Delivery';
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    customizationSummary: string;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  estimatedReadyMinutes: number;
}

export interface TableReservation {
  id: string;
  confirmationCode: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  date: string;
  timeSlot: string;
  guests: number;
  seatingZone: 'Espresso Bar Counter' | 'Sunlit Courtyard' | 'Roaster’s Mezzanine' | 'Private Cupping Room';
  occasion: string;
  specialRequests?: string;
  status: 'Confirmed' | 'Seated' | 'Cancelled';
  createdAt: string;
}

export interface GuestReview {
  id: string;
  guestName: string;
  roleOrContext: string;
  orderedItem: string;
  rating: number;
  comment: string;
  createdAt: string;
}
