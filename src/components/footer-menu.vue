<template>
  <div class="row footer-menu justify-center"
    :style="{width: $q.platform.is.bex ? '375px' : '100%', 'padding-bottom': $q.platform.is.ios ? '80px' : '0'}"
  >
    <div class="text-white row vertical-center btn-container q-ml-sm q-mr-sm q-gutter-xs title-small">
      <div class="col">
        <q-btn class="icon-btn" @click="$router.push('/')">
          <!-- <router-link :to="{path: '/'}"> -->
            <q-icon  size="30px">
              <svg>
                <use xlink:href="app-home.svg#icon"></use>
              </svg>
            </q-icon>
            <br>
            <span>{{ $t('Home') }}</span>
          <!-- </router-link> -->
        </q-btn>
        <q-btn class="icon-btn" @click="$router.push({ name: 'transaction-send-select-asset' })">
          <!-- <router-link :to="{path: '/'}"> -->
            <q-icon  size="30px">
              <svg>
                <use xlink:href="app-send.svg#icon"></use>
              </svg>
            </q-icon>
            <br>
            <span>{{ $t('Send') }}</span>
          <!-- </router-link> -->
        </q-btn>
      </div>
      <div class="col">
        <q-btn class="icon-btn" @click="$router.push({ name: 'transaction-receive-select-asset' })">
          <!-- <router-link :to="{path: '/'}"> -->
            <q-icon  size="30px">
              <svg>
                <use xlink:href="app-receive.svg#icon"></use>
              </svg>
            </q-icon>
            <br>
            <span>{{ $t('Receive') }}</span>
          <!-- </router-link> -->
        </q-btn>
        <q-btn class="icon-btn" @click="$router.push({ name: 'apps-dashboard' })">
          <!-- <router-link :to="{path: '/'}"> -->
            <q-icon  size="30px">
              <svg>
                <use xlink:href="apps.svg#icon"></use>
              </svg>
            </q-icon>
            <br>
            <span>{{ $t('Apps') }}</span>
          <!-- </router-link> -->
        </q-btn>
        </div>
        <div id="qr-button">
        <q-btn square>
          <q-icon class="default-text-color mb-2" size="30px">
            <svg>
              <use xlink:href="app-qr.svg#icon"></use>
            </svg>
          </q-icon>
        </q-btn>
        <br>
        <span>{{ 'QR' }}</span>
      </div>
    </div>
  </div>
</template>
<script>

</script>
<style lang="scss" scoped>
.vertical-center {
  margin: 0;
  position: absolute;
  top: 50%;
  -ms-transform: translateY(-50%);
  transform: translateY(-50%);
}
.btn-container {
  margin-top: 1px !important;
  overflow-x: auto;
  overflow-y: hidden;
  flex-wrap: nowrap;
}
.icon-btn {
  border-radius: 20px;
  border: none;
  width: 60px;
  height: 50px;
  outline: none;
  background-color: transparent;
  font-size: 12px;
  color: white;
  line-height: 20px;
  min-width: 50px;
}
#qr-button {
    z-index: 100 !important;
  }
</style>
