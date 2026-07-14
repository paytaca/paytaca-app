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
    </div>

    <div class="row items-center q-mb-sm">
      <div class="text-subtitle2" :class="textColor">History</div>
      <!-- SKELETON LOADER for title when loading backend data: <q-skeleton v-if="loading" type="text" width="80px" /> -->
      <q-space />
      <q-btn
        flat dense size="sm"
        :color="sortKey === 'date' ? 'primary' : ($q.dark.isActive ? 'grey-5' : 'grey-8')"
        label="Date"
        @click="toggleSort('date')"
      >
        <q-icon :name="sortKey === 'date' ? (sortOrder === 'asc' ? 'expand_less' : 'expand_more') : 'unfold_more'" />
      </q-btn>
      <!-- SKELETON LOADER for sort buttons when loading backend data: <q-skeleton v-if="loading" type="rect" width="60px" class="q-ml-sm" /> -->
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
      <!-- 
        SKELETON LOADER for transaction list when loading backend data:
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
      -->
      <div v-if="isLoaded && filteredTransactions.length > 0">
        <q-list separator :dark="$q.dark.isActive">
          <q-item v-for="tx in filteredTransactions" :key="tx.id" class="q-px-none">
            <!-- SKELETON LOADER for transaction icon: <q-item-section avatar><q-skeleton type="QAvatar" size="24px" /></q-item-section> -->
            <q-item-section avatar>
                <q-icon v-if="tx.type === 'OUTGOING'" name="north_east" color="negative" size="xs" />
                <q-icon v-if="tx.type === 'INCOMING'" name="south_west" color="positive" size="xs" />
            </q-item-section>
            <q-item-section>
              <div 
                class="text-weight-bold"
                :class="textColor">
                <!-- SKELETON LOADER for merchant name: <q-skeleton v-if="loading" type="text" width="150px" /> -->
                <span v-if="tx.type === 'OUTGOING'">{{ tx.merchant?.name }}</span>
                <div v-if="tx.type === 'INCOMING'">
                  
                  <div v-if="tx.is_token">
                    <div v-if="tx.merchant">
                      <span>{{ tx.merchant?.name }} Auth NFT</span>
                    </div>
                    <div v-else-if="tx.token?.is_global_auth">
                       <span>Global NFT</span>
                    </div>
                  </div>
                  <div v-else>
                    <span>Cash In</span>                     
                  </div>
                </div>
              </div>
               <!-- SKELETON LOADER for date: <q-skeleton v-if="loading" type="text" width="80px" height="12px" /> -->
               <div class="text-caption text-weight-bold" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">{{ tx.created_at }}</div>
            </q-item-section>
            <q-item-section side>
              <!-- SKELETON LOADER for amount: <q-skeleton v-if="loading" type="text" width="70px" /> -->
              
              <div v-if="tx.is_token" class="q-mx-md text-positive">
                <span v-if="tx.token_action">{{ tx.token_action }}</span>
              </div>
              <div v-else class="text-weight-bold" :class="tx.type === 'OUTGOING' ? 'text-negative' : 'text-positive'">
                <span v-if="tx.type === 'OUTGOING'">-</span>
                <span v-if="tx.type === 'INCOMING'">+</span>
                <span>{{ tx.amount }} BCH</span>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div v-else class="text-center q-pa-xl" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
        No transactions found
      </div>
    </div>
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
        list = list.filter(t => t.merchant?.name?.toLowerCase().includes(s));
      }
      list.sort((a, b) => {
        let mod = this.sortOrder === 'asc' ? 1 : -1;
        if (this.sortKey === 'amount') return (a.amount - b.amount) * mod;
        return (new Date(a.created_at) - new Date(b.created_at)) * mod;
      });
      return list;
    },
    textColor() {
      return this.$q.dark.isActive ? 'text-white' : 'text-grey-10'
    }
  },
  async mounted() {
    await this.fetchTransactions()
    this.isLoaded = true
  },
  methods: {

    async fetchTransactions () {
      return this.$store.dispatch('card/fetchCardTransactions', { cardId: this.card?.id }).catch(() => {})
    },

    toggleSort(key) {
      if (this.sortKey === key) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortKey = key;
        this.sortOrder = 'desc';
      }
    }
    // SKELETON LOADER: Add this method to fetch transactions from backend
    // async fetchTransactions() {
    //   this.loading = true
    //   try {
    //     const response = await fetch(`/api/cards/${this.card.id}/transactions`)
    //     const data = await response.json()
    //     this.transactions = data.transactions || []
    //   } catch (error) {
    //   } finally {
    //     this.loading = false
    //   }
    // }
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