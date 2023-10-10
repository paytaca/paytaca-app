<template>
  <q-dialog v-model="val" @hide="resetForm()" persistent>
    <q-card class="q-dialog-plugin br-15 q-pb-sm" :class="{'pt-dark info-banner': darkMode}">
        <q-card-section class="pt-label" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
          <span class="text-weight-medium">{{$t(isHongKong(currentCountry) ? 'Add_SEP721_Point' : 'Add_SEP721_Token')}}</span>
        </q-card-section>
        <q-separator />
        <q-form class="q-gutter-y-sm q-mx-none" method="post" @submit="submitAddToken">
          <q-card-section class="q-pb-none">
            <q-input
              dense
              filled
              :label="$t(isHongKong(currentCountry) ? 'Input_SEP721_PointAddress' : 'Input_SEP721_TokenAddress')"
              type="text"
              lazy-rules
              v-model="formData.contractAddress"
              @update:modelValue="autoFillFromAddress()"
              :dark="darkMode"
              :rules="[
                val => Boolean(val) || $t('Required'),
                val => isValidAddress(val) || $t('InputValidAddress'),
                val => !isAddressInAssets(val) || $t(isHongKong(currentCountry) ? 'PointAlreadyInList' : 'TokenAlreadyInList'),
              ]"
            />
            <q-input
              dense
              filled
              :loading="autoFilling"
              :label="$t('Name')"
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
              :label="$t('Symbol')"
              lazy-rules
              v-model="formData.symbol"
              :dark="darkMode"
              :rules="[true]"
            />
          </q-card-section>

          <q-separator class="q-mt-none"/>

          <q-card-actions align="right">
            <q-btn rounded class="text-white button" color="blue-9" padding="0.5em 2em 0.5em 2em" :label="$t('Add')" type="submit" />
            <q-btn rounded padding="0.5em 2em 0.5em 2em" flat :class="[darkMode ? 'pt-bg-dark' : 'pp-text']" :label="$t('Close')" v-close-popup />
          </q-card-actions>
        </q-form>
    </q-card>
  </q-dialog>
</template>
<script>
import { utils } from 'ethers'
import { debounce } from 'quasar'
import { getERC721ContractDetails } from '../../wallet/sbch/utils'
import { isHongKong } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'AddERC721AssetFormDialog',

  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    darkMode: Boolean,
    currentCountry: String
  },

  data () {
    return {
      val: this.modelValue,
      loading: false,
      autoFilling: false,
      formData: {
        contractAddress: '',
        name: '',
        symbol: ''
      }
    }
  },
  computed: {
    erc721Assets () {
      return this.$store.getters['sep20/getNftAssets']
    }
  },
  methods: {
    isHongKong,
    isValidAddress (address) {
      return utils.isAddress(address)
    },
    isAddressInAssets (address) {
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
        symbol: this.formData.symbol
      }
      this.$store.commit(commitName, payload)
      this.alertTokenAdded(payload)
    },
    alertTokenAdded (token) {
      this.$q.dialog({
        title: this.$t(isHongKong(this.currentCountry) ? 'PointAdded' : 'TokenAdded'),
        message: `Added token ${token.name} with address: ${token.address}`,
        class: 'pp-text',
        darkMode: this.darkMode
      }).onDismiss(() => {
        this.val = false
      })
    }
  },

  watch: {
    val () {
      this.$emit('update:modelValue', this.val)
    },
    modelValue () {
      this.val = this.modelValue
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
