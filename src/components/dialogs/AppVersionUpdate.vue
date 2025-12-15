<template>
  <q-dialog :persistent="isRequired" ref="dialogRef" full-width>
    <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="q-px-lg q-pt-lg text-center" :class="darkMode ? 'text-white' : 'text-black'" style="font-size: 17px;">
        A New Version is Available!
      </div>

      <div class="q-mx-lg q-px-sm q-pt-sm text-center" :class="darkMode ? 'text-white' : 'text-black'">
        {{ message }}
      </div>

      <div class="row justify-center q-py-sm">
        <q-btn 
          v-if="!isRequired"
          flat 
          :color="darkMode ? 'blue-grey-4' : 'blue-grey'" 
          label="Skip For Now" 
          @click="onSkipClick()" 
          v-close-popup
          class="q-mr-sm"
        />
        <q-btn 
          flat 
          color="blue" 
          label="Update" 
          @click="onUpdateClick()" 
          v-close-popup
        />
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
      darkMode: this.$store.getters['darkmode/getStatus']
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
    upgradeType: {
      type: String,
      required: true,
      validator: (value) => ['optional', 'required'].includes(value)
    }
  },
  computed: {
    isRequired () {
      return this.upgradeType === 'required'
    },
    message () {
      if (this.isRequired) {
        return 'You must upgrade to continue using the app.'
      } else {
        return 'You may upgrade to enjoy the latest updates.'
      }
    }
  },
  emits: [...useDialogPluginComponent.emits],
  methods: {
    openURL,
    getDarkModeClass,
    onSkipClick () {
      this.onDialogOK()
    },
    onUpdateClick () {
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

