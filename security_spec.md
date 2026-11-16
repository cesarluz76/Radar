# Security Specification — RADAR VALUATION PRO

## 1. Data Invariants
1. A `/users/{userId}` document can only be read by its verified owner (`request.auth.uid == userId`) or an authenticated verified admin (`isAdmin()`).
2. A user creating their own `/users/{userId}` document MUST set `uid == request.auth.uid` and `plan == 'FREE'` (self-assigned paid plans are forbidden).
3. Updating `/users/{userId}` by the owner cannot escalate `plan` or mutate `uid` or `createdAt`; only `isAdmin()` or an explicitly validated checkout flow may alter `plan` and subscription state.
4. All private subcollections under `/users/{userId}/...` (`portfolios`, `transactions`, `alerts`, `notifications`, `watchlists`, `saved_filters`, `subscriptions`, `payments`) are strictly scoped to `request.auth.uid == userId` (or `isAdmin()` for billing/support).
5. All `create` and `update` operations validate `request.auth.token.email_verified == true`, strict key allowlists (`hasAll` + `hasOnly`), string length bounds, regex ID guards (`^[a-zA-Z0-9_\-]+$`), and server timestamps (`request.time`) on `createdAt`/`updatedAt`.
6. `/config/{docId}` is readable by any authenticated user (`isSignedIn()`), and writable ONLY by `isAdmin()`.
7. `/parameter_history/{historyId}` and `/audit_logs/{logId}` are readable ONLY by `isAdmin()` and immutable once created.

## 2. Dirty Dozen Attack Payloads (All Expected: PERMISSION_DENIED)
1. **Self-Assigned Admin / Paid Plan on Registration**: `POST /users/u1` with `{ uid: "u1", plan: "PREMIUM", ... }` -> DENIED (`plan` must be `"FREE"` on client create).
2. **Privilege Escalation Update**: `PATCH /users/u1` by `u1` changing `{ plan: "PRO" }` -> DENIED (`affectedKeys` cannot include `plan`).
3. **Shadow Field Injection**: `POST /users/u1/portfolios/p1` with extra `{ isAdmin: true, ... }` -> DENIED (`keys().hasOnly(...)` blocks unknown fields).
4. **Spoofed Owner UID**: `POST /users/u1/transactions/t1` by `u2` or with `userId: "u2"` -> DENIED (`userId == request.auth.uid` and path match enforced).
5. **Unverified Email Spoof**: Request where `email == "cesarluzz76@gmail.com"` but `email_verified == false` attempting admin write to `/config/valuation` -> DENIED (`email_verified == true` mandatory).
6. **ID Poisoning / Resource Exhaustion**: Document ID > 128 chars or containing invalid symbols (`../admin`) -> DENIED (`isValidId()` regex guard).
7. **PII Cross-User Read**: User `u2` calling `get` or `list` on `/users/u1` or `/users/u1/transactions` -> DENIED (`isOwner(userId)` enforced).
8. **Blanket List Query Scraping**: User `u2` running collection list on `/users` -> DENIED (`list` denied on `/users` unless `isAdmin()`).
9. **Client Timestamp Forgery**: `POST /users/u1/alerts/a1` with backdated `createdAt` != `request.time` -> DENIED (`createdAt == request.time`).
10. **Immutable Field Tampering**: `PATCH /users/u1/transactions/t1` modifying `createdAt` or `userId` -> DENIED.
11. **Unbounded Array Flood**: `POST /users/u1/alerts/a1` with `channels` array of size 50 -> DENIED (`channels.size() >= 1 && channels.size() <= 3`).
12. **Non-Admin Config Tampering**: Regular user `u1` updating `bazinRate` or `proMonthlyPriceBRL` in `/config/valuation` -> DENIED (`isAdmin()` required).
