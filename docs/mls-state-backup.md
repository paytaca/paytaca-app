# MLS State Backup Implementation Plan

## Overview

MLS group state (the ratchet tree + secret tree that lets a device decrypt
messages) currently lives only in per-device IndexedDB
(`src/services/mls/state-store.js`). A wallet imported onto a new device has no
group state, so the device cannot decrypt past messages and cannot send
("Unknown MLS room"). The room list still syncs from Watchtower, so the user
sees the room but it's dead.

Two cases exist:

- **Member** (was invited) — a welcome (kind 30119) exists on the relay, so
  the fresh device can already rebuild via the welcome-driven auto-rejoin
  (implemented in `receiveMlsMessage` in `src/store/nostr-chat/mls-actions.js`).
- **Creator / owner** — no welcome was ever published, so the group is
  cryptographically unrecoverable once the originating device's storage is
  gone. This plan closes that gap.

## Design

Publish an **encrypted snapshot of the serialized MLS group state** so any
device holding the wallet mnemonic can recover the group.

`encodeGroupState(clientState)` (ts-mls) already produces deterministic bytes —
the same bytes stored per device in IndexedDB. We NIP-44-encrypt those bytes
**to the user's own Nostr pubkey** and store the ciphertext on the relay as a
replaceable event. Watchtower is also an option, but the relay already hosts
all other MLS data (welcomes, messages, commits), so a relay event keeps the
mechanism in one transport and requires no new server endpoint.

### Threat model

- The relay/Watchtower stores **ciphertext only** — same model as the app's
  existing encrypted room-name metadata.
- Decryption key derives from the wallet mnemonic (the Nostr key). No new key
  material, no new signing surface, no change to entropy/seed handling.
- A relay compromise or server leak reveals nothing; the secrets require the
  mnemonic.

### MLS forward-secrecy nuance (important)

The serialized state only contains secrets for the **current epoch**; when a
commit advances the epoch, the previous epoch's secret tree is discarded.

- A **latest** snapshot can decrypt only messages from its epoch onward.
- For **full history recovery**, the snapshot that must be preserved is the
  **initial** one — the creation-epoch state for creators, the join-epoch state
  for members. Restore the initial snapshot, then replay the group's relay
  history in `created_at` order; each message decrypts before the next commit
  erases its epoch's tree (the existing catch-up replay already depends on this
  ordering).

Members recovering via a welcome never see pre-join history — standard MLS
semantics — so the initial snapshot for a member is their join-epoch state.

## Event format

- **kind:** a dedicated MLS-state kind in the application range (e.g. 30116,
  the next unused kind near the existing 30117/30118/30119 family).
- **content:** `JSON.stringify({ name: 'Paytaca MLS State', data: { mlsKind: 30116, mlsState: <base64 nip44 ciphertext> } })`
  — matching the existing MLS event envelope (`buildMlsNostrEvent`).
- **tags:**
  - `['d', 'paytaca:mls-state:' + mlsGroupIdHex]` — makes it addressable and
    **replaceable** (the relay keeps only the newest).
  - `['h', mlsGroupIdHex]` — group linkage, consistent with other MLS events.
  - `['p', myPubKeyHex]` — so the existing `#p` subscription/history fetch
    delivers it to any of the user's devices.
  - `['e', 'initial' | 'epoch:<n>']`-style marker tag (e.g.
    `['snap', 'initial']` vs `['snap', 'epoch']`) so a restoring device can
    tell whether the snapshot is a creation/join-epoch snapshot (full replay
    possible) or a later-epoch refresh (partial recovery).
- **signed** with the wallet's Nostr key like every other MLS event.

Because the event is replaceable by d-tag, a group holds at most one snapshot
per author. That implies the **refresh strategy must not overwrite the
initial snapshot** — see "Snapshot cadence" below.

## Snapshot cadence

- **Publish at creation** (`createMlsGroup`) — the creation-epoch snapshot.
  This is what enables full history recovery for creator-owned groups, the gap
  this plan fixes.
- **Publish at join** (`joinMlsGroup`) — the member's join-epoch snapshot, for
  the same reason on the member path (covers member-owned devices where the
  welcome flow already works; provides redundancy and the relay-side marker).
- **Optional refresh at commit boundaries** — publishing the post-commit state
  lets a fresh device skip replaying long histories, at the cost of truncating
  recoverable history to the refreshed epoch. Because the relay event is
  replaceable by d-tag, refreshing would overwrite the initial snapshot. To
  have both, use two d-tags per group: `paytaca:mls-state:initial:{groupId}`
  (never refreshed) and `paytaca:mls-state:latest:{groupId}` (refreshed per
  commit). Recovery prefers `initial` (full replay) and may fall back to
  `latest` (partial, warns the user).

Default: publish initial only, plus `latest` refresh on **own** commits (cheap;
received commits don't need a re-publish since every member would otherwise
write the same slot — only the committer's device publishes `latest`).

## Recovery flow

In `initMls` / `receiveMlsMessage`, when a group event references a group with
no local state (`loadMlsState` returns null and no in-memory state):

1. Fetch the group's snapshot events (kind 30116, `#h` groupId,
   authors = myPubKey — own devices share the same author key).
2. Decrypt (`nip44.decrypt`) with the wallet's Nostr key, `decodeGroupState`,
   reattach `clientConfig` (mirroring `loadMlsState`).
3. Commit `SET_MLS_GROUP_STATE` and `SET_MLS_ROOM_MAP` (roomId comes from the
   matching room in the server-synced room list; for a group with no room row
   yet, recover the roomId from the room list or wait for it to sync).
4. If the snapshot is `initial`, replay the group's history via the existing
   `fetchMlsGroupEvents` (#h, time-sorted) + `receiveMlsMessage` loop so the
   timeline repopulates; if it's `latest`, process only events after the
   snapshot's epoch and surface a "older messages unavailable" notice.

The recovery path should reuse the same per-group processing lock
(`withMlsProcessingLock`) as send/receive to avoid racing the live
subscription.

## Files to touch

- **New** `src/services/mls/backup.js` — `publishMlsStateSnapshot(state,
  mlsGroupIdHex, roomId, marker)` and `fetchMlsStateSnapshot(relays, pubKey,
  mlsGroupIdHex)`; NIP-44 self-encrypt/decrypt using the existing key
  derivation pattern (`getRoomNameEncryptionKey` in
  `src/store/nostr-chat/actions.js` is the reference for self-encryption).
- `src/store/nostr-chat/mls-actions.js` —
  - `createMlsGroup`: publish initial snapshot after `saveMlsState`.
  - `joinMlsGroup`: publish join-epoch snapshot after `saveMlsState`.
  - own-commit paths (`addMlsMember`, `removeMlsMember`, `leaveMlsGroup`,
    `sendMlsMessage` if it commits): publish `latest` snapshot after
    `saveMlsState(newState)`.
  - `receiveMlsMessage`: when "no local group state" (the existing drop path),
    attempt snapshot recovery instead of dropping; on success continue to
    process the triggering event.
- `src/store/nostr-chat/state.js` / `mls-mutations.js` — no new persisted
  state required (snapshots live on the relay); optionally track
  `lastSnapshotAt` per group to throttle refresh.

## Validation

Write a Node scratch test (pattern already used in this repo — pure-JS noble
Ed25519 via `src/services/mls/context.js` works under Node WebCrypto):

1. Create a group with deterministic keys.
2. Publish the initial snapshot (mock relay or the real one with
   `useWebSocketImplementation()`).
3. Simulate a fresh device (new in-memory state): fetch + decrypt snapshot,
   `decodeGroupState`, verify the identity guard
   (`identities[privatePath.leafIndex] === myPub`).
4. Old state sends a message; fresh device decrypts it.
5. Replay ordering check: old state sends message, then commits, then sends
   again; fresh device replays sorted events and decrypts all three.

## Out of scope / honest limits

- **Existing groups** whose state is already lost stay unrecoverable — no
  snapshot was ever published. This mechanism only helps from rollout forward.
- A wiped device can only recover what was snapshotted: with initial-only
  cadence, history is complete but the replay must reach the current epoch
  before sending works (the replay is fast for small groups).
- If every snapshot slot is lost *and* the group has no members left who can
  re-invite, the group is gone — same as today.
