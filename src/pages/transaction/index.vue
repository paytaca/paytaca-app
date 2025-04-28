<template>
  <div id="app-container" class="light">
    <!-- Gradient Panel -->
    <div id="gradient-panel"></div>

    <!-- Header -->
    <div style="z-index: 1;" class="row justify-between text-light header">
      <div class="col-7 row">
        <img src='../../assets/paytaca_logo.png' id="header-logo"/>
        <div class="q-pl-sm" style="line-height: 0px;">
          <span class="label-medium">Welcome to</span><br>
          <span class="title-small">Paytaca BCH Wallet</span>
        </div>
      </div>
      <div class="col row justify-end q-pt-sm" style="right: 0px">
        <q-btn no-caps outline rounded padding="xs" size="sm" class="q-mx-xs">
          <span class="body-small q-px-xs">Help?</span>
        </q-btn>
        <q-btn icon="notifications" size="sm" padding="sm" outline round class="q-mx-xs ">
          <!-- <q-icon name="notifications" size=xs></q-icon> -->
        </q-btn>
        <q-btn icon="settings" size="sm" padding="sm" outline round class="q-mx-xs"/>
      </div>
    </div>
    <!-- Body -->

    <!-- Footer -->
    <footer-menu ref="footerMenu" />
  </div>
</template>
<script>

export default {
  data () {
    return {
      paytaca_logo: '../../assets/paytaca_logo.png'
    }
  }
}
</script>
<style lang="scss" scoped>
.header {
  padding: 24px 16px 0;
  #header-logo {
    height: 34px;
    width: 36px;
  }
}
</style>
