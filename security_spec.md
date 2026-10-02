# Security Specification (`security_spec.md`) — DecodeWithTech

## 1. Data Invariants

1. **Global Default Deny**: Every unmatched path is strictly denied (`allow read, write: if false;`).
2. **Admin-Only Writes**: Only a verified administrator (`isAdmin()`) can create, update, or delete documents in `/videos`, `/articles`, `/products`, `/social_links`, `/site_settings`, and `/admins`.
3. **Verified Email Requirement**: Every write operation and admin privilege check requires `request.auth != null && request.auth.token.email_verified == true`.
4. **Public Read Boundaries (Query Enforcer)**:
   - Public visitors may `get` or `list` documents in `/videos`, `/articles`, `/products`, and `/social_links` **only** when `resource.data.status == 'published'`.
   - Draft and hidden documents (`status == 'draft'` or `status == 'hidden'`) cannot be read by public visitors.
   - `allow list` rules never invoke `get()` or `exists()` to prevent $O(n)$ read cost amplification. Admin list queries validate `resource.data.authorId == request.auth.uid`.
5. **Strict Schema & Key Validation (`hasAll` + `hasOnly`)**: Every `create` and `update` validates exact required keys, types, string lengths, enum values, and immutable fields (`authorId`, `createdAt`).
6. **Temporal Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on update; `updatedAt` must equal `request.time` on both creation and update.
7. **PII Isolation**: No raw email addresses or personal data are stored in public Firestore documents; `/admins/{adminUid}` stores only `uid`, `role`, `status`, and `createdAt`, readable only by the owner admin (`request.auth.uid == adminUid`).
8. **User Profile Isolation (`/user_profiles/{userId}`)**: Authenticated users can `get`, `create`, and `update` only their own `/user_profiles/{userId}` document (`request.auth.uid == userId`), and updates are strictly restricted to `['displayName', 'updatedAt']` (only name editing is allowed, with `displayName` bounded to 1–80 chars).

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Shadow Field Injection on Video Creation**:
   `{ ...validVideo, "isFeaturedHack": true }` -> Rejected by `data.keys().hasOnly(...)`.
2. **Unverified Admin Email Spoof**:
   Auth token with `email: "ndnilamdevi12@gmail.com"`, `email_verified: false` attempting `create` on `/videos/v1` -> Rejected by `request.auth.token.email_verified == true`.
3. **Public Scraping of Draft Articles (`list`)**:
   Unauthenticated `list` query on `/articles` without `where('status', '==', 'published')` -> Rejected by `resource.data.status == 'published'`.
4. **Public Direct `get` of Hidden Product**:
   Unauthenticated `get` on `/products/prod_hidden` where `status == 'hidden'` -> Rejected by `existing().status == 'published' || isAdmin()`.
5. **Self-Assigned Admin Role Escalation**:
   Non-admin user `uid: "attacker123"` attempting to create `/admins/attacker123` -> Rejected by `isBootstrappedAdmin()`.
6. **Author ID Spoofing on Create**:
   Admin creating `/videos/v1` with `authorId: "someone_else"` -> Rejected by `data.authorId == request.auth.uid`.
7. **Immortal Field Mutation (`createdAt` / `authorId`)**:
   Admin updating `/articles/a1` with modified `createdAt` or `authorId` -> Rejected by `incoming().createdAt == existing().createdAt && incoming().authorId == existing().authorId`.
8. **Client Timestamp Forgery**:
   Admin creating `/products/p1` with `createdAt: Timestamp(2020, 1, 1)` -> Rejected by `incoming().createdAt == request.time`.
9. **Denial-of-Wallet Oversized ID Poisoning**:
   Creating `/videos/{200_char_id}` or ID with special characters -> Rejected by `isValidId(videoId)`.
10. **Value Poisoning on Update**:
    Updating `/products/p1` with `status: "published_hack"` or `name: ""` -> Rejected by `isValidProduct(incoming())`.
11. **Unauthorized Enumeration of `/admins` or `/site_settings`**:
    Calling `list` on `/admins` or `/site_settings` -> Rejected by `allow list: if false;`.
12. **Blanket Delete by Non-Admin**:
    Authenticated non-admin calling `delete` on `/videos/v1` -> Rejected by `isAdmin()`.

---

## 3. Red Team Audit & Verification Summary

- **Shadow Update Test**: Passed (`hasOnly` enforced on both `isValid[Entity]` and `affectedKeys()`).
- **Email Spoofing Test**: Passed (`request.auth.token.email_verified == true` enforced).
- **PII Blanket Test**: Passed (`/admins/{adminUid}` stores no email and restricts `get` to `request.auth.uid == adminUid && isAdmin()`).
- **Query Trust Test**: Passed (`allow list` checks `resource.data.status == 'published'` or `resource.data.authorId == request.auth.uid` with zero `get()`/`exists()` calls).
