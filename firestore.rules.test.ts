/**
 * Phase 0: Firestore Rules Security Test Specification ("Dirty Dozen" Payload Verification)
 * Verifies that all 12 adversarial payloads defined in security_spec.md are rejected.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  email?: string;
  emailVerified?: boolean;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_SECURITY_TESTS: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Order Create',
    collectionPath: '/orders/ord_101',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    payload: {
      id: 'ord_101',
      ownerId: 'user_A',
      orderNumber: 'KF-1001',
      customerName: 'Aarav',
      diningMode: 'Dine-In at Table',
      tableOrAddress: 'Table 04',
      paymentMethod: 'UPI / Instant Pay',
      itemSummary: ['1x Saffron Cortado'],
      subtotal: 340,
      discount: 0,
      tax: 17,
      deliveryFee: 0,
      total: 357,
      status: 'Received',
      estimatedReadyMinutes: 6,
      isFreeDrink: true, // Ghost field
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Identity Spoofing on Order Create',
    collectionPath: '/orders/ord_102',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    payload: {
      id: 'ord_102',
      ownerId: 'user_B', // Spoofed ownerId
      orderNumber: 'KF-1002',
      customerName: 'Aarav',
      diningMode: 'Dine-In at Table',
      tableOrAddress: 'Table 04',
      paymentMethod: 'UPI / Instant Pay',
      itemSummary: ['1x Saffron Cortado'],
      subtotal: 340,
      discount: 0,
      tax: 17,
      deliveryFee: 0,
      total: 357,
      status: 'Received',
      estimatedReadyMinutes: 6,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Admin Spoof on Menu Update',
    collectionPath: '/menu/kafi-saffron-cortado',
    operation: 'update',
    authUid: 'spoof_admin',
    email: 'kshahnoor112@gmail.com',
    emailVerified: false,
    payload: { inStock: false },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Terminal State Mutation on Completed Order',
    collectionPath: '/orders/ord_completed',
    operation: 'update',
    authUid: 'user_A',
    emailVerified: true,
    payload: { status: 'Received' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'ID Poisoning Attack with Invalid Characters',
    collectionPath: '/orders/invalid$id!with*spaces',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    payload: { id: 'invalid$id!with*spaces' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Denial-of-Wallet String Overflow on GuestReview',
    collectionPath: '/reviews/rev_overflow',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    payload: {
      id: 'rev_overflow',
      authorId: 'user_A',
      guestName: 'Aarav',
      roleOrContext: 'Guest',
      orderedItem: 'Cortado',
      rating: 5,
      comment: 'X'.repeat(2000), // Exceeds 500 char limit
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unbounded Array Injection on Order itemSummary',
    collectionPath: '/orders/ord_array_overflow',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    payload: {
      itemSummary: new Array(25).fill('1x Espresso'),
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Cross-Tenant Order Scraping',
    collectionPath: '/orders/ord_owned_by_B',
    operation: 'get',
    authUid: 'user_A',
    emailVerified: true,
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'PII Subcollection Leak to Non-Owner',
    collectionPath: '/orders/ord_owned_by_A/private/contact',
    operation: 'get',
    authUid: 'user_B',
    emailVerified: true,
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Client Timestamp Forgery on Reservation',
    collectionPath: '/reservations/res_forged_time',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    payload: {
      createdAt: '1999-01-01T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Immortal Field Tampering on Order Update',
    collectionPath: '/orders/ord_101',
    operation: 'update',
    authUid: 'user_A',
    emailVerified: true,
    payload: {
      ownerId: 'user_B',
      total: 1,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Orphaned Subcollection Write Without Parent Order',
    collectionPath: '/orders/non_existent_order/private/contact',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    payload: {
      ownerId: 'user_A',
      phone: '+91 98201 00000',
      email: 'guest@example.com',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
