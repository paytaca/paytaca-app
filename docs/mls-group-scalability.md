# MLS Group Scalability Implementation Plan

## Overview

MLS groups are currently hard-capped at `MAX_MLS_MEMBERS = 50` (see
`src/store/nostr-chat/mls-actions.js`). Raising the cap (or reaching 1000
members) requires changes to the **transport layer** — the MLS core (ratchet
tree, epochs, message processing) is not the bottleneck and stays untouched.

Three bottlenecks limit scale today:

1. **Per-member p-tag fan-out** — every message/commit event carries a p-tag
   for every member, and every member subscribes with `#p: myPubKey`. Event
   size grows ~70 bytes/member and the relay does O(n) delivery work per event.
2. **Bounded catch-up** — `fetchMlsHistory` caps at 200 received + 200 sent,
   and `acceptMlsInvite` catch-up fetches at most 100 group events. A member
   joining an active large group misses commits and desyncs.
3. **O(n) member-add** — each invite is a relay round-trip per invitee plus a
   commit every member must process.

This plan is additive: existing groups, messages, and the 50-member cap keep
working throughout. The cap is raised only after Phase 1 lands.

## Phase 1 — Group-channel delivery (small)

Replace per-member p-tag fan-out with `#h` (group id) based delivery.

### 1.1 Relay support (external, required first)

The relay (relay.paytaca.com) must index the `#h` tag on kind 30078 so
subscriptions and queries can match on it. Verify existing NIP-78 handling
indexes arbitrary tags; add `#h` indexing if not.

### 1.2 Event construction — `src/services/mls/nostr-transport.js`

`buildMlsNostrEvent()` currently adds a p-tag per member via the
`memberPubkeys` argument. Change:

- Drop member p-tags from **messages (30117)** and **commits (30118)** — the
  `#h` tag already routes delivery.
- Keep p-tags only on **welcomes (30119)** (`['p', inviteePubKey]`, already
  added explicitly in `addMlsMember`) and on the **KeyPackage event** (used
  for discovery).
- Event size becomes O(1) regardless of group size.

### 1.3 Subscriptions — `src/services/nostr-chat.js`

`subscribeMlsEvents()` currently subscribes with:

```js
{ kinds: [30078], '#p': [myPubKey] }
{ kinds: [30078], authors: [myPubKey] }
```

Change to:

- **Group traffic**: one subscription with all known group ids —
  `{ kinds: [30078], '#h': [...groupIds] }`. `pool.subscribeMany` accepts
  multiple filters, so group ids can be listed in a single filter.
- **Discovery**: keep `#p: [myPubKey]` for welcomes/invites to groups the
  device has not joined yet (needed before the group id is known).
- The resubscribe path (`_mlsResubInterval`) must re-fetch the group id list
  when groups are created/joined/left.

### 1.4 Subscription lifecycle — `src/store/nostr-chat/mls-actions.js`

- `initMls()` builds the initial group id list from `ws.mls.roomMlsMap` and
  passes it to `subscribeMlsEvents`.
- After `createMlsGroup`, `joinMlsGroup`, `leaveMlsGroup`:
  - `leaveMlsGroup` — the group id must be removed from the active `#h`
    subscription (or re-subscribe with the updated list).
  - `createMlsGroup` / `joinMlsGroup` — add the id to the subscription.
  - Simplest correct approach: a single `resubscribeMlsEvents()` helper that
    tears down and re-subscribes with the current room map. Frequency is low
    (only on group membership changes), so full re-subscribe is fine.

### 1.5 Queries — `src/services/nostr-chat.js`

- `fetchMlsHistory()` — the `#p` received-filter stays for discovery/history
  of DMs, but group history must come from `#h` queries; either add an `#h`
  filter or rely on the new snapshot flow (Phase 2).
- `fetchMlsGroupEvents()` already queries on `#h` — unchanged.

### 1.6 Verification

- Two members send/receive after raising the cap beyond current testing sizes.
- Confirm event size stops growing with member count (log the content length
  at `buildMlsNostrEvent`).
- Confirm a member with N groups receives all N groups' traffic via one `#h`
  subscription.

## Phase 2 — On-demand snapshot sync (significant, additive)

Let a new member recover current group state from a checkpoint instead of
replaying a bounded history.

### 2.1 Snapshot event — new module `src/services/mls/snapshot.js`

New NIP-78 event per group:

- Kind 30078 with d-tag `paytaca:mls-snapshot:<mlsGroupIdHex>` and `#h` tag.
- Content: JSON envelope like the existing event format, with
  `data.mlsSnapshot` = base64 of `encodeGroupState(clientState)` (already
  implemented in `src/services/mls/state-store.js`).
- Carries the group epoch + a hash of the group context so consumers can
  verify freshness and authenticity.

### 2.2 Authenticity — epoch-hash chain

A snapshot must be verifiable, otherwise a malicious member could feed a fake
state to a joiner. Minimal viable scheme:

- Publish/refresh a snapshot **only on role changes and member changes**
  (where a commit is already published).
- Verify on load: decode the snapshot, compare its epoch against the commits
  fetched after it; the `confirmedTranscriptHash` chain in the group context
  (already part of the MLS state) validates continuity when the joiner
  processes the subsequent commits.
- Optional hardening (deferred): anchor the snapshot hash in a blockchain
  transaction (see "Future work" below).

### 2.3 Join flow — `src/store/nostr-chat/mls-actions.js`

`acceptMlsInvite()` / `joinMlsGroup()`:

1. Try fetching a snapshot for the group (`#h` + d-tag query).
2. If found and verifiable: `decodeGroupState(snapshot)` → process commits
   fetched with `since = snapshotEpochTime` (via `fetchMlsGroupEvents`) →
   join local state.
3. If no snapshot: fall back to the current welcome + bounded replay path
   (works for small groups; no behavior change).
4. `initMls()`/`fetchMlsHistory()`: replace the 200-event bounded replay with
   snapshot-based recovery when a snapshot exists.

### 2.4 Cap raise

After Phase 2, raise `MAX_MLS_MEMBERS` in stages (e.g. 100 → 250) and
re-verify the relay under load. The 1000-member target also needs the relay
side to be load-tested for `#h` fan-out.

## Phase 3 — Membership registry (deferred)

With `#h` delivery in place, the p-tag fan-out is gone and a membership
registry is not needed for message delivery. It would only matter for
*discovery* at very large scale (finding groups), which this app does not
need yet. Options if it ever becomes necessary:

- NIP-29 (relay communities) as a group directory.
- CashToken-based membership/admin badges (owner mints/burns; a token serves
  as a verifiable membership credential).

## Files touched (summary)

| File | Phase | Change |
|------|-------|--------|
| `src/services/mls/nostr-transport.js` | 1 | Drop member p-tags from messages/commits |
| `src/services/nostr-chat.js` | 1, 2 | `#h` subscriptions; snapshot queries |
| `src/store/nostr-chat/mls-actions.js` | 1, 2 | Sub lifecycle; join/leave re-subscribe; snapshot-based join |
| `src/services/mls/snapshot.js` | 2 | New module (snapshot encode/publish/fetch/verify) |
| `src/services/mls/state-store.js` | 2 | Reuse `encodeGroupState`/`decodeGroupState` |
| relay.paytaca.com | 1 | `#h` tag indexing on kind 30078 |

MLS core (`src/services/mls/group.js`, `message.js`, `context.js`,
`key-package.js`) is untouched.

## Future work (separate from this plan)

- **Blockchain anchoring**: post the snapshot hash (or epoch hash) on-chain on
  role changes so a late joiner can verify canonical group state without
  trusting an inviter — complements Phase 2 authenticity.
- **MLS large-group (LDS) mode**: the RFC 9420 large-group design assumes a
  multicast delivery service; only relevant if scale grows past relay-based
  fan-out entirely.
