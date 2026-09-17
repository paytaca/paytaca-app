<template>
  <q-layout view="lHh Lpr lFf" :class="$q.dark.isActive ? 'bg-dark' : 'card-page-bg-light'">
    <q-header v-if="isloaded" class="bg-transparent text-bow">
      <CardPageHeader />
    </q-header>
    <div v-else class="row items-center q-pa-md" style="min-height: 60px; padding-top: max(env(safe-area-inset-top, 0px), 16px);">
      <q-btn flat round dense icon="arrow_back" color="primary" style="opacity: 0.3" />
      <div class="col">
        <q-skeleton type="text" width="150px" height="30px" class="q-mx-auto" />
      </div>
      <div style="width: 40px;"></div>
    </div>
    <q-page-container :class="$q.dark.isActive ? '' : 'card-page-bg-light'">
        <router-view :key="$route.path"></router-view>
    </q-page-container>

  </q-layout>
</template>

<script>
import CardPageHeader from 'src/components/card/CardPageHeader.vue';
import CardMaintenanceDialog from 'src/components/card/CardMaintenanceDialog.vue';
import { createCardLogic } from 'src/components/card/createCard.js';
import { clearCardUserCache, loadCardUser } from 'src/services/card/user';
import { fetchCardMaintenanceStatus, MAINTENANCE_EVENT, isUpdateRequired } from 'src/services/card/maintenance';
import packageInfo from '../../../../package.json';
import { cardLogger } from 'src/utils/debug-logger.js'

let cardMaintenanceDialogInstance = null
let cardMaintenanceDismissedKey = null
let cardMaintenanceActiveKey = null

export default {
  mixins: [createCardLogic],
  components: {
    CardPageHeader,
  },

  data () {
    return {
      user: null,
      isloaded: false,
      cardStatusFailCount: 0,
    }
  },

  computed: {
    textColor () {
      return this.$q.dark.isActive ? 'text-white' : 'text-dark'
    },
    textColorGrey () {
      return this.$q.dark.isActive ? 'text-grey-5' : 'text-grey-7'
    }
  },

  async mounted () {
    document.documentElement.classList.add('cards-page')
    try {
      await this.loadData()
    } catch (err) {
      cardLogger.error('Error loading card layout data:', err.message || err)
    } finally {
      this.isloaded = true
    }
    this.startCardMaintenancePolling()
    window.addEventListener(MAINTENANCE_EVENT, this.onCardMaintenanceEvent)
  },

  beforeUnmount () {
    document.documentElement.classList.remove('cards-page')
    window.removeEventListener(MAINTENANCE_EVENT, this.onCardMaintenanceEvent)
    if (this._cardMaintenanceTimer) clearInterval(this._cardMaintenanceTimer)
    if (cardMaintenanceDialogInstance) {
      cardMaintenanceDialogInstance.hide()
      cardMaintenanceDialogInstance = null
    }
    cardMaintenanceActiveKey = null
    clearCardUserCache()
    this.clearCards()
  },

  methods: {
    maintenanceKey (detail) {
      return [detail?.mode || 'maintenance', detail?.message || '', detail?.eta || '', detail?.updateRequired ? '1' : ''].join('|')
    },
    showCardMaintenanceDialog (detail) {
      if (cardMaintenanceDialogInstance) return
      const key = this.maintenanceKey(detail)
      if (key === cardMaintenanceDismissedKey) return
      cardMaintenanceActiveKey = key
      cardMaintenanceDialogInstance = this.$q.dialog({
        component: CardMaintenanceDialog,
        componentProps: {
          mode: detail?.mode || 'maintenance',
          message: detail?.message || '',
          eta: detail?.eta || '',
          updateRequired: Boolean(detail?.updateRequired),
        }
      }).onDismiss(() => {
        cardMaintenanceDialogInstance = null
        cardMaintenanceDismissedKey = cardMaintenanceActiveKey
        cardMaintenanceActiveKey = null
      })
    },
    onCardMaintenanceEvent (event) {
      this.showCardMaintenanceDialog(event?.detail)
    },
    pollCardMaintenanceStatus () {
      fetchCardMaintenanceStatus({ baseUrl: process.env.MAINNET_CARD_API_BASE_URL || '' })
        .then(status => {
          if (status?.maintenance) {
            this.cardStatusFailCount = 0
            this.showCardMaintenanceDialog({
              message: status.message,
              eta: status.eta,
              updateRequired: isUpdateRequired(status, packageInfo.version),
            })
            return
          }
          if (!status?.offline) {
            this.cardStatusFailCount = 0
            cardMaintenanceDismissedKey = null
            return
          }
          if (typeof navigator !== 'undefined' && navigator.onLine === false) return
          this.cardStatusFailCount++
          if (this.cardStatusFailCount >= 2) {
            this.showCardMaintenanceDialog({ mode: 'unreachable' })
          }
        })
        .catch(() => {})
    },
    startCardMaintenancePolling () {
      this.pollCardMaintenanceStatus()
      if (this._cardMaintenanceTimer) clearInterval(this._cardMaintenanceTimer)
      this._cardMaintenanceTimer = setInterval(() => this.pollCardMaintenanceStatus(), 60000)
    },
    async loadData () {
      await this.loadUser()
    },

    async loadUser (forceLogin = false) {
      if (forceLogin) {
        clearCardUserCache() // Clear cache to force fresh load
        this.showLoading(this.$t('Refreshing session...'))
      }
      this.user = await loadCardUser(forceLogin).then(user => {
        return user
      }).catch(err => {
        return null
      }).finally(() => {
        this.hideLoading()
      })
    },

    clearCards () {
      this.$store.commit('card/clearCards')
    },

    goToHome () {
      this.$router.push({ name: 'app-card' })
    },

    goToCardsList () {
      this.$router.push({ name: 'card-list' })
    },
    
    showLoading(message) {
      this.$q.loading.show({
        message: message || this.$t('Loading...')
      });
    },

    hideLoading() {
      this.$q.loading.hide();
    }
  }
}
</script>

<style lang="scss">
@import 'src/css/app-card.scss';
</style>
