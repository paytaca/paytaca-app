<template>
  <div class="full-width">
    <div class="row items-center q-mb-md">
      <div class="col">
        <q-input
          v-model="search"
          placeholder="Search transactions..."
          dense
          borderless
          input-class="search-input-field"
          :dark="$q.dark.isActive"
          clearable
          class="search-input-wrapper"
        >
          <template v-slot:prepend>
            <q-icon name="search" size="1.1rem" color="primary" />
          </template>
        </q-input>
      </div>
      <q-btn flat dense round icon="refresh" color="primary" :loading="loading" @click="refresh" class="q-ml-sm">
        <q-tooltip>Refresh history</q-tooltip>
      </q-btn>
    </div>

    <div class="row items-center q-mb-sm">
      <div class="text-subtitle2" :class="textColor">History</div>
      <q-space />
      <q-btn
        flat dense size="sm"
        :color="sortKey === 'date' ? 'primary' : ($q.dark.isActive ? 'grey-5' : 'grey-8')"
        label="Date"
        @click="toggleSort('date')"
      >
        <q-icon :name="sortKey === 'date' ? (sortOrder === 'asc' ? 'expand_less' : 'expand_more') : 'unfold_more'" />
      </q-btn>
      <q-btn
        flat dense size="sm"
        :color="sortKey === 'amount' ? 'primary' : ($q.dark.isActive ? 'grey-5' : 'grey-8')"
        label="Amount"
        @click="toggleSort('amount')"
      >
        <q-icon :name="sortKey === 'amount' ? (sortOrder === 'asc' ? 'expand_less' : 'expand_more') : 'unfold_more'" />
      </q-btn>
    </div>

    <q-separator class="q-mb-sm" :dark="$q.dark.isActive" />

    <div class="scroll" style="height: 350px;">
      <div v-if="loading" class="q-pa-md">
        <q-item v-for="n in 5" :key="n" class="q-px-none q-py-sm">
          <q-item-section avatar><q-skeleton type="QAvatar" size="24px" /></q-item-section>
          <q-item-section>
            <q-skeleton type="text" width="120px" class="q-mb-xs" />
            <q-skeleton type="text" width="80px" height="12px" />
          </q-item-section>
          <q-item-section side><q-skeleton type="text" width="60px" /></q-item-section>
        </q-item>
      </div>
      <div v-else-if="isLoaded && groupedTransactions.length > 0">
        <div v-for="group in groupedTransactions" :key="group.txid || group.key" class="q-mb-xs">
          <div v-if="group.rows.length > 1" class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-7'">
            {{ group.rows.length }} rows
          </div>
          <q-list separator :dark="$q.dark.isActive">
            <q-item v-for="tx in group.rows" :key="tx.id" class="q-px-none" clickable v-ripple @click="openDetails(tx)">
              <q-item-section avatar>
                <q-icon v-if="tx.kind === 'payment'" name="north_east" color="negative" size="xs" />
                <q-icon v-else-if="tx.kind === 'sweep'" name="swap_horiz" color="info" size="xs" />
                <q-icon v-else name="south_west" color="positive" size="xs" />
              </q-item-section>
              <q-item-section>
                <div class="text-weight-bold" :class="textColor">{{ rowTitle(tx) }}</div>
                <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">{{ tx.created_at_display }}</div>
              </q-item-section>
              <q-item-section side>
                <div v-if="tx.is_token" class="text-weight-bold text-positive">
                  <span v-if="tx.direction === 'outgoing'">-</span>
                  <span v-else>+</span>
                  <span>{{ ftDisplayAmount(tx) }} {{ ftTokenSymbol(tx) }}</span>
                </div>
                <div v-else class="text-weight-bold" :class="tx.direction === 'outgoing' ? 'text-negative' : 'text-positive'">
                  <span v-if="tx.direction === 'outgoing'">-</span>
                  <span v-else>+</span>
                  <span>{{ tx.displayAmount }} BCH</span>
                </div>
              </q-item-section>
              <q-item-section side>
                <q-icon name="chevron_right" :color="$q.dark.isActive ? 'grey-6' : 'grey-5'" size="xs" />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>
      <div v-else class="text-center q-pa-xl" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
        No transactions found
      </div>
    </div>

    <q-dialog v-model="showDetails">
      <q-card v-if="selectedTx" class="pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="min-width: 320px; max-width: 420px; border-radius: 24px;">
        <q-card-section class="q-pa-lg" :class="textColor">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-h6 text-weight-bold" :class="textColor">{{ rowTitle(selectedTx) }}</div>
            <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="showDetails = false" />
          </div>
          <div class="text-h6 text-weight-bold q-mb-md" :class="selectedTx.direction === 'outgoing' ? 'text-negative' : 'text-positive'">
            <span v-if="selectedTx.direction === 'outgoing'">-</span>
            <span v-else>+</span>
            <span v-if="selectedTx.is_token">{{ ftDisplayAmount(selectedTx) }} {{ ftTokenSymbol(selectedTx) }}</span>
            <span v-else>{{ selectedTx.displayAmount }} BCH</span>
          </div>
          <q-list separator :dark="$q.dark.isActive">
            <q-item class="q-px-none">
              <q-item-section>
                <q-item-label caption :class="captionColor">Date</q-item-label>
                <q-item-label>{{ selectedTx.created_at_display }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item class="q-px-none">
              <q-item-section>
                <q-item-label caption :class="captionColor">Type</q-item-label>
                <q-item-label class="text-capitalize">{{ selectedTx.kind }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="selectedTx.merchant?.name || selectedTx.merchantRefId != null" class="q-px-none">
              <q-item-section>
                <q-item-label caption :class="captionColor">Merchant</q-item-label>
                <q-item-label>{{ selectedTx.merchant?.name || `Merchant #${selectedTx.merchantRefId}` }}</q-item-label>
                <q-item-label v-if="selectedTx.merchantRefId != null" caption :class="captionColor">Ref {{ selectedTx.merchantRefId }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="selectedTx.is_token" class="q-px-none">
              <q-item-section>
                <q-item-label caption :class="captionColor">Token</q-item-label>
                <q-item-label>{{ ftTokenFullName(selectedTx) }}</q-item-label>
                <q-item-label caption class="tx-hash" :class="captionColor">{{ selectedTx.category }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="selectedTx.address" class="q-px-none">
              <q-item-section>
                <q-item-label caption :class="captionColor">Destination address</q-item-label>
                <q-item-label class="tx-hash">{{ selectedTx.address }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn flat dense round icon="content_copy" color="primary" @click="copyText(selectedTx.address)">
                  <q-tooltip>Copy address</q-tooltip>
                </q-btn>
              </q-item-section>
            </q-item>
            <q-item v-if="selectedTx.txid" class="q-px-none">
              <q-item-section>
                <q-item-label caption :class="captionColor">Transaction ID</q-item-label>
                <q-item-label class="tx-hash">{{ selectedTx.txid }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn flat dense round icon="content_copy" color="primary" @click="copyText(selectedTx.txid)">
                  <q-tooltip>Copy transaction ID</q-tooltip>
                </q-btn>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
export default {
  name: 'TransactionHistory',
  props: {
    card: { type: Object, required: true }
  },
  data() {
    return {
      search: '',
      sortKey: 'date',
      sortOrder: 'desc',
      isLoaded: false,
      loading: false,
      showDetails: false,
      selectedTx: null,
    }
  },
  computed: {
    transactions() {
      return this.$store.getters['card/transactions'](this.card?.id) || []
    },
    filteredTransactions() {
      let list = [...this.transactions];
      if (this.search) {
        const s = this.search.toLowerCase();
        list = list.filter(t =>
          (t.merchant?.name || '').toLowerCase().includes(s) ||
          String(t.merchantRefId || '').toLowerCase().includes(s) ||
          (t.address || '').toLowerCase().includes(s) ||
          (t.txid || '').toLowerCase().includes(s) ||
          (t.category || '').toLowerCase().includes(s) ||
          (this.ftTokenName(t) || '').toLowerCase().includes(s) ||
          (t.kind || '').toLowerCase().includes(s)
        );
      }
      list.sort((a, b) => {
        let mod = this.sortOrder === 'asc' ? 1 : -1;
        if (this.sortKey === 'amount') {
          const aNum = a.is_token ? this.ftDecimalValue(a) : Number(a.value || 0);
          const bNum = b.is_token ? this.ftDecimalValue(b) : Number(b.value || 0);
          return (aNum - bNum) * mod;
        }
        return (new Date(a.created_at) - new Date(b.created_at)) * mod;
      });
      return list;
    },
    groupedTransactions() {
      const groups = new Map();
      for (const tx of this.filteredTransactions) {
        const key = tx.txid || `row-${tx.id}`;
        if (!groups.has(key)) {
          groups.set(key, { key, txid: tx.txid, created_at: tx.created_at, created_at_display: tx.created_at_display, rows: [] });
        }
        const group = groups.get(key);
        group.rows.push(tx);
        if (new Date(tx.created_at) > new Date(group.created_at)) {
          group.created_at = tx.created_at;
          group.created_at_display = tx.created_at_display;
        }
      }
      const list = [...groups.values()];
      list.sort((a, b) => {
        let mod = this.sortOrder === 'asc' ? 1 : -1;
        return (new Date(a.created_at) - new Date(b.created_at)) * mod;
      });
      return list;
    },
    textColor() {
      return this.$q.dark.isActive ? 'text-white' : 'text-grey-10'
    },
    captionColor() {
      return this.$q.dark.isActive ? 'text-grey-5' : 'text-grey-7'
    }
  },
  async mounted() {
    await this.refresh()
  },
  methods: {
    async fetchTransactions() {
      return this.$store.dispatch('card/fetchCardTransactions', { cardId: this.card?.id })
    },
    async refresh() {
      if (!this.card?.id) return;
      this.loading = true;
      try {
        await this.fetchTransactions();
        this.hydrateFtMetadata();
      } catch {}
      finally {
        this.loading = false;
        this.isLoaded = true;
      }
    },
    ftTokenAsset(category) {
      if (!category) return null;
      return this.$store.getters['assets/getAsset']?.(`ct/${category}`)?.[0] || null;
    },
    ftDecimals(tx) {
      return parseInt(tx?.token?.decimals ?? this.ftTokenAsset(tx?.category)?.decimals ?? 0) || 0;
    },
    ftDecimalValue(tx) {
      const raw = Number(tx?.amount ?? 0);
      return raw / (10 ** this.ftDecimals(tx));
    },
    ftDisplayAmount(tx) {
      const decimals = this.ftDecimals(tx);
      const value = this.ftDecimalValue(tx);
      return String(parseFloat(value.toFixed(decimals)));
    },
    ftTokenName(tx) {
      const asset = this.ftTokenAsset(tx?.category);
      return asset?.symbol || asset?.name || this.shortCategory(tx?.category);
    },
    ftTokenSymbol(tx) {
      return this.ftTokenName(tx);
    },
    hydrateFtMetadata() {
      const categories = [...new Set(this.transactions.filter(t => t.is_token && t.category).map(t => t.category))];
      categories.forEach(category => {
        const exists = this.$store.getters['assets/getAsset']?.(`ct/${category}`)?.length;
        if (!exists) this.$store.dispatch('assets/getAssetMetadata', `ct/${category}`).catch(() => {});
      });
    },
    toggleSort(key) {
      if (this.sortKey === key) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortKey = key;
        this.sortOrder = 'desc';
      }
    },
    rowTitle(tx) {
      if (tx.kind === 'payment') return tx.merchant?.name || (tx.merchantRefId != null ? `Merchant #${tx.merchantRefId}` : 'Payment');
      if (tx.kind === 'sweep') return tx.is_token ? `Sweep ${this.ftTokenName(tx)}` : 'Sweep';
      if (tx.is_token) return `Cash In ${this.ftTokenName(tx)}`;
      return 'Cash In';
    },
    openDetails(tx) {
      this.selectedTx = tx;
      this.showDetails = true;
    },
    copyText(text) {
      if (!text) return;
      try {
        navigator.clipboard.writeText(text);
        this.$q.notify({ message: 'Copied to clipboard', color: 'positive', position: 'bottom', timeout: 1500 });
      } catch {}
    },
    ftTokenFullName(tx) {
      const asset = this.ftTokenAsset(tx?.category);
      if (asset?.symbol && asset?.name) return `${asset.symbol} · ${asset.name}`;
      return asset?.symbol || asset?.name || tx?.category || '';
    },
    rowSubtitle(tx) {
      const parts = [];
      if (tx.kind === 'payment' && tx.merchantRefId != null) parts.push(`Ref ${tx.merchantRefId}`);
      return parts.join(' · ');
    },
    shortTxid(txid) {
      if (!txid) return '';
      return txid.length > 14 ? `${txid.slice(0, 8)}...${txid.slice(-4)}` : txid;
    },
    shortAddress(address) {
      if (!address) return '';
      return address.length > 20 ? `${address.slice(0, 12)}...${address.slice(-6)}` : address;
    },
    shortCategory(category) {
      if (!category) return '';
      return category.length > 16 ? `${category.slice(0, 10)}...${category.slice(-4)}` : category;
    },
  }
}
</script>

<style lang="scss">
  @import "src/css/app-card.scss";
</style>

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

  .tx-hash {
    word-break: break-all;
    font-size: 12px;
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
