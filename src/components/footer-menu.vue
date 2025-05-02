<template>
  <div class="footer-menu"
    :style="{width: $q.platform.is.bex ? '375px' : '100%', 'height': $q.platform.is.ios ? '80px' : '70px'}"
  >
    <div class="row text-light btn-container title-smaller">
      <div class="col text-light">
        <div class="row">
          <div class="col text-center">
            <q-btn no-caps class="icon-btn title-smaller" flat @click="$router.push('/')">
              <q-icon size="25px">
                <svg>
                  <use xlink:href="app-home.svg#icon"></use>
                </svg>
              </q-icon>
              <br>
              <span>{{ $t('Home') }}</span>
            </q-btn>
          </div>
          <div class="col text-center">
            <q-btn no-caps class="icon-btn title-smaller" flat @click="$router.push({ name: 'transaction-send-select-asset' })">
              <q-icon size="25px">
                <svg>
                  <use xlink:href="app-send.svg#icon"></use>
                </svg>
              </q-icon>
              <br>
              <span>{{ $t('Send') }}</span>
            </q-btn>
          </div>
        </div>
      </div>
      <div class="col text-light text-center text-smaller" style="padding-top: 35px;">
        Scanner
      </div>
      <div class="col text-light">
        <div class="row">
          <div class="col">
            <q-btn no-caps class="icon-btn title-smaller" @click="$router.push({ name: 'transaction-receive-select-asset' })">
              <q-icon size="25px">
                <svg>
                  <use xlink:href="app-receive.svg#icon"></use>
                </svg>
              </q-icon>
              <br>
              <span>{{ $t('Receive') }}</span>
            </q-btn>
          </div>
          <div class="col">
            <q-btn no-caps class="icon-btn title-smaller" @click="$router.push({ name: 'apps-dashboard' })">
              <q-icon size="25px">
                <svg>
                  <use xlink:href="apps.svg#icon"></use>
                </svg>
              </q-icon>
              <br>
              <span>{{ $t('Apps') }}</span>
            </q-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="qr-scanner-container center" :style="{ 'padding-bottom': $q.platform.is.ios ? '60px' : '50px' }">
    <div class="qr-scanner" @click="$router.push({ name: 'qr-reader' })">
      <q-btn flat color="white" class="qr-button">
        <q-icon size="30px">
          <svg>
            <use xlink:href="app-qr.svg#icon"></use>
          </svg>
        </q-icon>
      </q-btn>
    </div>
  </div>
</template>
<script>
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
    padding: 10px 10px 0px;
  }
}
</style>
