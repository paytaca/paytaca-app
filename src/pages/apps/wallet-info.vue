<template>
  <div>
    <div id="app">
      <header-nav title="Wallet Info" backnavpath="/apps"></header-nav>
    </div>
    <footer-menu />
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'

export default {
  name: 'app-wallet-info',
  components: { HeaderNav }
}
</script>

<style scoped>
  #app {
    padding: 5px;
  }
  .section-title {
    font-size: 22px;
    margin-left: 14px;
  }
</style>
