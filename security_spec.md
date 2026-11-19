# Security Specification & Red-Team Invariants («ليالي الورد» Cloud Auto-Sync)

## 1. Data Invariants
1. **Default-Deny Catch-All**: No Firestore path outside `/users/{userId}`, `/vaults/{vaultId}`, and `/vaults/{vaultId}/messages/{messageId}` is readable or writable.
2. **Strict Verified Authentication**: All reads and writes require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Owner-Only User Profile Isolation**: `/users/{userId}` is strictly scoped to `request.auth.uid == userId`; `role` (`'wife' | 'husband'`), `uid`, and `createdAt` are immutable after creation; `list` queries on `/users` are completely forbidden.
4. **Two-Member Couple Vault Isolation**: `/vaults/{vaultId}` is capped at 2 members (`wifeUid` + `husbandUid`, `memberUids.size() <= 2`). Only verified members (`ownerUid`, `wifeUid`, or `husbandUid`) may `get` a vault; `list` queries on `/vaults` are forbidden to eliminate cross-couple discovery or scraping.
5. **Single-Spouse Role Authority**: Only `wifeUid` may write `cipherText`, `cipherIv`, `sourceDeviceId`, and `clientUpdatedAt` (and zero plaintext behavioral telemetry counters like answer/set counts are stored in Firestore). Husband can join an empty `husbandUid` slot once and update `husbandName`, never overwrite Wife's answers.
6. **Master Gate Chat Isolation (`/vaults/{vaultId}/messages/{messageId}`)**: Messages are AES-256-GCM encrypted client-side. Reading/listing/creating/deleting messages requires active membership (`ownerUid`/`wifeUid`/`husbandUid`) on the parent `/vaults/{vaultId}` document. Message `senderUid` must equal `request.auth.uid`, `senderRole` must match the caller's actual slot on `/vaults/{vaultId}`, updates are forbidden (`allow update: if false`), and `cipherText` is bounded to 8..4096 bytes.
7. **Zero Spoofed Timestamps & Zero Ghost Fields**: Every `create` asserts `createdAt == request.time`, every `update` asserts `updatedAt == request.time`, and every operation enforces strict `keys().hasOnly(...)` / `affectedKeys().hasOnly(...)` checks plus string/int bounds.
8. **Cryptographic Invite Proof Gate**: Vault creation commits a SHA-256 `joinTokenHash` derived from `vaultKey` (`layali-cloud-join:v1:${vaultKey}`), and joining an open spouse slot requires supplying `joinProofHash == existing().joinTokenHash` while keeping `joinTokenHash` immutable.

## 2. Adversarial "Dirty Dozen" Payloads (All Rejected by Rules)
1. **Unauthenticated read/write** to `/vaults/lw_12345678`: rejected by `isSignedIn()`.
2. **Unverified email token** (`email_verified: false`) writing `/users/{uid}`: rejected by `isVerifiedEmail()`.
3. **Cross-user profile read/write** (`auth.uid != userId`): rejected by `request.auth.uid == userId`.
4. **Role switching on user profile update** (`role: 'husband' -> 'wife'`): rejected by `incoming().role == existing().role` and `affectedKeys().hasOnly(...)`.
5. **Shadow / Ghost field injection** (`isAdmin: true` in `/vaults/{vaultId}` or `/messages/{messageId}`): rejected by `data.keys().hasOnly(...)`.
6. **List scraping attempt** (`getDocs(collection(db, 'vaults'))` or `collection(db, 'users')`): rejected by `allow list: if false`.
7. **Stranger slot-squatting with guessed vaultId alone** (missing or forged `joinProofHash`): rejected by `incoming().joinProofHash == existing().joinTokenHash`.
8. **Stranger joining an already-paired vault** (`husbandUid` already populated): rejected by `existing().husbandUid == ''`.
9. **Self-joining own vault in both roles** (`wifeUid == husbandUid`): rejected by `request.auth.uid != existing().ownerUid` and `data.wifeUid != data.husbandUid`.
10. **Husband spoofing Wife chat message** (`senderRole: 'wife'` written by `husbandUid`): rejected by `getVaultData(vaultId).wifeUid == request.auth.uid`.
11. **Non-member reading/posting chat messages** in `/vaults/{vaultId}/messages/{messageId}`: rejected by `isVaultMember(vaultId)`.
12. **Oversized Denial-of-Wallet payload** (`cipherText` > 131,072 on vault or > 4,096 on message) or **client-backdated timestamp tampering** (`createdAt` / `updatedAt` != `request.time`): rejected by `.size()` bounds, `request.time` check, and `allow update: if false`.
