<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('PST')"
              :backnavpath="`/apps/multisig/wallet/${route.params.address}}/pst`"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row q-mt-lg justify-center">
              <div class="col-xs-12 col-md-8 q-px-md q-gutter-y-md">
                Transaction {{ pst.transaction }}
                <q-list>
                  <q-item
                    :to="{name: 'app-multisig-wallet-pst-view', params: { address: route.params.address, id: pst.id }}">
                    <q-item-section>
                      <q-item-label>Spending BCH: {{ pst.totalBchValue }}</q-item-label>
                      <q-item-label># of Recipients: {{ pst.numberOfRecipients }}</q-item-label>
                      <q-item-label># of Signatures: {{ Object.keys(pst.signatures).length }}</q-item-label>
                      <q-item-label># of Required Signatures: {{ pst.m }}</q-item-label>
                      <div>Signers</div>
                      <div class="flex">
                        <q-chip
                          v-for="signerInfo, i in Object.entries(pst.signersInfo||{})" :key="`${signerInfo[0]}${i}`"
                          :icon="hasSignature(signerInfo[1], pst)? 'task': 'edit_document'"
                          class="q-mr-md"
                        >
                        {{ signerInfo[1].name }}
                        </q-chip>
                      </div>
                    </q-item-section>
                    <q-item-section side top>
                      <q-item-label><q-btn label="Sign"></q-btn></q-item-label>
                      <q-item-label caption>caption here</q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>{{ pst.transaction }}</q-item>
                </q-list>
              </div>
              <div class="col-xs-12 col-md-8 q-px-md q-gutter-y-md">
                <q-btn @click="deletePst">
                  Delete
                </q-btn>
                <q-btn
                  :to="{ name: 'app-multisig-wallet-pst-qrcode', params: {address: route.params.address, id: route.params.id } }">
                  View Qr Code
                </q-btn>
                <q-btn icon="download" label="Download PST File" @click="downloadPstFile"/>
              </div>
            </div>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { useStore } from 'vuex'
// import { useI18n } from 'vue-i18n'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
// import { loadLibauthHdWallet } from 'src/wallet'
import HeaderNav from 'components/header-nav'
// import FooterMenu from 'components/multisig/footer-menu.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Pst } from 'src/lib/multisig'

const $q = useQuasar()
const $store = useStore()
const route = useRoute()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const pst = computed(() => {
  const id = route.params.id
  const value = $store.getters['multisig/getPstById']({ id })
  if (value) {
    return Pst.createInstanceFromObject(value)
  }
  return value
})

const hasSignature = computed(() => {
  return (signerInfoValue, pst) => {
    const keyId = Object.keys(signerInfoValue.variables)[0]
    return Object.keys(pst.signatures).find((signatureKey) => {
      return signatureKey.startsWith(keyId)
    })
  }
})

const deletePst = () => {
  $store.dispatch('multisig/deletePstById', { id: route.params.id })
}

const downloadPstFile = () => {
  $q.dialog({
    title: 'Enter filename',
    message: '',
    prompt: {
      type: 'text',
      placeholder: 'Mypstfile'
    }
  }).onOk((filename) => {
    if (!filename) return
    const data = pst.value.toBase64()
    const blob = new Blob([data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.ppst`
    document.body.appendChild(a)
    a.click()
  }).onCancel(() => {})
}
onMounted(() => {
  window.pst = pst.value
})
</script>
