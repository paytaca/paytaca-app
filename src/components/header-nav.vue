<template>
  <div class="header-nav" :class="hasGradient ? 'gradient-bg':''" :style="{ height: getHeight }">
    <div class="nav-content row text-light">
      <div class="col-2">
        <q-btn icon="arrow_back_ios" style="padding-left: 5px;" size="sm" class="button-border" @click="previousPage()"/>
      </div>
      <div class="col-8 text-center title-large">
        {{ title }} <span class="title-small" v-if="subtitle">({{ subtitle }})</span>
      </div>
      <div class="col-2 text-right">
        <q-btn v-if="hasSettings" icon="settings" size="sm" class="button-border" @click="$router.push('/apps/settings')"/>
      </div>
    </div>
  </div>
</template>
<script>
import { settings } from 'src/store/walletconnect/getters'

export default {
  props: {
    title: {
      type: String,
      default: ''
    },
    subtitle: {
      type: String,
      default: ''
    },
    height: {
      type: String,
      default: 'small' // small, medium, full-height
    },
    hasGradient: {
      type: Boolean,
      default: false
    },
    hasSettings: {
      type: Boolean,
      default: false
    },
    backnavpath: {
      type: String,
      default: ''
    },
    useEmitBack: {
      type: Boolean,
      default: false
    },
    doubleBack: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    getHeight () {
      const height_size = ''

      switch (this.height) {
        case 'small':
          return  '84px'
        case 'medium':
          return '138px'
        case 'full-height':
          return '100%'
      }
    },    
  },
  emits: ['back'],
  methods: {
    previousPage() {
      const vm = this
      if(vm.useEmitBack) {
        vm.$emit('back')
      } else {
        if (vm.backnavpath) {
          vm.$router.push(vm.backnavpath)
        } else {
          vm.$router.go(-1)
        }
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.nav-content {
  margin: 24px 16px 0px
}
.back-button {
  border: 1px solid #fff;
  border-radius: 20%;
  align-items: center;
}
.button-border {
  border: 1px solid #fff;
  border-radius: 20%;
  padding: 0;
  width: 30px;
  height: 30px;
}
</style>
