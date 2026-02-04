<template>
  <q-dialog ref="dialog" full-width position="bottom" transition-show="slide-up">
    <q-card class="q-pb-lg br-15 bottom-card">
      <div class="q-pl-lg q-pt-md q-pb-sm text-bold" style="font-size: 20px;">Share Ad</div>

      <div class="q-px-lg q-pb-sm">
        <q-input v-model="link" readonly outlined dense>
          <template v-slot:append>
            <q-icon name="content_copy" @click="copyText(link)"/>
          </template>
        </q-input>
      </div>

      <div class="row q-pt-sm justify-center">
        <div v-for="(index, shareLink) in shareLinks" :key="index">
          <q-btn :icon="shareLinks[shareLink].icon" size="md" padding="0" flat round class="q-mx-md" :color="darkMode ? 'white' : 'blue-grey-8'" :href="shareLinks[shareLink].url" target="blank"/>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { copyToClipboard } from 'quasar'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      link: this.adShareUrl
    }
  },
  props: {
    adShareUrl: String
  },
  computed: {
    shareLinks () {
      const encodedUrl = encodeURIComponent(this.adShareUrl)
      const fbAppId = 438643061338284 // using a dev app, might have to replace
      const data = {
        fb: { icon: 'fab fa-facebook', url: `https://www.facebook.com/dialog/share?app_id=${fbAppId}&href=${encodedUrl}&display=popup` },
        messenger: { icon: 'fab fa-facebook-messenger', url: `https://facebook.com/share/?url=${encodedUrl}`, },
        twitter: { icon: 'fab fa-twitter', url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=P2P Ramp Ad&via=_paytaca_&related=_paytaca_` },
        telegram: { icon: 'telegram', url: `https://t.me/share?url=${encodedUrl}&text=Paytaca P2P Ramp Ad`, },
        whatsapp: { icon: 'fab fa-whatsapp', url: `https://wa.me/?text=Paytaca P2P Ramp Ad\n${encodedUrl}`, },
        email: { icon: 'email', url: `mailto:?body=P2P Ramp Ad: ${encodedUrl}` },
      }

      if (this.$q.platform.is.mobile) {
        data.telegram.url = `tg://msg_url?url=${encodedUrl}&text=P2P Ramp Ad`
        data.messenger = {
          icon: 'fab fa-facebook-messenger',
          url: `fb-messenger://share/?link=${encodedUrl}&app_id=${fbAppId}`
        }
      } else {
        delete data.messenger
      }
      return data
    }
  },
  methods: {
    copyText (value) {
      copyToClipboard(value)
        .then(() => {
          this.$q.notify({
            message: this.$t('CopiedToClipboard'),
            timeout: 800,
            color: 'blue-9',
            icon: 'mdi-clipboard-check'
          })
        })
    }
  }
}
</script>
