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
                {{ pst }}
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
import { computed } from 'vue'
import { useRoute } from 'vue-router'
// import { loadLibauthHdWallet } from 'src/wallet'
// import HeaderNav from 'components/header-nav'
// import FooterMenu from 'components/multisig/footer-menu.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
// import { Pst, MultisigWallet } from 'src/lib/multisig'

const $store = useStore()
const route = useRoute()
const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})
const pst = computed(() => {
  const id = route.params.id
  return $store.getters['multisig/getPstById']({ id })
})
</script>
