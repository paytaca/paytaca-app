<template>
  <q-dialog persistent ref="dialog">
    <q-card class="q-pa-md pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div>
        <div id="screenshot-qr" class="col q-py-md col-qr-code">
          <p style="color: black; margin-bottom: 0;">
            {{ isFirstShard ? 'First Shard' : 'Second Shard' }}
          </p>
          <p style="color: black">
            {{ isFirstShard ? $t('PersonalQRDescription2') : $t('ForSharingQRDescription2') }}
          </p>
          <div class="flex flex-center">
            <qr-code :text="shardText" color="#253933" :size="qrSize" error-level="H" />
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
    isFirstShard: Boolean
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
    document.addEventListener('backbutton', () => {
      this.$refs.dialog.hide()
    })

    const vm = this
    vm.qrSize = vm.$q.screen.width - 100
  }
}
</script>

<style lang="scss" scoped>
  .col-qr-code {
    margin: auto;
    text-align: center;
    width: 80vw;
    border: 4px solid #ed5f59;
    background: white;
  }
</style>
