<template>
  <q-dialog v-model="openDialog" v-on:before-hide="$emit('back')">
    <q-card
      class="br-15 q-px-md q-pa-xs q-mx-md q-mx-none pt-card-2 text-bow"
      :class="getDarkModeClass(darkMode)"
      :style="$q.platform.is.mobile ? 'min-width: 100%' : 'min-width: 30%'">
      <!-- <q-btn flat padding="md" icon="close" @click="$emit('back')"/> -->
      <div class="text-center text-weight-bold text-h6 q-my-md">{{ $t('SelectRampApp') }}</div>
      <div class="row no-wrap text-subtitle1 text-center q-pt-sm q-mb-lg">
        <div class="col-6 q-pa-xs">
          <div
            class="pt-app bg-grad"
            
            :style="{borderRadius: '20px'}"
            @click="selectApp('crypto')"
          >
            <q-icon class="app-icon" color="white" size="50px" name="currency_bitcoin" />
          </div>
          <p class="q-mt-xs q-mb-none q-mx-none pt-label" :class="getDarkModeClass(darkMode)">{{ $t('Crypto') }}</p>
        </div>

        <div class="col-6 q-pa-xs">
          <div
            class="pt-app bg-grad"
            
            :style="{borderRadius: '20px'}"
            @click="selectApp('fiat')"
          >
            <q-icon class="app-icon" color="white" size="50px" name="attach_money" />
          </div>
          <p class="q-mt-xs q-mb-none q-mx-none pt-label" :class="getDarkModeClass(darkMode)">{{ $t('Fiat') }}</p>
        </div>

        <!-- <div class="col column items-center">
          <q-btn @click="selectApp('appeal')" class="q-mb-sm q-pa-md button-color" dense flat outline rounded size="2em" icon="gavel"/>
          <span class="text-capitalize">appeals</span>
        </div> -->
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      openDialog: true
    }
  },
  emits: ['back', 'submit'],
  computed: {
    theme () {
      return this.$store.getters['global/theme']
    }
  },
  methods: {
    getDarkModeClass,
    selectApp (app) {
      this.openDialog = false
      this.$emit('submit', app)
    }
  }
}
</script>
<style lang="scss" scoped>
  .app-icon {
    vertical-align: middle;
    align-content: center;
  }
  .pt-app {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 25px;
    height: 100px;
  }
</style>
