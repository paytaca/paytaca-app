<template>
  <q-dialog ref="dialog" @hide="onDialogHide" :persistent="true" seamless>
    <q-card class="q-dialog-plugin">

        <q-card-section class="pt-label pp-text">
            <strong v-if="isSep20">Add SEP20 Token</strong>
            <strong v-else>Add SLP Token</strong>
        </q-card-section>

        <q-separator />
        <q-form ref="questForm" class="q-gutter-y-sm q-mx-none" method="post" @submit="onOKClick">
          <q-card-section class="q-pb-none">
            <q-input
              ref="SLPTokenID"
              dense
              filled
              color="input-color"
              class="pt-label"
              :label="$t(`Enter ${isSep20 ? 'SEP20 contract adress': 'SLP token ID'}`)"
              type="text"
              lazy-rules
              v-model="asset"
              :rules="[
                val => Boolean(val) || `Enter ${isSep20 ? 'SEP20 contract adress': 'SLP token id'} is required`,
              ]"
            />
          </q-card-section>

          <q-separator />

          <q-card-actions align="right">
              <q-btn rounded class="btn-add-payment text-white" padding="0.5em 2em 0.5em 2em" label="add" type="submit" />
              <q-btn class="pp-text" rounded padding="0.5em 2em 0.5em 2em" label="close" @click="onCancelClick" />
          </q-card-actions>
        </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
export default {
  props: {
    network: {
      type: String,
      default: 'BCH',
    },
  },

  data () {
    return {
      asset: null
    }
  },

  computed: {
    isSep20 () {
      return this.network === 'sBCH'
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
.btn-add-payment {
  background: radial-gradient(circle, #3C64F6 10%, #2648C3 100%) !important;
}
.pp-text {
  color: #000 !important;
}
</style>
