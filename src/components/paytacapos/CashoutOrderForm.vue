<template>
  <div class="text-center md-font-size text-grey-9 text-bold">Cash Out Transactions</div>
  <!-- Transaction List -->
  <div>
    <q-pull-to-refresh @refresh="refreshData">
      <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 100}px`" style="overflow:auto;">
        <!-- Cashout Order -->
        <q-card flat class="q-mx-lg q-mt-sm">
          <q-item v-for="(transaction, index) in transactions" :key="index" clickable @click="''">
            <q-item-section>
              transaction {{ index }}
            </q-item-section>
          </q-item>
        </q-card>
      </q-list>
    </q-pull-to-refresh>
  </div>
</template>
<script>

export default {
  data () {
    return {
      transactions: this.data,
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100,
    }
  },
  props: {
    data: Array
  },
  mounted () {
    console.log('transactions: ', this.data)
  },
  methods: {
    async refreshData (done) {
      done()
    }
  }
}
</script>
<style lang="scss" scoped>
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }
  .lg-font-size {
    font-size: large;
  }
</style>
