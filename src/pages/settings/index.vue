<template>
  <div class="pt-settings">
      <div class="row">
          <div class="col 12">
              <div class="pt-header">
                  <router-link :to="{ path: '/' }" class="pt-arrow-left-link">
                    <span class="material-icons">
                        arrow_back
                    </span>
                  </router-link>
                  <p class="text-h5 text-center q-my-none">
                    SETTINGS
                  </p>
                  <p class="text-h5 q-my-none pt-settings-icon">
                    <span class="material-icons">
                        settings
                    </span>
                  </p>
              </div>
          </div>
      </div>
      <div class="row">
          <div class="col-12 q-px-lg q-mt-md">
              <p class="q-px-sm q-my-sm dim-text">SECURITY</p>
              <q-list bordered separator padding style="border-radius: 14px; background: #fff">
                <q-item clickable v-ripple @click="popUpPinDialog">
                    <q-item-section>
                        <q-item-label class="pt-setting-menu">PIN</q-item-label>
                    </q-item-section>
                    <q-item-section avatar>
                        <q-icon name="pin" class="pt-setting-avatar"></q-icon>
                    </q-item-section>
                </q-item>
              </q-list>
          </div>
      </div>

      <pinDialog :pin-dialog-action="pinDialogAction" v-on:nextAction="removePinCaption" />

  </div>
</template>

<script>
import pinDialog from '../../components/pin'

export default {
  data () {
    return {
      pinDialogAction: ''
    }
  },
  components: { pinDialog },
  methods: {
    popUpPinDialog () {
      this.pinDialogAction = 'SET NEW'
    },
    removePinCaption () {
      this.pinDialogAction = ''
    }
  }
}
</script>

<style>
.pt-settings {
    background-color: #ECF3F3;
    min-height: 100vh;
}
.pt-header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 70px;
    color: #3B7BF6;
}
.pt-arrow-left-link {
    position: absolute;
    font-size: 30px;
    left: 20px;
    color: #3B7BF6;
    text-decoration: none;
    display: flex;
    justify-items: center;
    align-items: center;
}
.pt-settings-icon {
    position: absolute;
    font-size: 28px;
    right: 20px;
    color: #3B7BF6;
    display: flex;
    justify-items: center;
    align-items: center;
}
.pt-item {
    border-bottom-right-radius: 14px;
    border-bottom-left-radius: 14px;
}
.dim-text {
    color: #8F8CB8;
}
.pt-setting-menu {
    color: #3B7BF6;
}
.pt-setting-avatar {
    color: #da53b2;
}
</style>
