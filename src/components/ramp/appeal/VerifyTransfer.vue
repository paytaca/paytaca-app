<template>
  <q-card class="br-15 q-pt-sm q-mx-md q-mx-none q-my-lg" bordered flat
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]">
    <div>
      <q-btn
        flat
        padding="md"
        icon="close"
        @click="$emit('back')"
      />
    </div>
    <div class="text-center lg-font-size bold-text text-uppercase q-py-sm">Verifying Transfer</div>

    <q-separator class="q-my-sm q-mx-lg" :dark="darkMode"/>

    <div class="q-py-md q-mx-lg q-px-sm">
      <div class="sm-font-size q-pb-xs">Contract</div>
      <q-input class="q-pb-xs q-pb-lg" disable dense filled :dark="darkMode" v-model="contract">
      </q-input>

      <div class="sm-font-size q-pb-xs">TXID</div>
      <div @click="copyToClipboard(txid)">
        <q-input class="q-pb-xs" disable dense filled :dark="darkMode" v-model="txid">
          <template v-slot:append>
            <q-icon size="sm" name="content_copy"/>
          </template>
        </q-input>
      </div>
      <span class="xs-font-size" :class="darkMode ? '' : 'text-grey-7'">&nbsp;Contract Balance: 0 BCH</span>
    </div>
    <div class="text-center q-pb-lg" :class="darkMode ? '' : 'text-grey-7'">Verifying transfer, please wait...</div>
  </q-card>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      contract: 'bitcoincash:xxxxxxxxxxxxxxxx',
      txid: '04091977eb623861ca9138f1...c2da84'
    }
  },
  emits: ['back'],
  methods: {
    copyToClipboard (value) {
      console.log('copying')
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    }
  }
}
</script>
