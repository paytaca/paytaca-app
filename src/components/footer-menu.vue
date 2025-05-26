<template>
  <div class="footer-menu"
    :style="{width: $q.platform.is.bex ? '375px' : '100%', 'height': $q.platform.is.ios ? '80px' : '70px'}"
  >
    <div class="row text-dark btn-container title-smaller">
      <div class="col text-center">
        <q-btn no-caps class="icon-btn title-smaller" flat @click="selectMenu('transaction-index', 'home')">
          <q-icon size="25px" name="img:app-home.svg" :class="isActive('home') ? 'active' : 'inactive'">               
          </q-icon>
          <br>
          <span>{{ $t('Home') }}</span>
        </q-btn>
      </div>
      <div class="col text-center">
        <q-btn no-caps class="icon-btn title-smaller" flat @click="selectMenu('', 'tx')" >
          <q-icon size="25px" name="receipt_long" :class="isActive('tx') ? 'active' : 'inactive'">           
          </q-icon>
          <br>
          <span>TX</span>
        </q-btn>
      </div>
      <div class="col text-center">
        <q-btn flat no-caps class="icon-btn title-smaller" @click="selectMenu('app-marketplace', 'market')">
          <q-icon size="25px" name="img:ui-revamp/marketplace-light.svg" :class="isActive('market') ? 'active' : 'inactive'">                
          </q-icon>
          <br>
          <span>Market</span>
        </q-btn>
      </div>
      <div class="col text-center">
        <q-btn flat no-caps class="icon-btn title-smaller" @click="selectMenu('apps-dashboard', 'tools')">
          <q-icon size="25px" name="img:apps.svg" :class="isActive('tools') ? 'active' : 'inactive'">           
          </q-icon>
          <br>
          <span>Apps</span>
        </q-btn>
      </div>
    </div>
  <!-- <div class="qr-scanner-container center" :style="{ 'padding-bottom': $q.platform.is.ios ? '60px' : '50px' }">
    <div class="qr-scanner" @click="$router.push({ name: 'qr-reader' })">
      <q-btn flat color="white" class="qr-button">
        <q-icon size="25px" name="img:ui-revamp/qr.svg">
          <-- <svg>
            <use xlink:href="app-qr.svg#icon"></use>
          </svg> --
        </q-icon>
      </q-btn>
    </div>-->
  </div>
</template>
<script>

export default {
  data () {
    return {      
    }
  },
  computed: {
    activeMenu () {
      return this.$store.getters['global/activeMenu']
    }
  },
  methods: {
    selectMenu (path, menu) {
      this.$router.push({ name: path })      
      this.$store.commit('global/updateActiveMenu', menu)
    },
    isActive(menu) {
      return menu === this.activeMenu

    }
  }
}
</script>
<style lang="scss" scoped>
.btn-container {
  margin: auto;
  overflow-x: auto;
  overflow-y: hidden;
  flex-wrap: nowrap;
  height: 100%;
}
// .btn-container {
//   margin-top: 1px !important;
//   overflow-x: auto;
//   overflow-y: hidden;
//   flex-wrap: nowrap;
// }
.icon-btn {
  border-radius: 20px;
  border: none;
  width: 60px;
  outline: none;
  background-color: transparent;
  padding-top: 15px;  
}
.active {
  filter: brightness(0) saturate(100%) invert(53%) sepia(49%) saturate(6303%) hue-rotate(205deg) brightness(98%) contrast(96%);
}
.inactive {
  filter: brightness(0) saturate(100%) invert(53%) sepia(49%) saturate(6303%) hue-rotate(205deg) brightness(98%) contrast(96%);
}
#qr-button {
    z-index: 100 !important;
  }
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}
.qr-scanner-container {
  position: fixed;
  bottom: 0;
  width: 100%;
  z-index: 5;
  .qr-scanner {
    height: 50px;
    width: 50px;
    background-color: $primary;
    border-radius: 15px;
  }
  .qr-button {
    padding-top: 13px;
    padding-left: 13px;
  }
}
</style>
