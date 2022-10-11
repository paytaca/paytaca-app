<template>
  <q-dialog ref="dialog" @hide="onDialogHide" :persistent="true" seamless>
    <q-card class="q-dialog-plugin br-15 q-pb-sm" :class="{'pt-dark-card-2': darkMode}">
        <q-card-section class="pt-label text-weight-medium" :class="darkMode ? 'pt-dark-label' : 'pp-text'">
            <span>{{ addTokenTitle }}</span>
        </q-card-section>

        <q-separator />
        <q-form ref="questForm" class="q-gutter-y-sm q-mx-none" method="post" @submit="onOKClick">
          <q-card-section class="q-pb-none">
            <q-input
              ref="SLPTokenID"
              dense
              filled
              color="input-color"
              :label="inputPlaceholder"
              type="text"
              lazy-rules
              v-model="asset"
              :dark="darkMode"
              :rules="[
                val => Boolean(val) || $t('Required'),
              ]"
            />
          </q-card-section>

          <q-separator class="q-mt-none" />

          <q-card-actions align="right">
              <q-btn rounded class="text-white" color="blue-9" padding="0.5em 2em 0.5em 2em" :label="$t('Add')" type="submit" />
              <q-btn rounded padding="0.5em 2em 0.5em 2em" :class="[darkMode ? 'pt-bg-dark' : 'pp-text']" flat :label="$t('Close')" @click="onCancelClick" />
          </q-card-actions>
        </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
export default {
  emits: [
    // REQUIRED
    'ok', 'hide'
  ],
  props: {
    network: {
      type: String,
      default: 'BCH'
    },
    darkMode: Boolean
  },

  data () {
    return {
      asset: null
    }
  },

  computed: {
    isSep20 () {
      return this.network === 'sBCH'
    },
    addTokenTitle () {
      return this.isSep20 ? this.$t('Add_SEP20_Token') : this.$t('Add_Type1_Token')
    },
    inputPlaceholder () {
      return this.isSep20 ? this.$t('Enter_SEP20_ContractAddress') : this.$t('Enter_SLP_TokenId')
    }
  },

  methods: {
    show () {
      this.$refs.dialog.show()
    },
    onOKClick () {
      this.$refs.questForm.validate().then(success => {
        this.$emit('ok', this.asset)
        this.hide()
      })
    },
    onCancelClick () {
      this.hide()
    },
    hide () {
      this.$refs.dialog.hide()
    },
    onDialogHide () {
      this.$emit('hide')
    }
  }
}
</script>

<style>
.pp-text {
  color: #000 !important;
}
</style>
