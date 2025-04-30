<template>
  <div class="apps-container">
    <div class="row justify-between">
      <div class="title-medium">Paytaca Apps</div>
      <div class="text-capitalize body-small text-link">View more</div>
    </div>

    <!-- Apps -->
    <div id="list-container" class="apps-options">
      <div v-for="app in apps" class="app-item text-center">
        <q-btn  class="button-light br-15 app-button" square style="padding: 0px 10px 0px;">
          <q-icon size="24px" :name="app.icon"/>
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
      iconPath: 'img:ui-revamp/',
      apps: [
        { name: 'Merchant Admin' , icon: 'img:ui-revamp/merchant-admin.svg'},
        { name: 'Marketplace' , icon: 'img:ui-revamp/marketplace.svg'},
        { name: 'P2P Echange' , icon: 'img:ui-revamp/p2p-exchange.svg'},
        { name: 'Anyhedge' , icon: 'img:ui-revamp/anyhedge.svg'},
        { name: 'Wallet Connect', icon: 'mdi-connection' },
        { name: 'Gifts', icon: 'mdi-gift'},
        { name: 'Collectibles', icon: 'burst_mode' },
        { name: 'Map', icon: 'public' },
        { name: 'Wallet Info', icon: 'info' }, // remove this from list?
        { name: 'Wallet Backup', icon: 'img:wallet-backup.png' }



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

// #test {
//   filter: brightness(0) saturate(100%) invert(41%) sepia(14%) saturate(2216%) hue-rotate(178deg) brightness(96%) contrast(88%);
// }
</style>
