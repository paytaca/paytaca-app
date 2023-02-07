<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="$store.getters['darkmode/getStatus'] ? 'pt-dark' : ''">
    <header-nav :title="$t('Deposit')" backnavpath="/apps" ></header-nav>

    <h1>{{ this.depositCoin }}</h1>
  </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'

export default {
  components: {
    HeaderNav
  },
  data () {
    return {
      depositCoin: ''
    }
  },
  props: {
    selectedCoin: String
  },
  async mounted () {
    const vm = this

    vm.depositCoin = vm.selectedCoin

    console.log(vm.depositCoin)
  }
}
</script>
