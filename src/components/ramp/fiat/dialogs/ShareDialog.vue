<template>
  <q-dialog ref="dialog" full-width position="bottom" transition-show="slide-up">
    <q-card class="q-pb-lg br-15">
      <div class="q-pl-lg q-pt-md q-pb-sm text-bold" style="font-size: 20px;">Share</div>

      <div class="q-px-lg q-pb-sm">
        <q-input v-model="link" readonly outlined dense>
          <template v-slot:append>
            <q-icon name="content_copy" @click="copyText(link)"/>
          </template>
        </q-input>
      </div>

      <div class="row q-pt-sm justify-center">
        <div v-for="(index, shareLink) in shareLinks" :key="index">
          <q-btn :icon="shareLinks[shareLink].icon" size="lg" padding="0" flat round class="q-mx-md" color="blue-grey-8"/>
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
      darkMode: true,
      link: 'https://test.com/exchange'
    }
  },
  computed: {
    shareLinks () {
      const data = {
        fb: { icon: 'fab fa-facebook'},
        messenger: { icon: 'fab fa-facebook-messenger' },
        telegram: { icon: 'telegram' },
        whatsapp: { icon: 'fab fa-whatsapp' },
        email: { icon: 'email' }
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
      // console.log('copying link: ', value)
      // this.$copyText(value)
      // this.$copyText('hello worl')
      // this.$q.notify({
      //   message: this.$t('CopiedToClipboard'),
      //   timeout: 800,
      //   color: 'blue-9',
      //   icon: 'mdi-clipboard-check'
      // })
    }
  }
}
</script>
