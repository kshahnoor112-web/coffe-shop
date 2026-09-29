# KĀFĪ Roastery & Bakehouse — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants & Relational Architecture
1. **Default-Deny Safety Net**: Every unmatched path is strictly rejected (`allow read, write: if false;`).
2. **Verified Identity**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Bootstrapped Roastery Admin**: Admin privileges (`isAdmin()`) require either a document in `/admins/$(request.auth.uid)` or the verified runtime owner email (`kshahnoor112@gmail.com` with `email_verified == true`).
4. **PII Split-Collection Isolation**: Customer phone numbers and emails are strictly isolated in `/orders/{orderId}/private/{docId}` and `/reservations/{reservationId}/private/{docId}` where read/write is restricted exclusively to `isOwner` (verified via Master Gate `get()` on the parent document) or `isAdmin()`.
5. **Terminal State Locking**: Once an `Order` reaches `status == 'Completed'` or a `Reservation` reaches `status == 'Cancelled'`, non-admin updates are permanently blocked.
6. **Temporal Integrity & Immortal Fields**: `createdAt` must equal `request.time` on `create` and remain immutable on `update`. `updatedAt` must equal `request.time` on `update`. `ownerId` and `authorId` are immutable after creation.
7. **Secure List Queries**: `allow list` on `/orders` and `/reservations` strictly enforces `resource.data.ownerId == request.auth.uid || isAdmin()` without delegating filtering to the client or performing `get()` calls inside `list`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 1 (Shadow Field Injection on Order Create)**: Includes `"isFreeDrink": true` outside the `hasOnly` allowlist -> `PERMISSION_DENIED`.
2. **Payload 2 (Identity Spoofing on Order Create)**: Authenticated as `user_A`, sets `ownerId: "user_B"` -> `PERMISSION_DENIED`.
3. **Payload 3 (Unverified Email Admin Spoof)**: Token has `email: "kshahnoor112@gmail.com"` but `email_verified: false` attempting to mutate `/menu/kafi-saffron-cortado` -> `PERMISSION_DENIED`.
4. **Payload 4 (Terminal State Mutation)**: Attempting to update an order whose existing `status` is `'Completed'` back to `'Received'` as a non-admin -> `PERMISSION_DENIED`.
5. **Payload 5 (ID Poisoning Attack)**: Creating a document with a 300-character or special-character ID failing `isValidId()` -> `PERMISSION_DENIED`.
6. **Payload 6 (Denial-of-Wallet String Overflow)**: Submitting a `GuestReview` with a 50,000-character `comment` exceeding `maxLength: 500` -> `PERMISSION_DENIED`.
7. **Payload 7 (Unbounded Array Injection)**: Submitting an `Order` with 25 items in `itemSummary` exceeding `.size() <= 10` -> `PERMISSION_DENIED`.
8. **Payload 8 (Cross-Tenant Order Scraping)**: `user_A` running an unconstrained `list` query on `/orders` to read `user_B`'s orders -> `PERMISSION_DENIED`.
9. **Payload 9 (PII Subcollection Leak)**: `user_B` attempting `get` on `/orders/ord_1/private/contact` owned by `user_A` -> `PERMISSION_DENIED`.
10. **Payload 10 (Client Timestamp Forgery)**: Creating a `Reservation` with a backdated `createdAt` timestamp != `request.time` -> `PERMISSION_DENIED`.
11. **Payload 11 (Immortal Field Tampering)**: Updating an `Order` to change `ownerId` or `subtotal` during a customer cancellation/note update -> `PERMISSION_DENIED`.
12. **Payload 12 (Orphaned Subcollection Write)**: Writing to `/orders/non_existent_order/private/contact` where the parent `/orders/non_existent_order` does not exist -> `PERMISSION_DENIED`.
