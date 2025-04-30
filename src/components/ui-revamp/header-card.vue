<template>
  <q-card class="text-light card-light br-15 home-header-card">
    <!-- <div class="row justify-end" style="z-index: 2;">
        <-- <div></div> --

      </div> -->
    <q-btn class="button-default price-chart" round icon="show_chart" size="xs"/>
    <div class="card-container">
      <!-- token selector -->
      <div class="label-small">
        <q-icon name="keyboard_arrow_down" class="q-pr-sm"/> Select token (1 of 9)
      </div>
      <div class="row">
        <!-- Price -->
        <div class="headline-large">0.9978540 <span class="headline-small">BCH</span></div>
        <!-- Token Icon -->
        <q-img src="../../assets/bch-logo.png" id="header-logo"/>
      </div>
      <!-- Fiat Equivalent -->
       <div class="label-small">
        <span class="text-uppercase">php</span> &nbsp; 18684.99
       </div>

       <!-- Services -->
       <div class="services">
          <div class="row q-gutter-xs">
            <div class="col-10 row q-gutter-sm">
              <!-- {{ iconPath+opt.icon }} -->
              <div v-for="opt in coinsOptions">
                <q-btn  class="button-default" round>
                  <q-icon size="18px" :name="`img:ui-revamp/${opt.icon}`"/>
                </q-btn>
                <div class="q-pt-sm text-center text-capitalize title-smaller text-primary">{{ opt.name }}</div>
              </div>
            </div>
            <div class="col-2 row justify-end">
              <q-btn padding="0" icon="arrow_back_ios" size="12px" flat color="black"/>
              <q-btn padding="0" icon="arrow_forward_ios" size="12px" flat color="black"/>
            </div>
          </div>
       </div>
    </div>
  </q-card>
</template>
<script>

export default {
  data () {
    return {
      coinsOptions: [
        { name: 'freeze', icon: 'freeze.png'},
        { name: 'send', icon: 'send-bch.png'},
        { name: 'receive', icon: 'receive-bch.png'},
        { name: 'cashin', icon: 'cashin.png'}
      ]
    }
  }
}
</script>
<style lang="scss" scoped>
.home-header-card {
  z-index: 1;
  margin: 24px 16px 0px;
  .card-container {
    margin: 24px 24px 24px;
  }
}
#header-logo {
    margin: 5px 5px 0px;
    height: 28px;
    width: 28px;
  }
.token-select {
  // margin: 24px 24px 0px;
}
.services {
  margin-top: 24px;
}
.price-chart {
    position: absolute;
    right: 24px;
    top: 5%;
    // background-color: $primary !important;
    // color: #fff !important;
  }
</style>
