<template>
  <q-dialog persistent ref="dialogRef">
    <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)" style="width: 250px">
      <div class="text-center q-py-lg text-bold" :class="darkMode ? 'text-white' : 'text-black'" style="font-size: 15px;">Update App to Latest Version</div>

      <div class="row justify-center q-pb-sm">
        <q-btn flat color="red" label="cancel" @click="$router.push('/apps')" v-close-popup v-if="type === 'ramp'"/>
        <q-btn flat color="blue" label="OK" @click="onOKClick()" v-close-popup/>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { openURL } from 'quasar'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
    }
  },
  setup () {
    const { dialogRef, onDialogOK } = useDialogPluginComponent()

    return {
      onDialogOK,
      dialogRef
    }
  },
  props: {
    type: {
      type: String,
      default: 'general'
    }
  },
  emits: [...useDialogPluginComponent.emits],
  methods: {
    openURL,
    getDarkModeClass,
    onOKClick () {
      openURL(this.updateLink())
      this.onDialogOK()
    },
    updateLink () {
      let link = ''
      if (this.$q.platform.is.mobile) {
        link = 'https://play.google.com/store/apps/details?id=com.paytaca.app'
      }
      if (this.$q.platform.is.ios) {
        link = 'https://apps.apple.com/app/paytaca/id1451795432'
      }
      if (this.$q.platform.is.bex) {
        link = 'https://chrome.google.com/webstore/detail/paytaca/pakphhpnneopheifihmjcjnbdbhaaiaa'
      }

      return link
    }
  }
}
</script>
