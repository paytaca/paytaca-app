<template>
  <q-layout view="lHh Lpr lFf" :class="[getDarkModeClass(darkMode), darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page', 'text-bow']">
    <q-header class="shadow-2" :class="darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page'">
      <HeaderNav
        :title="storeData?.name || storeName || $t('StoreDetails')"
        :backnavpath="{ name: 'payment-hub-index' }"
        class="apps-header"
      />

      <div class="sticky-sub-header-content">
        <!-- Store Profile Header -->
        <div class="q-pa-md">
          <div class="row items-center q-col-gutter-md">
            <div class="col-auto">
              <q-avatar size="100px" rounded>
                <q-img v-if="storeData?.logo" :src="storeData.logo" fit="contain" />
                <q-img v-else src="~assets/paytaca_payment_hub_logo.png" fit="contain" />
              </q-avatar>
            </div>
            <div class="col overflow-hidden">
              <div class="row items-center no-wrap">
                <div class="text-h5 text-weight-bold ellipsis text-bow" :class="getDarkModeClass(darkMode)">
                  {{ storeData?.name || storeName }}
                  <q-tooltip v-if="(storeData?.name || storeName)?.length > 20">
                    {{ storeData?.name || storeName }}
                  </q-tooltip>
                </div>
                <q-btn flat round dense icon="edit" size="sm" class="q-ml-sm text-grey flex-shrink-0" @click="editStore" />
              </div>
              <div class="text-caption text-grey">ID: {{ storeId }}</div>

              <div class="row items-center q-mt-sm q-gutter-x-md">
                <div v-if="storeData?.website_url" class="row items-center text-caption text-pt-primary1 cursor-pointer" @click="openLink(storeData.website_url)">
                  <q-icon name="language" size="14px" class="q-mr-xs" />
                  {{ getHostname(storeData.website_url) }}
                </div>
                <div v-if="storeData?.support_email" class="row items-center text-caption text-grey">
                  <q-icon name="email" size="14px" class="q-mr-xs" />
                  {{ storeData.support_email }}
                </div>
              </div>

              <div class="row items-center q-mt-sm">
                <q-badge color="pt-primary1" class="q-mr-sm">
                  {{ storeData?.default_currency || 'USD' }}
                </q-badge>
                <q-badge outline color="grey">
                  Index: {{ storeData?.store_index || 0 }}
                </q-badge>
              </div>
            </div>
          </div>
        </div>

        <q-separator :dark="darkMode" />

        <!-- Navigation Tabs -->
        <q-tabs
          v-model="activeTab"
          dense
          class="text-grey"
          active-color="pt-primary1"
          indicator-color="pt-primary1"
          align="justify"
          narrow-indicator
        >
          <q-tab name="invoices" :label="$t('Invoices')" />
          <q-tab name="api_keys" :label="$t('APIKeys')" />
          <template v-if="displaySubs">
            <q-tab name="plans" :label="$t('Plans') || 'Plans'" />
            <q-tab name="subscriptions" :label="$t('Subscriptions') || 'Subscriptions'" />
          </template>
          <q-tab name="settings" :label="$t('Settings')" />
        </q-tabs>
        <q-separator :dark="darkMode" />

        <div class="q-px-md q-py-sm">
          <InvoicesToolbar
            v-if="activeTab === 'invoices'"
            v-model:search="invoiceSearchQuery"
            v-model:includeSubscriptions="includeSubscriptions"
            v-model:statuses="invoiceStatusFilter"
            :status-opts="invoiceStatuses"
          />

          <ApiKeysToolbar
            v-if="activeTab === 'api_keys'"
            v-model:search="searchQuery"
            v-model:hideInactive="hideInactive"
            v-model:orderBy="orderBy"
            v-model:orderDir="orderDir"
            @showHelp="showHelpDialog"
            @update:search="onSearch"
            @setOrdering="setOrdering"
            @create="() => createApiKey()"
          />

          <SubscriptionPlansToolbar
            v-if="activeTab === 'plans'"
            @create="() => createPlan()"
          />

          <SubscriptionsToolbar
            v-if="activeTab === 'subscriptions'"
            v-model:statuses="subscriptionsStatusFilter"
            :status-opts="['ACTIVE', 'PENDING', 'CANCELLED', 'TERMINATED']"
            v-model:search="subscriptionsSearchQuery"
          />          
        </div>
      </div>
    </q-header>

    <q-page-container>
      <q-page :class="darkMode ? 'bg-pt-dark-page' : 'bg-pt-light-page'" class="column no-wrap">
        <q-pull-to-refresh @refresh="refreshPage" class="col column no-wrap">
          <div v-touch-swipe.horizontal.mouse="handleGlobalSwipe" class="col column no-wrap">
            <q-tab-panels
              v-model="activeTab"
              keep-alive
              animated
              class="bg-transparent col"
            >
              <!-- Invoices Tab -->
              <q-tab-panel name="invoices" class="q-pa-none">
                <div class="col column no-wrap">
                  <InvoiceList
                    ref="invoiceListRef"
                    :store-id="storeId"
                    :status-filter="invoiceStatusFilterText"
                    :hasSubscriptions="includeSubscriptions"
                    :search-query="invoiceSearchQuery"
                    @clear-search="clearInvoiceSearch"
                  />
                </div>
              </q-tab-panel>

              <!-- API Keys Tab -->
              <q-tab-panel name="api_keys" class="q-pa-none">
                <q-linear-progress v-if="fetchingData" query reverse rounded color="pt-primary1" class="q-mt-none" />
                <div v-else style="height: 4px;"></div>

                <div class="q-px-md q-pb-md" :class="darkMode ? 'text-grey-2' : 'text-grey-10'">
                  <!-- Empty States -->
                  <div v-if="!fetchingData && filteredApiKeys.length === 0" class="text-center q-mt-xl">
                    <!-- Case 1: No keys exist at all (and not searching) -->
                    <div v-if="!searchQuery && !apiKeys.length">
                      <q-icon name="vpn_key" size="4em" class="text-grey q-mb-md" />
                      <div class="text-h6 text-grey q-mb-xs">{{ $t('NoAPIKeys') }}</div>
                      <div class="text-body2 text-grey q-mb-lg">{{ $t('NoKeysFound') }}</div>
                      <q-btn unelevated rounded color="pt-primary1" :label="$t('CreateKey')" icon="add" @click="createApiKey()" />
                    </div>
                    <!-- Case 2: All existing keys are inactive and hidden -->
                    <div v-else-if="hideInactive && apiKeys.some(k => k.revoked || k.has_expired) && !filteredApiKeys.length">
                      <q-icon name="visibility_off" size="4em" class="text-grey q-mb-md" />
                      <div class="text-h6 text-grey q-mb-xs">{{ $t('InactiveKeysHidden') }}</div>
                      <div class="text-body2 text-grey q-mb-lg">{{ $t('AllKeysInactive') }}</div>
                      <q-btn flat rounded color="pt-primary1" :label="$t('ShowInactive')" @click="hideInactive = false" />
                    </div>
                    <!-- Case 3: No keys match the search query -->
                    <div v-else-if="searchQuery">
                      <q-icon name="search_off" size="4em" class="text-grey q-mb-md" />
                      <div class="text-h6 text-grey q-mb-xs">{{ $t('NoResults') }}</div>
                      <div class="text-body2 text-grey q-mb-lg">{{ $t('NoKeySearchMatches') }}</div>
                      <q-btn flat rounded color="pt-primary1" :label="$t('ClearSearch')" @click="searchQuery = ''; onSearch()" />
                    </div>
                  </div>

                  <div v-else class="q-mt-md">
                    <q-infinite-scroll @load="onLoadMoreKeys" :offset="250" :disable="!hasNextKeysPage">
                      <q-list separator class="br-15 overflow-hidden border-grey-4">
                        <q-item v-for="key in filteredApiKeys" :key="key.id" class="q-py-md">
                          <q-item-section>
                            <div class="row items-center no-wrap full-width">
                              <div class="col text-weight-bold ellipsis q-pr-sm">
                                {{ key.name }}
                              </div>
                              <div class="col-auto font-mono text-grey-7 text-center q-px-sm" style="width: 110px; font-size: 0.85rem;">
                                {{ getKeyPrefix(key.id) }}
                              </div>
                              <div class="col-auto text-center q-px-sm" style="width: 100px;">
                                <q-badge
                                  :color="key.has_expired ? 'grey-5' : (key.revoked ? 'red-4' : 'green-4')"
                                  :text-color="darkMode ? 'black' : 'white'"
                                  rounded
                                  class="q-px-sm text-weight-medium"
                                  style="min-width: 80px;"
                                >
                                  {{ key.has_expired ? $t('Expired') : (key.revoked ? $t('Revoked') : $t('Active')) }}
                                </q-badge>
                              </div>
                              <div class="col-auto text-right" style="width: 40px;">
                                <q-btn
                                  v-if="!key.revoked && !key.has_expired"
                                  flat
                                  round
                                  dense
                                  icon="block"
                                  color="grey-6"
                                  size="sm"
                                  @click="revokeKey(key)"
                                >
                                  <q-tooltip>{{ $t('Revoke') }}</q-tooltip>
                                </q-btn>
                              </div>
                            </div>
                          </q-item-section>
                        </q-item>
                      </q-list>
                      <template v-slot:loading>
                        <div class="row justify-center q-my-md">
                          <q-spinner-dots color="pt-primary1" size="30px" />
                        </div>
                      </template>
                    </q-infinite-scroll>
                  </div>
                </div>
              </q-tab-panel>

              <!-- Plans Tab -->
              <q-tab-panel name="plans" class="q-pa-none">
                <q-linear-progress v-if="fetchingData" query reverse rounded color="pt-primary1" class="q-mt-none" />
                <div v-else style="height: 4px;"></div>

                <div class="q-px-md q-pb-md" :class="darkMode ? 'text-grey-2' : 'text-grey-10'">
                  <div v-if="!fetchingData && plans.length === 0" class="text-center q-mt-xl">
                    <q-icon name="list_alt" size="4em" class="text-grey q-mb-md" />
                    <div class="text-h6 text-grey q-mb-xs">{{ $t('NoPlans') || 'No Plans' }}</div>
                    <div class="text-body2 text-grey q-mb-lg">{{ $t('NoPlansFound') || 'Create a plan to offer subscriptions.' }}</div>
                    <q-btn unelevated rounded color="pt-primary1" :label="$t('CreatePlan') || 'Create Plan'" icon="add" @click="createPlan()" />
                  </div>

                  <div v-else class="q-mt-md">
                    <q-infinite-scroll @load="onLoadMorePlans" :offset="250" :disable="!hasNextPlansPage">
                      <q-list separator class="br-15 overflow-hidden border-grey-4">
                        <q-item v-for="plan in plans" :key="plan.id" class="q-py-md hover-bg-grey" clickable @click="openPlanDetails(plan)">
                          <q-item-section>
                            <div class="row items-center no-wrap full-width">
                              <div class="col text-weight-bold ellipsis q-pr-sm">
                                {{ plan.name }}
                                <div class="text-caption text-grey text-weight-regular">
                                  {{ plan.amount }} {{ plan.currency }} • {{ plan.period_days ? plan.period_days + ' ' + ($t('Days') || 'Days') : plan.period_blocks + ' ' + ($t('Blocks') || 'Blocks') }}
                                </div>
                                <div v-if="plan.description" class="text-caption text-grey-8 text-weight-regular ellipsis" style="max-width: 300px;">
                                  {{ plan.description }}
                                </div>
                                <div class="text-caption text-grey text-weight-regular q-mt-xs">
                                  ID: {{ plan.id }}
                                </div>
                              </div>
                              <div class="col-auto text-center q-px-sm" style="width: 100px;">
                                <q-badge
                                  :color="plan.is_active ? 'green-4' : 'grey-5'"
                                  :text-color="darkMode ? 'black' : 'white'"
                                  rounded
                                  class="q-px-sm text-weight-medium"
                                  style="min-width: 80px;"
                                >
                                  {{ plan.is_active ? ($t('Active') || 'Active') : ($t('Inactive') || 'Inactive') }}
                                </q-badge>
                              </div>
                              <div class="col-auto text-right" style="width: 40px;">
                                <q-btn
                                  v-if="plan.is_active"
                                  flat
                                  round
                                  dense
                                  icon="block"
                                  color="grey-6"
                                  size="sm"
                                  @click.stop="deactivatePlan(plan)"
                                >
                                  <q-tooltip>{{ $t('Deactivate') || 'Deactivate' }}</q-tooltip>
                                </q-btn>
                              </div>
                            </div>
                          </q-item-section>
                        </q-item>
                      </q-list>
                      <template v-slot:loading>
                        <div class="row justify-center q-my-md">
                          <q-spinner-dots color="pt-primary1" size="30px" />
                        </div>
                      </template>
                    </q-infinite-scroll>
                  </div>
                </div>
              </q-tab-panel>

              <!-- Subscriptions Tab -->
              <q-tab-panel name="subscriptions" class="q-pa-none">
                <q-linear-progress v-if="fetchingData" query reverse rounded color="pt-primary1" class="q-mt-none" />
                <div v-else style="height: 4px;"></div>

                <div class="q-px-md q-pb-md" :class="darkMode ? 'text-grey-2' : 'text-grey-10'">
                  <div v-if="!fetchingData && subscriptions.length === 0" class="text-center q-mt-xl">
                    <q-icon name="group" size="4em" class="text-grey q-mb-md" />
                    <div class="text-h6 text-grey q-mb-xs">{{ $t('NoSubscriptions') || 'No Subscriptions' }}</div>
                    <div class="text-body2 text-grey q-mb-lg">{{ $t('NoSubscriptionsFound') || "Users haven't subscribed yet." }}</div>
                  </div>

                  <div v-else class="q-mt-md">
                    <q-infinite-scroll @load="onLoadMoreSubscriptions" :offset="250" :disable="!hasNextSubscriptionsPage">
                      <q-list separator class="br-15 overflow-hidden border-grey-4">
                        <q-item v-for="sub in subscriptions" :key="sub.id" class="q-py-md" clickable v-ripple @click="openSubscriptionDetails(sub)">
                          <q-item-section>
                            <div class="row items-center no-wrap full-width">
                              <div class="col ellipsis q-pr-sm">
                                <div class="text-weight-bold">{{ sub.plan_details?.name || 'Subscription' }}</div>
                                <div class="text-caption text-grey text-weight-regular">
                                  {{ sub.pledge_satoshis ? (sub.pledge_satoshis / 1e8).toFixed(8).replace(/\.?0+$/, '') + ' BCH' : (sub.plan_details?.amount + ' ' + sub.plan_details?.currency) }}
                                  &bull;
                                  <span v-if="sub.period_blocks">{{ sub.period_blocks }} {{ $t('Blocks') || 'blocks' }}</span>
                                  <span v-else-if="sub.plan_details?.period_days">{{ sub.plan_details.period_days }} {{ $t('Days') || 'days' }}</span>
                                  <span v-else-if="sub.plan_details?.period_blocks">{{ sub.plan_details.period_blocks }} {{ $t('Blocks') || 'blocks' }}</span>
                                </div>
                                <div class="text-caption text-grey-6 font-mono q-mt-xs" style="font-size: 0.7rem;">{{ sub.funder_address || sub.subscriber_address }}</div>
                              </div>
                              <div class="col-auto text-center q-px-sm" style="width: 100px;">
                                <q-badge
                                  :color="sub.status === 'ACTIVE' ? 'green-4' : (sub.status === 'CANCELLED' ? 'red-4' : (sub.status === 'PENDING' ? 'orange-4' : 'grey-5'))"
                                  :text-color="darkMode ? 'black' : 'white'"
                                  rounded
                                  class="q-px-sm text-weight-medium"
                                  style="min-width: 80px;"
                                >
                                  {{ sub.status }}
                                </q-badge>
                              </div>
                              <div class="col-auto text-right" style="width: 40px;">
                                <q-btn
                                  v-if="sub.status === 'ACTIVE'"
                                  flat
                                  round
                                  dense
                                  icon="block"
                                  color="grey-6"
                                  size="sm"
                                  @click.stop="cancelSubscription(sub)"
                                >
                                  <q-tooltip>{{ $t('Cancel') || 'Cancel' }}</q-tooltip>
                                </q-btn>
                                  <!-- Reactivation is not supported -->
                              </div>
                              <div class="col-auto">
                                <q-icon name="chevron_right" class="text-grey" />
                              </div>
                            </div>
                          </q-item-section>
                        </q-item>
                      </q-list>
                      <template v-slot:loading>
                        <div class="row justify-center q-my-md">
                          <q-spinner-dots color="pt-primary1" size="30px" />
                        </div>
                      </template>
                    </q-infinite-scroll>
                  </div>
                </div>
              </q-tab-panel>

              <!-- Settings Tab -->
              <q-tab-panel name="settings">
                <q-linear-progress v-if="fetchingData" query reverse rounded color="pt-primary1" class="q-mt-none q-mb-md" />
                <div class="q-gutter-y-md">
                  <!-- Basic Configuration -->
                  <q-card flat bordered class="br-15 pt-card-2" :class="getDarkModeClass(darkMode)">
                    <q-card-section>
                      <div class="text-subtitle1 text-weight-bold q-mb-md">{{ $t('Configuration') }}</div>

                      <div class="q-gutter-y-sm">
                        <div class="row justify-between items-start">
                          <div class="text-caption text-grey q-mr-md">{{ $t('WebhookURL') }}</div>
                          <div class="col text-body2 text-right" style="word-break: break-all;">{{ storeData?.webhook_url || $t('NotConfigured') }}</div>
                        </div>
                        <template v-if="storeData?.webhook_url">
                          <q-separator />
                          <div class="row justify-between items-center">
                            <div class="text-caption text-grey">{{ $t('WebhookStatus') }}</div>
                            <div class="text-body2 text-right">
                              <q-badge :color="getWebhookStatusColor(storeData?.webhook_status)">
                                {{ storeData?.webhook_status || 'none' }}
                              </q-badge>
                            </div>
                          </div>
                          <template v-if="storeData?.webhook_status === 'failed' && storeData?.webhook_error_message">
                            <q-separator />
                            <div class="row justify-between items-start">
                              <div class="text-caption text-grey q-mr-md">{{ $t('WebhookError') }}</div>
                              <div class="col text-body2 text-right text-red" style="word-break: break-all;">{{ storeData?.webhook_error_message }}</div>
                            </div>
                          </template>
                        </template>
                        <q-separator />
                        <div class="row justify-between items-center">
                          <div class="text-caption text-grey">{{ $t('InvoiceExpiry') }}</div>
                          <div class="text-body2 text-right">{{ storeData?.invoice_expiration_minutes }} min</div>
                        </div>
                      </div>
                    </q-card-section>
                    <q-card-actions align="center">
                      <q-btn outline rounded no-caps color="pt-primary1" :label="$t('EditSettings')" @click="editStore" />
                    </q-card-actions>
                  </q-card>

                  <!-- Webhook Key Management -->
                  <q-card flat bordered class="br-15 pt-card-2" :class="getDarkModeClass(darkMode)">
                    <q-card-section>
                      <div class="row items-center q-mb-md">
                        <div class="text-subtitle1 text-weight-bold">{{ $t('WebhookVerification') }}</div>
                        <q-space />
                        <q-btn
                          flat
                          round
                          dense
                          icon="refresh"
                          color="pt-primary1"
                          @click="confirmRotateWebhookKeys"
                        >
                          <q-tooltip>{{ $t('RotateKeys') }}</q-tooltip>
                        </q-btn>
                      </div>

                      <div class="q-mb-sm text-caption text-grey">
                        {{ $t('WebhookKeyDescription') }}
                      </div>

                      <div v-if="webhookPublicKey" class="font-mono bg-grey-3 q-pa-sm br-5 text-caption text-black overflow-auto" style="max-height: 100px; white-space: pre-wrap; word-break: break-all;">
                        {{ webhookPublicKey }}
                      </div>
                      <div v-else class="text-center q-pa-md text-grey italic">
                        {{ $t('NoWebhookKey') }}
                      </div>
                    </q-card-section>
                    <q-card-actions v-if="webhookPublicKey" align="right">
                      <q-btn flat dense color="pt-primary1" icon="content_copy" :label="$t('CopyKey')" @click="copyApiKey(webhookPublicKey)" />
                    </q-card-actions>
                  </q-card>
                </div>
              </q-tab-panel>
            </q-tab-panels>
          </div>
        </q-pull-to-refresh>
      </q-page>
    </q-page-container>

  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { useQuasar, copyToClipboard, openURL, debounce } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'
import InvoicesToolbar from 'src/components/payment-hub/toolbars/InvoicesToolbar.vue'
import ApiKeysToolbar from 'src/components/payment-hub/toolbars/ApiKeysToolbar.vue'
import SubscriptionPlansToolbar from 'src/components/payment-hub/toolbars/SubscriptionPlansToolbar.vue'
import SubscriptionsToolbar from 'src/components/payment-hub/toolbars/SubscriptionsToolbar.vue'
import StoreInfoDialog from 'src/components/payment-hub/StoreInfoDialog.vue'
import ApiKeyFormDialog from 'src/components/payment-hub/ApiKeyFormDialog.vue'
import PlanFormDialog from 'src/components/payment-hub/PlanFormDialog.vue'
import PlanDetailDialog from 'src/components/payment-hub/PlanDetailDialog.vue'
import SubscriptionDetailDialog from 'src/components/payment-hub/SubscriptionDetailDialog.vue'
import InvoiceList from 'src/components/payment-hub/InvoiceList.vue'
import { DISPLAY_SUBS_APP } from 'src/wallet/payment-hub'
import { usePaymentHubCore } from 'src/composables/payment-hub/usePaymentHub'


import { SignatureTemplate, TransactionBuilder } from 'cashscript13'
import { formatKitInput, formatKitOutput, getSubscriptionContractInstance } from 'src/wallet/payment-hub/cashscript-utils'
import { createCancelSubscriptionTransaction } from 'src/wallet/payment-hub/services'

const $route = useRoute()
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const storeId = computed(() => $route.params.storeId)
const storeName = computed(() => $route.query.name)

const displaySubs = ref(DISPLAY_SUBS_APP);

const { wallet, hub, initHub, initWebSocket, closeWebSocket, _compareUUID } = usePaymentHubCore()

// Core state
const storeData = ref(null)
const apiKeys = ref([])
const plans = ref([])
const subscriptions = ref([])
const webhookPublicKey = ref('')
const fetchingData = ref(false)
const hideInactive = ref(true)
const activeTab = ref('invoices')
const keysPage = ref(1)
const hasNextKeysPage = ref(false)
const plansPage = ref(1)
const hasNextPlansPage = ref(false)
const subscriptionsPage = ref(1)
const hasNextSubscriptionsPage = ref(false)
const invoiceListRef = ref(null)

// Invoice Filter & Search state
const invoiceStatusFilter = ref([])
const invoiceStatusFilterText = computed(() => {
  if (Array.isArray(invoiceStatusFilter.value)) return invoiceStatusFilter.value.join(',')
  if (typeof invoiceStatusFilter.value === 'string') return invoiceStatusFilter.value
  return ''
})
const savedIncludeSubscriptions = localStorage.getItem('phub_includeSubscriptions')
const includeSubscriptions = ref(savedIncludeSubscriptions !== null ? savedIncludeSubscriptions === 'true' : false)

watch(includeSubscriptions, (val) => {
  localStorage.setItem('phub_includeSubscriptions', val)
  invoiceStatusFilter.value = []
})

const invoiceSearchQuery = ref('')

function clearInvoiceSearch() {
  invoiceSearchQuery.value = ''
}

const invoiceStatuses = computed(() => {
  if (includeSubscriptions.value) {
    return ['TOP UP', 'PAID', 'RECLAIMED']
  } else {
    return ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED']
  }
})
const mainTabs = ['invoices', 'api_keys', 'plans', 'subscriptions', 'settings']

function handleGlobalSwipe(details) {
  // Swipe for main tabs only
  const currentMainIndex = mainTabs.indexOf(activeTab.value)
  if (details.direction === 'left') {
    const nextTab = mainTabs[(currentMainIndex + 1) % mainTabs.length]
    if (nextTab === 'invoices') {
      invoiceStatusFilter.value = []
    }
    activeTab.value = nextTab
  } else if (details.direction === 'right') {
    const nextTab = mainTabs[(currentMainIndex - 1 + mainTabs.length) % mainTabs.length]
    if (nextTab === 'invoices') {
      invoiceStatusFilter.value = []
    }
    activeTab.value = nextTab
  }
}

// API Key Filter & Sort state
const searchQuery = ref('')
const orderBy = ref(localStorage.getItem('paytaca_hub_keys_orderBy') || 'created')
const orderDir = ref(localStorage.getItem('paytaca_hub_keys_orderDir') || 'desc')

/**
 * Handles ordering toggles.
 */
function setOrdering(field) {
  if (orderBy.value === field) {
    orderDir.value = orderDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    orderBy.value = field
    orderDir.value = field === 'created' ? 'desc' : 'asc'
  }

  // Persist sorting preferences
  localStorage.setItem('paytaca_hub_keys_orderBy', orderBy.value)
  localStorage.setItem('paytaca_hub_keys_orderDir', orderDir.value)

  queueRefresh(false, 'api-keys')
}

/**
 * Debounced search handler.
 */
function onSearch() {
  queueRefresh(false, 'api-keys')
}

const filteredApiKeys = computed(() => {
  if (hideInactive.value) {
    // Hide both revoked and expired keys if the toggle is active to keep list clean
    return apiKeys.value.filter(k => !k.revoked && !k.has_expired)
  }
  return apiKeys.value
})

// Subscriptions Filter & Search
const subscriptionsSearchQuery = ref('');
const subscriptionsStatusFilter = ref([]);
watch(subscriptionsSearchQuery, () => queueRefresh(false, 'subscriptions'))
watch(subscriptionsStatusFilter, () => queueRefresh(false, 'subscriptions'))

onMounted(() => {
  refreshPage()
})

onBeforeUnmount(() => {
  closeWebSocket(webSocketEventHandler)
})

const webSocketEventHandler = (data) => {
  console.log('payment-hub-update', data);
  if (!data || !data.store_id || !_compareUUID(data.store_id, storeId.value)) return

  if (data?.type === 'store') queueRefresh(true, 'store');
  if (data?.type === 'invoice') queueRefresh(true, 'invoices');
  if (data?.type === 'subscription') queueRefresh(true, 'subscriptions');
  if (data?.type === 'plan') queueRefresh(true, 'plans');
  if (data?.type === 'api-key') queueRefresh(true, 'api-keys');
  if (data?.type === 'webhook') queueRefresh(true, 'webhook');
}

/**
 * Main refresh function.
 */
async function refreshPage(done, isBackground = false, scopes='all') {
  console.log('Refreshing page', { isBackground, scopes });
  if (!isBackground) {
    fetchingData.value = true
    keysPage.value = 1
  }
  try {
    const paymentHub = await initHub({
      isBackground,
      autoRegister: false,
      loadingMessage: $t('ConnectingToPaymentHub')
    })
    initWebSocket(webSocketEventHandler)
    if (scopes !== 'all' && !Array.isArray(scopes)) scopes = [];

    // Fetch full store metadata
    if (scopes === 'all' || scopes.includes('store')) {
      storeData.value = await paymentHub.getStore(storeId.value)
    }

    if (scopes === 'all' || scopes.includes('api-keys')) {
      // Construct ordering string
      const ordering = (orderDir.value === 'desc' ? '-' : '') + orderBy.value
  
      // Fetch API keys (Page 1)
      const data = await paymentHub.listApiKeys(storeId.value, {
        page: 1,
        ordering: ordering,
        search: searchQuery.value || undefined
      })
      apiKeys.value = data.results || []
      hasNextKeysPage.value = !!data.next
    }

    // Fetch Plans (Page 1)
    if (scopes === 'all' || scopes.includes('plans')) {
      const plansData = await paymentHub.listPlans(storeId.value, { page: 1 })
      plans.value = plansData.results || []
      hasNextPlansPage.value = !!plansData.next
    }

    // Fetch Subscriptions (Page 1)
    if (scopes === 'all' || scopes.includes('subscriptions')) {
      const subsData = await paymentHub.listSubscriptions({
        store_id: storeId.value,
        page: 1,
        search: subscriptionsSearchQuery.value,
        status: subscriptionsStatusFilter.value?.join?.(','),
      })
      subscriptions.value = subsData.results || []
      hasNextSubscriptionsPage.value = !!subsData.next
    }

    // Refresh invoices list
    if (scopes === 'all' || scopes.includes('invoices')) {
      if (invoiceListRef.value && !isBackground) {
        invoiceListRef.value.refreshList()
      }
    }

    // Fetch Webhook Public Key
    if (scopes === 'all' || scopes.includes('webhook')) {
      const keyData = await paymentHub.getWebhookPublicKey(storeId.value).catch(() => null)
      webhookPublicKey.value = keyData?.public_key || ''
    }
  } catch (error) {
    console.error('Error fetching store details:', error)
  } finally {
    if (!isBackground) fetchingData.value = false
    if (typeof done === 'function') done()
  }
}

const debouncedRefreshPage = debounce((...args) => refreshPage(...args), 1000);
const queuedRefresh = ref({ scopes: [], isBackground: true });
function queueRefresh(isBackground, scope = '') {
  console.log('Queueing refresh', scope);
  if (scope === 'all') {
    queuedRefresh.value.scopes = 'all';
  } else if (queuedRefresh.value.scopes !== 'all') {
    if (!Array.isArray(queuedRefresh.value.scopes)) queuedRefresh.value.scopes = [];
    if (!queuedRefresh.value.scopes.includes(scope)) {
      queuedRefresh.value.scopes.push(scope);
    }
  }
  queuedRefresh.value.isBackground = queuedRefresh.value.isBackground && isBackground;

  const onComplete = () => {
    queuedRefresh.value.scopes = []
    queuedRefresh.value.isBackground = true
  }

  debouncedRefreshPage(onComplete, queuedRefresh.value.isBackground, queuedRefresh.value.scopes);
}

/**
 * Loads more API keys for pagination.
 */
async function onLoadMoreKeys(index, done) {
  if (!hasNextKeysPage.value || fetchingData.value) {
    done()
    return
  }

  try {
    keysPage.value++
    const ordering = (orderDir.value === 'desc' ? '-' : '') + orderBy.value
    const data = await hub.value.listApiKeys(storeId.value, {
      page: keysPage.value,
      ordering: ordering,
      search: searchQuery.value || undefined
    })
    if (data.results?.length) {
      apiKeys.value.push(...data.results)
    }
    hasNextKeysPage.value = !!data.next
  } catch (error) {
    console.error('Error loading more keys:', error)
  } finally {
    done()
  }
}

/**
 * Loads more Plans for pagination.
 */
async function onLoadMorePlans(index, done) {
  if (!hasNextPlansPage.value || fetchingData.value) {
    done()
    return
  }

  try {
    plansPage.value++
    const data = await hub.value.listPlans(storeId.value, { page: plansPage.value })
    if (data.results?.length) {
      plans.value.push(...data.results)
    }
    hasNextPlansPage.value = !!data.next
  } catch (error) {
    console.error('Error loading more plans:', error)
  } finally {
    done()
  }
}

/**
 * Loads more Subscriptions for pagination.
 */
async function onLoadMoreSubscriptions(index, done) {
  if (!hasNextSubscriptionsPage.value || fetchingData.value) {
    done()
    return
  }

  try {
    subscriptionsPage.value++
    const data = await hub.value.listSubscriptions({
      store_id: storeId.value,
      page: subscriptionsPage.value,
      search: subscriptionsSearchQuery.value,
      status: subscriptionsStatusFilter.value?.join?.(','),
    })
    if (data.results?.length) {
      subscriptions.value.push(...data.results)
    }
    hasNextSubscriptionsPage.value = !!data.next
  } catch (error) {
    console.error('Error loading more subscriptions:', error)
  } finally {
    done()
  }
}

function openLink(url) {
  if (url) openURL(url)
}

function getHostname(url) {
  try {
    return new URL(url).hostname
  } catch (e) {
    return url
  }
}

function getWebhookStatusColor(status) {
  switch (status) {
    case 'verified': return 'green'
    case 'pending': return 'orange'
    case 'failed': return 'red'
    default: return 'grey'
  }
}

function getKeyPrefix(id) {
  if (!id) return ''
  return id.substring(0, 8) + '...'
}

function showHelpDialog() {
  $q.dialog({
    title: $t('APIUsage'),
    message: `
      <div class="q-mb-md text-body2">
        To create an invoice for this store using Mode A (Automated), use the following endpoint:
      </div>
      <div class="font-mono bg-grey-3 q-pa-sm br-5 text-caption q-mb-md overflow-hidden text-black" style="word-break: break-all;">
        POST /api/v1/invoices/
      </div>
      <div class="q-mb-sm text-weight-medium text-caption">Headers:</div>
      <div class="font-mono bg-grey-3 q-pa-sm br-5 text-caption q-mb-md text-black" style="word-break: break-all;">
        Authorization: Api-Key &lt;YOUR_SECRET_KEY&gt;<br>
        Content-Type: application/json
      </div>
      <div class="q-mb-sm text-weight-medium text-caption">Body:</div>
      <div class="font-mono bg-grey-3 q-pa-sm br-5 text-caption text-black" style="word-break: break-all;">
        {<br>
        &nbsp;&nbsp;"amount": "10.50",<br>
        &nbsp;&nbsp;"currency": "USD",<br>
        &nbsp;&nbsp;"memo": "Order #123",<br>
        &nbsp;&nbsp;"redirect_url": "https://yoursite.com/done"<br>
        }
      </div>
    `,
    html: true,
    ok: { label: $t('Close'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })
}

function editStore() {
  $q.dialog({
    component: StoreInfoDialog,
    componentProps: {
      storeData: storeData.value
    }
  }).onOk(async (data) => {
    try {
      $q.loading.show()
      await hub.value.updateStore(storeId.value, data)
      queueRefresh(false, 'store')
      $q.notify({ type: 'positive', message: $t('StoreUpdated') })
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorUpdatingStore') })
    } finally {
      $q.loading.hide()
    }
  })
}

// --- API Keys logic ---
function copyApiKey(key) {
  copyToClipboard(key)
  $q.notify({
    message: $t('KeyCopied'),
    color: 'positive',
    icon: 'check',
    position: 'bottom',
    timeout: 2000
  })
}

function createApiKey() {
  $q.dialog({
    component: ApiKeyFormDialog
  }).onOk(async (data) => {
    try {
      $q.loading.show()
      const newKeyData = await hub.value.generateApiKey(storeId.value, data.name, data.expiry_date)

      // The secret key is only shown once.
      const secret = newKeyData.key || newKeyData.secret || newKeyData.token

      $q.dialog({
        title: $t('KeyGenerated'),
        message: $t('KeySecretWarning'),
        prompt: {
          model: secret,
          readonly: true
        },
        ok: { label: $t('CopyAndClose'), color: 'pt-primary1' },
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
      }).onOk(() => {
        copyToClipboard(secret)
        queueRefresh(false, 'api-keys')
      })
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorGeneratingKey') })
    } finally {
      $q.loading.hide()
    }
  })
}

function revokeKey(key) {
  $q.dialog({
    title: $t('RevokeKey'),
    message: $t('RevokeKeyConfirm', { name: key.name }),
    ok: { label: $t('Revoke'), color: 'red', unelevated: true, rounded: true },
    cancel: { label: $t('Cancel'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(async () => {
    try {
      $q.loading.show()
      await hub.value.revokeApiKey(key.id)
      queueRefresh(false, 'api-keys')
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorRevokingKey') })
    } finally {
      $q.loading.hide()
    }
  })
}

/**
 * Confirms and executes webhook key rotation.
 */
function confirmRotateWebhookKeys() {
  $q.dialog({
    title: $t('RotateWebhookKeys'),
    message: $t('RotateKeysWarning'),
    ok: { label: $t('Rotate'), color: 'red', unelevated: true, rounded: true },
    cancel: { label: $t('Cancel'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(async () => {
    try {
      $q.loading.show()
      const result = await hub.value.rotateWebhookKeys(storeId.value)
      webhookPublicKey.value = result.public_key
      $q.notify({ type: 'positive', message: $t('KeysRotated') })
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorRotatingKeys') })
    } finally {
      $q.loading.hide()
    }
  })
}

// --- Plans logic ---

function createPlan() {
  $q.dialog({
    component: PlanFormDialog
  }).onOk(async (data) => {
    try {
      $q.loading.show()
      await hub.value.createPlan(storeId.value, data)
      queueRefresh(false, 'plans')
      $q.notify({ type: 'positive', message: $t('PlanCreated') || 'Plan created successfully' })
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorCreatingPlan') || 'Error creating plan' })
    } finally {
      $q.loading.hide()
    }
  })
}

function deactivatePlan(plan) {
  $q.dialog({
    title: $t('DeactivatePlan') || 'Deactivate Plan',
    message: ($t('DeactivatePlanConfirm') || 'Are you sure you want to deactivate {name}?').replace('{name}', plan.name),
    ok: { label: $t('Deactivate') || 'Deactivate', color: 'red', unelevated: true, rounded: true },
    cancel: { label: $t('Cancel'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(async () => {
    try {
      $q.loading.show()
      await hub.value.deactivatePlan(plan.id)
      queueRefresh(false, 'plans')
      $q.notify({ type: 'positive', message: 'Plan deactivated successfully' })
    } catch (error) {
      $q.notify({ type: 'negative', message: $t('ErrorDeactivatingPlan') || 'Error deactivating plan' })
    } finally {
      $q.loading.hide()
    }
  })
}

// --- Subscriptions logic ---

function openPlanDetails(plan) {
  $q.dialog({
    component: PlanDetailDialog,
    componentProps: {
      planId: plan.id
    }
  })
}

function openSubscriptionDetails(sub) {
  $q.dialog({
    component: SubscriptionDetailDialog,
    componentProps: { subscriptionId: sub.id }
  }).onOk((payload) => {
    if (payload?.action === 'cancel_subscription') {
      cancelSubscription(payload.subscription)
    } else if (payload?.action === 'update_subscription_nft') {
      updateSubscriptionNft(payload.subscription, payload.data)
    }
  })
}

async function updateSubscriptionNft(sub, data) {
  try {
    $q.loading.show({ message: 'Fetching update kit...' })
    const kit = await hub.value.getSubscriptionUpdateKit(sub.id, data)

    $q.loading.show({ message: 'Signing update transaction...' })

    const isChipnet = $store.getters['global/isChipnet']
    const bchWallet = isChipnet ? wallet.value.BCH_CHIP : wallet.value.BCH

    const artifactObj = await hub.value.getContractArtifact()
    const contract = getSubscriptionContractInstance(sub, artifactObj, isChipnet);
    const provider = contract.provider;

    const addressIndex = sub.merchant_address_index
    if (addressIndex == null) throw new Error('Merchant address index not provided by backend')
    const pathStr = `0/${addressIndex}`

    const privKeyWif = await bchWallet.getPrivateKey(pathStr)
    if (!privKeyWif) throw new Error('Could not derive private key for merchant address')
    const sig = new SignatureTemplate(privKeyWif)

    const bchUtxos = await bchWallet.getUtxos()
    const plainUtxos = bchUtxos.filter(u => !u.token)
    
    let fundingUtxos = []
    let totalFundingSatoshis = 0n
    let estimatedFee = 1500n // Base fee for contract I/O and change output
    
    for (const utxo of plainUtxos) {
      fundingUtxos.push(utxo)
      totalFundingSatoshis += BigInt(utxo.satoshis ?? utxo.amount ?? utxo.value ?? 0)
      if (totalFundingSatoshis >= estimatedFee) break
      estimatedFee += 148n // Each additional input adds ~148 bytes
    }
    
    if (totalFundingSatoshis < estimatedFee) {
      throw new Error('Insufficient funds in merchant wallet to cover network fee')
    }

    const txBuilder = new TransactionBuilder({ provider })
    const formattedInputs = kit.inputs.map(input => formatKitInput(input));
    const formattedOutputs = kit.outputs.map(output => formatKitOutput(output));
    txBuilder.addInputs(formattedInputs, contract.unlock.updateNft(BigInt(data.new_pledge), BigInt(data.new_period), sig.getPublicKey(), sig))
    txBuilder.addOutputs(formattedOutputs)

    for (const fUtxo of fundingUtxos) {
      const addressPath = fUtxo.address_path ?? ('0/' + String(fUtxo.wallet_index))
      const fPrivKeyWif = await bchWallet.getPrivateKey(addressPath)
      const fSig = new SignatureTemplate(fPrivKeyWif)

      txBuilder.addInput({
        txid: fUtxo.txid,
        vout: fUtxo.vout,
        satoshis: BigInt(fUtxo.satoshis ?? fUtxo.amount ?? fUtxo.value ?? 0)
      }, fSig.unlockP2PKH())
    }

    const changeSatoshis = totalFundingSatoshis - estimatedFee
    if (changeSatoshis >= 546n) {
      txBuilder.addOutput({ to: sub.merchant_address, amount: changeSatoshis })
    }

    const rawTx = await txBuilder.build()

    $q.loading.show({ message: 'Submitting update...' })
    await hub.value.submitSubscriptionUpdate(sub.id, rawTx, data)

    queueRefresh(false, 'subscriptions')
    $q.notify({ type: 'positive', message: $t('SubscriptionUpdated') || 'Subscription updated successfully' })

  } catch (error) {
    console.error(error)
    const errorMsg = error.response?.data?.error || error.message
    $q.notify({ type: 'negative', message: ($t('ErrorUpdatingSubscription') || 'Error updating subscription: ') + errorMsg })
  } finally {
    $q.loading.hide()
  }
}

async function cancelSubscription(sub) {

  $q.dialog({
    title: $t('CancelSubscription') || 'Cancel Subscription',
    message: ($t('CancelSubscriptionConfirm') || 'Are you sure you want to cancel the subscription for {address}?').replace('{address}', sub.funder_address || sub.subscriber_address),
    ok: { label: $t('CancelSubscription') || 'Cancel Subscription', color: 'red', unelevated: true, rounded: true },
    cancel: { label: $t('Cancel'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(async () => {
    try {
      $q.loading.show({ message: 'Generating cancel transaction...' })
      // Returns null if subscription contract doesnt have utxos (determined from the cancellation kit inside)
      const rawTx = await createCancelSubscriptionTransaction({
        hub: hub.value,
        wallet: wallet.value,
        isChipnet: $store.getters['global/isChipnet'],
        isMerchant: true,
        sub: sub,
      })

      // 4. Submit to Payment Hub
      $q.loading.show({ message: 'Submitting cancellation...' })
      await hub.value.submitSubscriptionCancel(sub.id, rawTx, true)

      queueRefresh(false, 'subscriptions')
      $q.notify({ type: 'positive', message: $t('SubscriptionCancelled') || 'Subscription cancelled successfully' })
    } catch (error) {
      console.error(error)
      const errorMsg = error.response?.data?.error || error.message
      $q.notify({ type: 'negative', message: ($t('ErrorCancellingSubscription') || 'Error cancelling subscription: ') + errorMsg })
    } finally {
      $q.loading.hide()
    }
  })
}

</script>

<style lang="scss" scoped>
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}
.border-grey-4 {
  border: 1px solid rgba(128, 128, 128, 0.2);
}
</style>
