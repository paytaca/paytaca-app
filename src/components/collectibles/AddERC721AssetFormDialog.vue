<template>
  <q-dialog v-model="val" @hide="resetForm()">
    <q-card class="q-dialog-plugin br-15 q-pb-sm" :class="{'pt-dark-card': darkMode}">
        <q-card-section class="pt-label" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
          <span class="text-weight-medium">Add SEP721 Token</span>
        </q-card-section>
        <q-separator />
        <q-form class="q-gutter-y-sm q-mx-none" method="post" @submit="submitAddToken">
          <q-card-section class="q-pb-none">
            <q-input
              dense
              filled
              label="Input SEP721 Token address"
              type="text"
              lazy-rules
              v-model="formData.contractAddress"
              @input="autoFillFromAddress()"
              :dark="darkMode"
              :rules="[
                val => Boolean(val) || 'Required',
                val => isValidAddress(val) || 'Input valid address',
                val => !isAddressInAssets(val) || 'Token already exists in list',
              ]"
            />
            <q-input
              dense
              filled
              :loading="autoFilling"
              label="Name"
              lazy-rules
              v-model="formData.name"
              :dark="darkMode"
              :rules="[
                val => Boolean(val) || 'Required',
              ]"
            />
            <q-input
              dense
              filled
              :loading="autoFilling"
              label="Symbol"
              lazy-rules
              v-model="formData.symbol"
              :dark="darkMode"
              :rules="[true]"
            />
          </q-card-section>

          <q-separator class="q-mt-none"/>

          <q-card-actions align="right">
            <q-btn rounded class="text-white" color="blue-9" padding="0.5em 2em 0.5em 2em" label="add" type="submit" />
            <q-btn rounded padding="0.5em 2em 0.5em 2em" flat :class="[darkMode ? 'pt-bg-dark' : 'pp-text']" label="close" v-close-popup />
          </q-card-actions>
        </q-form>
    </q-card>
  </q-dialog>
</template>
<script>
import { utils } from 'ethers'
import { debounce } from 'quasar'
import { getERC721ContractDetails } from '../../wallet/sbch/utils'

export default {
  name: 'AddERC721AssetFormDialog',

  props: {
    value: {
      type: Boolean,
      default: false
    },
    darkMode: Boolean
  },

  data () {
    return {
      val: this.value,
      loading: false,
      autoFilling: false,
      formData: {
        contractAddress: '',
        name: '',
        symbol: '',
      },
    }
  },
  computed: {
    erc721Assets () {
      return this.$store.getters['sep20/getNftAssets']
    }
  },
  methods: {
    isValidAddress(address) {
      return utils.isAddress(address)
    },
    isAddressInAssets(address) {
      return this.erc721Assets.some(asset => asset && asset.address === address)
    },
    resetForm () {
      this.formData.contractAddress = ''
      this.formData.name = ''
      this.formData.symbol = ''
    },
    autoFillFromAddress: debounce(async function () {
      if (!this.formData.contractAddress) return
      if (!this.isValidAddress(this.formData.contractAddress)) return
      this.autoFilling = true
      try {
        const response = await getERC721ContractDetails(this.formData.contractAddress)
        if (!response.success) return
        if (!response.token) return
        this.formData.name = response.token.name
        this.formData.symbol = response.token.symbol
      } catch { }

      this.autoFilling = false
    }, 250),
    submitAddToken () {
      const commitName = 'sep20/addNewNftAsset'
      const payload = {
        address: this.formData.contractAddress,
        name: this.formData.name,
        symbol: this.formData.symbol,
      }
      this.$store.commit(commitName, payload)
      this.alertTokenAdded(payload)
    },
    alertTokenAdded (token) {
      this.$q.dialog({
        title: 'Token added',
        message: `Added token ${token.name} with address: ${token.address}`,
        class: 'pp-text'
      }).onDismiss(() => {
        this.val = false
      })
    },
  },

  watch: {
    val () {
      this.$emit('input', this.val)
    },
    value () {
      this.val = this.value
    }
  }
}
</script>
<style scoped>
.pp-text {
  color: #000 !important;
}
.pt-bg-dark-2 {
  color: #fff !important;
  background: #5D6D7E !important;
}
</style>
