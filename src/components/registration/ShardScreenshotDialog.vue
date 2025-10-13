<template>
  <q-dialog persistent ref="dialog">
    <q-card class="q-pa-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div>
        <div id="screenshot-qr" class="col q-py-md">
          <p style="margin-bottom: 0;">
            {{ shardth === 1 ? $t('FirstShard') : shardth === 2 ? $t('SecondShard') : $t('ExtraShard') }}
          </p>
          <p>
            {{
              shardth === 1
                ? $t('PersonalQRDescription2')
                : shardth === 2
                  ? $t('ForSharingQRDescription2')
                  : $t('ExtraQRDescription2')
            }}
          </p>
          <div class="flex flex-center">
            <qr-code :qr-id="shardth" :text="shardText" :size="qrSize" />
          </div>
        </div>
      </div>

      <div class="flex flex-center q-mt-md">
        <q-btn
          v-close-popup
          rounded
          class="button"
          :label="$t('Back')"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'ShardScreenshotDialog',

  props: {
    shardText: String,
    shardth: Number
  },

  data () {
    return {
      qrSize: 200
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass
  },

  mounted () {
    const vm = this

    document.addEventListener('backbutton', () => {
      vm.$refs.dialog.hide()
    })

    const screenWidth = vm.$q.screen.width
  }
}
</script>
