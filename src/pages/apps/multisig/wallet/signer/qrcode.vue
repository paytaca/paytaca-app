<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" class="sticky-header-container multisig-app" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('XPubKey QR Code')"
              backnavpath="/apps/multisig/create"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row q-mt-lg justify-center">
                <div class="col-xs-12 col-md-8 text-right q-px-md q-gutter-y-md">
                  <qr-code
                    class="q-mb-sm"
                    :text="`${myXPubKey.xPubKey}?${label}=multisigsigner`"
                    border-width="3px"
                    border-color="#ed5f59"
                    :size="220"
                    icon="bitcoin-cash-circle.svg"
                  />

                </div>
            </div>
            <div class="row q-mt-lg flex flex-wrap justify-center q-gutter-y-md">
                <div class="col-12 text-center">
                  <q-btn @click="$copyText(myXPubKey.xPubKey)" icon="content_copy" color="primary">Copy</q-btn>
                </div>
                <div class="col-12 text-center">
                  <q-btn :to="{ name: 'app-multisig' }" icon="arrow_back" outline>Back</q-btn>
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
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const $store = useStore()
const { t: $t } = useI18n()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const myXPubKey = computed(() => {
  const { xPubKey, derivationPath } = $store.getters['global/getWallet']('bch')
  return { xPubKey, derivationPath }
})
</script>

<style scoped>
.light {
  color: #141414;
}
</style>
