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
            <div class="row q-mt-lg justify-right">
                <div class="col-xs-12 col-md-8 text-right q-px-md q-gutter-y-md">
                    <q-list bordered>
                      <h6>Wallet Info</h6>
                      <q-item>
                        <q-item-section>
                          Wallet Name
                        </q-item-section>
                        <q-item-section right>
                          {{ wallet.template?.name }}
                        </q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section>
                          Wallet Description
                        </q-item-section>
                        <q-item-section right>
                          {{ wallet.template?.description }}
                        </q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section>
                          Wallet Address
                        </q-item-section>
                        <q-item-section right>
                          {{ wallet.cashaddress }}
                        </q-item-section>
                      </q-item>
                      <h6>Signers</h6>
                      <q-item>
                        <q-item-section>
                          Required Signers
                        </q-item-section>
                        <q-item-section right>
                          {{ wallet.m }} of {{  wallet.n }}
                        </q-item-section>
                      </q-item>
                      <q-item v-for="entity, i in wallet.template.entities" :key="i">
                        <q-item-section>
                          Signer's Name
                        </q-item-section>
                        <q-item-section right>
                          {{ entity.name }}
                        </q-item-section>
                      </q-item>
                    </q-list>
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
  if (route.params?.cashaddress) {
    return $store.getters['multisig/getWallet']({ cashaddress: route.params.cashaddress })
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
