<template>
  <div class="full-width">
    <div class="row items-center q-mb-md q-gutter-x-sm">
      <div class="col">
        <q-input 
          v-model="search" 
          label="Search merchants..." 
          outlined 
          dense
          :dark="$q.dark.isActive"
        >
          <template v-slot:append>
            <q-icon name="search" />
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
      <div v-if="filteredTransactions.length > 0">
        <q-list separator :dark="$q.dark.isActive">
          <q-item v-for="t in filteredTransactions" :key="t.id" class="q-px-none">
            <!-- SKELETON LOADER for transaction icon: <q-item-section avatar><q-skeleton type="QAvatar" size="24px" /></q-item-section> -->
            <q-item-section avatar>
               <q-icon :name="t.amount > 0 ? 'south_west' : 'north_east'" 
                       :color="t.amount > 0 ? 'positive' : 'negative'" 
                       size="xs" />
            </q-item-section>
            <q-item-section>
              <div 
                class="text-weight-bold"
                :class="textColor"
              >
                <!-- SKELETON LOADER for merchant name: <q-skeleton v-if="loading" type="text" width="150px" /> -->
                {{ t.name }}
              </div>
               <!-- SKELETON LOADER for date: <q-skeleton v-if="loading" type="text" width="80px" height="12px" /> -->
               <div class="text-caption text-weight-bold" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">{{ t.date }}</div>
            </q-item-section>
            <q-item-section side>
              <!-- SKELETON LOADER for amount: <q-skeleton v-if="loading" type="text" width="70px" /> -->
              <div class="text-weight-bold" :class="t.amount > 0 ? 'text-positive' : 'text-negative'">
                {{ t.amount > 0 ? '+' : '' }}{{ t.amount }} BCH
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
      // loading: false, // SKELETON LOADER: Set to true when fetching backend data
      // Mock data - in a real app, you'd fetch this using this.card.id
      // SKELETON LOADER: Replace with backend fetch in mounted() or a method
      transactions: [
        { id: 1, name: 'Main Street Coffee', amount: -0.0012, date: '2026-02-28' },
        { id: 2, name: 'Refund: Tech Store', amount: 0.05, date: '2026-02-27' },
        { id: 3, name: 'Gas Station', amount: -0.0085, date: '2026-02-26' }
      ]
    }
  },
  computed: {
    filteredTransactions() {
      let list = [...this.transactions];
      if (this.search) {
        const s = this.search.toLowerCase();
        list = list.filter(t => t.name.toLowerCase().includes(s));
      }
      list.sort((a, b) => {
        let mod = this.sortOrder === 'asc' ? 1 : -1;
        if (this.sortKey === 'amount') return (a.amount - b.amount) * mod;
        return (new Date(a.date) - new Date(b.date)) * mod;
      });
      return list;
    },
    textColor() {
      return this.$q.dark.isActive ? 'text-white' : 'text-grey-10'
    }
  },
  methods: {
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
    //     console.error('Failed to fetch transactions:', error)
    //   } finally {
    //     this.loading = false
    //   }
    // }
  }
}
</script>

<style lang="scss" scoped>
  @import "src/css/app-card.scss";
</style>