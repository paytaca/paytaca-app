<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" class="sticky-header-container multisig-app" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('Settings')"
              backnavpath="/apps/multisig"
              class="q-px-sm apps-header gift-app-header"
            >

          </HeaderNav>
            <div class="row q-mt-lg justify-center">
                <div class="col-xs-12 col-md-8 text-right q-px-md q-gutter-y-md">
                  {{ settings }}
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
const settings = computed(() => {
  return $store.getters['multisig/getSettings']
})

</script>
