<template>
  
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:100px;padding-bottom:50px;"
    :class="{'pt-dark': darkMode}"
  >
    <HeaderNav
      title="AnyHedge"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />

    
  </div>
</template>
<script>
import HeaderNav from '../../components/header-nav'
import { OracleNetwork, OracleData } from '@generalprotocols/price-oracle'
import { AnyHedgeManager } from '@generalprotocols/anyhedge'

export default {
  name: 'AnyHedge',
  components: {
    HeaderNav,
  },
  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    test() {
      console.log(OracleNetwork, OracleData)
      console.log(AnyHedgeManager)
    }
  },
  mounted() {
    this.test()
  }
}
</script>