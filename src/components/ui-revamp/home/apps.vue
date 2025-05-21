<template>
  <div class="apps-container" :class="darkmode ? 'text-light' : 'text-dark'">
    <div class="row justify-between">
      <div class="title-medium">Paytaca Apps</div>
      <div class="text-capitalize body-small text-link">View more</div>
    </div>

    <!-- Apps -->
    <div id="list-container" class="apps-options">
      <div v-for="app in apps" class="app-item text-center">
        <q-btn  class="button-light br-15 app-button" square style="padding: 0px 10px 0px;" @click="$router.push(app.path)">
          <q-icon size="24px" :name="app.icon" :class="app.name === 'Wallet Backup' ? 'default-color' : ''"/>
        </q-btn>
        <p class="q-pt-md title-smaller app-text">{{ app.name }}</p>
      </div>

      <!-- Change Color of SVG -->
      <!-- <img id="test" src="ui-revamp/Frame.svg" alt=""> -->
    </div>

  </div>
</template>
<script>

export default {
  data () {
    return {
      darkmode: this.$store.getters['darkmode/getStatus'],
      iconPath: 'img:ui-revamp/',
      apps: [
        { name: 'Merchant Admin' , icon: 'img:ui-revamp/merchant-admin.svg', path: '/apps/pos-admin'},
        { name: 'Marketplace' , icon: 'img:ui-revamp/marketplace.svg', path: '/apps/marketplace'},
        { name: 'P2P Echange' , icon: 'img:ui-revamp/p2p-exchange.svg', path: '/apps/exchange'},
        { name: 'Anyhedge' , icon: 'img:ui-revamp/anyhedge.svg', path: 'apps/anyhedge'},
        { name: 'Wallet Connect', icon: 'mdi-connection', path: '/apps/wallet-connect' },
        { name: 'Gifts', icon: 'mdi-gift', path: '/apps/gifts' },
        { name: 'Collectibles', icon: 'burst_mode', path: '/apps/collectibles'},
        { name: 'Map', icon: 'public', path: '/apps/map/' },
        { name: 'Wallet Info', icon: 'info', path: '/apps/wallet-info' }, // remove this from list?
        { name: 'Wallet Backup', icon: 'img:wallet-backup.png', path: '/apps/wallet-backup' }



      ]
    }
  }
}
</script>
<style lang="scss" scoped>
.apps-container {
  margin: 24px 16px 0px;
  .apps-options {
    margin-top: 10px;
    display: flex;
    overflow-x: auto;
    // gap: 10px;
            padding: 10px;
    white-space: nowrap;
    // transition: all 0.3s ease-in-out;
  }
  .app-item {
    // margin-right: 0x;
    // align-items: center;
  }
}
.list-container {

}
.app-button {
  display: block;
  margin: auto
}
.app-text {
  text-align: center;
  line-height: 15px !important;
  margin: 0px 10px 0px;
  word-wrap: break-word;
  overflow-wrap: break-word;

}

.default-color {  
   filter: brightness(0) saturate(100%) invert(28%) sepia(5%) saturate(6346%) hue-rotate(179deg) brightness(106%) contrast(75%);
}
</style>
