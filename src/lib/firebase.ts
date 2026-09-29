import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type {
  MenuItem,
  Order,
  OrderStatus,
  TableReservation,
  GuestReview,
} from '../types/coffee';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Defensive payload sanitizers matching firebase-blueprint.json constraints
function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || `id-${Date.now()}`;
}

function clampString(val: string, minLen: number, maxLen: number, fallback: string): string {
  const trimmed = (val || '').trim();
  const base = trimmed.length >= minLen ? trimmed : fallback;
  return base.slice(0, maxLen);
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged, type User };

export function isRoasteryAdmin(user: User | null): boolean {
  return Boolean(user && user.emailVerified && user.email === 'kshahnoor112@gmail.com');
}

export async function saveOrderToFirestore(order: Order, user: User): Promise<void> {
  const safeId = sanitizeId(order.id);
  const orderPath = `orders/${safeId}`;
  const itemSummary = order.items
    .slice(0, 10)
    .map((it) =>
      clampString(
        `${it.quantity}x ${it.name}${it.customizationSummary ? ` (${it.customizationSummary})` : ''}`,
        1,
        240,
        '1x Specialty Coffee'
      )
    );

  try {
    await setDoc(doc(db, 'orders', safeId), {
      id: safeId,
      ownerId: user.uid,
      orderNumber: clampString(order.orderNumber, 3, 24, 'KF-1000'),
      customerName: clampString(order.customerName, 1, 100, 'Roastery Guest'),
      diningMode: order.diningMode,
      tableOrAddress: clampString(order.tableOrAddress, 1, 240, 'Main Espresso Bar'),
      paymentMethod: order.paymentMethod,
      itemSummary: itemSummary.length > 0 ? itemSummary : ['1x House Espresso'],
      subtotal: Math.max(0, Math.min(500000, Math.round(order.subtotal))),
      discount: Math.max(0, Math.min(500000, Math.round(order.discount))),
      tax: Math.max(0, Math.min(100000, Math.round(order.tax))),
      deliveryFee: Math.max(0, Math.min(5000, Math.round(order.deliveryFee))),
      total: Math.max(0, Math.min(600000, Math.round(order.total))),
      status: 'Received',
      estimatedReadyMinutes: Math.max(0, Math.min(180, order.estimatedReadyMinutes)),
      createdAt: serverTimestamp(),
    });

    // Save isolated PII contact record in /orders/{orderId}/private/contact
    await setDoc(doc(db, 'orders', safeId, 'private', 'contact'), {
      ownerId: user.uid,
      phone: clampString(order.customerPhone, 3, 40, '+91 98200 00000'),
      email: clampString(user.email || '', 0, 120, ''),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, orderPath);
  }
}

export async function saveReservationToFirestore(
  res: TableReservation,
  user: User
): Promise<void> {
  const safeId = sanitizeId(res.id);
  const resPath = `reservations/${safeId}`;
  try {
    await setDoc(doc(db, 'reservations', safeId), {
      id: safeId,
      ownerId: user.uid,
      confirmationCode: clampString(res.confirmationCode, 3, 24, 'KFR-100'),
      guestName: clampString(res.guestName, 1, 100, 'Roastery Guest'),
      date: clampString(res.date, 8, 20, new Date().toISOString().split('T')[0]),
      timeSlot: clampString(res.timeSlot, 3, 80, '17:30 — Golden Hour Pour'),
      guests: Math.max(1, Math.min(20, Number(res.guests) || 2)),
      seatingZone:
        res.seatingZone === 'Roaster’s Mezzanine' ? 'Roasters Mezzanine' : res.seatingZone,
      occasion: clampString(res.occasion, 2, 120, 'Daily Coffee Ritual'),
      specialRequests: (res.specialRequests || '').slice(0, 300),
      status: 'Confirmed',
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'reservations', safeId, 'private', 'contact'), {
      ownerId: user.uid,
      phone: clampString(res.guestPhone, 3, 40, '+91 98200 00000'),
      email: clampString(res.guestEmail || user.email || '', 0, 120, ''),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, resPath);
  }
}

export async function saveReviewToFirestore(review: GuestReview, user: User): Promise<void> {
  const safeId = sanitizeId(review.id);
  const revPath = `reviews/${safeId}`;
  try {
    await setDoc(doc(db, 'reviews', safeId), {
      id: safeId,
      authorId: user.uid,
      guestName: clampString(review.guestName, 1, 80, 'Roastery Guest'),
      roleOrContext: clampString(review.roleOrContext, 1, 120, 'Verified Roastery Guest'),
      orderedItem: clampString(review.orderedItem, 1, 120, 'House Espresso Pour'),
      rating: Math.max(1, Math.min(5, Math.round(review.rating))),
      comment: clampString(review.comment, 5, 500, 'Exceptional single-origin extraction.'),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, revPath);
  }
}

export async function updateOrderStatusInFirestore(
  orderId: string,
  nextStatus: OrderStatus,
  estimatedReadyMinutes: number
): Promise<void> {
  const safeId = sanitizeId(orderId);
  const path = `orders/${safeId}`;
  try {
    await updateDoc(doc(db, 'orders', safeId), {
      status: nextStatus,
      estimatedReadyMinutes,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function seedMenuItemToFirestore(item: MenuItem): Promise<void> {
  const safeId = sanitizeId(item.id);
  const path = `menu/${safeId}`;
  try {
    await setDoc(doc(db, 'menu', safeId), {
      id: safeId,
      name: clampString(item.name, 2, 120, 'Specialty Coffee'),
      subtitle: clampString(item.subtitle, 2, 200, 'Roastery Selection'),
      category: item.category,
      price: item.price,
      imageUrl: item.imageUrl.slice(0, 500),
      origin: clampString(item.origin, 2, 120, 'Chikmagalur'),
      elevation: clampString(item.elevation, 2, 80, '1400m ASL'),
      process: clampString(item.process, 2, 100, 'Washed'),
      roastLevel: item.roastLevel,
      tastingNotes: item.tastingNotes.slice(0, 6),
      caffeineMg: item.caffeineMg,
      calories: item.calories,
      volumeOrWeight: clampString(item.volumeOrWeight, 1, 50, '240 ml'),
      description: clampString(item.description, 5, 600, item.subtitle),
      inStock: item.inStock,
      ...(item.featured !== undefined ? { featured: item.featured } : {}),
      ...(item.seasonalTag ? { seasonalTag: item.seasonalTag } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToGuestReviews(onData: (reviews: GuestReview[]) => void) {
  const path = 'reviews';
  const q = query(collection(db, path), where('rating', '>=', 1));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: GuestReview[] = snapshot.docs.map((d) => {
        const data = d.data();
        const createdTs = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
        return {
          id: data.id || d.id,
          guestName: data.guestName || 'Roastery Guest',
          roleOrContext: data.roleOrContext || 'Verified Guest',
          orderedItem: data.orderedItem || 'Signature Pour',
          rating: Number(data.rating) || 5,
          comment: data.comment || '',
          createdAt: createdTs.toISOString().split('T')[0],
        };
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToUserOrders(user: User, onData: (orders: Order[]) => void) {
  const path = 'orders';
  const q = isRoasteryAdmin(user)
    ? query(collection(db, path))
    : query(collection(db, path), where('ownerId', '==', user.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Order[] = snapshot.docs.map((d) => {
        const data = d.data();
        const createdTs = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
        const summaryList: string[] = Array.isArray(data.itemSummary) ? data.itemSummary : [];
        return {
          id: data.id || d.id,
          orderNumber: data.orderNumber || 'KF-1000',
          customerName: data.customerName || 'Guest',
          customerPhone: 'Stored in Private Vault',
          diningMode: data.diningMode || 'Dine-In at Table',
          tableOrAddress: data.tableOrAddress || 'Main Bar',
          paymentMethod: data.paymentMethod || 'UPI / Instant Pay',
          items: summaryList.map((line) => ({
            name: line,
            quantity: 1,
            unitPrice: data.subtotal || 0,
            customizationSummary: 'Synced via Firestore',
          })),
          subtotal: Number(data.subtotal) || 0,
          discount: Number(data.discount) || 0,
          tax: Number(data.tax) || 0,
          deliveryFee: Number(data.deliveryFee) || 0,
          total: Number(data.total) || 0,
          status: (data.status as OrderStatus) || 'Received',
          createdAt: createdTs.toISOString(),
          estimatedReadyMinutes: Number(data.estimatedReadyMinutes) || 0,
        };
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToUserReservations(
  user: User,
  onData: (reservations: TableReservation[]) => void
) {
  const path = 'reservations';
  const q = isRoasteryAdmin(user)
    ? query(collection(db, path))
    : query(collection(db, path), where('ownerId', '==', user.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: TableReservation[] = snapshot.docs.map((d) => {
        const data = d.data();
        const createdTs = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
        return {
          id: data.id || d.id,
          confirmationCode: data.confirmationCode || 'KFR-100',
          guestName: data.guestName || 'Guest',
          guestEmail: '',
          guestPhone: 'Stored in Private Vault',
          date: data.date || '',
          timeSlot: data.timeSlot || '',
          guests: Number(data.guests) || 2,
          seatingZone: data.seatingZone || 'Espresso Bar Counter',
          occasion: data.occasion || 'Coffee Ritual',
          specialRequests: data.specialRequests || '',
          status: data.status || 'Confirmed',
          createdAt: createdTs.toISOString(),
        };
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
