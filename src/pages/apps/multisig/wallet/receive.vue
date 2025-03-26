<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('XPubKey QR Code')"
              backnavpath="/apps/multisig/create"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row q-mt-lg justify-center">
                <div class="col-xs-12 col-md-8 text-right q-px-md q-gutter-y-md">
                  <qr-code
                    class="q-mb-sm"
                    :text="`${depositAddress}?amount=${amount}`"
                    border-width="3px"
                    border-color="#ed5f59"
                    :size="220"
                    icon="bitcoin-cash-circle.svg"
                  />
                </div>
            </div>
            <div class="row q-mt-lg flex flex-wrap justify-center q-gutter-y-md">
                <div class="col-12 text-center">
                  <div>{{ depositAddress }}</div>
                </div>
                <div class="col-12 text-center">
                  <q-btn @click="$copyText(depositAddress)" icon="content_copy" color="primary">Copy Address</q-btn>
                </div>
                <div class="col-12 text-center">
                  <q-btn :to="{ name: 'app-multisig-wallet-view', params: { address: depositAddress } }" icon="arrow_back" outline>Back</q-btn>
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
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const $store = useStore()
const route = useRoute()
const { t: $t } = useI18n()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const depositAddress = computed(() => {
  return route.params.address
})

const amount = ref(0)

</script>

<style scoped>
.light {
  color: #141414;
}
</style>
