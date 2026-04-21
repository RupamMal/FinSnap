# Security Specification: PennyWise AI

## 1. Data Invariants
- **Identity Integrity**: Every `Transaction` and `UserProfile` must be owned by the `request.auth.uid`. No user can read or modify another user's financial data.
- **Relational Integrity**: A `Transaction` can only be created if a corresponding `UserProfile` exists for that user.
- **Schema Hardening**: All numerical values must be `number` types, and all strings must have defined maximum lengths to prevent Denial of Wallet attacks.

## 2. The "Dirty Dozen" Payloads (Red Team Tests)
1. **The Ghost Write**: Attempt to create a transaction for `user_A` while authenticated as `user_B`.
2. **The Field Injection**: Attempt to create a transaction with an extra `isVerified: true` field.
3. **The Identity Spoof**: Attempt to update a transaction's `userId` to a different user.
4. **The Empty Profile**: Attempt to create a transaction before an onboarding profile exists.
5. **The Unverified Breach**: Attempt to write data with an unverified email (if email verified is required).
6. **The String Poison**: Attempt to write a 1MB string into the `merchant` field.
7. **The Negative Drain**: Attempt to set a negative `amount` (if disallowed).
8. **The State Shortcut**: Attempt to change a read-only field like `createdAt`.
9. **The Orphaned Document**: Attempt to write a transaction to an invalid ID (e.g., `../../../etc/passwd`).
10. **The Bulk Leak**: Attempt to list all transactions without a `userId` filter.
11. **The Profile Hijack**: Attempt to change the `userId` in a `userProfile` during an update.
12. **The Type Confusion**: Attempt to send a `string` as the `monthlyLimit`.

## 3. Conflict Report & Final Audit
- Identity Spoofing: **BLOCKED** by `data.userId == request.auth.uid` and path variable checks.
- State Shortcutting: **BLOCKED** by `affectedKeys().hasOnly()` during updates.
- Resource Poisoning: **BLOCKED** by `.size()` checks on all string inputs.
- Query Trust: **BLOCKED** by rule-side `resource.data.userId` validation.
