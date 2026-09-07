<template>
  <div class="full-width self-start q-pa-sm">
    <div class="row items-center q-mb-sm">
      <div class="col">
        <q-input
          v-model="search"
          placeholder="Search tokens..."
          dense
          borderless
          outlined
          input-class="search-input-field"
          :dark="$q.dark.isActive"
          clearable>
          <template v-slot:prepend>
            <q-icon name="search" size="1.1rem" color="primary" />
          </template>
        </q-input>
      </div>
    </div>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>
    <div v-else-if="!filteredHoldings.length" class="column items-center q-pa-xl text-center">
      <q-icon name="paid" size="48px" color="primary" style="opacity: 0.5;" />
      <div class="text-subtitle1 text-weight-medium q-mt-md" :class="textColor">
        {{ holdings.length && search ? 'No tokens match your search' : 'No CashTokens on this card yet' }}
      </div>
      <div v-if="!holdings.length && !search" class="text-caption q-mb-md" :class="textColorGrey">
        Fund it from your wallet or share its token address with another wallet.
      </div>
      <q-btn
        v-if="!holdings.length && !search"
        label="Fund Tokens"
        color="primary"
        unelevated
        rounded
        no-caps
        @click="$emit('fund-tokens')"
      />
    </div>
    <q-list v-else separator :dark="$q.dark.isActive">
      <q-item v-for="holding in filteredHoldings" :key="holding.category" class="q-px-none">
        <q-item-section avatar>
          <q-avatar size="32px" color="primary" text-color="white">
            <q-img v-if="holding.logo" :src="holding.logo" />
            <span v-else class="text-weight-bold">{{ (holding.symbol || holding.category || '?').charAt(0).toUpperCase() }}</span>
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <div class="text-weight-bold" :class="textColor">{{ holding.symbol || truncateCategory(holding.category) }}</div>
          <div class="text-caption" :class="textColorGrey">{{ holding.name || truncateCategory(holding.category) }}</div>
        </q-item-section>
        <q-item-section side>
          <div class="text-weight-bold text-positive">{{ holding.displayBalance }}<span v-if="holding.symbol" class="q-mx-sm"> {{ holding.symbol }}</span></div>
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script>
export default {
  name: 'CardTokens',
  props: {
    holdings: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['fund-tokens'],
  data() {
    return {
      search: ''
    }
  },
  computed: {
    textColor() {
      return this.$q.dark.isActive ? 'text-white' : 'text-grey-10'
    },
    textColorGrey() {
      return this.$q.dark.isActive ? 'text-grey-5' : 'text-grey-7'
    },
    enrichedHoldings() {
      return this.holdings.map(item => {
        const category = typeof item === 'string' ? item : (item?.category || item?.token_id || item?.tokenId || item?.id || '')
        const rawBalance = typeof item === 'string' ? 0 : Number(item?.balance ?? item?.amount ?? 0)
        const asset = this.$store.getters['assets/getAsset']?.(`ct/${category}`)?.[0]
        const decimals = parseInt(asset?.decimals ?? item?.decimals ?? 0) || 0
        const balance = rawBalance / (10 ** decimals)
        return {
          category,
          symbol: asset?.symbol || '',
          name: asset?.name || '',
          logo: asset?.logo || '',
          displayBalance: String(parseFloat(balance.toFixed(decimals)))
        }
      })
    },
    filteredHoldings() {
      if (!this.search) return this.enrichedHoldings
      const s = this.search.toLowerCase()
      return this.enrichedHoldings.filter(holding => {
        return holding.symbol?.toLowerCase().includes(s) ||
          holding.name?.toLowerCase().includes(s) ||
          holding.category?.toLowerCase().includes(s)
      })
    }
  },
  watch: {
    holdings: {
      handler() {
        this.hydrateTokenMetadata()
      },
      immediate: true
    }
  },
  methods: {
    hydrateTokenMetadata() {
      this.holdings.forEach(item => {
        const category = typeof item === 'string' ? item : (item?.category || item?.token_id || item?.tokenId || item?.id || '')
        if (!category) return
        const exists = this.$store.getters['assets/getAsset']?.(`ct/${category}`)?.length
        if (!exists) this.$store.dispatch('assets/getAssetMetadata', `ct/${category}`).catch(() => {})
      })
    },
    truncateCategory(category) {
      if (!category) return 'Unknown token'
      return category.length > 12 ? `${category.slice(0, 8)}...` : category
    }
  }
}
</script>

<style lang="scss" scoped>
  .search-input-wrapper {
    background: transparent;
    border-radius: 14px;
    border: 1.5px solid;
    border-color: rgba(0, 0, 0, 0.12);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    padding-left: 4px;

    &:focus-within {
      border-color: var(--q-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--q-primary) 15%, transparent);
    }
  }

  .search-input-field {
    font-size: 13px;
  }

  .body--dark {
    .search-input-wrapper {
      border-color: rgba(255, 255, 255, 0.15);

      &:focus-within {
        border-color: var(--q-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--q-primary) 20%, transparent);
      }
    }
  }
</style>
