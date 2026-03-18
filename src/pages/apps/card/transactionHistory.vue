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
      <q-space />
      <q-btn
        flat dense size="sm"
        :color="sortKey === 'date' ? 'primary' : ($q.dark.isActive ? 'grey-5' : 'grey')"
        label="Date"
        @click="toggleSort('date')"
      >
        <q-icon :name="sortKey === 'date' ? (sortOrder === 'asc' ? 'expand_less' : 'expand_more') : 'unfold_more'" />
      </q-btn>
      <q-btn
        flat dense size="sm"
        :color="sortKey === 'amount' ? 'primary' : ($q.dark.isActive ? 'grey-5' : 'grey')"
        label="Amount"
        @click="toggleSort('amount')"
      >
        <q-icon :name="sortKey === 'amount' ? (sortOrder === 'asc' ? 'expand_less' : 'expand_more') : 'unfold_more'" />
      </q-btn>
    </div>

    <q-separator class="q-mb-sm" :dark="$q.dark.isActive" />

    <div class="scroll" style="height: 350px;">
      <div v-if="filteredTransactions.length > 0">
        <q-list separator :dark="$q.dark.isActive">
          <q-item v-for="t in filteredTransactions" :key="t.id" class="q-px-none">
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
                {{ t.name }}
              </div>
              <div class="text-caption text-weight-bold text-grey">{{ t.date }}</div>
            </q-item-section>
            <q-item-section side>
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
      // Mock data - in a real app, you'd fetch this using this.card.id
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
  }
}
</script>

<style lang="scss" scoped>
  @import "./createCard.scss"
</style>
