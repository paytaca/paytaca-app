# Card Data Reference Guide for Vue Files

## Card Data Structure

**Location:** `src/pages/apps/card/noBackend.js`

**Storage Key:** `mock_subcards`

### Security Notice
We only store minimal UI state in localStorage. NO sensitive backend data (raw card data, addresses, UTXOs, balances) is persisted locally. All card data is fetched fresh from the backend API. If offline, UI shows skeleton loaders.

### Stored in localStorage (UI State Only)

| # | Property | Description |
|---|----------|-------------|
| 1 | `id` | Card ID (to fetch from backend) |
| 2 | `uid` | Card UID (to fetch from backend) |
| 3 | `name` | Card alias/name (cached for display) |
| 4 | `isLocked` | UI lock state |
| 5 | `transactionAlerts` | UI setting for notifications |
| 6 | `merchantSpendLimits` | Object mapping merchant IDs to spend limits |
| 7 | `genericSpendLimit` | Global spend limit for generic auth |
| 8 | `hasOrderedPhysicalCard` | Physical card order flag |
| 9 | `shippingAddress` | Physical card shipping address |
| 10 | `cardReplacementStatus` | Replacement workflow status |

### NOT Stored Locally (Fetched from Backend)

- Balance, tokenBalance
- UTXOs, tokenUtxos
- Contract addresses
- Raw backend data
- Wallet info

### Offline Behavior

- UI shows skeleton loaders for missing data
- Basic card list is still available (IDs, names, UI state)

---

## Data Sources

### 1. localStorage (UI State Only - Minimal, Safe)
**Stored in:** `noBackend.js` via `CardStorage`

**Available Properties:**
- `id` - Card ID (to fetch from backend)
- `uid` - Card UID (to fetch from backend)
- `name` - Card alias/name (cached for display)
- `isLocked` - UI lock state
- `transactionAlerts` - UI notification setting
- `merchantSpendLimits` - Map of merchant ID → spend limit
- `genericSpendLimit` - Global spend limit for generic auth
- `hasOrderedPhysicalCard` - Physical card order flag
- `shippingAddress` - Physical card shipping address
- `cardReplacementStatus` - Replacement workflow status

**Access Pattern:**
```javascript
// In Vue component
const cards = this.CardStorage.getCards() // Returns array with UI state only
const card = this.CardStorage.getCardById(id) // Returns single card with UI state

// Properties available immediately:
card.id
card.name  // Use this for display
card.isLocked
card.merchantSpendLimits
```

### 2. Backend API (Fetch on Demand - Real Data)
**Source:** Card instance methods from `src/services/card/card.js`

**Fetch When:**
- Component mounts
- User pulls to refresh
- Background sync
- Before critical operations

**Available via Card instance:**
```javascript
// Initialize card instance
const card = await Card.createInitialized({ raw: { id: cardId } })

// Fetch from blockchain/backend:
const bchUtxos = await card.getBchUtxos()          // Returns UTXO array
const tokenUtxos = await card.getTokenUtxos()    // Returns token UTXOs
const authNfts = await card.getAuthNfts()          // Returns auth NFTs
const balance = await card.getBchUtxos()         // Calculate from UTXOs

// Addresses (from card.raw):
card.raw.contract_id      // Contract address
card.raw.token_address    // Token address
card.raw.cash_address     // Cash address
card.raw.category         // Token category
```

### 3. Offline Mode (Skeleton Loaders)
**When:** App is offline or backend fetch fails

**UI Behavior:**
```javascript
// Template - Show skeleton when data loading
<div v-if="loading" class="skeleton-loader">
  <q-skeleton type="text" />
  <q-skeleton type="rect" />
</div>
<div v-else>
  {{ cardBalance }} BCH
</div>

// Script
computed: {
  cardBalance() {
    // Return cached or show placeholder
    return this.backendData?.balance || '--'
  }
}
```

## Updated Vue Component Patterns

### Before (Old - Using localStorage for everything):
```vue
<template>
  <div>{{ activeCard.balance }} BCH</div>  <!-- From localStorage -->
  <div>{{ activeCard.raw?.alias }}</div>    <!-- From localStorage -->
  <div>{{ activeCard.contractAddress }}</div> <!-- From localStorage -->
</template>

<script>
// In created/mounted:
this.activeCard = this.CardStorage.getCardById(id) // Had everything
</script>
```

### After (New - Fetch from backend):
```vue
<template>
  <!-- Skeleton loaders while loading -->
  <div v-if="loading">
    <q-skeleton type="text" width="100px" />
  </div>
  
  <!-- Real data when loaded -->
  <div v-else>
    <div>{{ cardBalance }} BCH</div>
    <div>{{ cardName }}</div>
    <div>{{ formatAddress(cardContractAddress) }}</div>
  </div>
  
  <!-- UI state always available from localStorage -->
  <q-toggle v-model="activeCard.isLocked" />
</template>

<script>
export default {
  data() {
    return {
      loading: true,
      activeCard: null,        // From localStorage (UI state only)
      backendData: null        // From Card API
    }
  },
  
  computed: {
    // UI data - always available
    cardName() {
      return this.activeCard?.name || 'Card'
    },
    
    // Backend data - may show placeholder if loading/offline
    cardBalance() {
      return this.backendData?.balance || '--'
    },
    
    cardContractAddress() {
      return this.backendData?.contractAddress
    }
  },
  
  async mounted() {
    // Step 1: Get UI state from localStorage
    this.activeCard = this.CardStorage.getCardById(this.$route.query.id)
    
    // Step 2: Fetch backend data
    try {
      const card = await Card.createInitialized({ 
        raw: { id: this.activeCard.id } 
      })
      
      // Fetch balances and addresses
      const bchUtxos = await card.getBchUtxos()
      const balanceSats = bchUtxos.reduce((sum, u) => sum + BigInt(u.satoshis || 0), 0n)
      
      this.backendData = {
        balance: (Number(balanceSats) / 100000000).toFixed(8),
        contractAddress: card.raw?.contract_id,
        tokenAddress: card.raw?.token_address,
        cashAddress: card.raw?.cash_address,
        utxos: bchUtxos
      }
    } catch (error) {
      console.error('Failed to fetch card data:', error)
      // Keep skeleton/placeholder UI
    } finally {
      this.loading = false
    }
  }
}
</script>
```

## Property Mapping Reference

### cardDetails.vue
| Display | Data Source | Property |
|---------|-------------|----------|
| Card Name | localStorage | `activeCard.name` |
| Lock Status | localStorage | `activeCard.isLocked` |
| Balance | Backend | `card.getBchUtxos()` → calculate |
| Contract Address | Backend | `card.raw.contract_id` |
| Cash In | Backend | Requires `card.raw.cash_address` |
| Merchants | Backend | `card.getAuthNfts()` |
| Spend Limits | localStorage | `activeCard.merchantSpendLimits` |
| Generic Limit | localStorage | `activeCard.genericSpendLimit` |
| Physical Card | localStorage | `activeCard.hasOrderedPhysicalCard` |
| Shipping | localStorage | `activeCard.shippingAddress` |

### stackedCards.vue & allCards.vue
| Display | Data Source | Property |
|---------|-------------|----------|
| Card List | localStorage | `CardStorage.getCards()` |
| Card Name | localStorage | `card.name` |
| Balance | Backend | Fetch via Card instance per card |
| Card Count | localStorage | `cards.length` |

### manageAuthNFTs.vue
| Display | Data Source | Property |
|---------|-------------|----------|
| Generic Auth Enabled | localStorage | UI toggle state |
| Global Limit | localStorage | `card.genericSpendLimit` |
| Merchant List | Backend | `card.getAuthNfts()` |
| Merchant Spend Limits | localStorage | `card.merchantSpendLimits` |

## Implementation Checklist

1. **Update Vue files to:**
   - [ ] Use localStorage for UI state only (name, isLocked, settings)
   - [ ] Fetch balances/addresses from backend on mount
   - [ ] Add skeleton loaders for backend data
   - [ ] Handle offline state gracefully
   - [ ] Remove references to `activeCard.raw`, `activeCard.balance` from localStorage

2. **Add loading states:**
   - [ ] Add `loading` data property
   - [ ] Wrap backend-dependent UI in `v-if="!loading"`
   - [ ] Add skeleton components for balance, addresses
   - [ ] Show cached name immediately, load rest async

3. **Backend fetch implementation:**
   - [ ] Initialize Card instance with ID from localStorage
   - [ ] Call `card.getBchUtxos()` for balance
   - [ ] Access `card.raw.contract_id` for addresses
   - [ ] Cache result in component data (not localStorage)
   - [ ] Set loading=false when done

## Example: Balance Display Component

```vue
<template>
  <div class="balance-display">
    <q-skeleton 
      v-if="loading" 
      type="text" 
      width="120px" 
      height="24px"
    />
    <div v-else class="text-h6" :class="textColor">
      {{ displayBalance }}
      <span class="text-caption">BCH</span>
    </div>
    <div v-if="!loading && !backendData" class="text-caption text-grey">
      Offline - Balance unavailable
    </div>
  </div>
</template>

<script>
export default {
  props: ['cardId'],
  
  data() {
    return {
      loading: true,
      backendData: null,
      localCard: null
    }
  },
  
  computed: {
    displayBalance() {
      if (this.backendData?.balance) {
        return this.backendData.balance
      }
      return '--.--------'
    }
  },
  
  async mounted() {
    // Get local data immediately
    this.localCard = this.CardStorage.getCardById(this.cardId)
    
    // Fetch backend data
    try {
      const card = await Card.createInitialized({
        raw: { id: this.cardId }
      })
      
      const utxos = await card.getBchUtxos()
      const sats = utxos.reduce((sum, u) => sum + BigInt(u.satoshis || 0), 0n)
      
      this.backendData = {
        balance: (Number(sats) / 100000000).toFixed(8),
        utxos
      }
    } catch (err) {
      console.error('Failed to load balance:', err)
    } finally {
      this.loading = false
    }
  }
}
</script>
```

## Migration Steps

1. Replace `activeCard.raw?.alias` → `activeCard.name`
2. Replace `activeCard.balance` → async fetch + skeleton
3. Replace `activeCard.contractAddress` → `backendData.contractAddress`
4. Add loading states to all components
5. Test offline behavior (should show skeletons/notifications)
