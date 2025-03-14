<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('View Template')"
              backnavpath="/apps/multisig/create"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row q-mt-lg justify-center">
                <div class="col-xs-12 col-md-8 text-right q-px-md q-gutter-y-md">
                  <div v-if="wallet">{{ wallet }}</div>
                </div>
            </div>
            <!-- display created wallets  -->
            <div class="row q-mt-lg justify-right">
                <div class="col-xs-12 col-md-8 text-right q-px-md q-gutter-y-md">
                    <q-btn :to="{ name: 'app-multisig-create-wallet' }">Ok</q-btn>
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
import { useRoute } from 'vue-router'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = computed(() => {
  if (route.params?.address) {
    return $store.getters['multisig/getWallet']({ address: route.params.address })
  }
  return null
})

// TODO: SHOW DIALOG IF WALLET NOT FOUND, NAV BACK ON DIALOG CLOSE
</script>

<style scoped>
.light {
  color: #141414;
}
</style>
