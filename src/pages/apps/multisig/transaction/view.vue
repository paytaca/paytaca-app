<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('View Template')"
              backnavpath="/apps/multisig"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row q-mt-lg justify-center">
                <div class="col-xs-12 col-md-8 q-px-md q-gutter-y-md">
                  <q-card
                    flat bordered class="my-card" :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'">
                    <q-card-section>
                      <div class="row items-center no-wrap">
                        <div class="col">
                          <div class="text-h6">Unsigned Transaction</div>
                        </div>
                      </div>
                    </q-card-section>
                    <q-card-section>
                      {{ transaction }}
                    </q-card-section>
                    <q-separator />
                    <q-card-actions>
                      <q-btn flat @click="partiallySign">Partially Sign</q-btn>
                    </q-card-actions>
                  </q-card>
                </div>
            </div>
          </div>
        </div>
        <FooterMenu v-if="wallet" :address="wallet.address"/>
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
import FooterMenu from 'components/multisig/footer-menu.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()

const transaction = computed(() => {
  const transactions = $store.getters['multisig/getTransactionsByAddress']({ address: route.params.address })
  return transactions[route.params.index]
})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = computed(() => {
  if (route.params?.address) {
    return $store.getters['multisig/getWallet']({ address: route.params.address })
  }
  return null
})

const partiallySign = () => {
  console.log('TODO: CREATE PSBT, AND REDIRECT TO PSBT PAGE')
}

</script>

<style scoped>
.light {
  color: #141414;
}
</style>
