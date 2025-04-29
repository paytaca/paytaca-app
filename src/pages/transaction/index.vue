<template>
  <div id="app-container" class="light" :style="{ 'padding-bottom': $q.platform.is.ios ? '110px' : '100px'}">
    <!-- Gradient Panel -->
    <div id="gradient-panel"></div>

    <!-- Header -->
    <div class="row justify-between text-light header">
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
    <div class="row justify-between text-light manage-wallet">
      <div>
        <q-icon name="keyboard_arrow_down" class="q-pr-sm"/>
        <span class="body-small">Wallet Balance&nbsp;(Wallet 1)</span>&nbsp;
        <q-icon name="visibility_off" class="q-pr-sm"/>
      </div>
      <div>
        <!-- Change coin icon later <q-icon size="100px" name="img:../../assets/ui-revamp/manage-coin.png"/>-->
        <q-icon name="keyboard_arrow_down" class="q-pr-sm"/>
        <q-icon><img src='../../assets/ui-revamp/manage-coin.png'/></q-icon>
      </div>
    </div>

      <!-- Header Card -->
    <header-card/>

      <!-- Ellipses Note: Add Carousel later-->
    <div class="text-center q-pt-md">
      <q-icon padding="0" name="more_horiz" size="sm" color="black"/>
    </div>

      <!-- Tutorial Card -->
    <tutorial-card/>

      <!-- Marketplace -->
    <div class="marketplace">
      <div class="title-small">
        Shop in our Marketplace
      </div>
    </div>

    <!-- Footer -->
    <footer-menu ref="footerMenu" />
  </div>
</template>
<script>
import headerCard from 'src/components/ui-revamp/header-card.vue';
import tutorialCard from 'src/components/ui-revamp/tutorial-card.vue'

export default {
  data () {
    return {
      paytaca_logo: '../../assets/paytaca_logo.png'
    }
  },
  components: {
    headerCard,
    tutorialCard
  }
}
</script>
<style lang="scss" scoped>
.header {
  padding: 24px 16px 0;
  z-index: 1;
  #header-logo {
    height: 34px;
    width: 36px;
  }
}
.manage-wallet {
  z-index: 1;
  margin: 24px 16px 0px;
}
.marketplace {
  margin: 24px 16px 0px;
}
</style>
