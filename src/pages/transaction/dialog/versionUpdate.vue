<template>
  <q-dialog persistent ref="dialogRef" full-width>
    <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="q-px-lg q-pt-lg text-center" :class="darkMode ? 'text-white' : 'text-black'" style="font-size: 17px;">
        A New Version is Available!
      </div>

      <div class="q-mx-lg q-px-sm q-pt-sm">
        To enhance your experience and access the latest features and improvements, please update to the newest version of the app.
      </div>

      <div class="row justify-center q-py-sm">
        <q-btn flat :color="darkMode ? 'blue-grey-4' : 'blue-grey'"  label="cancel" @click="$router.push('/apps')" v-close-popup v-if="type === 'ramp'"/>
        <q-btn flat color="blue" label="Update" @click="onOKClick()" v-close-popup/>
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
      versionInfo: this.data
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
    },
    data: Object
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
